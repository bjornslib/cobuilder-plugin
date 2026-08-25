---
id: monolith-decomposition-audit-002
category: code-review
canonical_tags: [clean-architecture, ddd, data-systems, resilience, python]
sources:
  - books/unified-software-engineering.md
  - books/clean-architecture.md
  - books/domain-driven-design.md
  - books/designing-data-intensive-applications.md
  - books/implementing-domain-driven-design.md
related_tags: [bounded-contexts, saga, transactional-outbox, context-mapping, service-boundaries, distributed-systems, event-driven, consistency, strategic-ddd]
severity: critical
---

# Audit Task 002: Monolith-to-Services Decomposition — Full Architecture Critique

**Template**: unified-software-engineering.md
**Focus**: Architecture and Boundary Rules, Data-Intensive System Rules, Domain Modeling Rules
**Severity**: Critical — architecture migration affects all seams

---

## Input: System Description

### Current Architecture (text diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                     MONOLITH (Spring Boot)                       │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  OrderController  │  │ ProductController│  │ UserController│ │
│  │  /api/orders/*    │  │ /api/products/*  │  │ /api/users/*  │ │
│  └───────┬──────────┘  └───────┬──────────┘  └──────┬────────┘ │
│          │                     │                     │          │
│          ▼                     ▼                     ▼          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SHARED SERVICE LAYER (stateless)              │  │
│  │                                                           │  │
│  │  OrderService ──┬── ProductService ──┬── UserService      │  │
│  │                 │                    │                     │  │
│  │   (calls ───────┘)   (calls ─────────┘)                   │  │
│  │    ProductService     UserService                         │  │
│  └───────┬──────────────────┬──────────────────┬─────────────┘  │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SHARED DATABASE (Postgres)                    │  │
│  │                                                           │  │
│  │  orders ─── FK ──► products ── FK ──► users               │  │
│  │  │                   │                   │                 │  │
│  │  ├─ payments         ├─ inventory         ├─ addresses     │  │
│  │  ├─ shipments        ├─ categories        ├─ preferences   │  │
│  │  └─ order_items ◄────┘                   └─ sessions      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SHARED INFRA: Redis (cache), RabbitMQ (jobs), S3 (media) │  │
│  │  All services read/write same cache keys, same queues      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Proposed Decomposition (as proposed by architecture team)

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Order Service│   │Product Svc   │   │ User Service │
│              │   │              │   │              │
│ DB: orders   │   │DB: products  │   │DB: users     │
│    payments  │   │   inventory  │   │   addresses  │
│    shipments │   │   categories │   │   preferences│
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       │   "Event-driven via Kafka — fire and forget"    │
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                ┌─────────┴─────────┐
                │  API Gateway      │
                │  (routing, auth)  │
                └───────────────────┘
```

### Code Sketches — Current Monolith Problems

**OrderService.createOrder()** (current — illustrates cross-domain coupling)

```java
@Service
public class OrderService {
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;  // crosses domain
    @Autowired private UserRepository userRepository;          // crosses domain
    @Autowired private PaymentService paymentService;          // cycles
    @Autowired private InventoryService inventoryService;
    @Autowired private ShipmentService shipmentService;
    @Autowired private RabbitTemplate rabbitTemplate;

    @Transactional  // spans 6+ tables
    public Order createOrder(CreateOrderRequest req) {
        // Business rule: validate user exists and is active
        User user = userRepository.findById(req.getUserId())
            .orElseThrow(() -> new UserNotFoundException(req.getUserId()));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new InactiveUserException(user.getId());
        }

        // Business rule: validate products exist and have inventory
        List<OrderItem> items = new ArrayList<>();
        for (OrderItemRequest itemReq : req.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(itemReq.getProductId()));
            if (!inventoryService.hasSufficientStock(product.getId(), itemReq.getQuantity())) {
                throw new InsufficientStockException(product.getId());
            }
            items.add(new OrderItem(product, itemReq.getQuantity(),
                           product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()))));
        }

        Order order = new Order();
        order.setUserId(req.getUserId());
        order.setItems(items);
        order.setStatus(OrderStatus.PENDING);
        order.setTotal(items.stream().map(OrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
        orderRepository.save(order);

        // Cross-domain side effects inside same TX
        inventoryService.reserveStock(order.getId(), items);    // modifies products DB
        paymentService.createPendingPayment(order);              // modifies payments DB
        shipmentService.createPendingShipment(order);            // modifies shipments DB

        // Fire-and-forget notification — no retry safety
        rabbitTemplate.convertAndSend("order.created", new OrderCreatedEvent(order));

        return order;
    }
}
```

### Proposed Service Code (as designed by architecture team)

**OrderService.createOrder()** (proposed microservice version)

```java
@Service
public class OrderService {
    @Autowired private OrderRepository orderRepository;
    @Autowired private KafkaTemplate kafkaTemplate;
    @Autowired private RestTemplate restTemplate;  // sync HTTP to other services

    @Transactional
    public Order createOrder(CreateOrderRequest req) {
        // Validate user via sync HTTP call
        UserDTO user = restTemplate.getForObject(
            "http://user-service/users/" + req.getUserId(), UserDTO.class);
        if (user == null || !"ACTIVE".equals(user.getStatus())) {
            throw new InactiveUserException(req.getUserId());
        }

        // Validate each product via sync HTTP call (N+1 problem)
        List<OrderItem> items = new ArrayList<>();
        for (OrderItemRequest itemReq : req.getItems()) {
            ProductDTO product = restTemplate.getForObject(
                "http://product-service/products/" + itemReq.getProductId(), ProductDTO.class);
            if (product.getAvailableQuantity() < itemReq.getQuantity()) {
                throw new InsufficientStockException(itemReq.getProductId());
            }
            items.add(new OrderItem(product, itemReq.getQuantity()));
        }

        Order order = new Order();
        order.setUserId(req.getUserId());
        order.setItems(items);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);

        // Fire-and-forget events — no saga, no compensating actions
        kafkaTemplate.send("order.created", new OrderCreatedEvent(order.getId()));
        kafkaTemplate.send("inventory.reserve", new ReserveInventoryCommand(order));
        kafkaTemplate.send("payment.initiate", new InitiatePaymentCommand(order));

        return order;
    }
}
```

### Incident Logs

```
[Prod-2026-04-15] Order #8923: User validated, products validated, order persisted.
  → inventory.reserve event published, but product-service was down.
  → payment.initiate event published and processed — user charged.
  → inventory.reserve retried after 2 hours when product-service recovered.
  → Stock already sold to another customer. Order #8923 paid but unfulfillable.

[Prod-2026-04-22] Order #9104: payment.initiate event lost due to Kafka broker partition leader election.
  → Order persisted as PENDING, inventory reserved, but payment never collected.
  → Order timed out after 24h. Inventory remained locked for duration.

[Prod-2026-05-01] Order #9500: N+1 HTTP calls to product-service for 47 line items.
  → product-service p99 latency = 200ms × 47 = 9.4s in request path.
  → API Gateway timeout at 10s — race condition; order persisted but events partially published.
```

---

## Audit Report

### 1. Strategic Decomposition Critique

**Finding 2.1 — Services Split Along Entity Lines, Not Bounded Contexts (CRITICAL)**

The proposed decomposition creates Order, Product, and User services — these are entity/table boundaries, not bounded contexts. Per *Strategic Domain Design* (line 347-358): "Identify the bounded context before modeling substantial domain behavior. A model is valid only inside its bounded context. Classify areas as core, supporting, or generic subdomains."

A real bounded-context analysis would likely reveal:
- **Ordering Context** (core): order creation, pricing, checkout workflow
- **Fulfillment Context** (core): inventory reservation, picking, shipping
- **Catalog Context** (supporting): product information, pricing, descriptions
- **Identity Context** (generic): user accounts, authentication, preferences
- **Payments Context** (supporting): payment processing, refunds, reconciliation

The current split couples Order and Fulfillment across service boundaries (inventory reservation is fulfillment, not catalog) while keeping Order and Payment in the same service.

**Fix**: Redo decomposition with bounded-context discovery. Model context relationships explicitly (customer/supplier, anticorruption layer, published language).

---

### 2. Cross-Service Data Consistency

**Finding 2.2 — No Saga or Compensating Workflow (CRITICAL)**

When `inventory.reserve` fails (service down, product sold), the system has no mechanism to undo `payment.initiate`. Per *Distributed Transactions and Derived Data* (line 544-550): "Use local transactions where they solve real consistency problems cleanly. Avoid distributed transactions by default. Prefer outbox, idempotent consumers, sagas/process managers, and compensating workflows for cross-boundary coordination."

The proposed fire-and-forget Kafka pattern means:
- Payment collected but inventory unavailable → charge must be refunded (compensating action)
- Inventory reserved but payment not collected → reservation must be released (timeout + compensating)
- No process manager tracking the overall saga state → orphaned steps accumulate

Production incident confirms: Order #8923 charged with no stock.

**Fix**: Implement a `CreateOrderSaga` process manager that:
1. Persists saga state (in-progress steps, completed steps)
2. Has explicit compensating actions for each forward step
3. Survives restart — reads saga state on recovery
4. Has timeout for the overall saga

**Finding 2.3 — Chatty Cross-Service Joins on Hot Path (CRITICAL)**

The proposed `OrderService.createOrder()` makes N+1 synchronous HTTP calls to product-service and user-service. Per *Service Boundaries* (line 554-556): "Avoid chatty cross-service joins on hot paths." And per *Enterprise Boundary Rules* (line 340-341): "Remote APIs must be coarse-grained and version-aware. Do not pretend network calls are local method calls."

At 47 line items × 200ms each, the order creation takes 9.4s — 19× the monolith version. This is a classic distributed monolith anti-pattern.

**Fix**: 
- Bulk-fetch products: `POST /products/bulk-lookup` with array of IDs (single round trip)
- Maintain a local read-model of active products (eventually consistent) for validation
- Consider: does order creation really need to validate every product synchronously? Could validation be async with order initially ACCEPTED → VALIDATED transition?

**Finding 2.4 — No Explicit Consistency Boundaries (HIGH)**

The decomposition removes the database-enforced FK constraint between orders, products, and users — but adds no explicit consistency guarantee at the service level. Per *Aggregates* (line 397-407): "Aggregates are consistency boundaries, not object graphs. Design aggregates around invariants that must hold immediately. Reference other aggregates by identity unless stronger consistency is truly required."

What happens when:
- A product is deleted while an order referencing it is in-flight?
- A user is deactivated while their order is being processed?

No cross-service invariant is declared. The monolith at least had FK constraints catching these at DB level.

**Fix**: Declare explicit cross-aggregate constraints. For example:
- Order references Product by ID — product deletion must be soft (DEPRECATED status) while unreconciled orders exist
- User deactivation publishes `UserDeactivated` event → Ordering context handles in-flight orders per business policy (cancel? allow completion?)

---

### 3. Event and Messaging Design

**Finding 2.5 — Fire-and-Forget Events Without Reliability (CRITICAL)**

The Kafka `send()` calls have no confirmation, no outbox pattern, and no retry mechanism. Per *Events, Logs, and Streams* (line 520-527): "Logs and streams are durable histories, not merely transport pipes. Consumers must tolerate lag, duplicates, restart, and replay. Event payloads need stable identifiers, correlation metadata, explicit semantics, and versioning."

If the Kafka broker is unreachable:
- Order is persisted but `order.created` event is lost → no downstream processing
- Payment is never initiated, inventory is never reserved

Incident #9104 confirms this exact failure mode.

**Fix**: Use transactional outbox pattern:
1. In same local DB transaction as order save, insert `OutboxMessage` rows (one per event)
2. Outbox poller reads unprocessed messages and publishes to Kafka
3. Publication is at-least-once with idempotent consumer handling
4. Messages marked as published only after Kafka ack

**Finding 2.6 — Commands and Events Confused (HIGH)**

`inventory.reserve` and `payment.initiate` are commands (request action), not events (state facts). The system publishes them as events with no explicit consumer contract. Per *Events, Logs, and Streams* (line 522-523): "Distinguish commands, events, and materialized views. Commands request action; events state facts that happened."

A command that is published to a topic has no guaranteed consumer — the producer assumes InventoryService will act, but there's no contractual obligation. Better: `InventoryReserved` is an event (fact), `ReserveInventory` is a command (request).

**Fix**: 
- Use explicit command channels (point-to-point or command topics with routing key per service)
- Use events for facts: `OrderPlaced`, `PaymentCollected`, `InventoryReserved`
- Commands are directed; events are broadcast

**Finding 2.7 — No Ordering Guarantees Declared (MEDIUM)**

Per *Ordering* (line 512-518): "Do not assume global order in distributed systems. Require only the minimum ordering the business logic needs. Define ordering scope: per key, stream, partition, aggregate, tenant, or account. Keep ordering-sensitive logic close to the key or stream that defines order."

All order-related events should be ordered per `orderId` partition key, but this is not configured. Out-of-order `PaymentCollected` arriving before `InventoryReserved` could cause the saga to incorrectly transition state.

**Fix**: Partition order-lifecycle topics by `orderId`. Saga manager processes events sequentially per order.

---

### 4. Dependency Direction and Layer Violations

**Finding 2.8 — Core Domain Not Protected (HIGH)**

The ordering context is the core domain (where revenue is generated), but the proposed architecture treats it symmetrically with user and product services. Per *Strategic Domain Design* (line 352-355): "Invest the richest modeling effort in the core domain. Protect the core domain from foreign models, vendor schemas, legacy vocabulary, and generic platform abstractions."

In the proposed code:
- OrderService makes synchronous REST calls to foreign services → core domain is blocked on supporting/generic services
- OrderService uses `ProductDTO` directly → foreign model infiltrating core domain
- OrderService throws `InactiveUserException` based on user-service response → core domain depends on identity context's model

**Fix**: 
- Core domain defines ports: `ProductValidator`, `UserValidator` — implemented by adapters that call remote services
- Translation layer converts foreign DTOs to core domain value objects
- Core domain is never blocked on remote service availability — use stale-but-acceptable read models or async validation

**Finding 2.9 — No Explicit Context Relationships (MEDIUM)**

Per *Strategic Domain Design* (line 356-358): "Make context relationships visible in code, integration adapters, tests, or documentation. Use shared kernel only for a small, jointly governed model subset. Use customer/supplier, conformist, anticorruption layer, separate ways, open host service, or published language deliberately."

The proposed architecture uses implicit HTTP calls — the relationship between Ordering and Identity contexts is never named or governed. Is it customer/supplier (Ordering consumes Identity's user model, Identity must maintain backward compat)? Conformist (Ordering adopts Identity's model without translation)? The ambiguity causes silent breakage when Identity changes user status semantics.

**Fix**: Declare context relationships explicitly in architecture documentation:
- Ordering → Identity: Customer/Supplier (Identity is upstream, Ordering consumes)
- Ordering → Catalog: Customer/Supplier (Catalog is upstream for product data)
- Ordering → Payments: Partnership (coordinated saga)
- Ordering → Fulfillment: Partnership (coordinated saga)

---

### 5. Infrastructure and Operational Review

**Finding 2.10 — No Timeout or Resilience on Cross-Service Calls (HIGH)**

The `RestTemplate` calls have no explicit timeouts. Per *Dependency Protection* (line 575-578): "Every outbound call must have an explicit timeout. Timeouts must be intentional, not hidden library defaults."

Spring RestTemplate default timeout is infinite — if user-service hangs, OrderService blocks indefinitely.

**Fix**: Configure timeouts: connect=1s, read=3s. Use circuit breaker (Resilience4j) around all cross-service HTTP calls.

**Finding 2.11 — Shared Infrastructure Without Isolation (MEDIUM)**

In the monolith, Redis cache keys and RabbitMQ queues are shared across all domains. The decomposition keeps this pattern. Per *Service Boundaries* (line 552-554): "Service boundaries should reflect data ownership and update semantics." And per *Bulkheads* (line 584): "Isolate risky or slow dependencies with bulkheads and separate resource pools."

One service's cache stampede should not affect another service's cache capacity. One service's poison message should not block another service's queue.

**Fix**: Each service gets isolated Redis instances (or key-prefixed namespaces with quotas), isolated Kafka partitions, and dedicated queues.

---

### Redesign Prompt — Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  Routes: /orders → ordering, /products → catalog, etc.      │
│  Auth: validates JWT, injects tenant/user context            │
└────┬─────────┬──────────┬──────────┬────────────────────────┘
     │         │          │          │
     ▼         ▼          ▼          ▼
┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│Ordering │ │Catalog│ │Fulfillment│ │Payments  │  ← Core domains
│Context  │ │Context│ │Context   │ │Context   │
│(CORE)   │ │(SUPP) │ │(CORE)    │ │(SUPP)    │
└────┬────┘ └──┬───┘ └────┬─────┘ └────┬─────┘
     │         │          │            │
     │  ┌──────┴──────────┴────────────┴──────┐
     │  │       Event Bus (Kafka)              │
     │  │  - order-lifecycle (keyed: orderId)  │
     │  │  - product-lifecycle (keyed: prodId) │
     │  │  - fulfillment (keyed: orderId)      │
     │  │  - payment-events (keyed: paymentId) │
     │  └──────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────┐
│  Cross-Cutting Infrastructure (per-service)    │
│  - Outbox processor (DB → Kafka)              │
│  - Saga/Process Manager (CreateOrderSaga)      │
│  - Circuit breakers on cross-service HTTP      │
│  - Idempotent consumers at every ingress       │
│  - Read models for validation data             │
│  - Reconciliation jobs for consistency         │
└────────────────────────────────────────────────┘

Context Relationships:
  Ordering → Identity:   Customer/Supplier (consume UserValidated events)
  Ordering → Catalog:    Customer/Supplier (consume ProductPublished events,
                          maintain local product read model)
  Ordering ↔ Payments:   Partnership (CreateOrderSaga coordinates)
  Ordering ↔ Fulfillment: Partnership (CreateOrderSaga coordinates)
  Identity → All:        Published Language (UserDeactivated, UserActivated events)

Each service owns its database exclusively.
Cross-service consistency via sagas + idempotent consumers + reconciliation.
No synchronous HTTP calls on the hot order path.
```

---

## Summary of Findings

| # | Severity | Area | Finding |
|---|----------|------|---------|
| 2.1 | CRITICAL | Strategic Design | Decomposition follows entities, not bounded contexts |
| 2.2 | CRITICAL | Data Consistency | No saga/compensating workflow — orphaned steps on failure |
| 2.3 | CRITICAL | Performance | N+1 cross-service HTTP calls on order creation hot path |
| 2.5 | CRITICAL | Messaging | Fire-and-forget events with no outbox/confirmation |
| 2.4 | HIGH | Data Consistency | No explicit cross-aggregate consistency declarations |
| 2.6 | HIGH | Messaging | Commands and events confused — no semantic distinction |
| 2.8 | HIGH | Dependency Direction | Core domain not protected from foreign models |
| 2.9 | MEDIUM | Strategic Design | Context relationships never named or governed |
| 2.10 | HIGH | Resilience | No explicit timeouts on cross-service HTTP calls |
| 2.7 | MEDIUM | Messaging | No ordering guarantees declared for lifecycle events |
| 2.11 | MEDIUM | Infrastructure | Shared Redis/queues without isolation or quotas |

---

**Audit completed per unified-software-engineering.md review checklist (lines 971-1000).**
**Key redesign decisions surfaced: bounded contexts > entity services, sagas over fire-and-forget, transactional outbox pattern required.**
