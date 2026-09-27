<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the admin dashboard.
     */
    public function __invoke(): Response
    {
        $stats = Cache::remember('dashboard:admin:stats', now()->addMinutes(10), function () {
            return [
                'total' => Ticket::count(),
                'pengaduan' => Ticket::where('classification', 'pengaduan')->count(),
                'aspirasi' => Ticket::where('classification', 'aspirasi')->count(),
                'permintaan_informasi' => Ticket::where('classification', 'permintaan_informasi')->count(),
                'baru' => Ticket::where('status', 'baru')->count(),
                'respon_awal' => Ticket::where('status', 'respon_awal')->count(),
                'respon_substantif' => Ticket::where('status', 'respon_substantif')->count(),
                'selesai' => Ticket::whereNotNull('completed_at')->orWhere('status', 'selesai')->count(),
            ];
        });

        $recentTickets = Ticket::with('channel')
            ->orderByDesc('created_at')
            ->limit(7)
            ->get()
            ->map(fn (Ticket $t) => [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'classification' => $t->classification,
                'reporter_name' => $t->reporter_name,
                'content' => $t->content,
                'status' => $t->status,
                'channel' => $t->channel?->name ?? '-',
                'created_at' => $t->created_at->toDateTimeString(),
            ]);

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'recentTickets' => $recentTickets,
        ]);
    }
}
