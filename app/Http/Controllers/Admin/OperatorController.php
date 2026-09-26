<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
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
     * Tampilkan daftar pengguna (admin & operator) dengan paginasi, pencarian, dan Redis cache.
     */
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $perPage = (int) $request->query('per_page', 10);
        $page = (int) $request->query('page', 1);

        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 10;
        }

        $version = Cache::get('operators:version', 1);
        $searchHash = md5($search ?? '');
        $cacheKey = "operators:v{$version}:search:{$searchHash}:page:{$page}:per_page:{$perPage}";

        $operators = Cache::remember($cacheKey, now()->addHours(24), function () use ($search, $perPage) {
            return User::query()
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                })
                ->latest()
                ->paginate($perPage)
                ->withQueryString();
        });

        return Inertia::render('admin/operator/index', [
            'operators' => $operators,
            'filters' => [
                'search' => $search ?? '',
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Tambah pengguna baru (Admin atau Operator).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:admin,operator'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid.',
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

        $roleLabel = ucfirst($validated['role']);

        return redirect()->back()->with('flash', [
            'success' => "{$roleLabel} {$validated['name']} berhasil ditambahkan!",
        ]);
    }

    /**
     * Perbarui data pengguna (Admin atau Operator).
     */
    public function update(Request $request, User $operator): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:admin,operator'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($operator->id)],
            'password' => ['nullable', 'string', 'min:8'],
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid.',
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

        $updateData = [
            'name' => $validated['name'],
            'role' => $validated['role'],
            'email' => $validated['email'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $operator->update($updateData);

        self::clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Data pengguna {$operator->name} berhasil diperbarui!",
        ]);
    }

    /**
     * Hapus pengguna.
     */
    public function destroy(User $operator): RedirectResponse
    {
        if ($operator->id === auth()->id()) {
            return redirect()->back()->withErrors([
                'error' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ]);
        }

        $name = $operator->name;
        $operator->delete();

        self::clearCache();

        return redirect()->back()->with('flash', [
            'success' => "Pengguna {$name} berhasil dihapus!",
        ]);
    }

    /**
     * Invalidate operator Redis cache.
     */
    public static function clearCache(): void
    {
        if (Cache::has('operators:version')) {
            Cache::increment('operators:version');
        } else {
            Cache::put('operators:version', 2, now()->addDays(30));
        }
    }
}
