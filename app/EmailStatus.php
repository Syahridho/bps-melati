<?php

namespace App;

enum EmailStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';
    case Bounced = 'bounced';
    case Skipped = 'skipped';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Mengirim email…',
            self::Sent => 'Email terkirim',
            self::Failed => 'Email gagal terkirim',
            self::Bounced => 'Email tidak sampai',
            self::Skipped => 'Email tidak dikirim',
        };
    }

    public function variant(): string
    {
        return match ($this) {
            self::Pending => 'amber',
            self::Sent => 'success',
            self::Failed => 'destructive',
            self::Bounced => 'destructive',
            self::Skipped => 'muted',
        };
    }
}
