<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('forgot-password/index', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = $request->email;

        // Cek jika user nonaktif
        $user = User::where('email', $email)->where('is_active', true)->first();

        // Kirim link reset jika user aktif
        if ($user) {
            Password::sendResetLink(
                $request->only('email')
            );
        }

        // Kembali ke halaman lupa password dengan status via Inertia
        return redirect()->route('password.request')
            ->with('status', __('Jika email terdaftar, link reset password telah dikirim.'));
    }
}
