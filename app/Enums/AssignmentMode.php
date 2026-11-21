<?php

namespace App\Enums;

enum AssignmentMode: string
{
    case Free = 'free';

    case Claim = 'claim';

    case RoundRobin = 'round_robin';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $mode): string => $mode->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Keroyokan (Free)',
            self::Claim => 'Ambil Tiket (Claim)',
            self::RoundRobin => 'Bergiliran Otomatis (Round Robin)',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Free => 'Semua operator boleh membalas laporan mana pun. Tidak ada penanggung jawab (PIC).',
            self::Claim => 'Laporan baru masuk tanpa PIC. Operator mengambil tiket sendiri, lalu menjadi PIC-nya.',
            self::RoundRobin => 'Laporan baru otomatis ditugaskan bergiliran ke operator yang aktif dan tersedia.',
        };
    }
}
