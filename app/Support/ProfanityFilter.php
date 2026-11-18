<?php

namespace App\Support;

use App\Models\CensoredWord;
use Illuminate\Support\Facades\Cache;
use Normalizer;

/**
 * Sensor kata kasar di sisi server (Laravel) dengan daftar kata + regex.
 * Daftar kata diambil dari tabel `censored_words` (hanya yang aktif) dan
 * di-cache agar tidak dibangun ulang setiap request.
 *
 * Aturan pencocokan:
 *  - Kata panjang (>= 5 huruf): cocokkan di mana saja dalam teks, termasuk
 *    yang menempel (tanpa batas kata).
 *  - Kata pendek (<= 4 huruf): hanya cocok sebagai kata utuh, dengan batas
 *    (?<![\p{L}\p{N}]) dan (?![\p{L}\p{N}]).
 *  - Case-insensitive dan Unicode (/iu).
 *  - Dukung huruf berulang (anjiiing) dan leetspeak (a=4/@, i=1/!, dll).
 *  - Pola regex di-cache dengan static property agar tidak dibangun ulang.
 *
 * censor() mempertahankan huruf pertama persis seperti aslinya, mengganti
 * sisanya dengan `*`. Jumlah bintang = panjang kata - 1.
 *
 * Didaftarkan sebagai singleton di service container.
 */
class ProfanityFilter
{
    private const LEET = [
        'a' => 'a4@', 'i' => 'i1!|', 'e' => 'e3', 'o' => 'o0',
        's' => 's5$', 't' => 't7', 'g' => 'g9',
    ];

    private const CACHE_KEY = 'censored_words.active';

    /** @var array<string,string> */
    private static array $patternCache = [];

    /** @var list<array{word: string, match_type: string}> */
    private array $wordsWithType;

    /** @var list<string> */
    private array $allowlist;

    private string $maskChar;

    /**
     * @param  list<array{word: string, match_type: string}>  $wordsWithType
     * @param  list<string>  $allowlist
     */
    public function __construct(?array $wordsWithType = null, ?array $allowlist = null, ?string $maskChar = null)
    {
        $this->wordsWithType = $wordsWithType ?? $this->loadWordsFromDb();
        $this->allowlist = $allowlist ?? config('profanity.allowlist', []);
        $this->maskChar = $maskChar ?? config('profanity.mask_char', '*');
    }

    /**
     * Muat daftar kata aktif dari database. Jika tabel belum tersedia
     * (mis. saat migrasi belum dijalankan), kembalikan array kosong.
     *
     * @return list<array{word: string, match_type: string}>
     */
    private function loadWordsFromDb(): array
    {
        try {
            if (! app()->runningInConsole() && ! $this->tableExists()) {
                return [];
            }

            return CensoredWord::activeWithType();
        } catch (\Throwable) {
            return [];
        }
    }

    private function tableExists(): bool
    {
        return app('db')->getSchemaBuilder()->hasTable('censored_words');
    }

    /**
     * Muat daftar kata aktif dari database melalui cache. Digunakan oleh
     * singleton di service container.
     *
     * @return list<array{word: string, match_type: string}>
     */
    public static function loadActiveWords(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, function () {
            try {
                return app('db')->getSchemaBuilder()->hasTable('censored_words')
                    ? CensoredWord::activeWithType()
                    : [];
            } catch (\Throwable) {
                return [];
            }
        });
    }

    /**
     * Bersihkan cache daftar kata aktif. Dipanggil setelah kata ditambah,
     * diubah, dihapus, atau ditoggle.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Apakah teks mengandung setidaknya satu kata kasar (di luar allowlist).
     */
    public function contains(string $text): bool
    {
        if ($text === '') {
            return false;
        }

        $normalized = $this->normalize($text);

        foreach ($this->getSortedWords() as $item) {
            if ($this->isAllowlisted($item['word'])) {
                continue;
            }

            if (preg_match($this->pattern($item['word'], $item['match_type']), $normalized)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Samarkan kata kasar dalam teks, mempertahankan huruf pertama.
     *
     * Hasil tetap berupa teks asli; hanya bagian yang terdeteksi yang
     * di-censor (huruf pertama dipertahankan, sisnya diganti `*`).
     * Null/kosong dikembalikan utuh.
     */
    public function censor(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        if ($text === '') {
            return '';
        }

        $normalized = $this->normalize($text);
        $censored = $this->replace($normalized);

        // Normalisasi NFKC biasanya tidak mengubah panjang, sehingga hasil
        // censura pada teks ter-normalisasi tetap selaras dengan asli.
        if (mb_strlen($censored) === mb_strlen($text)) {
            return $censored;
        }

        $direct = $this->replace($text);

        return $direct;
    }

    /**
     * Samarkan teks, menerima dan mengembalikan null bila input null.
     * Cocok dipakai sebagai helper statis di seluruh layer keluaran.
     */
    public static function clean(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        return app(self::class)->censor($text);
    }

    /**
     * Alias statis untuk `contains()` lewat singleton.
     */
    public static function isProfane(string $text): bool
    {
        return app(self::class)->contains($text);
    }

    /**
     * @return list<string>
     */
    private function replace(string $text): string
    {
        $result = '';
        $pos = 0;
        $len = mb_strlen($text);

        while ($pos < $len) {
            $bestMatch = '';
            $bestMatchType = 'anywhere';

            // Coba semua kata (urutan terpendek dulu agar kata yang menempel,
            // mis. "AnjingAnjing", terpecah per kata bukan digabung).
            foreach ($this->getSortedWords() as $item) {
                if ($this->isAllowlisted($item['word'])) {
                    continue;
                }

                $sub = mb_substr($text, $pos);

                if (mb_strlen($item['word']) >= 5) {
                    // Kata panjang: cocok tanpa batas akhir.
                    $pattern = $this->buildLongPatternNoTail($item['word']);
                } else {
                    // Kata pendek: cocok sebagai kata utuh dengan batas kata.
                    $pattern = $this->pattern($item['word'], $item['match_type']);
                }

                if (preg_match($pattern, $sub, $matches, PREG_OFFSET_CAPTURE) && $matches[0][1] === 0) {
                    $match = $matches[0][0];

                    // Pilih match terpendek agar kata yang menempel terpecah
                    // per kata, bukan digabung menjadi satu match panjang.
                    if ($bestMatch === '' || mb_strlen($match) < mb_strlen($bestMatch)) {
                        $bestMatch = $match;
                        $bestMatchType = $item['match_type'];
                    }
                }
            }

            if ($bestMatch !== '') {
                $afterPos = $pos + mb_strlen($bestMatch);

                // Censor match dan lanjutkan ke posisi setelahnya.
                $result .= $this->censorMatch($bestMatch);
                $pos = $afterPos;

                continue;
            }

            // Tidak ada kata yang cocok pada posisi ini.
            $result .= mb_substr($text, $pos, 1);
            $pos++;
        }

        return $result;
    }

    private function censorMatch(string $match): string
    {
        $length = mb_strlen($match);

        if ($length === 0) {
            return $match;
        }

        $firstChar = mb_substr($match, 0, 1);
        $rest = mb_substr($match, 1);
        $masked = str_repeat('*', mb_strlen($rest));

        return $firstChar.$masked;
    }

    private function isAllowlisted(string $word): bool
    {
        return in_array(mb_strtolower($word), $this->allowlist, true);
    }

    /**
     * Kata diurutkan dari yang terpendek agar kata yang menempel (mis.
     * "AnjingAnjing", terpecah per kata bukan digabung menjadi satu match
     * panjang.
     *
     * @return list<array{word: string, match_type: string}>
     */
    private function getSortedWords(): array
    {
        $words = $this->wordsWithType;

        usort($words, function (array $a, array $b): int {
            return mb_strlen($a['word']) <=> mb_strlen($b['word']);
        });

        return $words;
    }

    private function normalize(string $text): string
    {
        if (class_exists(Normalizer::class)) {
            $normalized = Normalizer::normalize($text, Normalizer::NFKC);

            return $normalized !== false ? $normalized : $text;
        }

        return $text;
    }

    private function pattern(string $word, string $matchType): string
    {
        $cacheKey = $word.':'.$matchType;

        if (isset(self::$patternCache[$cacheKey])) {
            return self::$patternCache[$cacheKey];
        }

        $isLongWord = mb_strlen($word) >= 5;

        $parts = [];
        foreach (mb_str_split(mb_strtolower($word)) as $char) {
            $set = preg_quote(self::LEET[$char] ?? $char, '/');
            $parts[] = "[{$set}]+"; // huruf boleh berulang (anjiiing)
        }

        if ($isLongWord && $matchType === 'anywhere') {
            // Cocokkan di mana saja, termasuk yang menempel (tanpa batas kata
            // di awal). Tidak ada batas akhir agar kata yang menempel
            // ("AnjingAnjing") dapat terpecah per kata melalui pendekatan
            // terpendek-dulu di replace().
            $pattern = '/'.implode('', $parts).'/iu';
        } elseif ($matchType === 'anywhere') {
            // Kata pendek + anywhere: cocok di mana saja tetapi harus berdiri
            // sebagai satu kata (bukan bagian kata lain).
            $pattern = '/(?<![\p{L}\p{N}])'.implode('', $parts).'(?![\p{L}\p{N}])/iu';
        } else {
            // whole_word: cocok sebagai kata utuh dengan batas kata di awal
            // dan akhir.
            $pattern = '/(?<![\p{L}\p{N}])'.implode('[\W_]{0,2}', $parts).'(?![\p{L}\p{N}])/iu';
        }

        self::$patternCache[$cacheKey] = $pattern;

        return $pattern;
    }

    /**
     * Bangun pola regex untuk kata panjang tanpa batas akhir (dipakai untuk
     * deteksi kata yang menempel). Contoh: anjing -> [a4@]+[n]+[j]+[i]+[n]+[g]+
     */
    private function buildLongPatternNoTail(string $word): string
    {
        $cacheKey = $word.':anywhere';

        if (isset(self::$patternCache[$cacheKey])) {
            return self::$patternCache[$cacheKey];
        }

        $parts = [];
        foreach (mb_str_split(mb_strtolower($word)) as $char) {
            $set = preg_quote(self::LEET[$char] ?? $char, '/');
            $parts[] = "[{$set}]+";
        }
        $pattern = '/'.implode('', $parts).'/iu';
        self::$patternCache[$cacheKey] = $pattern;

        return $pattern;
    }
}
