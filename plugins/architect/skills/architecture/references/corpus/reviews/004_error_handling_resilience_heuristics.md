---
id: error-handling-resilience-audit-004
category: code-review
canonical_tags: [resilience, readability, refactoring, python]
sources:
  - books/unified-software-engineering.md
  - books/release-it.md
  - books/code-complete.md
  - books/clean-code.md
related_tags: [defensive-programming, circuit-breaker, timeouts, retries, bulkheads, observability, error-handling, dependency-protection, production-readiness]
severity: medium
---

# Audit Task 004: Error Handling and Resilience Patterns — Cross-Cutting Heuristic Review

**Template**: unified-software-engineering.md
**Type**: Cross-cutting heuristics expressed through curated task
**Focus**: Defensive Programming, Production Readiness, Dependency Protection, Testing Rules
**Sources**: All 15 source books + open-source patterns + production incidents

---

## Input: Pattern Catalog (6 anti-patterns with real-code sketches)

### Pattern 1: Swallowed Exceptions — The Silent Killer

```python
# Found in 8 of 12 audited Python services
# e-commerce/order_service/workers/stock_updater.py

def update_stock_from_warehouse():
    try:
        response = warehouse_api.fetch_current_stock()
        for item in response['items']:
            db.upsert(StockRecord(sku=item['sku'], quantity=item['qty']))
    except requests.Timeout:
        pass  # Smell: silently drops timeout — stock data goes stale
    except requests.ConnectionError:
        pass  # Smell: warehouse unreachable, no alert, no fallback
    except KeyError:
        pass  # Smell: API contract changed — items silently skipped
```

```typescript
// Found in 5 of 8 audited React/TypeScript frontends
// dashboard/src/hooks/useAnalyticsData.ts

const useAnalyticsData = (dateRange: DateRange) => {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        analyticsApi.fetchMetrics(dateRange)
            .then(setData)
            .catch(() => {});  // Smell: swallowed — user sees stale/empty dashboard
    }, [dateRange]);
```

### Pattern 2: Catch-All with Lossy Error Context

```java
// Found in 11 of 15 audited Java services
// payment-gateway/src/main/java/com/bank/gateway/PaymentProcessor.java

public PaymentResult processPayment(PaymentRequest request) {
    try {
        // 200+ lines of business logic, gateway calls, DB operations
        StripeCharge charge = stripeGateway.charge(request);
        Payment payment = paymentRepository.save(toEntity(charge));
        notificationService.sendConfirmation(payment);
        return new PaymentResult(payment.getId(), "SUCCESS");
    } catch (Exception e) {  // Smell: catches everything
        log.error("Payment processing failed");  // Smell: loses the actual error
        // Smell: no distinction between validation, timeout, gateway, DB failures
        return new PaymentResult(null, "FAILED");  // Smell: caller can't distinguish
    }
}
```

### Pattern 3: Retry Without Idempotency

```python
# Found in 6 of 12 audited services
# inventory/reservation_service.py

from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1))
def reserve_inventory(sku: str, quantity: int) -> str:
    # Smell: no idempotency key — if retry fires after initial success,
    # inventory is double-reserved
    current = db.query(Inventory).filter_by(sku=sku).first()
    if current.available < quantity:
        raise InsufficientStockError(sku)
    current.available -= quantity
    current.reserved += quantity
    db.commit()
    return str(uuid4())  # reservation ID
```

```go
// payment-service/internal/handler/charge.go

func (h *ChargeHandler) Handle(ctx context.Context, cmd ChargeCommand) error {
    // Smell: retry at HTTP middleware level, not handler level
    // If Stripe charge succeeds but DB save fails, middleware retries → double charge
    stripeCharge, err := h.stripeClient.Charge(cmd.Amount, cmd.Token)
    if err != nil {
        return err  // retryable — but what if charge already succeeded?
    }
    return h.repo.SavePayment(ctx, stripeCharge)
}
```

### Pattern 4: Timeout Mismatches and Cascading Failures

```
# Production incident — timeout cascade

Service A → Service B: timeout=30s
Service B → Service C: timeout=30s
Service C → Database:   timeout=30s

When DB is slow (25s queries):
  - Service C waits 25s (within its 30s timeout)
  - Service B waits 25s + processing = 26s (within its 30s timeout)
  - Service A waits 26s (within its 30s timeout) → BUT:
    Service A's thread pool has 200 threads
    200 × 26s = all threads occupied
    All new requests queued → API Gateway timeout at 60s → 503 storm

Root cause: each layer's timeout is slightly longer than the next,
creating a "timeout staircase" where no individual call fails fast
but the aggregate consumes all resources.
```

```yaml
# Typical misconfiguration found in 9 of 12 audited services
# application.yml
http:
  connect-timeout: 5000ms
  read-timeout: 30000ms   # Smell: 30s default — 30× too high for most calls

database:
  connection-timeout: 30000ms  # Smell: blocks 30s when pool is full
  query-timeout: 0             # Smell: no timeout — can hang forever

queue:
  consumer-timeout: 0          # Smell: RabbitMQ consumer blocks indefinitely
```

### Pattern 5: Error Classification Missing

```python
# Found in 8 of 12 services
# orders/api/views.py

@router.post("/orders")
def create_order(request: CreateOrderRequest):
    try:
        order = order_service.create(request)
        return OrderResponse.from_domain(order), 201
    except Exception as e:  # Smell: all exceptions mapped the same way
        # Is this:
        #   400: invalid product ID?  (client error)
        #   409: product out of stock? (conflict)
        #   422: payment declined?     (unprocessable)
        #   503: inventory service down? (service unavailable)
        #   500: unexpected bug?        (server error)
        return {"error": str(e)}, 500  # Smell: everything is 500
```

```typescript
// frontend/src/api/client.ts

async function apiCall<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        // Smell: all errors thrown as one type
        throw new Error(`API error: ${response.status}`);
        // Callers can't distinguish:
        //   - 401: redirect to login
        //   - 403: show permission error
        //   - 409: show conflict resolution UI
        //   - 503: show "temporarily unavailable" banner
    }
    return response.json();
}
```

### Pattern 6: Missing Circuit Breakers — Retry Storms

```
# Production incident — retry storm

Normal operation:
  Service A (200 req/s) → Service B (healthy)
  Service A retry config: max 3 attempts, exponential backoff

When Service B goes down:
  Attempt 1: 200 req/s → all fail after timeout=5s
  Attempt 2 (1s later): 200 more → all fail
  Attempt 3 (2s later):  200 more → all fail
  Total: 600 req/s pounding a dead service

  Net effect: Service A's retries make recovery HARDER by keeping
  Service B's connection queue saturated with doomed requests.
  Each retry opens a new TCP connection, new thread, new timeout timer.
  Service A itself degrades under the overhead of 3× connection attempts.

Without a circuit breaker, retry amplifies load 3× during outages.
```

---

## Audit Report: Cross-Cutting Heuristic Rules

### Heuristic Cluster A: Error Visibility and Classification

**H-A1: Every catch block must either handle, enrich, or propagate — never swallow.**

Derived from *Defensive Programming and Contracts* (lines 222-230): "Do not silently continue from corrupted or impossible state. Provide enough error context for diagnosis."

Pattern 1 violates this universally — `pass`, `() => {}`, and empty catch blocks. The heuristic: if you cannot meaningfully recover, at minimum log with context and correlation ID before re-raising. An empty catch block is a bug until proven otherwise.

Enforcement: lint rule — empty except/catch blocks are errors (not warnings). Allow only with an explicit `# nosec B110` or `// lint-ignore: swallowed-error` comment explaining why.

**H-A2: Error responses must distinguish four failure classes: client error (4xx), conflict (409), dependency failure (502/503/504), and internal error (500).**

Derived from *Dependency Protection* (line 582): "Do not retry validation errors or permanent failures." And *API Rules* (line 634-637): "Make failure modes explicit in API contracts. Let callers distinguish retryable, recoverable, and permanent failures."

Pattern 5 maps everything to 500 — the worst of all worlds. Callers retry validation errors (wasteful) and give up on transient failures (data loss). Every API must classify its errors:

| Domain Error Type | HTTP Status | Caller Action |
|---|---|---|
| Validation / Bad Input | 400 | Fix request, don't retry |
| Not Found | 404 | Don't retry |
| Conflict / State Mismatch | 409 | Check current state, may retry with updated version |
| Dependency Unavailable | 503 + Retry-After | Retry with backoff |
| Internal Error | 500 | Don't retry; alert operator |

**H-A3: Error context must be structured — at minimum: error type, operation name, correlation ID, and the specific entity/ID involved.**

Derived from *Observability* (line 616-617): "Emit meaningful structured logs at boundaries and failure points. Include correlation IDs, operation names, dependency names, and relevant identifiers."

Pattern 2's `log.error("Payment processing failed")` is useless for debugging. The heuristic: every log statement at ERROR/WARN level must include enough context to identify the exact request, user, and failing component without grepping adjacent lines.

Good: `log.error("Stripe charge failed", { correlationId, orderId, amount, stripeErrorCode, latency })`
Bad: `log.error("Payment processing failed")`

---

### Heuristic Cluster B: Retry Safety and Idempotency

**H-B1: Every operation that can be retried must be idempotent — either naturally (monotonic transitions) or explicitly (idempotency key).**

Derived from *Idempotency, Retry, and Replay* (lines 504-510) and *Forbidden Patterns* (line 922-923): "exactly-once wishful thinking" and "non-idempotent handlers under retry or redelivery."

Pattern 3 demonstrates the failure mode: retry decorators applied without idempotency. The heuristic: apply retry only where you can prove the operation is safe to repeat. For state-changing operations, require an idempotency key in the request and check for prior completion.

Checklist for retry safety:
1. Is the operation a pure read? → safe to retry
2. Does the operation use an idempotency key that is checked before execution? → safe
3. Is the operation a monotonic transition (e.g., PENDING → COMPLETE, never reverses)? → safe with dedup
4. Otherwise → do not retry. Fail fast and let the caller decide.

**H-B2: Retry must amplify at most linearly — retry count, total time, and concurrency must be bounded.**

Derived from *Dependency Protection* (lines 579-581): "Bound retry count and total retry time."

Pattern 6's retry storm shows unbounded amplification: 200 req/s → 600 req/s under failure. The heuristic:
- Max retry count ≤ 3
- Total retry time ≤ 30s (including all backoff periods)
- Jitter mandatory: ±25% of backoff interval to avoid thundering herd
- No nested retries — if Service A retries and Service B also retries internally, the compound delay and amplification multiply

Configuration template:
```yaml
retry:
  max_attempts: 3
  backoff:
    initial: 1s
    multiplier: 2
    max: 10s
    jitter: 0.25
  retryable_statuses: [408, 429, 500, 502, 503, 504]
  # Never retry: 400, 401, 403, 404, 409, 422
```

**H-B3: At-least-once delivery is the default; design consumers to tolerate duplicates.**

Derived from *Events, Logs, and Streams* (line 525): "Consumers must tolerate lag, duplicates, restart, and replay." And *Idempotency* (line 509): "Never assume exactly-once delivery unless the system boundary truly provides it and the design proves it."

Every async consumer (queue worker, event handler, Kafka consumer) must start with this assumption. The heuristic:
- Track processed message IDs in a durable store (DB table, Redis with persistence)
- Check before processing: has this message ID been seen?
- If duplicate detected: acknowledge and skip — do not reprocess

---

### Heuristic Cluster C: Timeout and Resource Boundaries

**H-C1: Every outbound call must have an explicit timeout shorter than the caller's own timeout.**

Derived from *Dependency Protection* (lines 575-578) and Pattern 4's cascade analysis.

The heuristic: timeouts must form a strict descending chain:
```
API Gateway (60s) > Service A (30s) > Service B (15s) > Service C (5s) > DB (3s)
```

Each layer's timeout must be ≤ 50% of its caller's timeout. This ensures a slow dependency causes a fast failure at the nearest boundary, rather than consuming resources across multiple layers.

Audit rule: check every `http.get()`, `rpc.call()`, `db.query()` — if no explicit timeout parameter, flag as HIGH severity.

**H-C2: Every queue, pool, cache, and buffer must have a maximum size.**

Derived from *Load, Capacity, and Backpressure* (line 591): "Unbounded queues, buffers, and work acceptance are forbidden."

From the fulfillment pipeline audit and Pattern 4:
- Queue max length: 5000 messages (or based on throughput × acceptable latency)
- Thread pool max size: explicit, based on CPU cores + I/O wait ratio
- Connection pool max size: explicit, based on database max_connections / service_count
- Cache max entries: explicit, with eviction policy
- Batch size: explicit maximum

Unbounded is a production incident waiting to happen. Every resource constraint should be explicit in configuration — never "pick a number that's high enough."

**H-C3: Timeouts and circuit breakers are complementary — timeouts protect individual calls, circuit breakers protect the system from a known-bad dependency.**

Derived from *Dependency Protection* (lines 576-583).

The heuristic:
- Timeout: "this one call took too long → fail this one call"
- Circuit breaker: "the last N calls all failed → stop making calls entirely for a while"

Pattern 6 demonstrates why timeout alone is insufficient. Without a circuit breaker, every retry opens a new connection to a dead dependency, consuming client resources. Circuit breaker threshold: open after 5 consecutive failures within 60s; half-open after 30s to test recovery.

---

### Heuristic Cluster D: Layer Integrity

**H-D1: Infrastructure exceptions must never cross layer boundaries un-translated.**

Derived from *Layer Responsibilities* (lines 282-300) and *Translation and Anticorruption* (lines 460-465).

Pattern 5's `except Exception` in the controller is better than leaking `StripeException`, but still wrong because it loses classification. The heuristic:
- Infrastructure adapter catches its own exceptions (StripeException, SQLException, HttpTimeoutException)
- Translates to domain- or application-layer exceptions (PaymentFailed, OrderNotFound, DependencyUnavailable)
- Domain layer never imports or catches infrastructure exception types

Audit check: search for imports of infrastructure exception types (stripe.*, sqlalchemy.*, requests.*, redis.*, amqp.*) in files outside the infrastructure layer.

**H-D2: A "Service" class must declare its layer role — application (orchestration), domain (business rules), or infrastructure (adapter).**

Derived from *Naming and Language Rules* (lines 132-137).

From both the Payment Processing and Monolith audits: `PaymentService`, `OrderService`, `UserService` — ambiguous. The heuristic: rename or annotate to make layer explicit:
- `ChargePaymentUseCase` (application)
- `OrderPricingPolicy` (domain)
- `StripePaymentGateway` (infrastructure)

---

## Summary: Cross-Cutting Heuristic Cards

| ID | Heuristic | Severity | Sources |
|----|-----------|----------|---------|
| H-A1 | Never swallow exceptions — handle, enrich, or propagate | CRITICAL | defensive-programming, construction |
| H-A2 | Distinguish 4 error classes: client, conflict, dependency, internal | CRITICAL | api-rules, dependency-protection |
| H-A3 | Structured error context: type + op name + correlation ID + entity ID | HIGH | observability |
| H-B1 | Every retry-able operation must be idempotent | CRITICAL | idempotency, data-consistency |
| H-B2 | Retry must amplify at most linearly — bound count, time, concurrency | HIGH | dependency-protection |
| H-B3 | Default to at-least-once; consumers must tolerate duplicates | HIGH | events-logs-streams |
| H-C1 | Explicit timeouts on every outbound call, descending chain | CRITICAL | dependency-protection |
| H-C2 | Every resource (queue, pool, cache) must have a max size | CRITICAL | load-capacity-backpressure |
| H-C3 | Timeouts + circuit breakers are complementary | HIGH | dependency-protection |
| H-D1 | Infrastructure exceptions never cross layer boundaries | HIGH | layer-responsibilities |
| H-D2 | Service classes must declare their layer role | MEDIUM | naming-rules |

---

## Curated Audit Task Prompts (for downstream workers)

These 11 heuristics can be used as standalone audit prompts:

1. "Audit this codebase for swallowed exceptions. Flag every empty catch/except block."
2. "Audit this API for error response classification. Map every exception to its correct HTTP status."
3. "Audit this service's logs. Verify every ERROR/WARN log includes correlationId, operation, and entity ID."
4. "Audit all retry configurations. For each, verify the retried operation is idempotent."
5. "Audit retry amplification. Calculate worst-case load during a dependency outage given current retry config."
6. "Audit all async consumers. Verify duplicate message handling (idempotency check)."
7. "Audit every outbound call (HTTP, RPC, DB) for explicit timeout configuration."
8. "Audit every queue, pool, and buffer for maximum size configuration."
9. "Audit circuit breaker configuration. Verify every dependency with >0 retries has a breaker."
10. "Audit imports of infrastructure exception types in non-infrastructure layers."
11. "Audit all classes named *Service — classify into application/domain/infrastructure."

---

**Audit completed per unified-software-engineering.md review checklist (lines 971-1000).**
**11 cross-cutting heuristics derived from 6 anti-patterns, mapped to template rules, with verifiable enforcement criteria.**
