---
id: legacy-inventory-audit-005
category: code-review
canonical_tags: [refactoring, readability, data-systems, python]
sources:
  - books/unified-software-engineering.md
  - books/working-effectively-with-legacy-code.md
  - books/refactoring.md
related_tags: [legacy-code, seams, characterization-tests, dependency-breaking, stepwise-refactoring, inventory, source-of-truth, testability]
severity: high
---

# Audit Task 005: Legacy Inventory Management System — Seam Identification and Safe Refactor

**Template**: unified-software-engineering.md
**Focus**: Legacy Code Rules (lines 719-783), Refactoring Rules (lines 652-716), Seams and Dependency Breaking
**Severity**: High — inventory is source-of-truth for all fulfillment; 14 years of accumulated logic

---

## Input: System Description

### Architecture Diagram (text)

```
┌──────────────────────────────────────────────────────────────────┐
│  SAP Integration (SOAP/XML) — sends inventory updates every 15m │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  InventoryBatchJob.java (runs every 15m via cron)                │
│                                                                   │
│  main():                                                          │
│    xml = SAPClient.fetchInventoryXML()  // no timeout, no retry   │
│    records = parseXML(xml)              // 600-line DOM parser    │
│    for each record:                                               │
│      sku, warehouseId, qtyOnHand, qtyReserved, qtyAvailable      │
│      InventoryDAO.update(sku, warehouseId, ...)                  │
│    InventoryDAO.recalculateAllWarehouses()  // triggers N+1 view  │
│    if (any sku dropped below threshold):                         │
│      EmailService.sendLowStockAlert(...)                         │
│    if (any sku went negative):                                    │
│      // 200 lines of correction logic — sometimes adjusts other   │
│      // SKUs in the same category to compensate                   │
│      InventoryDAO.correctNegativeStock(sku, ...)                  │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  InventoryDAO.java (2100 lines)                                   │
│                                                                   │
│  Direct JDBC — no ORM. Mix of prepared statements and string     │
│  concatenation.                                                   │
│                                                                   │
│  update(sku, warehouse, onHand, reserved, available):             │
│    // 3 separate UPDATE statements in same method — no TX boundary│
│    stmt.execute("UPDATE inventory SET qty_on_hand = " + onHand    │
│      + " WHERE sku = '" + sku + "' AND warehouse_id = " + wh);    │
│    stmt.execute("UPDATE inventory SET qty_reserved = " + reserved │
│      + " WHERE sku = '" + sku + "' AND warehouse_id = " + wh);    │
│    stmt.execute("UPDATE inventory SET qty_available = " + avail   │
│      + " WHERE sku = '" + sku + "' AND warehouse_id = " + wh);    │
│                                                                   │
│  recalculateAllWarehouses():                                      │
│    // Materialized view of all warehouse totals                   │
│    // Updates a `warehouse_summary` table by iterating all rows   │
│    // Runs on every batch — even if only 1 SKU changed            │
│                                                                   │
│  correctNegativeStock(sku, qty):                                  │
│    // Undocumented logic written by a contractor in 2016          │
│    // "Borrows" stock from same-category SKUs to fix negatives    │
│    // No audit trail — just mutates inventory rows                │
│    // Has a bug: sometimes "borrows" from the wrong warehouse     │
│    Category cat = getCategoryForSku(sku);                         │
│    List<Inventory> others = findByCategoryExcludingSku(cat, sku); │
│    for (Inventory other : others) {                               │
│      if (other.qtyAvailable > qty) {                              │
│        other.qtyAvailable -= qty;                                 │
│        other.qtyOnHand -= qty;                                    │
│        update(other);                                             │
│        break;                                                     │
│      }                                                            │
│    }                                                              │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  inventory TABLE (MySQL)                                          │
│                                                                   │
│  CREATE TABLE inventory (                                         │
│    id BIGINT AUTO_INCREMENT PRIMARY KEY,                          │
│    sku VARCHAR(50) NOT NULL,                                      │
│    warehouse_id INT NOT NULL,                                     │
│    qty_on_hand INT NOT NULL DEFAULT 0,                            │
│    qty_reserved INT NOT NULL DEFAULT 0,                           │
│    qty_available INT NOT NULL DEFAULT 0,                          │
│    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,              │
│    updated_by VARCHAR(50) DEFAULT 'SYSTEM'                        │
│  );                                                               │
│  -- No unique constraint on (sku, warehouse_id) — duplicates      │
│  -- exist from 2018 data migration                                │
│  -- 2.8 million rows                                              │
│  -- No foreign key to warehouse or product tables                 │
│  -- `qty_available` is redundant: should equal on_hand - reserved │
│  -- but `correctNegativeStock` sometimes adjusts on_hand without  │
│  -- updating available, creating drift                             │
└──────────────────────────────────────────────────────────────────┘
```

### Code Sketch — Key Smells in InventoryBatchJob

```java
// InventoryBatchJob.java — 840 lines, no tests

public class InventoryBatchJob {

    // Smell: hardcoded config
    private static final String SAP_URL = "http://sap-prod.internal:8080/ws/inventory";
    private static final int LOW_STOCK_THRESHOLD = 10;
    private static final String SMTP_HOST = "mail.internal";

    public static void main(String[] args) {
        // Smell: no structured logging, no correlation ID
        System.out.println("Starting inventory batch job...");

        // Smell: direct dependency on SAP — no interface, no mock possible
        SAPClient sapClient = new SAPClient(SAP_URL);

        String xml;
        try {
            xml = sapClient.fetchInventoryXML();  // no timeout
        } catch (Exception e) {
            // Smell: writes to a file in /tmp instead of proper error handling
            try {
                Files.write(Paths.get("/tmp/inventory_error.log"),
                    (new Date() + ": " + e.getMessage()).getBytes(),
                    StandardOpenOption.APPEND);
            } catch (IOException ex) {
                ex.printStackTrace();
            }
            return;  // Smell: exits silently — inventory won't update for 15+ minutes
        }

        // Smell: XML parsing with raw DOM — 600 lines of element.getChildNodes() chains
        List<InventoryRecord> records = parseXML(xml);

        InventoryDAO dao = new InventoryDAO();  // Smell: direct instantiation

        int updated = 0;
        int failed = 0;
        List<String> lowStockAlerts = new ArrayList<>();
        List<String> negativeStockCorrections = new ArrayList<>();

        for (InventoryRecord record : records) {
            try {
                dao.update(
                    record.getSku(),
                    record.getWarehouseId(),
                    record.getQtyOnHand(),
                    record.getQtyReserved(),
                    record.getQtyAvailable()
                );
                updated++;

                // Smell: business logic inline in batch job
                if (record.getQtyAvailable() < LOW_STOCK_THRESHOLD) {
                    lowStockAlerts.add(record.getSku() + " @ warehouse " +
                        record.getWarehouseId() + ": " + record.getQtyAvailable());
                }

                if (record.getQtyAvailable() < 0) {
                    // Smell: auto-correction of negative stock — masks SAP errors
                    int correctionNeeded = Math.abs(record.getQtyAvailable());
                    dao.correctNegativeStock(record.getSku(), correctionNeeded);
                    negativeStockCorrections.add(record.getSku() + " corrected by " +
                        correctionNeeded);
                }
            } catch (Exception e) {
                failed++;
                // Smell: continues on error — partial update, inconsistent state
                System.err.println("Failed to update SKU " + record.getSku() + ": " +
                    e.getMessage());
            }
        }

        // Smell: full warehouse recalc after every batch — 2.8M rows scanned
        dao.recalculateAllWarehouses();

        // Smell: email sending inline — couples batch processing to SMTP availability
        if (!lowStockAlerts.isEmpty()) {
            EmailService.sendLowStockAlert(lowStockAlerts);
        }

        // Smell: correction log sent via email instead of structured event
        if (!negativeStockCorrections.isEmpty()) {
            EmailService.sendNegativeCorrectionReport(negativeStockCorrections);
        }

        System.out.println("Batch complete: " + updated + " updated, " + failed +
            " failed, " + lowStockAlerts.size() + " low stock, " +
            negativeStockCorrections.size() + " corrections");
    }
}
```

### Production Incidents

```
[2024-09-15] SAP returned malformed XML (missing </inventory> tag)
  → DOM parser threw NullPointerException at line 247
  → Batch job crashed — inventory not updated for 3 hours (missed 12 SAP feeds)
  → Orders fulfilled against stale inventory → 47 oversells
  → Manual DB corrections took 4 hours

[2024-11-02] MySQL deadlock during recalculateAllWarehouses
  → Half of warehouse_summary rows updated, half stale
  → Fulfillment service used stale summary for warehouse selection
  → Orders routed to wrong warehouse (further from customer) → 2-day shipping delay

[2025-01-18] correctNegativeStock "borrowed" from a warehouse in a different region
  → Inventory moved silently from EU warehouse to US warehouse totals
  → Actual stock still in EU — US orders unfulfillable despite "available" qty
  → Discovered 6 days later during physical audit

[2025-02-28] EmailService.sendLowStockAlert timed out (SMTP server migration)
  → Batch hung for 5 minutes waiting for SMTP timeout
  → SAP feed for next window missed entirely

[2025-03-12] Row duplication: SAP sent same warehouse twice with slightly different XML
  → No unique constraint — INSERT instead of UPSERT created duplicate inventory rows
  → 2.8M rows grew to 2.85M → recalculateAllWarehouses doubled totals
  → Fulfillment thought 2× stock available → accepted 200 orders with no real stock
```

---

## Audit Report

### Phase 1: Characterize Current Behavior

**Finding 5.1 — No Tests; Behavior Is Unknown (CRITICAL)**

Per *Legacy Code Rules* (line 721): "Treat code without trustworthy tests as legacy code." InventoryBatchJob has zero tests. InventoryDAO has zero tests. The behavior of `correctNegativeStock()` is known only through production observation — it mutates inventory but no one knows the exact rules.

Before ANY refactoring, characterization tests are mandatory. Per *Characterization and Safety* (line 736-742): "Characterize current behavior before redesigning unclear code. Capture ugly behavior if real consumers rely on it. If tests are absent and cannot be added quickly, keep the change smaller and improve testability first."

**Fix**: 
1. Write characterization tests for InventoryDAO.update() — capture exactly what SQL is generated for given inputs
2. Write characterization tests for correctNegativeStock() — document "borrowing" behavior as-is (even if ugly)
3. Write characterization tests for parseXML() — capture how it handles specific SAP XML edge cases
4. These tests don't assert correctness — they assert CURRENT behavior. They are the safety net

**Finding 5.2 — SAP Dependency Blocks All Change (CRITICAL)**

Per *Legacy Code Rules* (line 727-730): "Identify the dependency that makes change difficult. Find or create a seam. Break the blocking dependency."

The SAP SOAP call is the primary blocking dependency:
- No interface → can't mock for testing
- No timeout → can hang batch indefinitely
- Direct URL in code → can't point to staging/test SAP instance
- XML contract is implicit → no schema validation

Every change to InventoryBatchJob requires running against production SAP for verification — which means changes can only be tested during a 15-minute window or risk corrupting live data.

**Fix**: Create seams in order of increasing safety:
1. Extract `InventoryFeedSource` interface: `fetchInventoryRecords() → List<InventoryRecord>`
2. Implement `SapInventoryFeedSource` (wraps current SAPClient, adds timeout)
3. Implement `FileInventoryFeedSource` (reads from local XML file for testing)
4. Parameterize feed source — inject, don't instantiate

---

### Phase 2: Dependency Breaking and Seam Identification

**Finding 5.3 — InventoryDAO Has No Transaction Boundaries (HIGH)**

Per *Enterprise Boundary Rules* (line 333-335): "Transaction boundaries must be explicit in application workflow. Keep transactions short."

Three separate UPDATE statements for one SKU/warehouse update with no transaction. If the batch crashes between UPDATE #2 and UPDATE #3, the row has updated `qty_on_hand` and `qty_reserved` but stale `qty_available` — exactly the data drift problem observed.

**Fix**: 
- Wrap all three updates in a single transaction
- Or better: single UPDATE statement setting all three columns
- Even better: make `qty_available` a computed column (`on_hand - reserved`) — eliminate the data drift possibility entirely

**Finding 5.4 — SQL Injection in InventoryDAO (HIGH)**

String concatenation in SQL: `"UPDATE inventory SET qty_on_hand = " + onHand + " WHERE sku = '" + sku + "'"`. While SKU values come from SAP (internal system), this is still a violation of *Defensive Programming and Contracts* (lines 221-225) and a latent risk if SAP is ever compromised.

**Fix**: Use PreparedStatement with parameterized queries — this also improves performance through query plan caching.

**Finding 5.5 — No Unique Constraint on (sku, warehouse_id) (HIGH)**

Per *Data-Intensive System Rules* (line 481-492): source-of-truth ownership must be explicit. Without a unique constraint, duplicate rows silently accumulate. The 2018 migration introduced duplicates that were never cleaned up, and the 2025 SAP malformed XML incident created more.

**Fix**: 
1. Add unique constraint: `UNIQUE (sku, warehouse_id)`
2. Before constraint: deduplication migration — for each (sku, warehouse) pair, keep the most-recently-updated row
3. Change DAO to use `INSERT ... ON DUPLICATE KEY UPDATE` (MySQL) or equivalent upsert

**Finding 5.6 — `correctNegativeStock` Is Dangerous and Undocumented (HIGH)**

Per *Legacy Code Techniques* (line 777-781): "Use sprout method when new behavior can be added through a small insertion point."

The auto-correction logic silently mutates other SKUs to compensate. It crosses warehouse boundaries, has no audit trail, and masks the root cause (SAP sending bad data). This is not a legacy technique — it's a bug masquerading as a feature.

**Fix**: 
- Phase 1: Add audit logging — every correction writes to `inventory_correction_log` table with timestamp, user, before/after values
- Phase 2: Remove auto-correction. When SAP sends negative stock, emit an alert and refuse the update (SAP is source-of-truth and must be fixed)
- Phase 3: If business insists on correction, use a sprout class: `InventoryCorrectionService` with explicit rules and approval workflow

---

### Phase 3: Structural Refactoring to Enable Safe Change

**Finding 5.7 — Full Warehouse Recalculation Is Brutally Inefficient (HIGH)**

`recalculateAllWarehouses()` scans 2.8M rows on every 15-minute batch, even when only 50 rows changed. This is the cause of the deadlock incident and makes recovery slower.

**Fix**: Incremental recalculation — only update `warehouse_summary` for warehouses that had SKU changes in this batch. This reduces the operation from O(2.8M) to O(changed_rows).

**Finding 5.8 — Email Sending Coupled to Batch Processing (MEDIUM)**

Per *Production Readiness Rules* (line 643-648): "Background jobs must be restart-safe." And per *Separation of Concerns* (line 265): "Separate policy from mechanism."

The batch job sends email inline — if SMTP is slow/down, the batch hangs. Email failures should not prevent inventory updates.

**Fix**: 
- Emit `LowStockDetected` and `NegativeStockDetected` domain events
- Separate `InventoryAlertHandler` consumes events and sends notifications
- Batch job completes regardless of email status

**Finding 5.9 — Hardcoded Configuration Blocks Environment Changes (MEDIUM)**

Per *Pragmatic Engineering Rules* (line 873-879): "Build, test, lint, format, package, and deploy steps should be reproducible."

SAP_URL, SMTP_HOST, and LOW_STOCK_THRESHOLD are hardcoded. Moving to staging requires code changes. Per *Seams and Dependency Breaking* (line 761-762): "Break dependencies on environment variables — direct file writes."

**Fix**: Externalize to configuration file or environment variables. Inject via constructor.

---

### Phase 4: Incremental Change Plan

Per *Default Legacy Workflow* (lines 723-733), the change plan must be:

```
Step 1 — Add safety net (DON'T change behavior)
  ├── Write characterization tests for InventoryDAO.update/recalculate/correctNegativeStock
  ├── Write characterization tests for parseXML() with recorded SAP responses
  └── Verify tests pass against CURRENT code

Step 2 — Break blocking dependencies (smallest seams first)
  ├── Extract InventoryFeedSource interface ← seam #1
  ├── Implement FileInventoryFeedSource for testing ← enables offline testing
  ├── Parameterize batch job to accept feed source
  └── Verify: characterization tests still pass

Step 3 — Fix data integrity (structural, preserves behavior)
  ├── Add (sku, warehouse_id) UNIQUE constraint (after dedup migration)
  ├── Change DAO to use parameterized PreparedStatements
  ├── Wrap updates in single transaction
  ├── Add inventory_correction_log audit table
  └── Verify: characterization tests still pass

Step 4 — Improve efficiency (preserves behavior)
  ├── Change recalculateAllWarehouses to incremental
  └── Verify: same totals as full recalculation

Step 5 — Decouple notifications (preserves behavior)
  ├── Extract event emission from batch job
  ├── Create InventoryAlertHandler (separate class)
  └── Verify: alerts still sent for same conditions

Step 6 — Now safe to change behavior
  ├── Remove auto-correction; alert instead
  ├── Add SAP response timeout (30s)
  ├── Externalize configuration
  └── Add new behavior tests (assert correctness, not just current behavior)
```

---

### Target Architecture After Incremental Refactor

```
┌─────────────────────────────────────────────────────────┐
│  InventoryUpdateOrchestrator (application)               │
│  - receives feed source via injection                    │
│  - coordinates: fetch → parse → validate → persist       │
│  - emits events, does NOT send email                     │
└──┬──────────────────────────────────────────────────────┤
   │
   ▼
┌──────────────────────────────┐  ┌────────────────────────┐
│ InventoryFeedSource (port)   │  │ InventoryRepository     │
│                              │  │ (port)                  │
│ Implementations:             │  │                         │
│  - SapInventoryFeedAdapter   │  │  - upsert(sku, wh, qty) │
│  - FileInventoryFeedAdapter  │  │  - findBySkuAndWh(...)  │
│    (for testing)             │  │  - recalcWarehouse(wh)  │
└──────────────────────────────┘  └────────────────────────┘
                                             │
                                    ┌────────┴────────┐
                                    │ PostgresAdapter  │
                                    │ (infrastructure) │
                                    └──────────────────┘

Events emitted:
  InventoryUpdated(sku, warehouseId, oldQty, newQty)
  LowStockDetected(sku, warehouseId, availableQty)
  NegativeStockRejected(sku, warehouseId, sapValue)  ← no auto-correction

AlertHandler (separate):
  - consumes LowStockDetected → sends email/Slack
  - consumes NegativeStockRejected → pages on-call
  - independent retry, independent failure mode
```

---

## Summary of Findings

| # | Severity | Area | Finding |
|---|----------|------|---------|
| 5.1 | CRITICAL | Legacy Safety | Zero tests — behavior is unknown, any change is risky |
| 5.2 | CRITICAL | Legacy Seams | SAP dependency blocks all testing and safe change |
| 5.3 | HIGH | Data Integrity | Three separate UPDATEs without transaction → data drift |
| 5.4 | HIGH | Security | SQL injection via string concatenation in DAO |
| 5.5 | HIGH | Data Integrity | No unique constraint → duplicate rows accumulate |
| 5.6 | HIGH | Business Logic | correctNegativeStock silently cross-contaminates inventory |
| 5.7 | HIGH | Performance | Full 2.8M row recalculation every 15 minutes |
| 5.8 | MEDIUM | Resilience | Email sending inline → batch hangs on SMTP failure |
| 5.9 | MEDIUM | Configurability | Hardcoded URLs/credentials block environment changes |

---

## Curated Legacy Code Audit Prompts (for downstream workers)

1. "Audit this service for test coverage — identify all untested code paths. Prioritize by business criticality."
2. "For this 2000+ line class, identify every dependency that blocks testing (hardcoded URLs, direct instantiations, static calls). Rank by difficulty to break."
3. "Audit all SQL in this codebase for string concatenation. Flag every unparameterized query."
4. "Audit this database for missing unique constraints on business keys. Identify tables at risk of duplication."
5. "For this batch job, identify every side effect (email, file write, external call) that is not idempotent or retry-safe."
6. "Audit this codebase for hardcoded configuration values. List every value that should be externalized."

---

**Audit completed per unified-software-engineering.md Legacy Code Rules (lines 719-783) and review checklist (lines 971-1000).**
**6-phase incremental change plan with explicit seams at each step. Every legacy change leaves the area more observable, testable, and modular (line 783).**
