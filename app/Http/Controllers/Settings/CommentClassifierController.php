<?php

namespace App\Http\Controllers\Settings;

use App\Actions\RecordSettingUpdateAudit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCommentClassifierRequest;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\Social\CommentClassifier;
use App\Services\Social\RuleRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class CommentClassifierController extends Controller
{
    public function __construct(private RuleRepository $repository)
    {
    }

    public function index(): Response
    {
        $rules = $this->repository->rules();

        return Inertia::render('settings/comment-classifier/index', [
            'rules' => $rules,
        ]);
    }

    public function update(UpdateCommentClassifierRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Bangun aturan dari input (nested atau top-level).
        $keywords = $validated['keywords'] ?? [];
        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $key) {
            if (isset($validated[$key]) && is_array($validated[$key]) && ! isset($keywords[$key])) {
                $keywords[$key] = $validated[$key];
            }
        }

        $keywordsClean = [];
        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $key) {
            if (isset($keywords[$key])) {
                $keywordsClean[$key] = array_values(array_filter((array) $keywords[$key], fn ($v) => trim((string) $v) !== ''));
            }
        }

        $rules = [
            'min_length' => (int) $validated['min_length'],
            'min_words' => (int) $validated['min_words'],
            'fallback_when_uncertain' => (bool) ($validated['fallback_when_uncertain'] ?? false),
            'keywords' => $keywordsClean,
            'ignore' => array_values(array_filter((array) ($validated['ignore'] ?? []), fn ($v) => trim((string) $v) !== '')),
            'abbreviations' => $validated['abbreviations'] ?? [],
            'priority' => array_values(array_unique(array_filter((array) ($validated['priority'] ?? ['pengaduan', 'aspirasi', 'permintaan_informasi']), fn ($v) => trim((string) $v) !== ''))),
        ];

        // Ringkasan perubahan kata ditambah/dihapus.
        $oldRules = $this->repository->rules();
        $summary = $this->diffSummary($oldRules, $rules);

        $newRules = $this->repository->save($rules);

        app(RecordSettingUpdateAudit::class)->handle($request->user(), $request, ['comment_classifier']);

        AuditLogger::log(
            eventType: 'setting.comment_classifier_updated',
            category: 'setting',
            actor: $request->user(),
            meta: [
                'version' => $newRules['version'],
                'added' => $summary['added'],
                'removed' => $summary['removed'],
            ],
            severity: 'notice',
        );

        return redirect()->back()->with('flash', [
            'success' => 'Aturan klasifikasi komentar berhasil disimpan!',
        ]);
    }

    public function reset(Request $request): RedirectResponse
    {
        $this->repository->resetToDefault();

        app(RecordSettingUpdateAudit::class)->handle($request->user(), $request, ['comment_classifier']);

        AuditLogger::log(
            eventType: 'setting.comment_classifier_updated',
            category: 'setting',
            actor: $request->user(),
            meta: ['action' => 'reset_to_default', 'version' => $this->repository->version()],
            severity: 'notice',
        );

        return redirect()->back()->with('flash', [
            'success' => 'Aturan klasifikasi dikembalikan ke default.',
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:2000'],
        ], [
            'text.required' => 'Teks komentar wajib diisi.',
            'text.max' => 'Teks komentar maksimal 2000 karakter.',
        ]);

        $rules = $this->repository->rules();
        $result = app(CommentClassifier::class)->classify((string) $validated['text'], $rules);

        return response()->json([
            'jenis' => $result['jenis'],
            'alasan' => $result['alasan'],
            'teks_normal' => $result['teks_normal'],
        ]);
    }

    /**
     * @return array{added: array<string, array<int, string>>, removed: array<string, array<int, string>>}
     */
    protected function diffSummary(array $old, array $new): array
    {
        $added = [];
        $removed = [];

        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $cat) {
            $oldList = (array) ($old['keywords'][$cat] ?? []);
            $newList = (array) ($new['keywords'][$cat] ?? $new[$cat] ?? []);
            $added[$cat] = array_values(array_diff($newList, $oldList));
            $removed[$cat] = array_values(array_diff($oldList, $newList));
        }

        $oldIgnore = (array) ($old['ignore'] ?? []);
        $newIgnore = (array) ($new['ignore'] ?? []);
        $added['ignore'] = array_values(array_diff($newIgnore, $oldIgnore));
        $removed['ignore'] = array_values(array_diff($oldIgnore, $newIgnore));

        return ['added' => $added, 'removed' => $removed];
    }
}
