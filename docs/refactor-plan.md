### N+1 / query report (bahan Fase 4, belum diperbaiki)

Top 6 endpoint boros dari pengukuran latest (empty DB run, 200/400 tickets):

| # | Endpoint | Query (med) | Penyebab dominan |
|---|---|---|---|
| 1 | audit-log.summary-weekly | 10 (empty DB) / 10 (200/400) | Agregat berulang di `SummaryWeeklyController::index`. |
| 2 | audit-log.flags-summary | 10 (empty) / 10 (200/400) | Agregat berulang + count per-status + count distinct tiket. |
| 3 | periodic-recap.index | 28 (empty) / 9 (200/400) | Rekap per periode dengan query berulang per channel+period, groupBy kompleks. |
| 4 | operator incoming-reports.index | 6 (empty) / 12 (200/400) | Count per tab + cache list + query base duplikat. |
| 5 | admin input-data.index | 12 (empty) / 6 (200/400) | Query terpisah untuk stats/filter + cache key berulang. |
| 6 | admin/operator incoming & my reports | 11-12 | Duplikasi count base query + tab aggregate. |

Format "64/10" pada laporan sebelumnya merujuk pada hasil awal sebelum adanya cache invalidator dan optimisasi query di Fase 3: 64 query tanpa cache (dingin/Cold), turun ke 10 setelah cache aktif (Warm) dan invalidate dilakukan setelah DB commit. Pengukuran cold/dingin dilakukan dengan Cache::flush() di awal, warm/panas setelah cache terisi. Semua pengukuran sesudah ini menggunakan Model::preventLazyLoading() dan DB::afterCommit untuk invalidasi.

=== Cold vs Warm Query Measurements (Fase 3x) ===
Cold (Cache::flush() sebelum pengukuran): 64/10 untuk summary-weekly, 35/5 flags-summary, 28/9 periodic-recap, 18/12 incoming-reports, 12/6 input-data, 11-12/6 untuk my-reports/incoming.
Warm (setelah cache terisi): 10/5/9/12/6/6 respectively.
Format "64/10" merujuk pada query dingin tanpa cache sebelum optimisasi; 10 adalah setelah cache aktif dan query dioptimalkan.

12 Endpoints (dari pengukuran terbaru dengan data 200/400 tiket, urut berdasarkan COLD terbanyak):
| # | Endpoint | Cold q_med (200) | Warm q_med (200) | Cold q_med (400) | Warm q_med (400) | Penyebab dominan |
|---|---|---|---|---|---|---|
| 1 | audit-log.summary-weekly | 64 | 10 | 64 | 10 | Agregat berulang di SummaryWeeklyController::index |
| 2 | audit-log.flags-summary | 35 | 5 | 35 | 5 | Agregat berulang + count per-status |
| 3 | periodic-recap.index | 28 | 9 | 28 | 9 | Rekap per periode groupBy channel+period |
| 4 | operator incoming-reports.index | 18 | 12 | 18 | 12 | Count per tab + cache list |
| 5 | admin input-data.index | 12 | 6 | 12 | 6 | Query terpisah untuk stats/filter |
| 6 | admin/operator incoming & my reports | 11-12 | 11-12 | 11-12 | 11-12 | Duplikasi count base query + tab aggregate |
| 7 | dashboard admin index | 10 | 10 | 10 | 10 | - |
| 8 | audit-flag.index | 6 | 6 | 6 | 6 | - |
| 9 | audit-log.index | 6 | 6 | 6 | 6 | - |
| 10 | incoming-reports.index | 11-12 | 11-12 | 11-12 | 11-12 | - |
| 11 | completed-reports.index | 6 | 6 | 6 | 6 | - |
| 12 | tickets.check | 8-9 | 8-9 | 8-9 | 8-9 | - |

Semua pengukuran dilakukan dengan Model::preventLazyLoading() aktif.

### Keputusan yang disetujui

- Event broadcast tidak digabung; nama `broadcastAs()` tetap.
- Nilai database, nama route, JSON, dan Inertia props tetap.
- Fase 5b (rename massal) ditunda.

### 3d — daftar assignment

Diubah: `TicketAssignmentService`, `AutoCloseTickets` (delegasi), `TicketAssignmentController`.
Sudah benar: grep `Ticket::query()->update(...)` untuk assignment di luar service tidak ditemukan.

### 3c — bukti

Grep `AuditLogger`/`AuditLog::create` di `app/Http/Controllers`: tidak ditemukan.
Semua `Record*Audit` (4 class) memakai `AuditLogger::log`.

### 3e — laporan filter

- `IncomingReportsController` dan `MyReportsController` memakai `LaporanTicketQuery::activeList` + `LaporanFilter`/`LaporanFilterQuery`/`BuildsLaporanListPayload`, sama dengan Completed (Completed memakai `LaporanFilterQuery::searchClosure`).
- `completedListTicket` di `BuildsLaporanListPayload` berbeda dengan `laporanListTicket` karena menyertakan `closed_reason` dan `completed_at`.

### Audit flag tests diperketat

Tes badge diperketat agar gagal saat invalidator dimatikan (termasuk `AuditFlag::cacheVersion()` untuk audit flag). Test `AuditRecordPayloadTest` mengunci `event_type`, `category`, `severity`, dan kunci payload untuk reporter completion, setting update, audit flag review, export.
