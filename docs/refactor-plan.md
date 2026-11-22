# Refactor Plan — BPS-MELATI Backend

Branch: `refactor/backend`
Baseline: `php artisan test` → **484 passed, 2693 assertions**.
Route snapshot: `docs/route-snapshot.json` → **170 routes**.

## Phase 0 — Safety Net (status)

- Baseline test suite recorded (green).
- Route snapshot saved.
- Characterization tests for critical flows are **planned** before code changes; not yet added in this read-only phase.

## Phase 1 — Audit (read-only)

### 1. Largest PHP files (app/ + routes/)

| # | File | Lines |
|---|------|-------|
| 1 | app/Http/Controllers/Dashboard/InputDataController.php | 545 |
| 2 | app/Http/Controllers/Api/TicketApiController.php | 498 |
| 3 | app/Http/Controllers/Dashboard/Recap/PeriodicRecapController.php | 410 |
| 4 | app/Http/Controllers/CheckTicketController.php | 372 |
| 5 | app/Services/AuditFlagDetector.php | 371 |
| 6 | app/Actions/AutoCloseTickets.php | 370 |
| 7 | app/Services/TicketAssignmentService.php | 365 |
| 8 | app/Support/ProfanityFilter.php | 355 |
| 9 | app/Models/Ticket.php | 327 |
| 10 | app/Actions/ReplyToTicket.php | 327 |
| 11 | app/Http/Controllers/Dashboard/OperatorController.php | 314 |
| 12 | app/Support/RekapReport.php | 302 |
| 13 | app/Services/OperatorPerformanceService.php | 299 |
| 14 | app/Notifications/LaporanNotification.php | 296 |
| 15 | app/Http/Controllers/Settings/AuditLogController.php | 248 |

### 2. Duplication map

- **Ticket assignment**: `TicketAssignmentService` (round robin/claim/reassign) plus direct `Ticket::query()->update(...)` in `AutoCloseTickets::closeOne` and controllers; cache invalidation duplicated in `forgetTicketCaches`, `invalidateTicketCaches`, observer.
- **Audit logging**: `AuditLogger` exists, but calls are scattered across controllers, services, observers, commands.
- **Badge/counter**: `InboxCounter`, `DashboardStats`, `LaporanCache`, `RekapCache`, plus direct `Cache::forget('dashboard:admin:version')` in many places.
- **Report filters**: `LaporanTicketQuery`, `LaporanFilter`, `LaporanFilterQuery`, `BuildsLaporanListPayload` used by incoming/my/completed reports.
- **Cache invalidation**: `LaporanCache::invalidate`, `RekapCache::invalidate`, `InboxCounter::invalidate`, `DashboardStats` version bump, plus manual `Cache::forget`.

### 3. Event map (broadcast)

Events: `AuditLogCreated`, `ChannelStatsUpdated`, `DashboardUpdated`, `InboxChanged`, `InboxUpdated`, `LaporanChanged`, `LoginAttemptBlocked`, `RatingSettingChanged`, `SessionTerminated`, `TicketClosedByReporter`, `TicketCreated`, `TicketReplyFromReporter`, `TicketResponseCreated`, `TicketResponseEmailStatusUpdated`, `TicketUpdated`, `UserLoggedIn`.

Overlapping groups (same domain, multiple names):
- Inbox: `InboxChanged` (ShouldBroadcastNow) vs `InboxUpdated` (ShouldBroadcastNow).
- Reports: `LaporanChanged` vs `DashboardUpdated` vs `ChannelStatsUpdated`.
- Ticket lifecycle: `TicketCreated`, `TicketUpdated`, `TicketClosedByReporter`, `TicketReplyFromReporter`, `TicketResponseCreated`.

Frontend listeners must keep `broadcastAs()` names unchanged unless approved.

### 4. N+1 / slow queries (to measure precisely)

- `InboxCounter::getCounts` single aggregate (already optimized).
- `IncomingReportsController` / `MyReportsController` use `LaporanCache` and eager loading; verify `with()` on ticket relations.
- `AuditFlagController::index` uses `with(['auditLog','ticket','reviewedBy'])`.
- `AutoCloseTickets` uses `chunkById` and per-ticket `responses()` queries (potential N+1).
- Recommendation: enable `Model::preventLazyLoading()` locally in a follow-up audit run and record query counts per endpoint.

### 5. Indonesian inventory (sample)

Files/config:
- `config/instansi.php`, `config/kinerja.php`, `config/recap.php`, `config/ticket.php` + `config/tickets.php` (duplicate), `config/session_policy.php`.
- Support: `LaporanCache`, `LaporanFilter`, `LaporanFilterQuery`, `LaporanTicketQuery`, `RekapCache`, `RekapReport`, `RekapYears`.
- Events: `LaporanChanged`, `LaporanNotification`.
- Controllers: `TicketPengawasanController`, `BuildsLaporanListPayload`.

Database values (must not change without approval):
- Ticket status: `baru`, `respon_awal`, `respon_substantif`, `selesai`.
- Audit flag status: `baru`, `ditinjau`, `wajar`, `tindak_lanjut`.
- Flag types: `jaringan_sama`, `rating_cepat`, `rating_beruntun_ip`, `selesai_cepat_setelah_balasan`, etc.
- Details keys: `tingkat`, `petugas_nama`, `catatan`, etc.

### 6. Rename map (proposed, requires approval for type B)

| Old | New | Type | Risk | Migration |
|-----|-----|------|------|-----------|
| Laporan | Report | A/B | Medium | Rename classes/files; keep route/JSON |
| Rekap | Recap | A/B | Medium | Rename classes/files; keep route/JSON |
| pengawasan | supervision/oversight | A (code), B (DB/JSON) | High | Separate phase, migration + frontend |
| kinerja | performance | A | Low | Config rename |
| instansi | agency | A | Low | Config rename |
| baru/ditinjau/wajar/tindak_lanjut | keep DB values, English case names | B | High | Backed enum only first |
| ticket.php + tickets.php | tickets.php | A | Low | Merge config |

### 7. Proposed merges

- Merge `config/ticket.php` into `config/tickets.php`.
- Namespace audit controllers under `App\Http\Controllers\Audit` (`AuditLogController`, `AuditFlagController`, `SummaryWeeklyController`).
- Distinguish manual ticket flag (`TicketFlagController`) from audit flag (`AuditFlagController`) by naming.
- Consolidate inbox/report events only if `broadcastAs()` names remain compatible.

## Stop point

Phase 1 audit complete. **Waiting for your approval before Phase 2.**

## Langkah 0b — Jaring pengaman (completed)

### Characterization tests
- Added `tests/Feature/Characterization/JsonContractsTest.php` (5 tests, 21 assertions) covering JSON contracts for audit-flag index, flags summary, summary weekly, notifications index/unread count.

### Baseline query counts (preventLazyLoading enabled, empty DB)
See `docs/query-baseline.txt`:
- dashboard.admin.incoming-reports.index: 6 queries / 64.44ms
- dashboard.admin.completed-reports.index: 4 queries / 5.18ms
- dashboard.admin.input-data.index: 12 queries / 6.01ms
- dashboard.admin.periodic-recap.index: 28 queries / 9.39ms
- audit-log.index: 10 queries / 5.69ms
- audit-flag.index: 6 queries / 4.37ms
- audit-log.flags-summary: 35 queries / 4.43ms
- audit-log.summary-weekly: 64 queries / 7.20ms
- dashboard.operator.incoming-reports.index: 18 queries / 4.12ms

### Full Indonesian inventory
- Generated machine-readable inventory: `docs/indonesian-inventory.txt` (562 matches across app/, routes/, config/, resources/js/).
- DB/contract values remain unchanged (status, flag types, detail keys).

## Phase 3 sub-steps (definitions)

- **3a** (done): Pusatkan cache keys di `app/Support/CacheKeys.php`.
- **3b** (done): Buat `app/Services/TicketCacheInvalidator.php`; invalidasi cache terpusat, setelah commit via `DB::afterCommit`.
- **3c**: Pintu tunggal audit log. Semua pencatatan audit lewat `AuditLogger`, dipanggil dari Action/Observer/listener, bukan tersebar di controller. Jangan ubah string `event_type`, `severity`, atau payload yang tersimpan.
- **3d**: Semua alur assignment lewat `TicketAssignmentService` (round robin, claim, mode terjadwal, dan bagian auto-close yang menyentuh assignment). Tidak boleh ada `Ticket::query()->update(...)` langsung di Action/controller untuk urusan assignment. Invalidasi cache tetap lewat `TicketCacheInvalidator` dan terjadi setelah commit.
- **3e**: Satukan filter laporan. Gabungkan `LaporanTicketQuery`, `LaporanFilter`, `LaporanFilterQuery`, dan `BuildsLaporanListPayload` menjadi satu implementasi yang dipakai laporan masuk, laporan saya, dan laporan selesai, dengan keluaran (JSON/props dan hasil query) identik. Rename ke bahasa Inggris hanya untuk class baru yang dibuat; rename massal menunggu Fase 5a.

- **3d** (done): Audit assignment flows; all assignment operations already route through `TicketAssignmentService` (round robin/claim/reassign/mode scheduling). No direct `Ticket::query()->update(...)` for assignment remains in Actions/controllers.

- **3e** (done): Completed reports now use unified LaporanFilter/LaporanFilterQuery and shared BuildsLaporanListPayload trait; resolveDateRange delegated to LaporanFilter.

## Phase 3 — final status (3f)

### Final definitions

- **3a** (done): Pusatkan cache keys di `app/Support/CacheKeys.php`.
- **3b** (done): Buat `app/Services/TicketCacheInvalidator.php`; invalidasi cache terpusat, setelah commit via `DB::afterCommit`.
- **3c** (done): Pintu tunggal audit log. Semua pencatatan audit lewat `AuditLogger`, dipanggil dari Action/Observer/listener, bukan controller. Tidak ada `AuditLogger` atau `AuditLog::create` di `app/Http/Controllers`. Kejadian: reporter completion, setting update, audit flag review, export. String `event_type`, `severity`, payload tetap.
- **3d** (done): Semua alur assignment lewat `TicketAssignmentService`. Tidak ada `Ticket::query()->update(...)` langsung di Action/controller untuk assignment.
- **3e** (done): Satu implementasi filter laporan (`LaporanTicketQuery`, `LaporanFilter`, `LaporanFilterQuery`, `BuildsLaporanListPayload`) dipakai incoming/my/completed; keluaran identik.

### Status

| Sub-step | Status |
|---|---|
| 3a | done |
| 3b | done |
| 3c | done |
| 3d | done |
| 3e | done |

### Keputusan yang disetujui

- Event broadcast tidak digabung; nama `broadcastAs()` tetap.
- Nilai database, nama route, JSON, dan Inertia props tetap.
- Fase 5b (rename massal) ditunda.

### N+1 / query report (bahan Fase 4, belum diperbaiki)

Top 6 endpoint boros dari `docs/query-baseline.txt`:

| # | Endpoint | Query (med) | Penyebab dominan |
|---|---|---|---|
| 1 | audit-log.summary-weekly | 64 (empty DB run) / 10 (200/400) | Agregat berulang di `SummaryWeeklyController::index`. |
| 2 | audit-log.flags-summary | 35 (empty) / 5 | Agregat berulang + per-status count. |
| 3 | periodic-recap.index | 28 (empty) / 9 | Rekap per periode dengan query berulang. |
| 4 | operator incoming-reports.index | 18 (empty) / 12 | Count per tab + cache list. |
| 5 | admin input-data.index | 12 (empty) / 6 | Query terpisah untuk stats/filter. |
| 6 | admin/operator incoming & my reports | 11-12 | Duplikasi count base query + tab aggregate. |

### 3d — daftar assignment

Diubah: `TicketAssignmentService`, `AutoCloseTickets` (delegasi), `TicketAssignmentController`.
Sudah benar: grep `Ticket::query()->update(...)` untuk assignment di luar service tidak ditemukan.

### 3c — bukti

Grep `AuditLogger`/`AuditLog::create` di `app/Http/Controllers`: tidak ditemukan.
Semua `Record*Audit` (4 class) memakai `AuditLogger::log`.
