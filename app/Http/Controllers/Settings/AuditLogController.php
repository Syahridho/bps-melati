<?php

namespace App\Http\Controllers\Settings;

use App\Actions\RecordAuditLogExportAudit;
use App\Http\Controllers\Controller;
use App\Models\AuditFlag;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    /**
     * Display a paginated listing of audit logs with filtering.
     */
    public function index(Request $request)
    {
        $query = AuditLog::query();

        // Filters
        $eventType = $request->query('event_type');
        $category = $request->query('category');
        $severity = $request->query('severity');
        $actor = $request->query('actor');
        $ticketId = $request->query('ticket_id');
        $ip = $request->query('ip');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if ($eventType) {
            $query->where('event_type', $eventType);
        }
        if ($category) {
            $query->where('category', $category);
        }
        if ($severity) {
            $query->where('severity', $severity);
        }
        if ($actor) {
            $query->where('actor_id', $actor);
        }
        if ($ticketId) {
            $query->where('ticket_id', $ticketId);
        }
        if ($ip) {
            $query->where('ip', 'like', "%{$ip}%");
        }
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }

        // Paginate - 50 items per page
        $perPage = $request->query('per_page', 50);
        $logs = $query->with('ticket:id,ticket_number')
            ->latest('created_at')
            ->paginate($perPage)
            ->through(fn (AuditLog $log): array => [
                'id' => $log->id,
                'event_type' => $log->event_type,
                'category' => $log->category,
                'severity' => $log->severity,
                'actor_id' => $log->actor_id,
                'actor_name' => $log->actor_name,
                'actor_role' => $log->actor_role,
                'ticket_id' => $log->ticket_id,
                'ticket_number' => $log->ticket?->ticket_number,
                'ip' => $log->ip,
                'user_agent' => $log->user_agent,
                'meta' => $log->meta,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        if (! $request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json([
                'logs' => $logs->items(),
                'total' => $logs->total(),
            ]);
        }

        return inertia('dashboard/admin/audit-log/index', [
            'logs' => $logs,
            'filters' => $request->only(['event_type', 'category', 'severity', 'actor', 'ticket_id', 'ip', 'start_date', 'end_date', 'per_page']),
            'total' => AuditLog::count(),
        ]);
    }

    /**
     * Export audit logs to CSV.
     */
    public function exportCsv(Request $request)
    {
        $this->authorize('viewAny', AuditLog::class);

        $query = AuditLog::query();

        // Apply same filters as index
        $eventType = $request->query('event_type');
        $category = $request->query('category');
        $severity = $request->query('severity');
        $actor = $request->query('actor');
        $ticketId = $request->query('ticket_id');
        $ip = $request->query('ip');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if ($eventType) {
            $query->where('event_type', $eventType);
        }
        if ($category) {
            $query->where('category', $category);
        }
        if ($severity) {
            $query->where('severity', $severity);
        }
        if ($actor) {
            $query->where('actor_id', $actor);
        }
        if ($ticketId) {
            $query->where('ticket_id', $ticketId);
        }
        if ($ip) {
            $query->where('ip', 'like', "%{$ip}%");
        }
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }

        // Log the export action
        $exportCount = $query->count();

        app(RecordAuditLogExportAudit::class)->handle($request->user(), $request, $exportCount, [
            'event_type' => $eventType,
            'category' => $category,
            'severity' => $severity,
            'actor' => $actor,
            'ticket_id' => $ticketId,
            'ip' => $ip,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);

        $logs = $query->latest('created_at')->get(['id', 'event_type', 'category', 'severity', 'actor_name', 'actor_role', 'ticket_id', 'ip', 'user_agent', 'meta', 'created_at']);

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');

            // Header row
            fputcsv($handle, [
                'ID',
                'Event Type',
                'Category',
                'Severity',
                'Actor ID',
                'Actor Name',
                'Actor Role',
                'Ticket ID',
                'IP',
                'User Agent',
                'Meta',
                'Created At',
            ]);

            // Data rows
            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->id,
                    $log->event_type,
                    $log->category,
                    $log->severity,
                    $log->actor_id ?? 'N/A',
                    $log->actor_name ?? 'N/A',
                    $log->actor_role ?? 'N/A',
                    $log->ticket_id ?? 'N/A',
                    $log->ip ?? 'N/A',
                    substr($log->user_agent ?? 'N/A', 0, 200),
                    json_encode($log->meta ?? []),
                    $log->created_at->toIso8601String(),
                ]);
            }

            fclose($handle);
        }, 'audit-logs-'.now()->format('Ymd_His').'.csv')
            ->header('Content-Type', 'text/csv; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="audit-logs-'.now()->format('Ymd_His').'.csv"');
    }

    /**
     * Get flag statistics/summary.
     */
    public function flagsSummary(Request $request)
    {
        $status = $request->query('status', 'baru'); // default: baru/unreviewed

        $cacheKey = 'auditflags:summary:'.$status.':'.AuditFlag::cacheVersion();

        $compute = function () {
            $total = AuditFlag::selectRaw('COUNT(DISTINCT COALESCE(ticket_id, id)) as c')->value('c');
            $newCount = AuditFlag::where('status', 'baru')
                ->selectRaw('COUNT(DISTINCT COALESCE(ticket_id, id)) as c')->value('c');
            $reviewedCount = AuditFlag::where('status', 'ditinjau')
                ->selectRaw('COUNT(DISTINCT COALESCE(ticket_id, id)) as c')->value('c');

            $byType = AuditFlag::select('type', DB::raw('count(*) as total'))
                ->groupBy('type')
                ->get()
                ->keyBy('type');

            $bySeverity = AuditFlag::select('severity', DB::raw('count(*) as total'))
                ->groupBy('severity')
                ->get()
                ->keyBy('severity');

            return [
                'total' => $total,
                'new_count' => $newCount,
                'reviewed_count' => $reviewedCount,
                'by_type' => $byType ?: [],
                'by_severity' => $bySeverity ?: [],
            ];
        };

        try {
            $data = Cache::remember($cacheKey, 30, $compute);
        } catch (\Throwable $e) {
            $data = $compute();
        }

        return response()->json($data);
    }
}
