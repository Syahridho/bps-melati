<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditFlag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    /**
     * Display the admin review dashboard.
     * Shows all new flags that need review, with filters.
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'baru'); // default: baru/unreviewed

        $query = AuditFlag::where('status', $status)
            ->with(['auditLog', 'ticket', 'reviewedBy'])
            ->latest('created_at');

        $flags = $query->paginate(20);

        return inertia('settings/review/index', [
            'flags' => $flags,
            'current_status' => $status,
            'statuses' => ['baru', 'ditinjau', 'wajar', 'tindak_lanjut'],
        ]);
    }

    /**
     * Update flag status with required note.
     * Validasi: status 'tindak_lanjut' wajib memiliki catatan.
     */
    public function updateStatus(Request $request, string $flagId)
    {
        $request->validate([
            'status' => ['required', 'string'],
            'note' => [
                'required',
                'string',
                'max:500',
                // Note is waived for status other than tindak_lanjut
                function ($attribute, $value, $fail) {
                    if ($request->status !== 'tindak_lanjut') {
                        // Allow empty for other statuses
                        return;
                    }
                    if (trim($value) === '') {
                        $fail('Catatan wajib diisi untuk status "Tindak Lanjut".');
                    }
                },
            ],
        ]);

        $flag = AuditFlag::findOrFail($flagId);

        DB::transaction(function () use ($flag, $request) {
            $flag->status = $request->status;
            $flag->review_note = $request->note;
            $flag->reviewed_by = $request->user()?->id;
            $flag->reviewed_at = now();
            $flag->save();

            // When status changed to wajar, exclude_rating should be false
            if ($request->status === 'wajar') {
                $flag->exclude_rating = false;
                $flag->save();
            }
        });

        return response()->json([
            'status' => 'success',
            'flag_id' => $flagId,
            'new_status' => $request->status,
            'note' => $flag->review_note,
        ]);
    }
}