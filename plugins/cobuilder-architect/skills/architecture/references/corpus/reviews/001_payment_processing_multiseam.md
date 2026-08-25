---
id: payment-processing-audit-001
category: code-review
canonical_tags: [resilience, clean-architecture, data-systems, ddd, python]
sources:
  - books/unified-software-engineering.md
  - books/clean-architecture.md
  - books/domain-driven-design.md
  - books/release-it.md
  - books/designing-data-intensive-applications.md
related_tags: [multi-seam-review, payment-processing, anemic-domain-model, idempotency, port-adapter, saga, circuit-breaker, correlation-ids, source-of-truth]
severity: high
---

# Audit Task 001: Payment Processing Service — Multi-Seam Review

**Template**: unified-software-engineering.md
**Seams**: Engine (construction + functions), Observability, Boundaries (architecture), Data
**Severity**: High — payment path is revenue-critical

---

## Input: System Description

### Architecture Diagram (text)

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (HTTP)                     │
│  POST /payments/charge                                  │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│     PaymentController        │  ← framework annotation
│  @Post("/payments/charge")   │    @Transactional
│  charge(dto: ChargeRequest)  │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│  PaymentService (Spring)     │  ← "Service" — which kind?
│  charge(req: ChargeRequest)  │    validates, calls gateway,
│  - validateAmount(amount)    │    updates DB, sends email
│  - checkFraud(userId,amount) │
│  - gateway.charge(req)       │
│  - repo.save(payment)        │
│  - emailer.sendReceipt(..)   │
└────┬──────────┬──────────────┘
     │          │
     ▼          ▼
┌─────────┐  ┌──────────┐
│Stripe   │  │Postgres  │
│Gateway  │  │Repository│
└─────────┘  └──────────┘
```

### Code Sketches

**PaymentController.java** (current state — smells annotated)

```java
@RestController
@RequestMapping("/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;  // field injection

    @PostMapping("/charge")
    @Transactional  // TX boundary at controller level — wrong layer
    public ResponseEntity<?> charge(@RequestBody ChargeRequest request) {
        // Smell: No validation of input shape, just passes raw DTO
        try {
            PaymentResult result = paymentService.charge(request);
            return ResponseEntity.ok(result);
        } catch (StripeException e) {
            // Smell: Leaking infrastructure exception to HTTP layer
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        } catch (FraudCheckException e) {
            // Smell: Business failure mapped to 500 instead of domain error
            return ResponseEntity.status(500).body(Map.of("error", "Fraud check failed"));
        }
    }
}
```

**PaymentService.java** (current state)

```java
@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private StripeGateway stripeGateway;
    @Autowired
    private FraudChecker fraudChecker;
    @Autowired
    private EmailService emailService;

    public PaymentResult charge(ChargeRequest request) {
        // Smell: Validation inline, not at boundary
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
        if (request.getSourceToken() == null || request.getSourceToken().isBlank()) {
            throw new IllegalArgumentException("Missing source token");
        }

        // Smell: Boolean flag parameter
        FraudCheckResult fraudResult = fraudChecker.check(request.getUserId(), request.getAmount(), true);

        if (fraudResult.isBlocked()) {
            throw new FraudCheckException(fraudResult.getReason());
        }

        // Smell: Infrastructure dependency in "service" — no timeout configured
        StripeCharge charge = stripeGateway.charge(
            request.getSourceToken(),
            request.getAmount(),
            request.getCurrency()
        );

        // Smell: Payment entity is anemic — just setters
        Payment payment = new Payment();
        payment.setUserId(request.getUserId());
        payment.setAmount(request.getAmount());
        payment.setCurrency(charge.getCurrency());
        payment.setStripeChargeId(charge.getId());
        payment.setStatus("COMPLETED");  // magic string
        payment.setCreatedAt(Instant.now());

        paymentRepository.save(payment);

        // Smell: Side effect (email) inside core business flow
        emailService.sendReceipt(request.getUserId(), payment);

        // Smell: Returns Stripe domain object wrapped
        return new PaymentResult(payment.getId(), charge.getStatus());
    }
}
```

**Payment.java** (entity)

```java
@Entity
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue
    private Long id;

    private String userId;
    private BigDecimal amount;
    private String currency;
    private String stripeChargeId;
    private String status;              // "PENDING", "COMPLETED", "FAILED" — magic strings
    private Instant createdAt;

    // Getters and setters only — no behavior, no invariants
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    // ... remaining getters/setters
}
```

### Observability Data (synthesized logs/metrics)

```
# Recent production incidents from logs

[2026-05-01 14:32:11] ERROR PaymentService.charge — StripeException: Connection timeout after 30000ms
  → No correlation ID, no request context logged
  → Payment saved with status "COMPLETED" despite Stripe timeout (phantom success)

[2026-05-02 09:15:44] WARN  FraudChecker.check — External fraud API returned 503
  → No circuit breaker — 300+ requests queued, thread pool exhausted

[2026-05-03 18:22:01] ERROR PaymentService.charge — NullPointerException at emailService.sendReceipt
  → Email failed, but payment already persisted — user charged, no receipt
  → No idempotency key — user retried, got double-charged (2 payments, 1 Stripe charge on second)

# Metrics
- payment.charge.latency.p99: 3200ms (target: 500ms) — Stripe timeout at 30s dominates
- payment.fraud.check.failure_rate: 12% (fraud API flaky)
- payment.double_charge.incidents: 4 in last 30 days
- payment.email.delivery.failure_rate: 3% — causes silent receipt loss
- health.check: always green — doesn't verify Stripe connectivity
```

---

## Audit Report

### 1. Engine / Construction Review

**Finding 1.1 — Anemic Domain Model (CRITICAL)**

`Payment` entity is a passive ORM container with no behavior or invariants. Per *Domain Modeling Rules — Entities* (line 376-383): "Entities must protect meaningful state transitions. Expose intention-revealing behavior, not arbitrary setters. Do not use entities as passive ORM containers in behavior-rich domains." Payment amounts, currencies, and status transitions carry real business rules.

- `status` is a magic string with no transition validation — code can set it to `"COMPLETED"` before Stripe even responds (and it does, per the timeout incident).
- No invariant: `amount` must be positive, `currency` must be valid ISO 4217 — these are scattered in `PaymentService` validations, not enforced by the entity.

**Fix**: Model `Payment` as a proper aggregate with status lifecycle, using value objects for `Money` (amount + currency) and `PaymentStatus` enum with valid transitions.

**Finding 1.2 — Controller Contains Business Logic (HIGH)**

`PaymentController` owns `@Transactional` and manually maps `StripeException` and `FraudCheckException` to HTTP status codes. Per *Layer Responsibilities* (line 293-296): "controllers translate between external formats and internal models. Do not move business policy out of the use case or domain model." And per *Forbidden Patterns* (line 907): "business rules in controllers" is forbidden.

- Transaction boundary at controller = framework coupling
- Infrastructure exceptions (`StripeException`) leaking to HTTP layer
- `FraudCheckException` mapped to 500 instead of domain-specific 4xx

**Fix**: Remove `@Transactional` from controller. Return use-case output from application service; let a presenter/adapter map domain outcomes to HTTP.

**Finding 1.3 — `PaymentService` Violates Command/Query Separation (HIGH)**

`charge()` calls Stripe, saves to DB, sends email — all in one method. Per *Construction Rules — Functions* (line 191-195): "Separate commands from queries. A function that answers a question should not also mutate state. Isolate error handling from the main path. Split parsing, validation, computation, I/O, and formatting when they are conceptually different."

The method mixes: validation, fraud check (query), remote I/O, persistence, and notification.

**Fix**: Split into orchestrated steps in an Application Service, each with its own error isolation.

**Finding 1.4 — Boolean Flag Parameter (MEDIUM)**

`fraudChecker.check(userId, amount, true)` — the `true` is opaque. Per *Functions and Routines* (line 189): "Avoid boolean flag parameters; split behavior or model the mode explicitly."

**Finding 1.5 — Field Injection via @Autowired (LOW)**

Field injection makes dependencies invisible and hinders testing. Per *Seams and Dependency Breaking* (line 749): prefer "constructor injection."

---

### 2. Boundary / Architecture Review

**Finding 2.1 — No Port/Adapter Separation (CRITICAL)**

`PaymentService` depends directly on `StripeGateway`, `PaymentRepository` (Spring Data JPA), and `EmailService`. No interfaces owned by the application layer. Per *Dependency Direction* (line 273-278): "Business rules must not depend on frameworks, web handlers, ORMs, database drivers, UI libraries, queues, SDKs, or vendor APIs. Inner policy layers define the abstractions they need. Outer detail layers implement those abstractions."

If Stripe is replaced with Adyen, every `StripeCharge` reference must change. The domain should only know about a `PaymentGateway` port.

**Fix**: Define `PaymentGateway` interface in application layer. Implement `StripePaymentGateway` in infrastructure. Same for `EmailPort` / `SmtpEmailAdapter`.

**Finding 2.2 — Transaction Boundary in Wrong Layer (HIGH)**

`@Transactional` on controller binds TX to HTTP request lifecycle. Per *Enterprise Boundary Rules* (line 333-335): "Transaction boundaries must be explicit in application workflow. Avoid transactions that span remote calls. Keep transactions short."

The current TX spans the entire Stripe gateway call — if Stripe is slow (30s timeout), the database connection is held that entire time.

**Fix**: Persist payment as `PENDING` before calling gateway, update to `COMPLETED` on success, `FAILED` on error. Keep DB TX short; the gateway call lives outside it.

**Finding 2.3 — Stripe Types Leak to Domain (MEDIUM)**

`PaymentResult` wraps `charge.getStatus()` which is a Stripe string, not a domain status. Per *Translation and Anticorruption* (line 461-465): "Translate at context boundaries. Keep foreign schemas, statuses, IDs, DTOs, and vendor vocabulary out of the local core model. Use an anticorruption layer."

**Fix**: Map Stripe status strings to domain `PaymentStatus` enum at the adapter boundary.

**Finding 2.4 — Mixed Layer Responsibilities (HIGH)**

`PaymentService` is annotated `@Service` but does everything: validation, domain logic, infrastructure coordination, notification. It's unclear whether it's an application service, domain service, or infrastructure service. Per *Naming Rules* (line 132-137): "If a class is named `Service`, it must be clear whether it is an application use case coordinator, a domain service, an infrastructure adapter, or a temporary legacy boundary."

**Fix**: Split into:
- `ChargePaymentUseCase` (application layer — orchestration)
- `Payment` aggregate (domain layer — invariants)
- `StripePaymentGateway` (infrastructure)

---

### 3. Data / Consistency Review

**Finding 3.1 — No Idempotency Mechanism (CRITICAL)**

No idempotency key on charge requests. Per *Idempotency, Retry, and Replay* (line 504-510): "Handlers of commands, jobs, events, and client requests must tolerate retries. Prefer deduplication keys, request IDs, natural idempotency, or monotonic state transitions. Never assume exactly-once delivery."

Production incident confirms: user retried and got double-charged.

**Fix**: Add `idempotencyKey` to `ChargeRequest`. Check for existing payment with that key before processing.

**Finding 3.2 — Phantom Success on Timeout (CRITICAL)**

When Stripe times out, the payment is saved with `status = "COMPLETED"` — but the charge may not have succeeded. Per *Consistency and Write Semantics* (line 494-501): "Be explicit about read-after-write expectations. Document or encode when a write is accepted, durable, visible, and applied."

**Fix**: Default initial status is `PENDING`. Query Stripe for charge status after timeout. Only transition to `COMPLETED` on confirmation.

**Finding 3.3 — No Source-of-Truth Ownership (HIGH)**

Is Stripe the source of truth for charge status or the local DB? The code treats the local DB as authoritative (writes COMPLETED before confirming Stripe). Per *Source of Truth* (line 481-492): "For every important dataset, identify primary owner, derived copies, replication path, update path, read path, consistency expectation, repair or rebuild strategy."

**Fix**: Stripe is the source of truth for charge outcome. Local DB mirrors it. Reconciliation job should detect mismatches.

**Finding 3.4 — No Retry Safety on Email Send (MEDIUM)**

`emailService.sendReceipt()` is called after persistence but has no retry or failure isolation. If it fails, payment is committed but receipt is lost. Per *Background Work* (line 643-648): "Failure and retry policy must be explicit."

**Fix**: Emit `PaymentCompleted` domain event. Separate `SendReceiptOnPaymentCompleted` handler with its own retry policy and dead-letter queue.

---

### 4. Observability Review

**Finding 4.1 — No Correlation IDs (HIGH)**

Logs show no trace context — impossible to connect a user request to Stripe calls to DB queries. Per *Observability* (line 615-621): "Include correlation IDs, operation names, dependency names, and relevant identifiers."

**Fix**: Propagate `X-Correlation-ID` through all layers. Include in every log statement and Stripe metadata.

**Finding 4.2 — Health Check is Deceptive (HIGH)**

Health check returns green even when Stripe is unreachable. Per *Deployment, Startup, and Operations* (line 623-630): "Readiness must report whether the service can actually serve. Liveness must not mask deadlocks or stuck subsystems."

**Fix**: Readiness probe must verify Stripe connectivity (lightweight ping). Liveness probe checks local process health only.

**Finding 4.3 — Missing Metrics (MEDIUM)**

Per *Observability* (line 620): "Measure latency, throughput, error rate, saturation, queue depth, retries, timeouts, circuit-breaker state, dependency health, and lag." Current metrics only cover latency and fraud failure rate. Missing: circuit breaker state, retry counts, idempotency hit rate, Stripe timeout rate.

**Finding 4.4 — Inconsistent Error Logging (MEDIUM)**

`StripeException` is logged at ERROR but `FraudCheckException` is not logged at all — only thrown. Per *Observability* (line 616): "Emit meaningful structured logs at boundaries and failure points."

---

## Summary of Findings

| # | Severity | Seam | Finding |
|---|----------|------|---------|
| 1.1 | CRITICAL | Engine | Anemic domain model — Payment entity has no invariants or behavior |
| 2.1 | CRITICAL | Boundaries | No port/adapter separation — direct dependency on Stripe, JPA |
| 3.1 | CRITICAL | Data | No idempotency — double-charges possible and observed |
| 3.2 | CRITICAL | Data | Phantom success on Stripe timeout — payment marked COMPLETED prematurely |
| 1.2 | HIGH | Engine | Controller owns @Transactional and error mapping |
| 1.3 | HIGH | Engine | Command/query separation violated in monolithic charge() method |
| 2.2 | HIGH | Boundaries | Transaction spans external gateway call |
| 2.4 | HIGH | Boundaries | PaymentService has ambiguous layer role |
| 3.3 | HIGH | Data | No explicit source-of-truth ownership |
| 4.1 | HIGH | Observability | No correlation IDs — untraceable requests |
| 4.2 | HIGH | Observability | Health check doesn't verify gateway connectivity |
| 1.4 | MEDIUM | Engine | Boolean flag parameter to fraudChecker |
| 2.3 | MEDIUM | Boundaries | Stripe types leak into domain result objects |
| 3.4 | MEDIUM | Data | Email failure after persistence causes lost receipts |
| 4.3 | MEDIUM | Observability | Missing circuit breaker / retry metrics |
| 4.4 | MEDIUM | Observability | Inconsistent error logging across failure types |
| 1.5 | LOW | Engine | Field injection instead of constructor injection |

## Redesign Prompt

Refactor toward this target architecture:

```
POST /payments/charge
  │
  ▼
ChargePaymentController (adapter)
  │  - extracts idempotencyKey + ChargeRequest from HTTP
  │  - calls use case, maps outcome → HTTP response
  ▼
ChargePaymentUseCase (application)
  │  - owns transaction boundary (short, local)
  │  - loads/creates Payment aggregate
  │  - calls PaymentGateway port → returns domain result
  │  - persists aggregate state change
  │  - publishes PaymentCompleted domain event
  ▼
Payment aggregate (domain)
  │  - enforces amount > 0, valid currency
  │  - status lifecycle: PENDING → COMPLETED | FAILED
  │  - rejects invalid transitions
  │  - encapsulates Money value object
  ▼
StripePaymentGateway (infrastructure)
  │  - implements PaymentGateway port
  │  - configured timeout (5s max)
  │  - maps StripeCharge → domain ChargeResult
  │  - includes correlation ID in Stripe metadata

PaymentCompleted event → SendReceiptHandler (separate, retry-safe)
                       → FraudAnalyticsHandler
```

---

**Audit completed per unified-software-engineering.md review checklist (lines 971-1000).**
