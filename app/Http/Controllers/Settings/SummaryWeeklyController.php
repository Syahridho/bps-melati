<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\AuditFlag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SummaryWeeklyController extends Controller
{
    /**
     * Display the weekly summary page.
     * Shows statistics about audit flags, logs, and summaries.
     */
    public function index()
    {
        $now = now();
        $startOfWeek = $now->startOfWeek();
        $endOfWeek = $now->endOfWeek();

        // This week's stats
        $logsThisWeek = AuditLog::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
        $flagsThisWeek = AuditFlag::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();

        // New flags this week
        $newFlagsThisWeek = AuditFlag::where('status', 'baru')
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        // By severity
        $bySeverity = AuditFlag::where('status', 'baru')
            ->select('severity', DB::raw('count(*) as total'))
            ->groupBy('severity')
            ->get()
            ->keyBy('severity');

        // Top tickets with flags
        $ticketsWithFlags = AuditFlag::where('status', 'baru')
            ->select('ticket_id', DB::raw('count(*) as flag_count'))
            ->groupBy('ticket_id')
            ->latest('created_at')
            ->take(10)
            ->get();

        $reviewedCount = AuditFlag::where('status', 'ditinjau')->count();

        // Admin with most flags
        $adminsWithMostFlags = AuditFlag::where('status', 'baru')
            ->whereNotNull('reviewed_by')
            ->select('reviewed_by', DB::raw('count(*) as reviewed_count'))
            ->groupBy('reviewed_by')
            ->latest('reviewed_at')
            ->take(5)
            ->get();

        // Summary by type
        $byType = AuditFlag::where('status', 'baru')
            ->select('type', DB::raw('count(*) as total'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        if (! request()->header('X-Inertia') && (request()->ajax() || request()->wantsJson())) {
            return response()->json([
                'logs_this_week' => $logsThisWeek,
                'new_flags_this_week' => $newFlagsThisWeek,
                'reviewed_count' => $reviewedCount,
            ]);
        }

        return inertia('settings/summary-weekly/index', [
            'logs_this_week' => $logsThisWeek,
            'flags_this_week' => $flagsThisWeek,
            'new_flags_this_week' => $newFlagsThisWeek,
            'by_severity' => $bySeverity ?: [],
            'by_type' => $byType ?: [],
            'tickets_with_flags' => $ticketsWithFlags->toArray(),
            'admins_with_flags' => $adminsWithMostFlags->toArray(),
        ]);
    }

    /**
     * Generate and send weekly summary to admin.
     * This is called by the scheduler.
     */
    public function generate()
    {
        try {
            $now = now();
            $startOfWeek = $now->startOfWeek();
            $endOfWeek = $now->endOfWeek();

            // Get stats for the week
            $logsThisWeek = AuditLog::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
            $flagsThisWeek = AuditFlag::whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
            $newFlagsThisWeek = AuditFlag::where('status', 'baru')
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            // By severity
            $bySeverity = AuditFlag::where('status', 'baru')
                ->select('severity', DB::raw('count(*) as total'))
                ->groupBy('severity')
                ->get()
                ->pluck('total', 'severity');

            // By type
            $byType = AuditFlag::where('status', 'baru')
                ->select('type', DB::raw('count(*) as total'))
                ->groupBy('type')
                ->get()
                ->pluck('total', 'type');

            // Top flags needing review
            $needsReview = AuditFlag::where('status', 'baru')
                ->with(['auditLog', 'ticket'])
                ->latest('created_at')
                ->take(10)
                ->get();

            // Cache the summary
            Cache::put('weekly_audit_summary_' . $now->format('Y-W'), [
                'logs' => $logsThisWeek,
                'flags' => $flagsThisWeek,
                'new_flags' => $newFlagsThisWeek,
                'by_severity' => $bySeverity->toArray(),
                'by_type' => $byType->toArray(),
                'generated_at' => $now->toIso8601String(),
            ]);

            // Invalidate any stale cache
            Cache::forget('weekly_audit_summary_stale');

            // Return success - in production would send notification to admins
            return [
                'success' => true,
                'message' => 'Ringkasan mingguan berhasil dibuat',
                'summary' => [
                    'logs' => $logsThisWeek,
                    'flags' => $flagsThisWeek,
                    'new_flags' => $newFlagsThisWeek,
                ],
            ];
        } catch (\Exception $e) {
            \Log::error('Weekly audit summary generation error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error generating weekly summary'];
        }
    }
}