# WP Distributed Crawler Spec (Master-Slave)

Version: v1.0  
Status: Draft for implementation  
Target: Stable distributed crawling network across many WordPress sites

## 1) Objective

Build a distributed crawler platform where:
- one bootstrap agent file is deployed to many WordPress sites (slaves),
- a central master service controls tasks and code updates,
- slaves execute crawl jobs and return normalized data,
- output can be routed:
  - to master first, then master forwards to novel manager API, or
  - directly from slave to novel manager API with master-issued credentials.

Primary goals:
- high stability under node/network failures
- controlled rolling updates from master to slaves
- at-least-once task delivery with idempotent ingest
- predictable operations at scale

## 2) Terminology

This document keeps `master/slave` naming to match current ops language.

- `Master`: control plane service (scheduler, command queue, updates, routing, monitoring).
- `Slave`: crawler agent runtime running inside a WordPress site.
- `Command`: a unit of work sent from master to slave.
- `Lease`: temporary lock proving a slave owns a command execution slot.
- `Artifact`: signed runtime package for slave code update.

## 3) Scope

In scope:
- control protocol (register, heartbeat, command polling, ack/result)
- master-driven code update and rollback
- crawl command model and execution lifecycle
- result transport and delivery modes
- reliability and observability baseline

Out of scope in v1:
- anti-bot bypass arms race strategy per target site
- legal/compliance takedown workflow
- fully autonomous peer-to-peer slave coordination

## 4) High-Level Architecture

Topology:
1. Master schedules crawl commands by source/domain priority.
2. Slaves poll master, lease commands, execute crawl jobs.
3. Slaves post results and execution metrics.
4. Master stores results, deduplicates, and routes to novel manager API.
5. Master also manages signed artifact rollout to slaves.

Delivery model:
- command delivery: at-least-once
- command execution: may repeat on lease timeout/retry
- data ingest correctness: idempotent by business key + idempotency key

## 5) Deployment Model (One File on Many WP Sites)

Recommended slave entrypoint:
- deploy one bootstrap file as MU-plugin:
  - `/wp-content/mu-plugins/crawler-agent-bootstrap.php`

Bootstrap responsibilities:
- load current runtime package from local release directory
- run registration if node not yet registered
- start polling loop via WP-Cron and/or WP-CLI
- enforce safe mode if runtime integrity check fails

Runtime directories (slave):
- `/wp-content/uploads/crawler-agent/releases/{version}/`
- `/wp-content/uploads/crawler-agent/current` (symlink or pointer)
- `/wp-content/uploads/crawler-agent/previous`
- `/wp-content/uploads/crawler-agent/state/` (queue, leases, logs)

## 6) Master Components

Master services:
- `Control API`: registration, heartbeat, command poll/ack/result
- `Scheduler`: creates commands and priorities
- `Lease Manager`: visibility timeout and requeue
- `Artifact Registry`: versioned signed packages
- `Rollout Manager`: canary/ring rollout and rollback
- `Result Router`: forward normalized payload to novel manager API
- `Observability`: metrics, logs, alerts, dashboards

Master storage (logical tables):
- `crawler_nodes`
- `crawler_node_heartbeats`
- `crawler_commands`
- `crawler_command_attempts`
- `crawler_leases`
- `crawler_artifacts`
- `crawler_rollouts`
- `crawler_results`
- `crawler_dlq`
- `crawler_metrics_minute`

## 7) Slave Components

Slave runtime modules:
- `Node Identity`: node id, key pair/token, environment tags
- `Poller`: request commands from master with capability metadata
- `Executor`: run crawl handlers with bounded concurrency
- `Result Publisher`: send result chunks and final status
- `Update Agent`: check/download/verify/apply artifact updates
- `Local Durable Queue`: store outbound events when network is down
- `Health Reporter`: heartbeat with cpu/memory/queue/error rates

Execution constraints (default):
- command concurrency per slave: 2-4
- per-domain request concurrency: 1
- per-domain rate limit: configurable tokens/sec
- global command timeout: 300s (type-dependent overrides allowed)

## 8) Control API Contract (Master Side)

Base path example:
- `https://master.example.com/api/crawler/v1`

Endpoints:
- `POST /nodes/register`
- `POST /nodes/heartbeat`
- `POST /nodes/{node_id}/poll`
- `POST /commands/{command_id}/ack`
- `POST /commands/{command_id}/progress`
- `POST /commands/{command_id}/result`
- `POST /commands/{command_id}/fail`
- `GET /nodes/{node_id}/update/check`
- `GET /artifacts/{artifact_id}`
- `POST /nodes/{node_id}/update/report`

Auth model:
- each slave has `node_id + node_secret` (or mTLS cert)
- request signing: `HMAC-SHA256(METHOD.PATH.TIMESTAMP.NONCE.BODY_SHA256)`
- replay protection with nonce cache and timestamp skew window (<= 300s)

## 9) Command Model and Lifecycle

Command types (v1):
- `crawl_story_list`
- `crawl_story_detail`
- `crawl_chapter`
- `backfill_story_range`
- `health_probe`
- `self_test`

Command envelope:
- `command_id` (uuid)
- `source`
- `type`
- `payload`
- `priority`
- `max_attempts`
- `visibility_timeout_sec`
- `created_at`

Lifecycle:
1. `queued`
2. `leased`
3. `running`
4. terminal:
  - `succeeded`
  - `failed_retryable`
  - `failed_permanent`
  - `dead_letter`

Lease rules:
- slave must ack lease within short window (example 10s)
- if lease expires, command returns to queue
- attempts increment on each new lease
- command moves to DLQ after `max_attempts`

## 10) Crawl Execution Contract

Handler input:
- source config snapshot
- command payload
- crawl limits (depth, page count, time budget)
- dedupe hints

Handler output:
- normalized records (`stories[]`, `chapters[]`)
- execution stats (fetched_pages, parsed_items, bytes, duration)
- errors with typed codes

Error classes:
- `network_transient`
- `parse_error`
- `source_changed`
- `blocked_or_rate_limited`
- `auth_error`
- `internal_error`

Retry policy:
- retry on transient classes with exponential backoff + jitter
- no retry on permanent schema/content errors

## 11) Data Delivery Modes

Mode A (recommended default):
- slave -> master result endpoint
- master validates/deduplicates/routes to novel manager ingest API

Mode B (optional high-throughput):
- slave gets short-lived ingest token from master
- slave pushes directly to novel manager API
- slave still posts command status and digest to master

Idempotency:
- per batch key: `source + command_id + chunk_index`
- per business record:
  - story key: `source + source_story_id`
  - chapter key: `source + source_story_id + source_chapter_id` (fallback chapter_no)

## 12) Code Update and Rollout

Artifact package:
- `artifact_id`
- `version`
- `manifest.json` (files + sha256)
- signed checksum file (Ed25519 recommended)

Slave update flow:
1. heartbeat/poll includes current version
2. master returns update instruction when rollout applies
3. slave downloads artifact
4. verifies signature + checksums
5. installs to `releases/{version}` without replacing active version
6. health check runs (`self_test`)
7. switch `current` pointer atomically
8. report success/failure to master

Rollback:
- automatic rollback to `previous` on startup/runtime health failure
- master can force rollback command by node group/ring

Rollout strategy:
- ring 0 canary: 5%
- ring 1: 25%
- ring 2: 100%
- block next ring if failure ratio exceeds threshold

## 13) Stability and Backpressure

Required controls:
- per-source concurrency caps
- per-domain circuit breaker
- adaptive polling interval based on queue depth and node load
- max in-flight commands per node
- load shedding when node cpu/memory exceeds threshold

Store-and-forward behavior:
- if master unreachable, slave buffers results locally
- local queue has disk cap and eviction policy
- when connectivity restored, slave flushes backlog in order

## 14) Security Requirements

- TLS required for all master-slave traffic
- request signature required on every control API call
- rotate node secrets periodically (example every 30 days)
- least-privilege tokens (separate poll/result/update scopes)
- artifact signature verification required before update apply
- reject unsigned or stale update artifacts
- audit all admin operations on master (rollout, revoke, force command)

## 15) Observability and SLO

Core metrics:
- active slaves
- heartbeat freshness
- command queue depth by type/source
- lease timeout rate
- command success/failure ratio
- DLQ growth rate
- result delivery latency to novel manager API
- update success ratio by artifact version

SLO targets (initial):
- command dispatch p95 <= 3s from queue to lease
- command success ratio >= 98% (excluding permanent parse errors)
- update rollout success >= 99% before full rollout
- result routing success >= 99.5%

## 16) Capacity Baseline

Planning assumptions:
- 200 slave nodes
- average 2 concurrent commands per node
- average command runtime 30-90s
- average chapter payload p95 <= 24KB, p99 <= 96KB

Master baseline:
- queue and lease storage must support 10k+ active queued commands
- control API should sustain heartbeat + poll traffic from all nodes

## 17) Failure Scenarios and Recovery

Scenario: master API outage
- expected: slaves continue local execution briefly and buffer results
- recovery: replay buffered results with idempotency keys

Scenario: slave offline
- expected: leases expire, commands requeued
- recovery: node returns and resumes polling

Scenario: bad artifact rollout
- expected: canary detects failure, rollout halted
- recovery: automatic rollback and master marks artifact blocked

Scenario: duplicate command execution
- expected under at-least-once model
- recovery: dedupe by idempotency/business keys at ingest path

## 18) Implementation Roadmap

Phase 1 (Control plane MVP):
- node register/heartbeat/poll
- command queue + lease timeout + retries + DLQ
- result endpoint and basic routing to master storage

Phase 2 (Crawler runtime):
- crawl handlers for story list/detail/chapter
- local durable queue
- retry/circuit breaker/rate limits

Phase 3 (Update system):
- artifact build/sign
- slave verify/install/switch/rollback
- canary rollout manager

Phase 4 (Scale + hardening):
- performance tuning and autoscaling rules
- deep observability and alerting
- operational runbooks and chaos drills

## 19) Must-Approve Decisions Before Build

1. Slave runtime packaging format (`zip` only vs container-like bundle)
2. Local queue format on slave (`sqlite` vs append-only file)
3. Result mode default (Mode A via master vs Mode B direct to novel API)
4. Rollout ring segmentation strategy (by domain/source/region)
5. Secret distribution and rotation workflow

## 20) Next Deliverables

If this spec is approved, next artifacts should be:
- OpenAPI 3.1 for master control endpoints
- SQL schema draft for master control-plane tables
- slave bootstrap contract (`crawler-agent-bootstrap.php`) with update protocol
- command handler interface spec and error code catalog
