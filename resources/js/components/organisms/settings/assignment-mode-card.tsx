import { AnimatedBeamClaim } from '@/components/molecules/animated-beam-claim';
import { AnimatedBeamFree } from '@/components/molecules/animated-beam-free';
import { AnimatedBeamRoundRobin } from '@/components/molecules/animated-beam-round-robin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ConfirmationAssignment from '@/components/view/dashboard/settings/assignment/confirmation-modal';
import { formatFullDate } from '@/lib/incoming-reports-utils';
import { type AssignmentModeSettings, type AssignmentModeValue } from '@/types/settings';
import { useForm } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, History, LoaderCircle } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';

interface AssignmentModeCardProps {
    assignmentMode: AssignmentModeSettings;
}

const modePreviews: Record<AssignmentModeValue, ComponentType> = {
    free: AnimatedBeamFree,
    claim: AnimatedBeamClaim,
    round_robin: AnimatedBeamRoundRobin,
};

export function AssignmentModeCard({ assignmentMode }: AssignmentModeCardProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    const form = useForm({
        mode: assignmentMode.current as AssignmentModeValue,
        apply: 'now' as 'now' | 'scheduled',
        scheduled_at: '',
    });

    const selectedOption = assignmentMode.options.find((option) => option.value === form.data.mode);

    const handleSubmit = () => {
        form.post(route('settings.assignment-mode'), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmOpen(false);
                toast.success('Pengaturan mode penanganan laporan diperbarui.');
            },
            onError: () => {
                setConfirmOpen(false);
                toast.error('Gagal menyimpan mode penanganan laporan.');
            },
        });
    };

    const statusBadge = (status: string) => {
        if (status === 'applied') {
            return (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600">
                    Diterapkan
                </Badge>
            );
        }

        if (status === 'cancelled') {
            return (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                    Dibatalkan
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-600">
                Terjadwal
            </Badge>
        );
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-base font-semibold">Mode Penanganan Laporan</h3>
                <p className="text-muted-foreground text-sm">
                    Mode aktif saat ini: <span className="text-foreground font-medium">{assignmentMode.current_label}</span>
                </p>
            </div>

            {assignmentMode.pending && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                    <CalendarClock className="mt-0.5 size-4 shrink-0" />
                    <span>
                        Mode <strong>{assignmentMode.pending.label}</strong> akan aktif pada{' '}
                        {assignmentMode.pending.scheduled_at ? formatFullDate(assignmentMode.pending.scheduled_at) : '-'}.
                    </span>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="assignment-mode">Mode Penanganan Laporan</Label>
                <Select value={form.data.mode} onValueChange={(value) => form.setData('mode', value as AssignmentModeValue)}>
                    <SelectTrigger id="assignment-mode">
                        <SelectValue placeholder="Pilih mode" />
                    </SelectTrigger>
                    <SelectContent>
                        {assignmentMode.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedOption && <p className="text-muted-foreground text-xs">{selectedOption.description}</p>}
                {form.errors.mode && <p className="text-destructive text-xs">{form.errors.mode}</p>}
            </div>

            {(() => {
                const Preview = modePreviews[form.data.mode];
                return Preview ? <Preview key={form.data.mode} /> : null;
            })()}

            <div className="space-y-2">
                <Label>Waktu Penerapan</Label>
                <ToggleGroup
                    type="single"
                    value={form.data.apply}
                    onValueChange={(value) => {
                        if (value) {
                            form.setData('apply', value as 'now' | 'scheduled');
                        }
                    }}
                    className="justify-start"
                >
                    <ToggleGroupItem value="now" variant="outline" className="text-xs">
                        Terapkan sekarang
                    </ToggleGroupItem>
                    <ToggleGroupItem value="scheduled" variant="outline" className="text-xs">
                        Jadwalkan
                    </ToggleGroupItem>
                </ToggleGroup>

                {form.data.apply === 'scheduled' && (
                    <div className="space-y-1">
                        <Label htmlFor="assignment-mode-schedule" className="text-xs">
                            Tanggal & jam penerapan
                        </Label>
                        <Input
                            id="assignment-mode-schedule"
                            type="datetime-local"
                            value={form.data.scheduled_at}
                            onChange={(event) => form.setData('scheduled_at', event.target.value)}
                        />
                        {form.errors.scheduled_at && <p className="text-destructive text-xs">{form.errors.scheduled_at}</p>}
                    </div>
                )}
                {form.errors.apply && <p className="text-destructive text-xs">{form.errors.apply}</p>}
            </div>

            <Button type="button" onClick={() => setConfirmOpen(true)} disabled={form.processing} className="gap-2">
                {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Simpan Mode
            </Button>

            <ConfirmationAssignment
                confirmOpen={confirmOpen}
                setConfirmOpen={setConfirmOpen}
                selectedOption={selectedOption}
                form={form}
                handleSubmit={handleSubmit}
            />

            <div className="space-y-2 pt-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <History className="size-4" />
                    Riwayat Perubahan Mode
                </h4>

                {assignmentMode.history.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Belum ada perubahan mode.</p>
                ) : (
                    <div className="divide-y rounded-lg border">
                        {assignmentMode.history.map((item) => (
                            <div key={item.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{item.new_label ?? '-'}</span>
                                        {statusBadge(item.status)}
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        {item.old_label ? `Dari ${item.old_label} · ` : ''}
                                        {item.changed_by_name ?? 'Sistem'} ·{' '}
                                        {item.applied_at
                                            ? `Diterapkan ${formatFullDate(item.applied_at)}`
                                            : item.scheduled_at
                                              ? `Dijadwalkan ${formatFullDate(item.scheduled_at)}`
                                              : '-'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
