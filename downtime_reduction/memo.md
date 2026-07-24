# Problem-Framing Memo: Downtime Reduction Through Scheduler/API Integration

**Team domain:** B — Predictive Maintenance & Equipment Reliability
**Problem statement:** #4 — Downtime Reduction
**Stage:** 1 (Data Engineering) | Inuka Hackathon | 24 July 2026

## The KPC problem

KPC's pipeline maintenance workflow is largely manual: field issues get reported, but there is
no automated, auditable path from "an asset needs attention" to "a ticket exists in the
maintenance system with the right priority." This creates two costs: **delay** (time between
an issue being known and a technician being dispatched) and **invisibility** (no structured
record connecting maintenance events to downtime hours, so the true cost of delay is never
quantified). Problem 4 asks us to cut operational downtime by integrating tested
schedulers/APIs into existing maintenance workflows with performance monitoring — i.e., close
that gap with automation, and prove the automation itself is reliable.

## What the data tells us

Our work-order dataset (simulated for Stage 1, structured to match a realistic KPC ticketing
export) contains 600 cleaned maintenance records across 24 pump/valve assets in three depot
zones (Mombasa, Nairobi, Kisumu). Before cleaning, the raw export exhibited the messiness typical
of real operational systems: three different date formats, 17 distinct status-string variants
collapsing to 4 canonical states, 195 missing technician assignments, and a small number of
physically impossible timestamps (completion logged before the report time). Our ETL pipeline
resolves all of this into a single clean table and — critically — flags rather than silently
drops the anomalies, so downstream automation only fires on data it can trust.

## Our approach

1. **ETL foundation** (this stage): extract → clean → quality-gate → load into SQLite, with
   structured logging and 9 automated data-quality checks (uniqueness, valid ranges, referential
   sanity) enforced as a CI gate on every commit.
2. **Scheduler + API integration**: a Cron-style scheduler reads the cleaned data, applies a
   priority rule set to open/overdue work orders, and creates tickets via a mock CMMS API
   (standing in for KPC's real ticketing system) — with retry logic and full performance
   monitoring (latency, success rate, retry counts) logged per run.
3. **Stage 2/3 direction**: replace the mock API with a real integration once access is granted;
   add a predictive layer (which assets are *likely* to need a ticket soon, not just which
   already do) to move from reactive-automation to genuinely proactive scheduling.

## Why this matters

If scheduler-driven ticket creation replaces manual reporting even partially, KPC gains an
auditable, timestamped record of every maintenance trigger — the foundation needed to later
quantify (and reduce) downtime hours with real evidence, not estimates.
