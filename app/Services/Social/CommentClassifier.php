<?php

namespace App\Services\Social;

class CommentClassifier
{
    private array $rules;

    public function __construct(array $rules = [])
    {
        $this->rules = $rules === [] ? app(RuleRepository::class)->rules() : $rules;
    }

    /**
     * Klasifikasikan teks komentar.
     *
     * @param  string  $text
     * @param  array<string, mixed>|null  $rules
     * @return array{jenis: string|null, alasan: string, teks_normal: string}
     */
    public function classify(string $text, ?array $rules = null): array
    {
        $rules = $rules ?? $this->rules;
        if ($rules === []) {
            $rules = app(RuleRepository::class)->rules();
        }

        $repo = app(RuleRepository::class);
        $rules = $repo->normalize($rules);

        $normalized = $this->normalizeText($text, $rules);
        $teksNormal = $normalized;

        $minLength = (int) ($rules['min_length'] ?? 10);
        $minWords = (int) ($rules['min_words'] ?? 3);

        if ($this->isOnlyEmojiNumberLink($normalized)) {
            return ['jenis' => null, 'alasan' => 'hanya emoji/angka/link', 'teks_normal' => $teksNormal];
        }

        $keywords = (array) ($rules['keywords'] ?? []);
        $ignore = (array) ($rules['ignore'] ?? []);
        $priority = (array) ($rules['priority'] ?? ['pengaduan', 'aspirasi', 'permintaan_informasi']);
        $strongQuestionWords = (array) ($rules['strong_question_words'] ?? [
            'bagaimana', 'apakah', 'berapa', 'kapan', 'dimana', 'di mana', 'bisakah', 'bolehkah', 'adakah',
        ]);
        $weakQuestionWords = (array) ($rules['weak_question_words'] ?? [
            'apa', 'siapa', 'kenapa', 'mengapa', 'kok',
        ]);
        $fallback = (bool) ($rules['fallback_when_uncertain'] ?? false);

        // Buang frasa ignore dari teks (strip, bukan return null).
        $stripped = $this->stripIgnorePhrases($normalized, $ignore);
        $strippedWordCount = count(preg_split('/\s+/u', trim($stripped), -1, PREG_SPLIT_NO_EMPTY) ?: []);

        // Jika setelah dibuang tidak ada sisa.
        if ($stripped === '') {
            return ['jenis' => null, 'alasan' => 'hanya sapaan/pujian', 'teks_normal' => $teksNormal];
        }


        // Konteks pertanyaan (dari sisa teks).
        $endsQuestion = (bool) preg_match('/\?\s*$/u', $stripped);

        $hasStrongQuestionWord = false;
        $matchedQuestionWords = [];
        foreach ($strongQuestionWords as $qw) {
            $qw = trim((string) $qw);
            if ($qw !== '' && $this->matchWholePhrase($stripped, $qw)) {
                $hasStrongQuestionWord = true;
                $matchedQuestionWords[] = $qw;
            }
        }

        $hasWeakQuestionWord = false;
        $matchedWeakQuestionWords = [];
        foreach ($weakQuestionWords as $qw) {
            $qw = trim((string) $qw);
            if ($qw !== '' && $this->matchWholePhrase($stripped, $qw)) {
                $hasWeakQuestionWord = true;
                $matchedWeakQuestionWords[] = $qw;
            }
        }

        // Sinyal permintaan_informasi.
        $questionSignal = 0;
        if ($hasStrongQuestionWord) {
            $questionSignal += 3;
        }
        if ($hasWeakQuestionWord) {
            if ($endsQuestion) {
                $questionSignal += 3;
            } else {
                $questionSignal += 1;
            }
        }
        // "?" saja (min_words) bila tidak ada kata tanya.
        $questionMarkOnly = false;
        if (! $hasStrongQuestionWord && ! $hasWeakQuestionWord && $endsQuestion && $strippedWordCount >= $minWords) {
            $questionSignal += 1;
            $questionMarkOnly = true;
        }

        $scores = [
            'pengaduan' => 0,
            'aspirasi' => 0,
            'permintaan_informasi' => $questionSignal,
        ];

        $matched = [
            'pengaduan' => [],
            'aspirasi' => [],
            'permintaan_informasi' => array_merge($matchedQuestionWords, $matchedWeakQuestionWords),
        ];

        if ($questionMarkOnly) {
            $matched['permintaan_informasi'][] = '?';
        }

        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $cat) {
            $list = (array) ($keywords[$cat] ?? []);
            foreach ($list as $kw) {
                $kw = trim((string) $kw);
                if ($kw === '') {
                    continue;
                }
                if ($this->matchWholePhrase($stripped, $kw)) {
                    if (mb_strpos($kw, ' ') !== false) {
                        $weight = 2;
                    } else {
                        $weight = 1;
                    }
                    $scores[$cat] += $weight;
                    $matched[$cat][] = $kw;
                }
            }
        }

        $hasQuestion = $hasStrongQuestionWord || $hasWeakQuestionWord || $endsQuestion;
        $hasPengaduanKeyword = $matched['pengaduan'] !== [];

        // Kalimat berakhir "?" dan tidak punya keyword pengaduan kuat tidak boleh aspirasi.
        if ($endsQuestion && ! $hasPengaduanKeyword) {
            $scores['aspirasi'] = 0;
        }

        // Tentukan pemenang.
        $maxScore = max($scores);

        if ($maxScore <= 0) {
            return ['jenis' => null, 'alasan' => 'hanya sapaan/pujian', 'teks_normal' => $teksNormal];
        }

        $selected = null;
        foreach ($priority as $cat) {
            if (isset($scores[$cat]) && $scores[$cat] === $maxScore) {
                $selected = $cat;
                break;
            }
        }
        if ($selected === null) {
            foreach ($scores as $cat => $sc) {
                if ($sc === $maxScore) {
                    $selected = $cat;
                    break;
                }
            }
        }

        // Alasan dengan skor dan kata yang cocok.
        $parts = [];
        foreach (['pengaduan', 'aspirasi', 'permintaan_informasi'] as $cat) {
            $terms = array_values(array_unique($matched[$cat]));
            $termStr = $terms !== [] ? ' ('.implode(', ', $terms).')' : '';
            $parts[] = "{$cat}={$scores[$cat]}{$termStr}";
        }
        $alasan = implode('; ', $parts);

        return ['jenis' => $selected, 'alasan' => $alasan, 'teks_normal' => $teksNormal];
    }

    public function normalizeText(string $text, array $rules): string
    {
        $text = mb_strtolower(trim($text));
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        // Kurangi huruf berulang (2+ -> 1).
        $text = preg_replace('/(.)\1+/u', '$1', $text) ?? $text;

        // Ganti singkatan dari peta (batas kata).
        $abbreviations = (array) ($rules['abbreviations'] ?? []);
        foreach ($abbreviations as $short => $long) {
            $short = trim((string) $short);
            $long = trim((string) $long);
            if ($short === '' || $long === '') {
                continue;
            }
            $pattern = '/(?<![\p{L}\p{N}_])'.preg_quote($short, '/').'(?![\p{L}\p{N}_])/u';
            $text = preg_replace($pattern, $long, $text) ?? $text;
        }

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    protected function stripIgnorePhrases(string $text, array $ignore): string
    {
        $terms = [];
        foreach ($ignore as $term) {
            $term = trim((string) $term);
            if ($term !== '') {
                $terms[] = $term;
            }
        }
        // Hapus frasa terpanjang dulu.
        usort($terms, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        foreach ($terms as $term) {
            $quoted = preg_quote($term, '/');
            $pattern = '/(?<![\p{L}\p{N}_])'.$quoted.'(?![\p{L}\p{N}_])/u';
            $text = preg_replace($pattern, ' ', $text) ?? $text;
        }

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    protected function matchWholePhrase(string $text, string $phrase): bool
    {
        $phrase = trim($phrase);
        if ($phrase === '') {
            return false;
        }

        $quoted = preg_quote($phrase, '/');
        $pattern = '/(?<![\p{L}\p{N}_])'.$quoted.'(?![\p{L}\p{N}_])/u';

        return (bool) preg_match($pattern, $text);
    }

    protected function isOnlyEmojiNumberLink(string $text): bool
    {
        $withoutUrls = preg_replace('~https?://\S+~u', '', $text) ?? $text;
        $withoutUrls = preg_replace('~\b[\w.-]+\.[a-z]{2,}\S*~iu', '', $withoutUrls) ?? $withoutUrls;

        if (! preg_match('/\p{L}/u', $withoutUrls)) {
            return true;
        }

        return false;
    }
}