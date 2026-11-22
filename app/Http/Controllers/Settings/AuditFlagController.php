<?php

namespace App\Http\Controllers\Settings;

use App\Actions\RecordAuditFlagReviewAudit;
use App\Http\Controllers\Controller;
use App\Models\AuditFlag;
use App\Services\TicketCacheInvalidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AuditFlagController extends Controller
{
    /**
     * Display a listing of audit flags with filtering.
     */
    public function index(Request $request)
    {
        $query = AuditFlag::with(['auditLog', 'ticket', 'reviewedBy']);

        // Filters
        $status = $request->query('status'); // default: show all, or filter 'baru'
        $type = $request->query('type');
        $severity = $request->query('severity');
        $ticketId = $request->query('ticket_id');

        if ($status) {
            $query->where('status', $status);
        }
        if ($type) {
            $query->where('type', $type);
        }
        if ($severity) {
            $query->where('severity', $severity);
        }
        if ($ticketId) {
            $query->where('ticket_id', $ticketId);
        }

        $flags = $query->latest('created_at')->paginate(20)
            ->through(fn (AuditFlag $flag): array => array_merge($flag->toArray(), [
                'ticket_number' => $flag->ticket?->ticket_number,
            ]));

        if (! $request->header('X-Inertia') && ($request->ajax() || $request->wantsJson())) {
            return response()->json([
                'flags' => $flags->items(),
                'total' => $flags->total(),
            ]);
        }

        return inertia('settings/audit-flags/index', [
            'flags' => $flags,
            'filters' => $request->only(['status', 'type', 'severity', 'ticket_id']),
            'types' => $this->getFlagTypes(),
            'severities' => ['info', 'notice', 'warning'],
        ]);
    }

    /**
     * Get flags by type.
     */
    public function byType(Request $request, string $type)
    {
        $query = AuditFlag::where('type', $type)->with(['auditLog', 'ticket', 'reviewedBy']);

        $severity = $request->query('severity');
        if ($severity) {
            $query->where('severity', $severity);
        }

        $flags = $query->latest('created_at')->paginate(20)
            ->through(fn (AuditFlag $flag): array => array_merge($flag->toArray(), [
                'ticket_number' => $flag->ticket?->ticket_number,
            ]));

        return response()->json([
            'flags' => $flags->items(),
            'total' => $flags->total(),
            'current_type' => $type,
        ]);
    }

    /**
     * Update flag status with required note.
     */
    public function updateStatus(Request $request, string $flagId)
    {
        $request->validate([
            'status' => ['required', Rule::in(['baru', 'ditinjau', 'wajar', 'tindak_lanjut'])],
            'note' => [
                'required', // Wajib diisi untuk status tindak_lanjut dan some others
                'string',
                'max:500',
            ],
        ]);

        $flag = AuditFlag::findOrFail($flagId);

        // For tindak_lanjut status, note is mandatory
        if ($request->status === 'tindak_lanjut' && empty($request->note)) {
            return back()->with('error', 'Catatan wajib diisi untuk status "Tindak Lanjut".');
        }

        DB::transaction(function () use ($flag, $request) {
            // Konsolidasi: semua penanda pada tiket yang sama ikut diperbarui.
            $query = AuditFlag::query();
            if ($flag->ticket_id !== null) {
                $query->where('ticket_id', $flag->ticket_id);
            } else {
                $query->whereKey($flag->id);
            }

            $query->update([
                'status' => $request->status,
                'review_note' => $request->note,
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
            ]);

            if ($request->status === 'wajar') {
                $query->update(['exclude_rating' => false]);
            }
        });

        // Invalidate cache badge audit flag agar angka terbaru.
        app(TicketCacheInvalidator::class)->invalidateAuditFlag();

        // Catat perubahan status ke audit log agar sidebar badge terbarui secara realtime.
        app(RecordAuditFlagReviewAudit::class)->handle($request->user(), $flag->ticket, $flagId, $request->status);

        return response()->json([
            'status' => 'success',
            'flag_id' => $flagId,
            'new_status' => $request->status,
        ]);
    }

    /**
     * Add note to flag review.
     */
    public function addNote(Request $request, string $flagId)
    {
        $request->validate([
            'note' => ['required', 'string', 'max:500'],
        ]);

        $flag = AuditFlag::findOrFail($flagId);

        $flag->review_note = $request->note;
        $flag->reviewed_by = $request->user()?->id;
        $flag->reviewed_at = now();
        $flag->save();

        return response()->json([
            'status' => 'success',
            'review_note' => $flag->review_note,
            'reviewed_at' => $flag->reviewed_at,
        ]);
    }

    /**
     * Get available flag types with descriptions.
     */
    protected function getFlagTypes(): array
    {
        return [
            AuditFlag::TYPE_JARINGAN_SAMA => 'Jaringan Sama (IP)',
            AuditFlag::TYPE_RATING_CEPAT => 'Rating Cepat',
            AuditFlag::TYPE_RATING_BERUNTUN_IP => 'Rating Beruntun IP',
            AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN => 'Selesai Cepat Setelah Balasan',
            AuditFlag::TYPE_PERANGKAT_SAMA => 'Perangkat Sama',
            AuditFlag::TYPE_PENYELESAIAN_TIDAK_WAJAR => 'Penyelesaian Tidak Wajar',
            AuditFlag::TYPE_LOGIN_GAGAL_BERULANG => 'Login Gagal Berulang',
            AuditFlag::TYPE_LOGIN_BARU => 'Login Baru',
            AuditFlag::TYPE_EKSPOR_SENSITIF => 'Ekspor Sensitif',
            AuditFlag::TYPE_PERUBAHAN_PENGATURAN_KRITIS => 'Perubahan Pengaturan Kritis',
        ];
    }
}
