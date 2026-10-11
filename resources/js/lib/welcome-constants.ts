import { type AlurStep, type ClassificationOption } from '@/types/welcome';
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb, MessageCircle, MessagesSquare, PenSquare, Ticket } from 'lucide-react';

// Warna ikon mengikuti warna kategori di dashboard admin agar konsisten.
export const CLASSIFICATIONS: ClassificationOption[] = [
    {
        value: 'pengaduan',
        label: 'Pengaduan',
        description: 'Laporkan masalah atau ketidakpuasan terhadap layanan.',
        icon: AlertCircle,
        iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
        value: 'aspirasi',
        label: 'Aspirasi',
        description: 'Sampaikan saran, masukan, atau ide perbaikan.',
        icon: Lightbulb,
        iconClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    },
    {
        value: 'permintaan_informasi',
        label: 'Permintaan Informasi',
        description: 'Ajukan permohonan data atau informasi.',
        icon: HelpCircle,
        iconClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
];

export const ALUR_STEPS: AlurStep[] = [
    {
        icon: PenSquare,
        title: 'Tulis Laporan',
        description: 'Pilih jenis laporan, isi form dengan jelas dan lengkap, lampirkan berkas jika perlu.',
    },
    {
        icon: Ticket,
        title: 'Terima Nomor Tiket',
        description: 'Sistem membuat nomor tiket. Simpan nomor ini untuk memantau laporan Anda.',
    },
    {
        icon: MessagesSquare,
        title: 'Proses Tindak Lanjut',
        description: 'Petugas menelaah dan memberikan tanggapan atas laporan Anda.',
    },
    {
        icon: MessageCircle,
        title: 'Beri Tanggapan',
        description: 'Anda dapat membalas tanggapan petugas melalui halaman Cek Tiket.',
    },
    {
        icon: CheckCircle2,
        title: 'Selesai',
        description: 'Tiket ditutup oleh Anda atau otomatis oleh sistem setelah batas waktu tertentu.',
    },
];
