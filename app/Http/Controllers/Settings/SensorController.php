<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\BulkStoreCensoredWordRequest;
use App\Http\Requests\Settings\StoreCensoredWordRequest;
use App\Http\Requests\Settings\UpdateCensoredWordRequest;
use App\Models\CensoredWord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class SensorController extends Controller
{
    private const CACHE_KEY = 'censored_words.active';

    public function index(): Response
    {
        $words = CensoredWord::orderByRaw('CHAR_LENGTH(word) DESC')
            ->orderBy('word')
            ->get(['id', 'word', 'match_type', 'is_active', 'created_at', 'updated_at'])
            ->map(fn (CensoredWord $word): array => [
                'id' => $word->id,
                'word' => $word->word,
                'match_type' => $word->match_type,
                'is_active' => (bool) $word->is_active,
                'created_at' => $word->created_at?->toIso8601String(),
                'updated_at' => $word->updated_at?->toIso8601String(),
            ])
            ->all();

        return Inertia::render('settings/sensors/index', [
            'words' => $words,
        ]);
    }

    public function store(StoreCensoredWordRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $censoredWord = CensoredWord::create([
            'word' => $validated['word'],
            'match_type' => $validated['match_type'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Kata {$censoredWord->word} berhasil ditambahkan!",
        ]);
    }

    public function bulkStore(BulkStoreCensoredWordRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $words = $request->wordsList();
        $matchType = $validated['match_type'];
        $isActive = $request->boolean('is_active', true);

        $added = 0;
        $skipped = 0;
        foreach ($words as $word) {
            $existing = CensoredWord::where('word', $word)->first();
            if ($existing) {
                $skipped++;

                continue;
            }

            CensoredWord::create([
                'word' => $word,
                'match_type' => $matchType,
                'is_active' => $isActive,
            ]);
            $added++;
        }

        $this->clearCache();

        if ($added > 0) {
            return redirect()->back()->with('flash', [
                'success' => "{$added} kata berhasil ditambahkan".($skipped > 0 ? ", {$skipped} kata duplikat dilewati" : '').'!',
            ]);
        }

        return redirect()->back()->with('flash', [
            'error' => 'Tidak ada kata baru yang ditambahkan. Semua kata sudah terdaftar.',
        ]);
    }

    public function update(UpdateCensoredWordRequest $request, CensoredWord $censoredWord): RedirectResponse
    {
        $validated = $request->validated();

        $censoredWord->update([
            'word' => $validated['word'],
            'match_type' => $validated['match_type'],
            'is_active' => $request->boolean('is_active', $censoredWord->is_active),
        ]);

        $this->clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Kata {$censoredWord->word} berhasil diperbarui!",
        ]);
    }

    public function destroy(CensoredWord $censoredWord): RedirectResponse
    {
        $name = $censoredWord->word;
        $censoredWord->delete();

        $this->clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Kata {$name} berhasil dihapus!",
        ]);
    }

    public function toggle(CensoredWord $censoredWord): RedirectResponse
    {
        $censoredWord->update([
            'is_active' => ! $censoredWord->is_active,
        ]);

        $this->clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Kata {$censoredWord->word} berhasil ".($censoredWord->is_active ? 'diaktifkan' : 'dinonaktifkan').'!',
        ]);
    }

    private function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
