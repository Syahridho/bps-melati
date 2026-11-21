<?php

namespace App\Http\Controllers\Settings;

use App\Enums\AssignmentMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAssignmentModeRequest;
use App\Models\User;
use App\Services\AssignmentModeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

class AssignmentModeController extends Controller
{
    public function update(UpdateAssignmentModeRequest $request, AssignmentModeService $modeService): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        $mode = AssignmentMode::from($request->validated('mode'));

        if ($request->validated('apply') === 'scheduled') {
            $scheduledAt = Carbon::parse($request->validated('scheduled_at'));

            $modeService->schedule($mode, $actor, $scheduledAt);

            return back()->with('flash', [
                'success' => 'Mode '.$mode->label().' dijadwalkan aktif pada '.$scheduledAt->locale('id')->translatedFormat('d F Y H:i').'.',
            ]);
        }

        $modeService->applyNow($mode, $actor);

        return back()->with('flash', [
            'success' => 'Mode penanganan laporan diubah menjadi '.$mode->label().'. Hanya berlaku untuk laporan baru.',
        ]);
    }
}
