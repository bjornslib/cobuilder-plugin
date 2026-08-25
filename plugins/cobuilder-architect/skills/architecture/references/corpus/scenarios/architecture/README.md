---
title: "Readme"
status: active
type: skill
last_verified: 2026-05-25
grade: reference
---

# Architecture Decision Scenarios

Scenario-based architecture exercises focusing on clean architecture decisions, trade-off analysis, and system design reasoning.

## Status

This directory is intentionally sparse. The primary architecture/DDD scenarios live under `scenarios/architecture_ddd/` (5 scenario cards, fully tagged with `canonical_tags` and `heuristics`). Future workers may add broader architecture decision scenarios here as the corpus grows.

## Existing architecture scenario coverage

- `scenarios/architecture_ddd/001_service_boundary_feature_placement.yaml` — Layer placement decisions
- `scenarios/architecture_ddd/002_repository_vs_domain.yaml` — Persistence boundaries
- `scenarios/architecture_ddd/003_bounded_context_splitting.yaml` — Bounded context identification
- `scenarios/architecture_ddd/004_ubiquitous_language_naming.yaml` — Domain language exercises
- `scenarios/architecture_ddd/005_clean_architecture_violations.yaml` — Dependency rule violations
- `scenarios/resilience/resilience_patterns.yaml` — Resilience patterns (circuit breakers, bulkheads, retries)
- `scenarios/data_systems/data_system_patterns.yaml` — Data systems patterns (ordering, consistency, partitioning)

All 7 scenario cards now have `canonical_tags` and extracted `heuristics` fields.

## Future expansion

- Broader architecture decision records (ADRs) as training scenarios
- Microservice decomposition case studies
- Event-driven architecture scenarios
- System design interview-style exercises
