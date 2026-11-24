<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AndroidRelease extends Model
{
    protected $fillable = [
        'version',
        'release_notes',
        'original_name',
        'stored_path',
        'size_bytes',
        'checksum_sha256',
        'uploaded_by',
        'is_active',
        'download_count',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'size_bytes' => 'integer',
            'download_count' => 'integer',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public static function active(): ?self
    {
        return static::where('is_active', true)->latest('id')->first();
    }
}