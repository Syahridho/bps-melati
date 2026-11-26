<?php

namespace App\Services\Social;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class RuleRepository
{
    public const CACHE_KEY = 'comment_classifier:rules';
    public const SETTING_KEY = 'comment_classifier';

    /**
     * Muat aturan (dari cache Redis, fallback DB, fallback config default).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            return $this->loadFromStorage();
        });
    }

    public function get(): array
    {
        return $this->rules();
    }

    public function all(): array
    {
        return $this->rules();
    }

    public function current(): array
    {
        return $this->rules();
    }

    public function load(): array
    {
        return $this->rules();
    }

    public function getRules(): array
    {
        return $this->rules();
    }

    public function version(): int
    {
        return (int) ($this->rules()['version'] ?? 1);
    }

    /**
     * Simpan aturan baru: normalisasi, naikkan version, tulis setting, reset cache.
     *
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    public function save(array $rules): array
    {
        $current = $this->rules();
        $normalized = $this->normalize($rules);
        $normalized['version'] = ((int) ($current['version'] ?? 1)) + 1;

        Setting::set(self::SETTING_KEY, json_encode($normalized, JSON_UNESCAPED_UNICODE));
        $this->resetCache();

        return $normalized;
    }

    /**
     * Kembalikan ke default: hapus setting, reset cache.
     *
     * @return array<string, mixed>
     */
    public function resetToDefault(): array
    {
        $previousVersion = $this->version();

        Setting::set(self::SETTING_KEY, null);
        $this->resetCache();

        $rules = $this->rules();
        // Naikkan version agar komentar yang pernah dilewati dinilai ulang.
        $rules['version'] = max((int) ($rules['version'] ?? 1), $previousVersion + 1);

        Setting::set(self::SETTING_KEY, json_encode($rules, JSON_UNESCAPED_UNICODE));
        $this->resetCache();

        return $rules;
    }

    public function resetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function forget(): void
    {
        $this->resetCache();
    }

    public function clearCache(): void
    {
        $this->resetCache();
    }

    /**
     * @return array<string, mixed>
     */
    protected function loadFromStorage(): array
    {
        $raw = Setting::get(self::SETTING_KEY);

        if (blank($raw)) {
            return $this->defaultRules();
        }

        $decoded = json_decode((string) $raw, true);

        if (! is_array($decoded)) {
            return $this->defaultRules();
        }

        return $this->normalize(array_merge($this->defaultRules(), $decoded));
    }

    /**
     * @return array<string, mixed>
     */
    protected function defaultRules(): array
    {
        return (array) config('comment_classifier', []);
    }

    /**
     * Normalisasi struktur aturan agar konsisten.
     *
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    public function normalize(array $rules): array
    {
        $defaults = $this->defaultRules();

        $minLength = isset($rules['min_length']) ? (int) $rules['min_length'] : (int) ($defaults['min_length'] ?? 8);
        $minWords = isset($rules['min_words']) ? (int) $rules['min_words'] : (int) ($defaults['min_words'] ?? 3);
        $fallback = array_key_exists('fallback_when_uncertain', $rules)
            ? (bool) $rules['fallback_when_uncertain']
            : (bool) ($defaults['fallback_when_uncertain'] ?? false);

        // Ambil keywords dari nested atau top-level, mendukung berbagai format.
        $keywordsInput = [];
        if (isset($rules['keywords']) && is_array($rules['keywords'])) {
            $kw = $rules['keywords'];
            // Format: keywords => ['kuat' => [cat=>[]], 'lemah' => [cat=>[]]]
            if (array_key_exists('kuat', $kw) || array_key_exists('lemah', $kw)) {
                foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $cat) {
                    $spec = [];
                    if (isset($kw['kuat'][$cat]) && is_array($kw['kuat'][$cat])) {
                        $spec['kuat'] = $kw['kuat'][$cat];
                    }
                    if (isset($kw['lemah'][$cat]) && is_array($kw['lemah'][$cat])) {
                        $spec['lemah'] = $kw['lemah'][$cat];
                    }
                    if ($spec !== []) {
                        $keywordsInput[$cat] = $spec;
                    }
                }
            } else {
                $keywordsInput = $kw;
            }
        }
        // Top-level kategori langsung: rules['pengaduan'] = [...]
        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $key) {
            if (isset($rules[$key]) && is_array($rules[$key]) && ! isset($keywordsInput[$key])) {
                $keywordsInput[$key] = $rules[$key];
            }
        }
        // Top-level kuat/lemah grouping: rules['kuat'] = [cat=>[]] atau rules['keywords_kuat']
        foreach (['kuat' => 'kuat', 'strong' => 'kuat', 'strong_keywords' => 'kuat', 'keywords_kuat' => 'kuat',
                 'lemah' => 'lemah', 'weak' => 'lemah', 'weak_keywords' => 'lemah', 'keywords_lemah' => 'lemah'] as $srcKey => $bucket) {
            if (isset($rules[$srcKey]) && is_array($rules[$srcKey])) {
                foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $cat) {
                    if (isset($rules[$srcKey][$cat]) && is_array($rules[$srcKey][$cat])) {
                        if (! isset($keywordsInput[$cat]) || ! is_array($keywordsInput[$cat])) {
                            $keywordsInput[$cat] = [];
                        }
                        if (! isset($keywordsInput[$cat][$bucket])) {
                            $keywordsInput[$cat][$bucket] = [];
                        }
                        $keywordsInput[$cat][$bucket] = array_merge($keywordsInput[$cat][$bucket], $rules[$srcKey][$cat]);
                    }
                }
            }
        }

        $keywords = [];
        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $key) {
            if (array_key_exists($key, $keywordsInput)) {
                $spec = $keywordsInput[$key];
                $defaultSpec = [];
            } else {
                $spec = $defaults['keywords'][$key] ?? [];
                $defaultSpec = is_array($defaults['keywords'][$key] ?? null) ? $defaults['keywords'][$key] : [];
            }
            // Flatten nested kuat/lemah jika ada.
            $items = [];
            if (is_array($spec)) {
                if (array_key_exists('kuat', $spec) || array_key_exists('lemah', $spec)) {
                    foreach (['kuat', 'lemah'] as $b) {
                        if (isset($spec[$b]) && is_array($spec[$b])) {
                            $items = array_merge($items, $spec[$b]);
                        }
                    }
                } elseif (array_is_list($spec)) {
                    $items = $spec;
                }
            }
            if (! array_key_exists($key, $keywordsInput) && $items === []) {
                // fallback default jika key tidak dikirim
                $items = is_array($defaultSpec) && (array_key_exists('kuat', $defaultSpec) || array_key_exists('lemah', $defaultSpec))
                    ? array_merge($defaultSpec['kuat'] ?? [], $defaultSpec['lemah'] ?? [])
                    : (array_is_list($defaultSpec) ? $defaultSpec : []);
            }
            $keywords[$key] = $this->cleanWordList($items);
        }

        $ignore = $this->cleanWordList(
            isset($rules['ignore']) && is_array($rules['ignore'])
                ? $rules['ignore']
                : ($defaults['ignore'] ?? [])
        );

        $abbreviations = [];
        $abbrInput = isset($rules['abbreviations']) && is_array($rules['abbreviations'])
            ? $rules['abbreviations']
            : ($defaults['abbreviations'] ?? []);
        foreach ($abbrInput as $short => $long) {
            $short = $this->cleanWord((string) $short);
            $long = trim((string) $long);
            if ($short !== '' && $long !== '') {
                $abbreviations[$short] = $long;
            }
        }

        $priority = isset($rules['priority']) && is_array($rules['priority'])
            ? array_values(array_unique(array_filter($rules['priority'], fn ($v) => is_string($v) && $v !== '')))
            : ($defaults['priority'] ?? ['pengaduan', 'aspirasi', 'permintaan_informasi']);
        if ($priority === []) {
            $priority = $defaults['priority'] ?? ['pengaduan', 'aspirasi', 'permintaan_informasi'];
        }

        $strongQuestionInput = null;
        foreach (['strong_question_words', 'question_words', 'kata_tanya_kuat'] as $k) {
            if (isset($rules[$k]) && is_array($rules[$k])) {
                $strongQuestionInput = $rules[$k];
                break;
            }
        }
        if ($strongQuestionInput === null) {
            $strongQuestionInput = $defaults['strong_question_words'] ?? [];
        }
        $strongQuestionWords = $this->cleanWordList($strongQuestionInput);

        $weakQuestionInput = null;
        foreach (['weak_question_words', 'question_words_weak', 'weak_questions', 'kata_tanya_lemah', 'pertanyaan_lemah'] as $k) {
            if (isset($rules[$k]) && is_array($rules[$k])) {
                $weakQuestionInput = $rules[$k];
                break;
            }
        }
        if ($weakQuestionInput === null) {
            $weakQuestionInput = $defaults['weak_question_words'] ?? ['apa', 'siapa', 'kenapa', 'mengapa', 'kok'];
        }
        $weakQuestionWords = $this->cleanWordList($weakQuestionInput);

        $version = isset($rules['version']) ? (int) $rules['version'] : (int) ($defaults['version'] ?? 1);

        return [
            'min_length' => max(1, min(10000, $minLength)),
            'min_words' => max(1, min(1000, $minWords)),
            'fallback_when_uncertain' => $fallback,
            'strong_question_words' => $strongQuestionWords,
            'weak_question_words' => $weakQuestionWords,
            'keywords' => $keywords,
            'ignore' => $ignore,
            'abbreviations' => $abbreviations,
            'priority' => $priority,
            'version' => max(1, $version),
        ];
    }

    /**
     * Normalisasi spec kata kunci per kategori: mendukung format lama (array string)
     * maupun baru (['kuat'=>[], 'lemah'=>[]]).
     *
     * @param  mixed  $spec
     * @param  array<string, mixed>  $defaultSpec
     * @return array{kuat: array<int,string>, lemah: array<int,string>}
     */
    protected function normalizeKeywordSpec(mixed $spec, array $defaultSpec = []): array
    {
        $collect = function ($value): array {
            $out = [];
            if (! is_array($value)) {
                return $out;
            }
            if (array_key_exists('kuat', $value) || array_key_exists('lemah', $value)) {
                foreach (['kuat', 'lemah'] as $b) {
                    if (isset($value[$b]) && is_array($value[$b])) {
                        $out = array_merge($out, $value[$b]);
                    }
                }
                return $out;
            }
            if (array_is_list($value)) {
                return $value;
            }
            return $out;
        };

        $items = $collect($spec);
        if ($items === []) {
            $items = $collect($defaultSpec);
        }

        return $this->cleanWordList($items);
    }

    /**
     * @param  array<int, mixed>  $list
     * @return array<int, string>
     */
    protected function cleanWordList(array $list): array
    {
        $out = [];
        foreach ($list as $item) {
            $word = $this->cleanWord((string) $item);
            if ($word !== '') {
                $out[] = $word;
            }
        }

        return array_values(array_unique($out));
    }

    protected function cleanWord(string $word): string
    {
        $word = trim(mb_strtolower($word));
        $word = preg_replace('/\s+/u', ' ', $word) ?? $word;

        // Tolak karakter kontrol.
        if (preg_match('/[\x00-\x1F\x7F]/u', $word)) {
            return '';
        }

        if (mb_strlen($word) > 60) {
            $word = mb_substr($word, 0, 60);
        }

        return $word;
    }
}
