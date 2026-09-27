<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the operator dashboard.
     */
    public function __invoke(): Response
    {
        $stats = Cache::remember('dashboard:operator:stats', now()->addMinutes(10), function () {
            return [
                'total' => Ticket::count(),
                'pengaduan' => Ticket::where('classification', 'pengaduan')->count(),
                'aspirasi' => Ticket::where('classification', 'aspirasi')->count(),
                'permintaan_informasi' => Ticket::where('classification', 'permintaan_informasi')->count(),
                'baru' => Ticket::where('status', 'baru')->count(),
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

        return Inertia::render('operator/dashboard', [
            'stats' => $stats,
            'recentTickets' => $recentTickets,
        ]);
    }
}
