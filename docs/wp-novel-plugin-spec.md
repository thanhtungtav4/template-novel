# WP Novel Plugin Spec (Custom Tables + API Ingestion)

Version: v1.4  
Status: Draft for implementation  
Target: WordPress plugin for high-volume novel storage and server-to-server API ingestion

## 1) Objective

Build a WordPress plugin that stores novel data in custom database tables (not `wp_posts/wp_postmeta`) and exposes APIs for:
- high-volume ingestion from an external crawler service
- public story/chapter read access
- admin operations and monitoring

Important boundary:
- crawler logic runs on a separate server.
- this plugin does not crawl any source site.
- plugin responsibility is receive, validate, queue, upsert, and serve read APIs.

Primary capacity target:
- 100,000 stories
- scalable chapter storage (millions of rows)

Success criteria (v1):
- ingest API accepts at least 2,000 chapter items/minute on a single worker node under normal load.
- no duplicate story/chapter rows after retries (idempotent correctness).
- p95 public story list latency under 300ms with warm cache.
- p95 chapter read latency under 250ms with warm cache.
- queue lag under 5 minutes for 95% of ingest jobs.

Assumptions:
- crawler server sends normalized UTF-8 payloads and stable source IDs.
- WordPress host can run long-lived CLI workers (systemd/supervisor/cron wrapper).
- Redis object cache is available in production.

Locked product decisions (approved on 2026-02-21):
- multi-source is required: multiple crawler sources will ingest into the same platform.
- chapter size planning baseline: p95 <= 24KB, p99 <= 96KB (raw text).
- compliance/takedown workflow is out of scope for v1.

v1.3 performance hardening scope:
- add query/sort indexes for high-cardinality story listing paths.
- replace per-item recount triggering by coalesced recount queue.
- reduce queue table bloat using inline-vs-blob payload strategy.

v1.4 performance hardening scope:
- align list/read indexes with actual API filters (`source`, optional `status`, soft-delete filters).
- optimize user/social endpoints (`library`, `ratings`, `comments`) for high-read traffic.
- move refresh token lifecycle off `wp_usermeta` into dedicated indexed table.

## 2) Why Custom Tables

For this workload, custom tables are the correct approach because:
- `wp_posts + wp_postmeta` becomes inefficient for large meta queries and bulk upserts.
- custom indexes are required for fast listing, filtering, and chapter pagination.
- ingestion pipeline needs idempotent upsert and queue semantics that are easier in dedicated tables.

Tradeoffs accepted:
- higher plugin complexity (migrations, repositories, custom APIs).
- lower compatibility with generic WP plugins that expect `wp_posts`.
- requires explicit backup/restore policy for custom tables.

## 3) Scope

In scope:
- plugin bootstrap and migration system
- custom tables and indexes
- REST API for ingestion and read
- background queue worker for async ingestion
- admin screens for health, queue, and logs
- performance and security baseline
- user authentication (WordPress user + JWT) and reading progress tracking
- user library/bookmarks and reading history

Out of scope in v1:
- crawler runtime, crawl scheduling, anti-bot bypass, proxy rotation
- full text external search engine integration (Meilisearch/Elasticsearch)
- payments/locking chapters
- recommendation engine

Explicit non-goals:
- no admin UI to manually edit chapter body at scale in v1.
- no bidirectional sync from WordPress back to crawler system.
- no realtime websocket delivery for chapter updates.
- no legal/compliance takedown workflow in v1.

## 4) High-Level Architecture

Topology:
1. Crawler Server (separate machine/service) crawls source websites.
2. Crawler Server pushes story/chapter batches to WordPress private ingest API.
3. WordPress API Server validates auth + schema, then writes ingest queue quickly.
4. Worker on WordPress API Server processes queue and performs idempotent upserts.
5. Plugin updates caches/aggregates and exposes public read APIs.

Delivery semantics:
- network model is at-least-once delivery from crawler server to plugin API.
- plugin guarantees idempotent writes so retries do not create duplicates.
- plugin does not make callbacks to crawler; crawler pulls status from API response/log endpoint if needed.

Components:
- REST Controller (`/wp-json/novel/v1/...`)
- Repository layer (DB queries via `$wpdb` + prepared statements)
- Migration layer (schema versions)
- Queue/Worker layer (WP-CLI + cron trigger)
- Admin dashboard (status, retries, logs)
- No crawler module inside plugin codebase

Operational SLOs:
- ingest API availability: 99.9% monthly
- public read API availability: 99.9% monthly
- queue processing success ratio: >= 99.5% (excluding invalid payload)
- mean time to recover failed worker: < 15 minutes

## 5) Plugin Structure

```text
wp-content/plugins/novel-manager/
  novel-manager.php
  uninstall.php
  includes/
    class-plugin.php
    class-migrator.php
    class-db.php
    class-repository-story.php
    class-repository-chapter.php
    class-rest-public.php
    class-rest-ingest.php
    class-auth-signature.php
    class-ingest-service.php
    class-queue.php
    class-cache.php
    class-observability.php
  admin/
    class-admin-page.php
  cli/
    class-cli-worker.php
  contracts/
    interface-story-repository.php
    interface-chapter-repository.php
    interface-queue.php
    interface-cache.php
    interface-user-progress-repository.php
    interface-refresh-token-repository.php
  docs/
    wp-novel-plugin-spec.md
```

Module responsibilities:
- `class-rest-ingest.php`: validate headers/body, enqueue jobs, return request-level response.
- `class-ingest-service.php`: apply idempotent domain upserts and aggregate updates.
- `class-queue.php`: claim/release jobs, retry scheduling, dead-letter transitions.
- `class-auth-signature.php`: HMAC verification, nonce replay protection, key lookup.
- `class-auth-jwt.php`: JWT token generation, validation, refresh for user authentication.
- `class-rest-public.php`: read-only endpoints with cursor pagination.
- `class-rest-user.php`: user auth endpoints (register, login, refresh) and user progress/library endpoints.
- `class-repository-user-progress.php`: reading progress, bookmarks, reading history DB operations.
- `class-repository-refresh-token.php`: refresh token hash lifecycle (issue, rotate, revoke, purge).
- `class-observability.php`: structured logs + metrics counters.

Interface contracts:
- all repository and service classes implement corresponding interfaces from `contracts/`.
- enables mock injection for unit tests and future swap of storage backends.
- `interface-cache.php` abstracts Redis vs WP transient fallback.

Coding constraints:
- all DB writes go through repository/service layer, not directly in controller.
- all SQL uses `$wpdb->prepare`.
- JSON responses follow shared envelope for predictable client integration.

## 6) Data Model (Custom Tables)

Table prefix must use `$wpdb->prefix`, examples below use `wp_novel_*`.

Global data conventions:
- all timestamps stored in UTC (`DATETIME` UTC semantics).
- all text fields stored as UTF-8 (`utf8mb4` collation).
- soft delete only where explicitly supported (`deleted_at IS NULL` default filter).
- no physical delete from core content tables in normal ingest flow.
- every table should use InnoDB and include created/updated timestamps where relevant.

Foreign key policy:
- logical foreign keys are required in code.
- physical foreign keys are optional in DB for write throughput; if enabled, use `ON DELETE RESTRICT`.
- if physical FKs are disabled, repository layer must enforce referential checks.

Enum conventions:
- `stories.status`: `0=draft`, `1=ongoing`, `2=completed`, `3=hiatus`, `4=dropped`.
- `ingest_jobs.status`: `queued`, `processing`, `completed`, `failed`, `dead_letter`.

### 6.1 `wp_novel_stories`

Purpose: core story metadata.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `source` VARCHAR(40) NOT NULL
- `source_story_id` VARCHAR(191) NOT NULL
- `slug` VARCHAR(191) NOT NULL
- `title` VARCHAR(255) NOT NULL
- `title_original` VARCHAR(255) NULL
- `author_name` VARCHAR(191) NULL
- `status` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `cover_url` VARCHAR(1024) NULL
- `summary` MEDIUMTEXT NULL
- `language` VARCHAR(10) NOT NULL DEFAULT 'vi'
- `chapter_count` INT UNSIGNED NOT NULL DEFAULT 0
- `word_count` INT UNSIGNED NOT NULL DEFAULT 0
- `popularity_score` DECIMAL(14,4) NOT NULL DEFAULT 0
- `rating_avg` DECIMAL(4,2) NULL
- `rating_count` INT UNSIGNED NOT NULL DEFAULT 0
- `last_chapter_no` DECIMAL(10,2) NULL
- `cache_version` INT UNSIGNED NOT NULL DEFAULT 0
- `view_count` BIGINT UNSIGNED NOT NULL DEFAULT 0
- `published_at` DATETIME NULL
- `updated_at_source` DATETIME NULL
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL
- `deleted_at` DATETIME NULL

Indexes:
- `UNIQUE(source, source_story_id)`
- `UNIQUE(source, slug)`
- `KEY(deleted_at, status, updated_at, id)` — public listing by updated
- `KEY(deleted_at, status, popularity_score, id)` — public listing by popular
- `KEY(deleted_at, status, published_at, id)` — public listing by newest
- `KEY(deleted_at, source, status, updated_at, id)` — source-specific listing by updated
- `KEY(deleted_at, source, status, popularity_score, id)` — source-specific listing by popular
- `KEY(deleted_at, source, status, published_at, id)` — source-specific listing by newest
- `KEY(updated_at_source)` — worker stale-check
- `KEY(author_name)` — author filter
- `FULLTEXT(title, title_original, author_name)` on MySQL 8+

Index design notes:
- redundant single-column `KEY(slug)` removed: `UNIQUE(source, slug)` covers queries that always include `source`.
- standalone `KEY(updated_at, id)`, `KEY(popularity_score, id)`, `KEY(published_at, id)` removed: composite `(deleted_at, status, ...)` and `(deleted_at, source, status, ...)` indexes cover listing patterns.
- `deleted_at` leads composite indexes to push down `IS NULL` filtering at index level, preventing full-table filter on soft-deleted rows.
- `cache_version` is atomically incremented on story/chapter upsert to support versioned cache keys.

Business rules:
- `slug` must be lowercase URL-safe string (`[a-z0-9-]+`), max 191 chars.
- slug uniqueness is scoped by `source` (same slug can exist across different sources).
- public story detail lookup uses `(source, slug)`, not global slug.
- `updated_at_source` is mandatory for conflict resolution in ingest flow.
- `chapter_count`, `word_count`, `last_chapter_no` are aggregate fields maintained by worker, not trusted directly from crawler.
- soft delete means set `deleted_at`, keep row for traceability.
- `q` filter in story list requires FULLTEXT availability; if unavailable, endpoint returns `invalid_filter`.
- when `status` is omitted on public list, API defaults to `status IN (1,2)` for index-friendly query plans.

### 6.2 `wp_novel_story_aliases`

Purpose: alternate titles for search.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `story_id` BIGINT UNSIGNED NOT NULL
- `alias` VARCHAR(255) NOT NULL

Indexes:
- `UNIQUE(story_id, alias)` — enforces uniqueness at DB level (collation `utf8mb4_unicode_ci` handles case-insensitive dedup)
- optional `FULLTEXT(alias)`

Business rules:
- aliases are deduplicated case-insensitively per `story_id`.
- aliases are replaced as full set on story refresh when payload provides alias list.

### 6.3 `wp_novel_genres`

Purpose: normalized genre dictionary.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `slug` VARCHAR(120) NOT NULL
- `name` VARCHAR(120) NOT NULL
- `created_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(slug)`
- `UNIQUE(name)`

Business rules:
- genre dictionary is source-agnostic and normalized by lowercase slug.
- slug changes are not allowed after creation in v1.

### 6.4 `wp_novel_story_genres`

Purpose: many-to-many relation story <-> genre.

Columns:
- `story_id` BIGINT UNSIGNED NOT NULL
- `genre_id` BIGINT UNSIGNED NOT NULL

Indexes:
- `PRIMARY KEY(story_id, genre_id)`
- `KEY(genre_id, story_id)`

Business rules:
- relation rows are replaced atomically per story when genres are refreshed.
- no duplicate relation row is allowed.

### 6.5 `wp_novel_chapters`

Purpose: chapter metadata only (fast list queries).

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `story_id` BIGINT UNSIGNED NOT NULL
- `source_chapter_id` VARCHAR(191) NULL
- `chapter_no` DECIMAL(10,2) NOT NULL
- `slug` VARCHAR(191) NOT NULL
- `title` VARCHAR(255) NOT NULL
- `is_published` TINYINT UNSIGNED NOT NULL DEFAULT 1
- `word_count` INT UNSIGNED NOT NULL DEFAULT 0
- `read_count` BIGINT UNSIGNED NOT NULL DEFAULT 0
- `published_at` DATETIME NULL
- `updated_at_source` DATETIME NULL
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL
- `deleted_at` DATETIME NULL

Indexes:
- `UNIQUE(story_id, chapter_no)`
- `UNIQUE(story_id, slug)`
- `UNIQUE(story_id, source_chapter_id)` if source id is provided
- `KEY(story_id, updated_at_source)` — worker stale-check
- `KEY(story_id, is_published, deleted_at, chapter_no, id)` — primary chapter listing + keyset pagination
- `KEY(story_id, is_published, deleted_at, published_at, id)`

Index design notes:
- `KEY(story_id, published_at)` removed: covered by `(story_id, is_published, deleted_at, published_at, id)`.
- `KEY(story_id, chapter_no, id)` removed: covered by `(story_id, is_published, deleted_at, chapter_no, id)` since public listing always filters `is_published=1` and `deleted_at IS NULL`.
- `deleted_at` column added for chapter-level soft delete (crawler corrections and moderation actions).

Business rules:
- `chapter_no` supports decimal values for side/interlude chapters.
- if `source_chapter_id` missing, `(story_id, chapter_no)` is canonical identity.
- updates must not reduce `updated_at_source` (last-write-wins by source timestamp).
- soft delete sets `deleted_at`; public API filters `deleted_at IS NULL`.
- `read_count` is aggregate/analytics counter, never trusted from crawler payload.

### 6.6 `wp_novel_chapter_content`

Purpose: chapter body storage separated from metadata table.

Columns:
- `chapter_id` BIGINT UNSIGNED PK
- `content_raw` LONGTEXT NOT NULL
- `content_html` LONGTEXT NULL
- `content_hash` BINARY(32) NULL
- `content_size` INT UNSIGNED NOT NULL DEFAULT 0
- `content_encoding` VARCHAR(10) NOT NULL DEFAULT 'none'
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

`content_encoding` values: `none` (raw UTF-8), `gzip`, `zstd`.

Indexes:
- `PRIMARY KEY(chapter_id)`
- `KEY(content_hash)`

Business rules:
- `content_hash` is SHA-256 over normalized raw content (computed before compression).
- if incoming `content_hash` equals existing hash, skip body update.
- `content_encoding`: application layer compresses/decompresses transparently; DB stores opaque bytes when compressed.
- recommended compression: `gzip` for v1 (p99 chapter body 96KB raw → ~25-30KB compressed).
- optional future mode: move cold `content_raw` to object storage and keep pointer.

### 6.7 `wp_novel_ingest_jobs`

Purpose: durable ingest queue.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `job_type` VARCHAR(40) NOT NULL
- `source` VARCHAR(40) NOT NULL
- `request_id` CHAR(36) NOT NULL
- `idempotency_key` VARCHAR(120) NOT NULL
- `external_ref` VARCHAR(191) NOT NULL
- `payload_inline_json` MEDIUMTEXT NULL
- `payload_blob_id` BIGINT UNSIGNED NULL
- `payload_hash` BINARY(32) NOT NULL
- `payload_size_bytes` INT UNSIGNED NOT NULL DEFAULT 0
- `payload_encoding` VARCHAR(20) NOT NULL DEFAULT 'none'
- `payload_storage` VARCHAR(20) NOT NULL DEFAULT 'inline'
- `status` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0
- `max_attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 5
- `next_run_at` DATETIME NOT NULL
- `locked_at` DATETIME NULL
- `locked_by` VARCHAR(64) NULL
- `last_error` TEXT NULL
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(source, job_type, request_id, external_ref)`
- `KEY(status, next_run_at, id)`
- `KEY(source, external_ref)`
- `KEY(request_id)`
- `KEY(source, idempotency_key)`
- `KEY(status, locked_at)`
- `KEY(payload_hash)`
- `KEY(payload_blob_id)`

Job status lifecycle (`status` TINYINT mapping):
- `0=queued` -> `1=processing` -> `2=completed`
- `1=processing` -> `0=queued` (retry path with backoff)
- `1=processing` -> `3=failed` -> `4=dead_letter` after max attempts

Business rules:
- `locked_at` + `locked_by` are heartbeat-controlled to avoid worker deadlock.
- worker claims jobs in small batches with optimistic lock update.
- enqueue must use `INSERT ... ON DUPLICATE KEY` against `(source, job_type, request_id, external_ref)` to prevent duplicate jobs.
- payload storage strategy:
  - `payload_storage='inline'` for payloads <= 64KB (`payload_inline_json` populated, no blob row).
  - `payload_storage='blob'` for payloads > 64KB (`payload_blob_id` populated, payload body in blob table).
  - blob payloads use `payload_encoding='gzip'` and are stored as binary, not base64 text.
- completed jobs are purged after 7 days; failed/dead-letter jobs retained 30 days (configurable).

### 6.8 `wp_novel_api_keys`

Purpose: authentication for private ingest API.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `key_name` VARCHAR(120) NOT NULL
- `key_id` VARCHAR(64) NOT NULL
- `secret_hash` VARCHAR(255) NOT NULL
- `permissions` VARCHAR(120) NOT NULL
- `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1
- `last_used_at` DATETIME NULL
- `created_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(key_id)`
- `KEY(is_active)`

Business rules:
- store only secret hash, never plaintext secret.
- key permissions example: `ingest:stories`, `ingest:chapters`, `ingest:stats`.
- API key rotation supports overlap window where old/new key are both valid.
- `secret_hash` uses `password_hash` (`argon2id` if available, fallback `bcrypt`).

### 6.9 `wp_novel_sync_logs`

Purpose: observability and audit.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `event_type` VARCHAR(40) NOT NULL
- `source` VARCHAR(40) NULL
- `reference_id` VARCHAR(191) NULL
- `level` VARCHAR(10) NOT NULL
- `message` TEXT NOT NULL
- `context_json` LONGTEXT NULL
- `created_at` DATETIME NOT NULL

Indexes:
- `KEY(event_type, created_at)`
- `KEY(level, created_at)`
- `KEY(reference_id)`

Log policy:
- default retention 30 days (configurable).
- large `context_json` values should be truncated/sanitized to avoid PII leakage.
- logs are append-only; no in-place updates.

### 6.10 `wp_novel_ingest_requests`

Purpose: request-level tracking for external crawler reconciliation.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `request_id` CHAR(36) NOT NULL
- `source` VARCHAR(40) NOT NULL
- `job_type` VARCHAR(40) NOT NULL
- `idempotency_key` VARCHAR(120) NOT NULL
- `status` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `total_items` INT UNSIGNED NOT NULL DEFAULT 0
- `accepted_items` INT UNSIGNED NOT NULL DEFAULT 0
- `rejected_items` INT UNSIGNED NOT NULL DEFAULT 0
- `processed_items` INT UNSIGNED NOT NULL DEFAULT 0
- `failed_items` INT UNSIGNED NOT NULL DEFAULT 0
- `last_error` TEXT NULL
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(request_id)`
- `UNIQUE(source, job_type, idempotency_key)`
- `KEY(source, created_at)`
- `KEY(status, updated_at)`
- `KEY(source, idempotency_key)`

Business rules:
- one row per ingest API request.
- state is updated by worker as jobs progress.
- crawler checks this table via status endpoint.
- status TINYINT mapping for this table: `0=queued`, `1=processing`, `2=completed`, `3=partially_failed`, `4=failed`.

### 6.11 `wp_novel_ingest_payload_blobs`

Purpose: binary payload storage for large ingest jobs to keep queue table lean.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `payload_blob` LONGBLOB NOT NULL
- `payload_hash` BINARY(32) NOT NULL
- `payload_size_bytes` INT UNSIGNED NOT NULL
- `payload_encoding` VARCHAR(20) NOT NULL DEFAULT 'gzip'
- `created_at` DATETIME NOT NULL
- `expires_at` DATETIME NOT NULL

Indexes:
- `KEY(expires_at)`
- `KEY(created_at)`
- `KEY(payload_hash)`

Business rules:
- used only when job payload exceeds inline threshold (default 64KB).
- worker loads blob lazily only after claim succeeds.
- blob rows are purged by retention policy and never required for completed jobs older than retention.

### 6.12 `wp_novel_story_recount_queue`

Purpose: coalesced recount queue to avoid per-item aggregate recomputation.

Columns:
- `story_id` BIGINT UNSIGNED PK
- `dirty_since` DATETIME NOT NULL
- `next_run_at` DATETIME NOT NULL
- `priority` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `touch_count` INT UNSIGNED NOT NULL DEFAULT 1
- `locked_at` DATETIME NULL
- `locked_by` VARCHAR(64) NULL
- `updated_at` DATETIME NOT NULL

Indexes:
- `KEY(priority DESC, next_run_at, story_id)` — matches claim query `ORDER BY priority DESC, next_run_at, story_id`
- `KEY(locked_at)` — stale lock reaper

Business rules:
- one row per `story_id`; duplicate touches are coalesced via upsert.
- coalescing window default is 60 seconds before recount execution.
- recount worker updates story aggregates in batch and deletes processed queue rows on success.

### 6.13 `wp_novel_nonce_replay`

Purpose: fallback nonce replay protection when Redis is unavailable.

Columns:
- `nonce_hash` BINARY(32) PK
- `key_id` VARCHAR(64) NOT NULL
- `expires_at` DATETIME NOT NULL

Indexes:
- `PRIMARY KEY(nonce_hash)`
- `KEY(expires_at)` — TTL purge

Business rules:
- primary nonce replay storage is Redis (`novel:nonce:{hash}` with 600s TTL).
- this table is fallback when Redis is unavailable; checked after Redis miss.
- purge expired rows via scheduled task every 5 minutes.
- table is small (10-minute window × request rate) and write-heavy; keep on fast storage.

### 6.14 `wp_novel_reading_progress`

Purpose: track last reading position per user per story ("continue reading").

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `story_id` BIGINT UNSIGNED NOT NULL
- `chapter_id` BIGINT UNSIGNED NOT NULL
- `chapter_no` DECIMAL(10,2) NOT NULL
- `scroll_position` FLOAT NULL
- `updated_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(user_id, story_id)` — one progress per user per story
- `KEY(user_id, updated_at, story_id)` — "continue reading" list sorted by recent
- `KEY(story_id)` — admin/popularity stats

Business rules:
- upsert on every chapter read (INSERT ON DUPLICATE KEY UPDATE).
- `scroll_position` is optional float 0.0—1.0 representing scroll percentage.
- `chapter_no` is denormalized for fast display without JOIN.
- old progress rows are never deleted; user can clear via API.

### 6.15 `wp_novel_bookmarks`

Purpose: user’s personal library — follow, favorite, plan-to-read.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `story_id` BIGINT UNSIGNED NOT NULL
- `status` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `notify_new_chapter` TINYINT UNSIGNED NOT NULL DEFAULT 1
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

`status` mapping: `0=following`, `1=favorite`, `2=plan_to_read`, `3=dropped`.

Indexes:
- `UNIQUE(user_id, story_id)` — one bookmark per user per story
- `KEY(user_id, status, updated_at)` — library filtered by status
- `KEY(user_id, updated_at, story_id)` — library `type=all` merge cursor path
- `KEY(story_id)` — bookmark count / popularity

Business rules:
- bookmark is upserted (status change does not delete+recreate).
- `notify_new_chapter` flag is for future push notification feature.
- deletion is hard delete (no soft delete for bookmarks).

### 6.16 `wp_novel_reading_history`

Purpose: detailed log of chapters read by each user.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `story_id` BIGINT UNSIGNED NOT NULL
- `chapter_id` BIGINT UNSIGNED NOT NULL
- `read_at` DATETIME NOT NULL

Indexes:
- `UNIQUE(user_id, chapter_id)` — one record per user per chapter (re-read updates `read_at`)
- `KEY(user_id, story_id, read_at)` — chapters read per story
- `KEY(user_id, read_at, story_id, chapter_id)` — recent global history with covering fields

Business rules:
- upsert on each chapter read; `read_at` is updated to latest timestamp.
- default retention: 90 days (configurable); purge via scheduled task.
- used for "reading history" page and future recommendation engine input.

### 6.17 `wp_novel_ratings`

Purpose: user ratings and reviews for stories.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `story_id` BIGINT UNSIGNED NOT NULL
- `score` TINYINT UNSIGNED NOT NULL
- `review_text` TEXT NULL
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

`score` range: 1–10 (maps to 0.5–5.0 stars in UI).

Indexes:
- `UNIQUE(user_id, story_id)` — one rating per user per story
- `KEY(story_id, created_at, id)` — ratings newest-first list
- `KEY(story_id, score, created_at, id)` — ratings highest/lowest + tie-break
- `KEY(user_id, created_at)` — user’s review history

Business rules:
- upsert: user can update their rating/review anytime.
- recount worker recomputes `rating_avg` and `rating_count` on `stories` table.
- `review_text` is optional; a pure score-only rating is allowed.
- deletion removes the row and triggers recount.

### 6.18 `wp_novel_comments`

Purpose: chapter-level and story-level comments/discussion.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `story_id` BIGINT UNSIGNED NOT NULL
- `chapter_id` BIGINT UNSIGNED NULL
- `parent_id` BIGINT UNSIGNED NULL
- `content` TEXT NOT NULL
- `likes_count` INT UNSIGNED NOT NULL DEFAULT 0
- `is_pinned` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `is_hidden` TINYINT UNSIGNED NOT NULL DEFAULT 0
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL
- `deleted_at` DATETIME NULL

`chapter_id` NULL = story-level comment. `parent_id` NULL = top-level comment.

Indexes:
- `KEY(chapter_id, deleted_at, is_hidden, is_pinned, created_at, id)` — chapter comments newest/oldest with moderation filters
- `KEY(story_id, deleted_at, is_hidden, is_pinned, created_at, id)` — story comments newest/oldest with moderation filters
- `KEY(chapter_id, deleted_at, is_hidden, is_pinned, likes_count, created_at, id)` — chapter comments top sort
- `KEY(story_id, deleted_at, is_hidden, is_pinned, likes_count, created_at, id)` — story comments top sort
- `KEY(user_id, created_at)` — user’s comment history
- `KEY(parent_id, deleted_at, created_at)` — threaded replies lookup

Business rules:
- max nesting depth: 2 levels (top-level + reply, no deeper threading).
- `content` max length: 2000 characters.
- soft delete via `deleted_at`; admin can hard delete.
- `likes_count` is denormalized counter; separate likes table deferred to v2.
- `is_hidden` is set by moderator/admin; hidden comments not shown publicly.
- `is_pinned` is set by admin; pinned comments appear first.

### 6.19 `wp_novel_refresh_tokens`

Purpose: dedicated refresh token lifecycle storage for user auth.

Columns:
- `id` BIGINT UNSIGNED PK AUTO_INCREMENT
- `user_id` BIGINT UNSIGNED NOT NULL
- `token_hash` BINARY(32) NOT NULL
- `device_id` VARCHAR(120) NULL
- `user_agent_hash` BINARY(32) NULL
- `ip_hash` BINARY(32) NULL
- `issued_at` DATETIME NOT NULL
- `expires_at` DATETIME NOT NULL
- `last_used_at` DATETIME NULL
- `revoked_at` DATETIME NULL

Indexes:
- `UNIQUE(token_hash)` — O(logN) token lookup for refresh
- `KEY(user_id, revoked_at, expires_at)` — active token checks per user
- `KEY(expires_at)` — purge expired tokens
- `KEY(last_used_at)` — idle token cleanup and analytics

Business rules:
- refresh token plaintext is never stored; only `SHA-256` hash is persisted.
- on refresh rotation: insert new token row, revoke old row in same transaction.
- active token policy v1: one active token per user (new login revokes previous active token).
- purge revoked/expired tokens daily; keep short audit retention window (configurable).

## 7) REST API Spec

Namespace: `novel/v1`

API design rules:
- all ingest routes return request-level envelope (`request_id`, counters, errors[]).
- all public read routes return deterministic field names and cursor token.
- error payload format:
  - `error.code` (machine readable)
  - `error.message` (human readable)
  - `error.details` (optional object/array)
- datetime values are ISO-8601 UTC strings in API payloads.

### 7.1 Private Ingest Endpoints

`POST /wp-json/novel/v1/ingest/stories/bulk`
- Purpose: push story batch to ingest queue.
- Auth: server-to-server HMAC signature header.
- Suggested batch size: 100 to 300 stories/request.
- Response: accepted count, rejected count, request id, per-item errors.
- Batch sizing rule: satisfy both limits (`items <= 300` and `request_body_bytes <= 5MB`).
- Required body:
  - `source` string (1..40)
  - `items[]` array (1..300)
- `items[]` required fields:
  - `source_story_id` string (1..191)
  - `slug` string (1..191)
  - `title` string (1..255)
  - `updated_at_source` datetime
- `items[]` optional fields:
  - `title_original`, `author_name`, `status`, `cover_url`, `summary`, `language`, `aliases[]`, `genres[]`

`POST /wp-json/novel/v1/ingest/chapters/bulk`
- Purpose: push chapter batch to ingest queue.
- Auth: server-to-server HMAC signature header.
- Suggested batch size: 100 to 300 chapters/request.
- Response: accepted count, rejected count, request id, per-item errors.
- Batch sizing rule: satisfy both limits (`items <= 300` and `request_body_bytes <= 12MB`).
- Required body:
  - `source` string (1..40)
  - `items[]` array (1..300)
- `items[]` required fields:
  - `source_story_id` string (1..191)
  - `chapter_no` number
  - `slug` string (1..191)
  - `title` string (1..255)
  - `content_raw` string (1..256KB hard limit, p99 target <= 96KB)
  - `updated_at_source` datetime
- `items[]` optional fields:
  - `source_chapter_id`, `published_at`, `is_published`

`POST /wp-json/novel/v1/ingest/rebuild-stats`
- Purpose: trigger aggregate recalculation for story ids.
- Auth: admin key only.
- Required body:
  - `story_ids[]` bigint array (max 10,000)

Optional status endpoint:

`GET /wp-json/novel/v1/ingest/requests/{request_id}`
- Purpose: crawler server checks asynchronous processing result.
- Auth: same ingest key.
- Response: request status summary (`queued`, `processing`, `completed`, `partially_failed`, `failed`) + counters.
- Data source: `wp_novel_ingest_requests`.
- Status interpretation:
  - `queued`: accepted, waiting worker.
  - `processing`: worker started.
  - `completed`: all accepted items processed successfully.
  - `partially_failed`: at least one item failed permanently.
  - `failed`: request-level failure before processing.

### 7.2 Public Read Endpoints

`GET /wp-json/novel/v1/stories`
- Filters: `source`, `q`, `status`, `genre`, `author`, `updated_after`.
- Pagination: cursor-based (`limit`, `cursor`), avoid offset at scale.
- Sort: `updated_desc`, `popular_desc`, `newest_desc`.
- Sort mapping:
  - `updated_desc` -> `(updated_at DESC, id DESC)`
  - `popular_desc` -> `(popularity_score DESC, id DESC)`
  - `newest_desc` -> `(published_at DESC, id DESC)`
- Defaults:
  - `limit=20`, max `limit=100`
  - `sort=updated_desc`
  - `status IN (1,2)` when `status` filter is omitted
- Cursor format:
- base64 of `{"sort":"updated_desc","k1":"2026-02-21T10:00:00Z","k2":12345}`
- Response fields:
  - `items[]`, `next_cursor`, `has_more`

`GET /wp-json/novel/v1/stories/{source}/{slug}`
- Returns story detail + selected metadata.
- Include:
  - core metadata, genres, aliases, chapter stats, latest chapter snapshot.

`GET /wp-json/novel/v1/stories/{id}/chapters`
- Filters: `from_chapter_no`, `to_chapter_no`.
- Pagination: cursor-based.
- Defaults:
  - `limit=50`, max `limit=200`
- Sort:
  - ascending chapter number by default.

`GET /wp-json/novel/v1/chapters/{id}`
- Returns chapter metadata + content.
- Optional query:
  - `include_content=true|false` (default true)
- Support ETag/If-None-Match for cache-friendly chapter reads.

### 7.3 Auth Contract for Ingest

Headers:
- `X-Novel-Key-Id`
- `X-Novel-Timestamp` (unix)
- `X-Novel-Nonce`
- `X-Novel-Request-Id` (client generated UUID)
- `Idempotency-Key` (required for ingest routes)
- `X-Novel-Signature` (HMAC SHA256)

Signature base:
- `method + "." + path + "." + timestamp + "." + nonce + "." + body_sha256`

Signature algorithm details:
- digest: `HMAC-SHA256(base_string, secret)`
- encoding: lowercase hex
- compare using constant-time function
- `body_sha256` is hex SHA-256 of raw request body bytes
- method is uppercase (`POST`, `GET`)
- path is canonical route path only (example `/wp-json/novel/v1/ingest/chapters/bulk`)

Validation rules:
- reject if timestamp skew > 300 seconds
- reject nonce replay for 10 minutes
- reject if key inactive
- reject if `Idempotency-Key` missing on ingest routes
- reject duplicate `Idempotency-Key` inside configured retention window after same successful payload
- enforce TLS only (HTTPS required)
- require `X-Novel-Request-Id` UUID format
- reject payload > configured limit (default 5MB stories, 12MB chapters, measured on decompressed body)

Network hardening (recommended):
- IP allowlist for crawler server egress addresses
- private network path (VPN/WireGuard/peering) or mTLS
- WAF/rate limit on ingest routes only
- separate API keys per crawler environment (`prod`, `staging`)

### 7.4 API Error Codes (Canonical)

Ingest endpoint errors:
- `invalid_signature`
- `timestamp_skew`
- `nonce_replay`
- `key_inactive`
- `permission_denied`
- `missing_idempotency_key`
- `payload_too_large`
- `invalid_schema`
- `rate_limited`
- `idempotency_conflict`
- `internal_error`

Public endpoint errors:
- `invalid_cursor`
- `not_found`
- `invalid_filter`
- `internal_error`

User endpoint errors:
- `invalid_credentials` — wrong username/password
- `user_exists` — email or username already registered
- `invalid_token` — JWT token invalid or malformed
- `token_expired` — JWT token expired, use refresh
- `refresh_token_invalid` — refresh token expired or revoked
- `bookmark_not_found` — bookmark does not exist for this user
- `invalid_schema` — request body validation failure
- `rate_limited` — too many auth attempts

### 7.5 User Authentication Contract (JWT)

Authentication for user-facing endpoints uses JWT tokens instead of HMAC signatures.

Token types:
- **Access token**: short-lived (default 7 days), used for API requests.
- **Refresh token**: long-lived (default 30 days), used only to obtain new access tokens.

Token payload (access):
```json
{
  "sub": 12345,
  "username": "reader1",
  "iat": 1740144000,
  "exp": 1740748800,
  "type": "access"
}
```

Signing: `HMAC-SHA256` with plugin secret key (stored in `wp_options`, separate from ingest API secrets).

Request header: `Authorization: Bearer {access_token}`

Validation rules:
- reject if token expired.
- reject if token type is not `access` (refresh tokens cannot be used for API requests).
- reject if user does not exist or is disabled in WordPress.
- rate limit auth endpoints: 10 login attempts/minute per IP, 30 register attempts/hour per IP.

Refresh flow:
1. client sends `POST /auth/refresh` with `refresh_token` in body.
2. server validates refresh token, checks expiry and revocation.
3. server returns new access token + new refresh token (rotation).
4. old refresh token is invalidated after use (one-time use).

Refresh token storage:
- refresh tokens are hashed and stored in `wp_novel_refresh_tokens` (not `wp_usermeta`).
- lookup path is by `token_hash` unique index for low-latency refresh validation.
- only one active refresh token per user at a time (new login invalidates previous).

### 7.6 User Endpoints

`POST /wp-json/novel/v1/auth/register`
- Purpose: create new user account.
- Auth: public (no token required).
- Required body:
  - `username` string (3..60)
  - `email` string (valid email)
  - `password` string (8..128)
- Optional body:
  - `display_name` string (1..100)
- Response: `{ user_id, username, access_token, refresh_token, expires_at }`
- Creates WordPress user with `subscriber` role.

`POST /wp-json/novel/v1/auth/login`
- Purpose: authenticate and obtain JWT tokens.
- Auth: public.
- Required body:
  - `login` string (username or email)
  - `password` string
- Response: `{ user_id, username, access_token, refresh_token, expires_at }`

`POST /wp-json/novel/v1/auth/refresh`
- Purpose: obtain new access token using refresh token.
- Auth: public (refresh token in body).
- Required body:
  - `refresh_token` string
- Response: `{ access_token, refresh_token, expires_at }`

`GET /wp-json/novel/v1/me/library`
- Purpose: user's reading dashboard — stories being read + bookmarks.
- Auth: Bearer JWT.
- Query params:
  - `type` enum: `reading`, `bookmarks`, `all` (default `all`)
  - `bookmark_status` int (filter bookmarks by status, optional)
  - `limit` int (1..100, default 20)
  - `cursor` string
- Response: `{ items[], next_cursor, has_more }`
  - Each item includes story summary + reading progress (if any) + bookmark status (if any).
- Query execution strategy:
  - `type=reading`: single indexed query on `wp_novel_reading_progress(user_id, updated_at, story_id)`.
  - `type=bookmarks`: single indexed query on `wp_novel_bookmarks(user_id, status, updated_at)`.
  - `type=all`: run two bounded indexed queries (`reading` + `bookmarks`) and merge by `updated_at` in application layer.
  - avoid large SQL `UNION + ORDER BY` across full user datasets.

`PUT /wp-json/novel/v1/me/progress/{story_id}`
- Purpose: update reading progress for a story.
- Auth: Bearer JWT.
- Required body:
  - `chapter_id` bigint
  - `chapter_no` decimal
- Optional body:
  - `scroll_position` float (0.0-1.0)
- Response: `{ story_id, chapter_id, chapter_no, scroll_position, updated_at }`
- Side effects:
  - upserts `wp_novel_reading_progress`.
  - upserts `wp_novel_reading_history` for the chapter.
  - auto-creates bookmark with `status=following` if user has no bookmark for this story.

`POST /wp-json/novel/v1/me/bookmarks/{story_id}`
- Purpose: add or update bookmark.
- Auth: Bearer JWT.
- Optional body:
  - `status` int (0=following, 1=favorite, 2=plan_to_read, 3=dropped; default 0)
  - `notify_new_chapter` boolean (default true)
- Response: `{ story_id, status, notify_new_chapter, created_at, updated_at }`

`DELETE /wp-json/novel/v1/me/bookmarks/{story_id}`
- Purpose: remove bookmark.
- Auth: Bearer JWT.
- Response: `204 No Content`

`GET /wp-json/novel/v1/me/history`
- Purpose: recent reading history.
- Auth: Bearer JWT.
- Query params:
  - `limit` int (1..100, default 20)
  - `cursor` string
- Response: `{ items[], next_cursor, has_more }`
  - Each item: `{ story_id, story_title, chapter_id, chapter_title, chapter_no, read_at }`

`POST /wp-json/novel/v1/me/progress/bulk`
- Purpose: batch update reading progress for multiple stories (mobile offline sync).
- Auth: Bearer JWT.
- Required body:
  - `items[]` array (1..50)
- `items[]` fields:
  - `story_id` bigint (required)
  - `chapter_id` bigint (required)
  - `chapter_no` decimal (required)
  - `scroll_position` float (optional)
- Response: `{ updated_count, items[] }`

`GET /wp-json/novel/v1/me/settings`
- Purpose: get user reading preferences.
- Auth: Bearer JWT.
- Response: `{ font_size, font_family, line_height, theme, page_width }`
- Defaults: `{ font_size: 16, font_family: "default", line_height: 1.8, theme: "light", page_width: "medium" }`

`PUT /wp-json/novel/v1/me/settings`
- Purpose: update user reading preferences.
- Auth: Bearer JWT.
- Body: any subset of settings fields.
- Response: full settings object.
- Storage: `wp_usermeta` key `novel_reading_settings` (JSON).

`POST /wp-json/novel/v1/me/ratings/{story_id}`
- Purpose: submit or update rating/review.
- Auth: Bearer JWT.
- Required body:
  - `score` int (1-10)
- Optional body:
  - `review_text` string (max 2000 chars)
- Response: `{ story_id, score, review_text, created_at, updated_at }`
- Side effect: triggers recount for `rating_avg` and `rating_count` on story.

`DELETE /wp-json/novel/v1/me/ratings/{story_id}`
- Purpose: remove own rating.
- Auth: Bearer JWT.
- Response: `204 No Content`

`GET /wp-json/novel/v1/stories/{source}/{slug}/ratings`
- Purpose: list ratings for a story (public).
- Auth: none (public).
- Query params:
  - `limit` int (1..50, default 20)
  - `cursor` string
  - `sort` enum: `newest`, `highest`, `lowest` (default `newest`)
- Response: `{ items[], next_cursor, has_more, summary: { avg, count, distribution } }`
- Sort execution:
  - `newest`: `ORDER BY created_at DESC, id DESC`
  - `highest`: `ORDER BY score DESC, created_at DESC, id DESC`
  - `lowest`: `ORDER BY score ASC, created_at DESC, id DESC`

`GET /wp-json/novel/v1/stories/{id}/comments`
- Purpose: list story-level comments.
- Auth: optional Bearer JWT (shows own actions if logged in).
- Query params:
  - `limit` int (1..50, default 20)
  - `cursor` string
  - `sort` enum: `newest`, `oldest`, `top` (default `newest`)
- Response: `{ items[], next_cursor, has_more }`
- Sort execution (after filters `deleted_at IS NULL AND is_hidden=0`):
  - `newest`: `ORDER BY is_pinned DESC, created_at DESC, id DESC`
  - `oldest`: `ORDER BY is_pinned DESC, created_at ASC, id ASC`
  - `top`: `ORDER BY is_pinned DESC, likes_count DESC, created_at DESC, id DESC`

`GET /wp-json/novel/v1/chapters/{id}/comments`
- Purpose: list chapter-level comments.
- Auth: optional Bearer JWT.
- Query params: same as story comments.
- Response: same structure.

`POST /wp-json/novel/v1/me/comments`
- Purpose: post a new comment.
- Auth: Bearer JWT.
- Required body:
  - `story_id` bigint
  - `content` string (1..2000)
- Optional body:
  - `chapter_id` bigint (if chapter-level comment)
  - `parent_id` bigint (if reply, max nesting depth 2)
- Response: `{ id, user_id, story_id, chapter_id, parent_id, content, created_at }`

`DELETE /wp-json/novel/v1/me/comments/{id}`
- Purpose: delete own comment.
- Auth: Bearer JWT.
- Response: `204 No Content`

`POST /wp-json/novel/v1/me/reports`
- Purpose: report inappropriate content.
- Auth: Bearer JWT.
- Required body:
  - `entity_type` enum: `story`, `chapter`, `comment`
  - `entity_id` bigint
  - `reason` enum: `spam`, `inappropriate`, `copyright`, `other`
- Optional body:
  - `detail` string (max 500 chars)
- Response: `{ id, status, created_at }`

Chapter API enhancements (applied to existing endpoints):

`GET /wp-json/novel/v1/chapters/{id}` response additions:
- `prev_chapter`: `{ id, chapter_no, slug, title }` or null
- `next_chapter`: `{ id, chapter_no, slug, title }` or null
- Eliminates need for separate API calls to determine navigation.

`GET /wp-json/novel/v1/stories/{id}/chapters` response additions:
- When Bearer JWT is provided, each chapter item includes `is_read` boolean.
- `is_read` is resolved via LEFT JOIN on `wp_novel_reading_history(user_id, chapter_id)`.

`GET /wp-json/novel/v1/stories/{source}/{slug}` response additions:
- `view_count` field in response (from `stories.view_count` column).

## 8) Ingestion Rules (Idempotent)

Story upsert key:
- `source + source_story_id`

Chapter upsert key:
- `story_id + source_chapter_id` when available
- fallback `story_id + chapter_no`

Idempotency and dedupe:
- compute `payload_hash`
- drop duplicates within configurable time window
- use transactional upsert per story chunk
- store and return `request_id` for traceability between crawler server and plugin
- accept at-least-once delivery, reject logical duplicates by business key + idempotency key
- idempotency behavior:
  - same `Idempotency-Key` + same `payload_hash` => return previous success response (safe replay).
  - same `Idempotency-Key` + different `payload_hash` => return `409 idempotency_conflict`.
- idempotency retention window default: 72 hours per `(source, job_type, idempotency_key)`.

Conflict resolution:
- source update timestamp wins
- never delete hard on missing records by default
- mark soft deleted only when explicit delete event arrives

Crawler retry contract:
- crawler treats HTTP `2xx` as accepted by plugin (not necessarily already upserted).
- crawler retries on `408`, `429`, `500`, `502`, `503`, `504` with exponential backoff + jitter.
- crawler does not retry on `400`, `401`, `403`, `404`, `422`.
- crawler sends exhausted retries to its own DLQ on crawler server.

Upsert algorithm (stories):
1. validate request payload and enqueue.
2. worker resolves existing rows by `(source, source_story_id)`.
3. compare `updated_at_source`; ignore stale update.
4. upsert core story row.
5. replace aliases + genres in same transaction.
6. upsert `story_id` into `wp_novel_story_recount_queue` (coalesced recount trigger).

Upsert algorithm (chapters):
1. resolve `story_id` from `(source, source_story_id)` using batch lookup:
   - `SELECT id, source_story_id FROM wp_novel_stories WHERE source = ? AND source_story_id IN (?,...)`
   - map results into `{source_story_id => story_id}` hash for O(1) lookup per item.
   - if story not found for any item, reject that item individually.
2. resolve chapter identity by `(story_id, source_chapter_id)` else `(story_id, chapter_no)`.
3. compare `updated_at_source`; ignore stale update.
4. upsert chapter metadata.
5. update chapter content only when `content_hash` changed.
6. upsert `story_id` into `wp_novel_story_recount_queue` (coalesced recount trigger).

Recount coalescing rules:
- multiple touches on same story collapse to a single queue row (`touch_count` increments).
- recount worker runs in batches (default 500 stories/run) and recomputes:
  - `chapter_count`
  - `word_count`
  - `last_chapter_no`
- recount queue retries independently from ingest queue.

Transaction boundaries:
- stories: transaction per story item.
- chapters: transaction per chapter item.
- recount queue upsert: in same transaction as story/chapter upsert.
- recount execution: async batch operation, not in ingest transaction.

## 9) Worker and Queue Strategy

Recommended:
- store ingest requests quickly in `wp_novel_ingest_jobs`
- process using WP-CLI worker for reliability
- use WP-Cron only as fallback trigger, not as primary worker

Worker command:
- `wp novel ingest-worker --limit=500 --max-runtime=60 --memory-limit=512M`

Retry policy:
- exponential backoff
- max attempts configurable (default 5)
- dead-letter status after max attempts
- keep `last_error` and `attempts` visible in admin + API status endpoint

Recommended worker split:
- `ingest-worker stories` queue
- `ingest-worker chapters` queue
- `recount-worker stories` queue
- independent concurrency so large chapter traffic does not block story updates

Worker claim strategy:
- claim query selects `status=0 (queued) AND next_run_at <= NOW()` ordered by `next_run_at, id`.
- transition to `status=1 (processing)` with `locked_at`, `locked_by`, increment attempt counter atomically.
- heartbeat updates `locked_at` every N seconds while processing.
- stale lock reaper returns job to `status=0 (queued)` when heartbeat expired.
- MySQL 8 pattern:
  - transaction begin
  - `SET TRANSACTION ISOLATION LEVEL READ COMMITTED;` — avoids gap lock issues on status index scan
  - `SELECT id FROM ... WHERE status=0 ... ORDER BY next_run_at, id LIMIT N FOR UPDATE SKIP LOCKED`
  - `UPDATE ... SET status=1, locked_at=NOW(), locked_by=?, attempts=attempts+1 WHERE id IN (...)`
  - transaction commit
- stale lock timeout default: 120 seconds.

Transaction isolation policy:
- all worker claim and upsert transactions use `READ COMMITTED` isolation level.
- MySQL default `REPEATABLE READ` causes gap locks on index ranges during `FOR UPDATE` scans, degrading concurrent worker throughput.
- `READ COMMITTED` reduces lock scope to only the selected rows, enabling better parallelism.

Recount worker strategy:
- claim query selects recount rows `next_run_at <= NOW()` ordered by `priority DESC, next_run_at, story_id`.
- worker recalculates aggregates in batch SQL (grouped by `story_id`) and updates stories in bulk.
- on success, delete processed recount rows.
- on failure, keep row and push `next_run_at` with exponential backoff (recount queue local retry).

Backoff policy (default):
- attempt 1 retry after 30s
- attempt 2 retry after 120s
- attempt 3 retry after 600s
- attempt 4 retry after 1800s
- attempt 5 retry after 3600s then `dead_letter`

CLI operations:
- `wp novel ingest-worker stories --concurrency=4 --limit=1000 --max-runtime=300`
- `wp novel ingest-worker chapters --concurrency=8 --limit=2000 --max-runtime=300`
- `wp novel recount-worker stories --concurrency=2 --limit=500 --max-runtime=300`
- `wp novel replay-dead-letter --job-type=chapters --since=\"-24 hours\"`
- `wp novel recount-story --story-id=12345`

## 10) Performance and Scale Plan

Query strategy:
- only select required columns
- keyset pagination for stories and chapters
- strict indexed where/order patterns
- split chapter metadata and content tables

Read query/index map:
- `stories?sort=updated_desc` => `KEY(deleted_at, status, updated_at, id)`; source-filtered path uses `KEY(deleted_at, source, status, updated_at, id)`
- `stories?sort=popular_desc` => `KEY(deleted_at, status, popularity_score, id)`; source-filtered path uses `KEY(deleted_at, source, status, popularity_score, id)`
- `stories?sort=newest_desc` => `KEY(deleted_at, status, published_at, id)`; source-filtered path uses `KEY(deleted_at, source, status, published_at, id)`
- `stories?q=...` => `FULLTEXT(title, title_original, author_name)` mandatory for search-enabled deploy
- `stories/{id}/chapters` => `KEY(story_id, is_published, deleted_at, chapter_no, id)`
- `stories/{source}/{slug}/ratings?sort=newest` => `KEY(story_id, created_at, id)`
- `stories/{source}/{slug}/ratings?sort=highest|lowest` => `KEY(story_id, score, created_at, id)`
- `stories/{id}/comments?sort=newest|oldest` => `KEY(story_id, deleted_at, is_hidden, is_pinned, created_at, id)`
- `stories/{id}/comments?sort=top` => `KEY(story_id, deleted_at, is_hidden, is_pinned, likes_count, created_at, id)`
- `me/library?type=all` => two indexed queries + app-layer merge, no full UNION sort

Cache strategy:
- object cache (Redis recommended)
- cache keys:
  - `novel:story:{id}:v{story_version}`
  - `novel:story:{id}:chapters:{cursor}:v{story_version}`
  - `novel:list:{filter_hash}:{cursor}:v{list_version_bucket}`
- invalidation model:
  - chapter/story upsert increments `cache_version` on story row.
  - cache key includes `cache_version` for automatic invalidation without explicit purge.
  - list caches expire by short TTL (30-120s) using time-bucketed `list_version_bucket`.
  - avoid global cache purge on each upsert.

Popularity score computation:
- `popularity_score` is a computed aggregate, not directly ingested from crawler.
- v1 formula: `popularity_score = (chapter_count * 0.3) + (word_count / 10000 * 0.2) + (rating_avg * rating_count * 0.5)`
- future enhancement: incorporate view/read counters via Redis `INCR` + periodic flush to DB.
- view counter strategy (deferred to v1.1):
  - Redis: `INCR novel:views:{story_id}` per page view, `INCR novel:reads:{chapter_id}` per chapter read.
  - flush worker: every 5 minutes, drain Redis counters to `wp_novel_stories.view_count` / `wp_novel_chapters.read_count`.
  - avoid direct DB write on every page view to prevent write contention.
- recount worker recomputes `popularity_score` using latest aggregates.

Expected scale notes:
- 100k stories is manageable in MySQL with correct indexes.
- chapter content volume is the main storage risk.
- if total chapters exceed several million with large bodies, evaluate:
  - compression
  - archive strategy
  - object storage for cold chapter bodies

Performance guardrails:
- avoid wildcard prefix LIKE on unindexed columns.
- avoid `SELECT *` on chapter content routes.
- enforce maximum page size in API to protect DB.
- require query timeout defaults at DB and app layer.
- if FULLTEXT is unavailable, disable `q` filter and return `invalid_filter` instead of fallback table scan.
- for user library feeds, avoid cross-table `UNION ORDER BY` over full sets; always merge bounded indexed slices.
- for comments/ratings listing, enforce deterministic tie-break order by `id` to keep keyset pagination stable.

Capacity planning baseline:
- assume average 500 chapters/story for 100k stories => ~50M chapter metadata rows (long-term upper bound).
- if average chapter body is 12KB raw, body storage can exceed 500GB and needs cold-storage strategy.
- maintain separate growth dashboard per table (`stories`, `chapters`, `chapter_content`, `ingest_jobs`).

Index review cadence:
- weekly review during initial ingestion ramp.
- monthly review once query patterns stabilize.

## 11) Admin UX (v1)

Admin pages:
- Dashboard: story/chapter/job counts + ingest health
- Queue: pending, processing, failed jobs + retry action
- API Keys: create/disable keys
- Logs: filter by level/source/event
- Tools: reindex, recount, cache purge

Capabilities:
- custom capability `manage_novel_data`
- default map to administrator

Admin workflow requirements:
- queue page must support filters: `job_type`, `status`, `source`, `created_at range`.
- failed/dead-letter rows must provide one-click "requeue selected".
- API key page must show `last_used_at`, permission scope, and revoke action.
- dashboard must show current queue lag and 1-hour error trend.

UX principles:
- operational actions (requeue, purge cache, rebuild stats) require confirmation dialogs.
- destructive actions must be logged to `wp_novel_sync_logs`.
- error messages should expose machine code + human summary for operators.

## 12) Security Requirements

- write endpoints are private, read endpoints can be public
- prepared SQL only, no string-concat SQL
- strict JSON schema validation per endpoint
- rate limiting per key and IP
- rate limiter storage design:
  - primary: Redis sliding window counter (`novel:ratelimit:{key_id}:{window_bucket}` with TTL)
  - algorithm: sliding window log or fixed window counter (configurable)
  - default limits: 60 requests/minute and 50MB payload/minute per key
  - fallback: WP transient with fixed window counter when Redis unavailable
  - rate limit response includes `Retry-After` header with seconds until reset
- payload size limits and timeout controls
- optional IP allowlist for ingest endpoints
- never store API secret in plain text
- enforce HTTPS and reject plain HTTP at edge/proxy
- rotate ingest API keys periodically and support key revoke without downtime
- store nonce/idempotency replay cache with TTL to block replay attacks
- isolate crawler key permissions to ingest routes only (least privilege)

Additional controls:
- redact `content_raw` from error logs by default.
- enforce per-key quota (requests/min and payload bytes/min).
- lock key automatically after repeated auth failures threshold.
- require admin capability + nonce verification on all wp-admin actions.
- sanitize and validate all string fields before DB write.
- store nonce replay keys in Redis if available, fallback transient/object cache with strict TTL.

Audit requirements:
- log every key create/revoke event with operator user id.
- log every manual requeue/dead-letter replay action.
- retain security logs for at least 90 days in production.

## 13) Migration and Versioning

Version keys:
- plugin code version
- db schema version (stored in `wp_options`)

Migration approach:
- incremental migrations (`001`, `002`, ...)
- forward-only by default
- full backup before destructive migration

Migration rules:
- every migration is idempotent and checks existing schema before DDL.
- long-running DDL must be split to minimize lock duration.
- index creation on very large tables should be scheduled in low-traffic window.
- migration execution result is logged to `wp_novel_sync_logs`.

Rollback strategy:
- schema rollback is not guaranteed automatically.
- operational rollback path is restore from backup + redeploy previous plugin version.
- for risky releases, run canary on staging with production-like data snapshot first.

Uninstall behavior:
- configurable:
  - keep data on uninstall (default)
  - optional hard drop all `wp_novel_*` tables

## 14) Testing and Acceptance

Test layers:
- unit tests for repository/service logic
- integration tests for REST endpoints
- migration tests on clean and upgrade installs
- load test for ingest API and list API
- load test for user/social APIs (`/me/library`, ratings list, comments list, auth refresh)

Acceptance targets:
- ingest 100k stories without duplicate corruption
- story list p95 < 300ms under warm cache
- chapter read p95 < 250ms under warm cache
- `GET /me/library?type=reading|bookmarks` p95 < 250ms under warm cache
- `GET /me/library?type=all` p95 < 350ms under warm cache
- ratings/comments list p95 < 300ms on story with high interaction volume
- zero SQL injection findings in static scan

Required test cases (minimum):
- idempotency replay: same payload + same idempotency key should not duplicate rows.
- stale update rejection: older `updated_at_source` must not overwrite newer data.
- partial batch validation: invalid item rejected without dropping valid items in same request.
- worker crash recovery: jobs locked by crashed worker are reclaimed correctly.
- dead-letter replay: replayed job succeeds after transient dependency recovery.
- pagination correctness: no missing/duplicate rows across cursor pages.
- signature validation: tampered payload fails auth.
- high-volume ingest soak: sustained ingest for 60 minutes without queue runaway.
- library `type=all` uses merge strategy without full-table UNION sort in query plan.
- ratings `newest/highest/lowest` queries use intended indexes without filesort regression.
- comments `top/newest/oldest` queries keep stable keyset order and avoid full scan.
- refresh token rotation path remains O(logN) via `token_hash` unique lookup.

## 15) Deployment and Operations

Environment recommendations:
- MySQL 8+ / MariaDB with InnoDB
- Redis object cache
- PHP memory >= 512MB for worker process
- separate worker process via cron/systemd/supervisor

Two-server deployment model:
- Server A: crawler service (outside WordPress), owns crawl scheduler and source extraction.
- Server B: WordPress + plugin API, owns storage/read APIs and ingest worker.
- Communication: Server A -> Server B over HTTPS private path (VPN/mTLS/IP allowlist).
- Server A can buffer to local queue (Kafka/RabbitMQ/Redis stream optional) before calling plugin API.

Monitoring:
- queue lag
- failed jobs/min
- API 4xx/5xx rate
- slow query log and top query fingerprint
- DB size growth by table
- ingest latency from API accepted time to upsert completed time
- crawler retry rate and crawler-side DLQ size

Backup:
- daily logical backup
- binary log or point-in-time strategy for large installs

Disaster recovery targets:
- RPO <= 15 minutes (binlog/PITR enabled).
- RTO <= 4 hours for full service recovery.
- quarterly restore drill on staging using latest production backup snapshot.

Alert thresholds (initial):
- queue lag > 10 minutes for 15 minutes => warning.
- dead-letter rate > 1% over 15 minutes => critical.
- ingest API 5xx > 2% over 5 minutes => critical.
- DB disk usage > 80% => warning, >90% => critical.

Runbook essentials:
- if queue lag spikes: scale worker concurrency, inspect slow queries, inspect failed jobs.
- if auth failures spike: verify crawler key rotation, clock skew, and signature generation.
- if chapter read latency spikes: verify cache hit ratio, inspect top slow chapter queries.
- if dead-letter grows: group by error code and replay only transient-failure classes.

Release checklist:
- run migrations on staging snapshot.
- run integration + load smoke tests.
- validate key endpoints (`stories`, `chapters`, `ingest status`).
- monitor first hour after deploy with elevated alert sensitivity.

## 16) Implementation Roadmap

Phase 1 (Foundation):
- plugin skeleton
- migration runner
- initial custom tables
- basic admin settings
- deliverables:
  - install/activate/uninstall lifecycle
  - schema version tracking
  - initial API key management screen

Phase 2 (Ingest API + Queue):
- HMAC auth
- ingest endpoints
- queue table and worker
- idempotent story/chapter upsert
- queue payload inline/blob storage strategy
- coalesced story recount queue
- request status endpoint for crawler reconciliation
- API contract examples for external crawler server
- deliverables:
  - working crawler -> API -> queue -> DB pipeline
  - stable queue growth profile under sustained load
  - dead-letter and retry controls
  - structured ingest logs

Phase 3 (Public API):
- story list/detail endpoints
- chapter list/read endpoints
- cursor pagination
- deliverables:
  - documented query/filter contract
  - stable response schemas for frontend integration

Phase 4 (Performance):
- redis cache layer
- query tuning
- load tests and index tuning
- deliverables:
  - baseline performance report
  - index tuning changelog
  - cache hit-rate dashboard

Phase 5 (Observability + Hardening):
- logs dashboard
- retry/dead-letter controls
- rate limit and security hardening
- deliverables:
  - operational runbook
  - alerting dashboard
  - key rotation and security audit checklist

## 17) Locked Decisions (PM Approved)

1. Multi-source is required from day one; identity and routing must support duplicate slugs across sources.
2. Chapter payload planning baseline is fixed at p95 <= 24KB and p99 <= 96KB per chapter body.
3. Ingest network security mode is `VPN/mTLS + IP allowlist` for production.
4. Idempotency is mandatory (`Idempotency-Key` required) and enforced at DB unique constraint level.
5. Compliance/takedown workflow is out of scope for v1.
6. Frontend reads from custom API; optional SEO mirror to `wp_posts` is deferred.

Implementation defaults:
1. Keep chapter body in MySQL for hot data; plan cold archive after 180 days in phase 2+.
2. Initial peak ingest budget: 300 stories/minute and 10,000 chapters/minute.
3. Worker sizing baseline for peak:
   - chapter worker capacity target is 2,000 chapters/minute/worker.
   - minimum 5 chapter workers for 10,000 chapters/minute peak.
   - deploy 6 chapter workers (5 required + 1 headroom) in production baseline.
4. Capacity planning baseline: average 300 chapters/story, 3x growth reserve.
5. Start with single language (`vi`) and keep schema extensible for i18n.

## 18) External Crawler -> Plugin API Contract (Minimum)

Story payload (bulk):

```json
{
  "source": "truyen-source-a",
  "items": [
    {
      "source_story_id": "abc123",
      "slug": "than-dao",
      "title": "Than Dao",
      "author_name": "Tac Gia",
      "status": 1,
      "summary": "...",
      "genres": ["tien-hiep", "huyen-huyen"],
      "updated_at_source": "2026-02-21T08:00:00Z"
    }
  ]
}
```

Chapter payload (bulk):

```json
{
  "source": "truyen-source-a",
  "items": [
    {
      "source_story_id": "abc123",
      "source_chapter_id": "c-1001",
      "chapter_no": 1,
      "slug": "chuong-1",
      "title": "Chuong 1",
      "content_raw": "...",
      "updated_at_source": "2026-02-21T08:05:00Z"
    }
  ]
}
```

Standard response shape:

```json
{
  "request_id": "2f24b68a-b6d5-41d3-a4e8-33c8b679ab67",
  "accepted_count": 200,
  "rejected_count": 3,
  "errors": [
    { "index": 4, "code": "invalid_slug", "message": "slug is required" }
  ]
}
```

Status code policy:
- `200` accepted with partial errors
- `202` accepted asynchronously (queued)
- `400/422` validation error (do not retry same payload)
- `401/403` auth/permission error
- `409` idempotency conflict
- `429` rate limited (retry with backoff)
- `5xx` server error (retry with backoff)

Request status response example:

```json
{
  "request_id": "2f24b68a-b6d5-41d3-a4e8-33c8b679ab67",
  "source": "truyen-source-a",
  "job_type": "chapters_bulk",
  "status": "processing",
  "total_items": 300,
  "accepted_items": 298,
  "rejected_items": 2,
  "processed_items": 190,
  "failed_items": 0,
  "updated_at": "2026-02-21T08:10:00Z"
}
```

Signature pseudocode (crawler side):

```text
raw_body = JSON.stringify(payload)
body_sha256 = hex(sha256(raw_body))
method = "POST"
path = "/wp-json/novel/v1/ingest/chapters/bulk"
base = method + "." + path + "." + timestamp + "." + nonce + "." + body_sha256
signature = hex(hmac_sha256(base, api_secret))
headers = {
  "X-Novel-Key-Id": key_id,
  "X-Novel-Timestamp": timestamp,
  "X-Novel-Nonce": nonce,
  "X-Novel-Request-Id": uuid_v4(),
  "Idempotency-Key": uuid_v4(),
  "X-Novel-Signature": signature
}
```

## 19) Architecture Gap Checklist (PM Gate)

Status:
- incorporated into v1.4 spec; keep this list as go-live gate verification.

Must before build:
- enforce multi-source slug strategy: `UNIQUE(source, slug)` and source-aware story detail route.
- enforce idempotency at schema level with required `Idempotency-Key` and unique `(source, job_type, idempotency_key)`.
- bind request signature to method + path + body hash (not body-only signing).
- align chapter batch/size limits with payload ceilings (100-300 items, 256KB hard per chapter, 12MB request max).
- implement atomic worker claim (`FOR UPDATE SKIP LOCKED`) and stale-lock recovery timeout.
- add queue retention policy (completed 7 days, dead-letter 30 days) to prevent uncontrolled table growth.
- align read indexes with actual public filters (`source`, default status scope, soft-delete predicates).
- enforce indexed execution paths for ratings/comments sorts (`newest`, `highest`, `lowest`, `top`).
- move refresh token lifecycle to dedicated `wp_novel_refresh_tokens` table (no `wp_usermeta` lookup path in hot auth flow).

Can defer (post-v1 hardening):
- cold archive of chapter bodies older than 180 days to object storage.
- advanced popularity scoring model for `popular_desc`.
- SEO mirror sync to `wp_posts` for selected stories.
- automated index advisor and query plan regression checks.

Related specs:
- distributed crawler master-slave architecture: `docs/wp-crawler-master-slave-spec.md`

---

If approved, next deliverable should be:
- technical task breakdown by phase
- SQL migration files draft
- OpenAPI contract draft for all endpoints
