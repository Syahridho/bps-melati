<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAdmin();
        $this->seedOperator();
    }

    private function seedAdmin(): void
    {
        // Ganti lewat .env (ADMIN_EMAIL, ADMIN_PASSWORD) dan WAJIB diganti di produksi.
        $email = env('ADMIN_EMAIL', 'admin@melati.test');

        $user = User::firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => 'Administrator',
            'password' => env('ADMIN_PASSWORD', 'password'), // di-hash otomatis oleh cast model User
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();
    }

    private function seedOperator(): void
    {
        // Ganti lewat .env (OPERATOR_EMAIL, OPERATOR_PASSWORD) dan WAJIB diganti di produksi.
        $email = env('OPERATOR_EMAIL', 'operator@melati.test');

        $user = User::firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => 'Operator',
            'password' => env('OPERATOR_PASSWORD', 'password'), // di-hash otomatis oleh cast model User
            'role' => 'operator',
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();
    }
}
