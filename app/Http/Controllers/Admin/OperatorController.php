<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SessionTerminator;
use App\Support\IpMasker;
use App\Support\UserAgentParser;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OperatorController extends Controller
{
    /**
     * Tampilkan daftar pengguna dengan paginasi, pencarian,
     * dan status online.
     */
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $perPage = (int) $request->query('per_page', 10);

        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 10;
        }

        $operators = User::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at->toIso8601String(),
                ...self::presenceFor($user),
            ]);

        return Inertia::render('admin/operator/index', [
            'operators' => $operators,
            'filters' => [
                'search' => $search ?? '',
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Tambah pengguna baru.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'role.required' => 'Role wajib dipilih.',
            'role.enum' => 'Role tidak valid.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
        ]);

        User::create([
            'name' => $validated['name'],
            'role' => $validated['role'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        self::clearCache();

        $roleLabel = match ($validated['role']) {
            'admin' => 'Admin',
            'operator' => 'Operator',
            'operator_tim' => 'Operator Tim',
            default => ucfirst($validated['role']),
        };

        return redirect()->back()->with('flash', [
            'success' => "{$roleLabel} {$validated['name']} berhasil ditambahkan!",
        ]);
    }

    /**
     * Perbarui data pengguna.
     */
    public function update(Request $request, User $operator): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($operator->id)],
            'is_active' => ['nullable', 'boolean'],
            'password' => ['nullable', 'string', 'min:8'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'role.required' => 'Role wajib dipilih.',
            'role.enum' => 'Role tidak valid.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan oleh akun lain.',
            'password.min' => 'Password minimal 8 karakter.',
        ]);

        if ($operator->id === auth()->id() && $validated['role'] !== 'admin') {
            return redirect()->back()->withErrors([
                'role' => 'Anda tidak dapat mengubah role Anda sendiri dari Admin.',
            ]);
        }

        // Jangan izinkan menurunkan/menghapus admin terakhir
        if ($operator->isAdmin() && $validated['role'] !== 'admin') {
            $adminCount = User::where('role', UserRole::Admin)->where('is_active', true)->count();
            if ($adminCount <= 1) {
                return redirect()->back()->withErrors([
                    'role' => 'Sistem harus memiliki setidaknya satu Admin aktif.',
                ]);
            }
        }

        $wasActive = $operator->is_active;
        $willBeActive = $request->has('is_active') ? $request->boolean('is_active') : true;

        $updateData = [
            'name' => $validated['name'],
            'role' => $validated['role'],
            'email' => $validated['email'],
            'is_active' => $willBeActive,
        ];

        $passwordChanged = ! empty($validated['password']);

        if ($passwordChanged) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $operator->update($updateData);

        self::clearCache();

        $roleChanged = $operator->getOriginal('role') !== $validated['role'];

        $reason = match (true) {
            $wasActive && ! $willBeActive => SessionTerminator::REASON_DEACTIVATED,
            $passwordChanged => SessionTerminator::REASON_PASSWORD_CHANGED,
            $roleChanged => SessionTerminator::REASON_FORCED_LOGOUT,
            default => null,
        };

        if ($reason !== null) {
            app(SessionTerminator::class)->terminate($operator, $reason, actor: auth()->user(), request: $request);
        }

        return redirect()->back()->with('flash', [
            'success' => $reason === SessionTerminator::REASON_DEACTIVATED
                ? "Akun {$operator->name} dinonaktifkan dan sesi aktifnya telah diakhiri."
                : ($roleChanged ? "Role akun {$operator->name} diubah dan sesinya diakhiri." : "Data pengguna {$operator->name} berhasil diperbarui!"),
        ]);
    }

    /**
     * Hapus pengguna.
     */
    public function destroy(Request $request, User $operator): RedirectResponse
    {
        if ($operator->id === auth()->id()) {
            return redirect()->back()->withErrors([
                'error' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ]);
        }

        if ($operator->isAdmin()) {
            $adminCount = User::where('role', UserRole::Admin)->where('is_active', true)->count();
            if ($adminCount <= 1) {
                return redirect()->back()->withErrors([
                    'error' => 'Sistem harus memiliki setidaknya satu Admin aktif.',
                ]);
            }
        }

        $name = $operator->name;

        app(SessionTerminator::class)->terminate($operator, SessionTerminator::REASON_FORCED_LOGOUT, actor: auth()->user(), request: $request);

        $operator->delete();

        self::clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Pengguna {$name} berhasil dihapus!",
        ]);
    }

    /**
     * Paksa logout operator lain.
     */
    public function forceLogout(Request $request, User $operator): RedirectResponse
    {
        $actor = $request->user();

        abort_unless($actor instanceof User && $actor->isAdmin(), 403);

        if ($operator->id === $actor->id) {
            return redirect()->back()->withErrors([
                'error' => 'Anda tidak dapat memaksa logout akun Anda sendiri.',
            ]);
        }

        $hadSession = filled($operator->current_session_id);

        app(SessionTerminator::class)->terminate($operator, SessionTerminator::REASON_FORCED_LOGOUT, actor: $actor, request: $request);

        self::clearCache();

        return redirect()->back()->with('flash', [
            'success' => $hadSession
                ? "Sesi {$operator->name} telah diakhiri. Pengguna harus login kembali."
                : "{$operator->name} sedang tidak aktif. Tidak ada sesi untuk diakhiri.",
        ]);
    }

    public static function clearCache(): void
    {
        if (Cache::has('operators:version')) {
            Cache::increment('operators:version');
        } else {
            Cache::put('operators:version', 2, now()->addDays(30));
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function presenceFor(User $user): array
    {
        return [
            'is_online' => $user->isOnline(),
            'last_active_at' => $user->last_activity_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'last_login_device' => UserAgentParser::label($user->last_login_agent),
            'last_login_ip' => IpMasker::mask($user->last_login_ip),
            'has_session' => filled($user->current_session_id),
        ];
    }
}
