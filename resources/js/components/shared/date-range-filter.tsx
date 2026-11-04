import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { endOfMonth, endOfYear, format, isSameDay, startOfDay, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
    from?: string | null;
    to?: string | null;
    onRangeChange: (from: string | null, to: string | null) => void;
    className?: string;
}

type PresetKey = 'hari_ini' | '7_hari' | '30_hari' | 'bulan_ini' | 'bulan_lalu' | 'triwulan_ini' | 'tahun_ini' | 'semua' | 'custom';

export function DateRangeFilter({ from, to, onRangeChange, className }: DateRangeFilterProps) {
    const [open, setOpen] = React.useState(false);

    // Parse incoming string props to DateRange
    const dateRange: DateRange | undefined = React.useMemo(() => {
        if (from === 'semua' || to === 'semua') {
            return undefined;
        }
        const parsedFrom = from ? new Date(from) : undefined;
        const parsedTo = to ? new Date(to) : parsedFrom;
        if (parsedFrom && isNaN(parsedFrom.getTime())) return undefined;
        if (parsedTo && isNaN(parsedTo.getTime())) return undefined;
        return {
            from: parsedFrom,
            to: parsedTo,
        };
    }, [from, to]);

    const [tempRange, setTempRange] = React.useState<DateRange | undefined>(dateRange);

    React.useEffect(() => {
        setTempRange(dateRange);
    }, [dateRange]);

    const handleSelect = (range: DateRange | undefined) => {
        setTempRange(range);
        if (range?.from && range?.to) {
            onRangeChange(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'));
            setOpen(false);
        } else if (range?.from && !range?.to) {
            // single day selected initially
            onRangeChange(format(range.from, 'yyyy-MM-dd'), format(range.from, 'yyyy-MM-dd'));
        }
    };

    const applyPreset = (key: PresetKey) => {
        const now = new Date();
        let f: Date | undefined;
        let t: Date | undefined;
        let strFrom: string | null = null;
        let strTo: string | null = null;

        switch (key) {
            case 'hari_ini':
                f = startOfDay(now);
                t = startOfDay(now);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            case '7_hari':
                f = startOfDay(subDays(now, 6));
                t = startOfDay(now);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            case '30_hari':
                f = startOfDay(subDays(now, 29));
                t = startOfDay(now);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            case 'bulan_ini':
                f = startOfMonth(now);
                t = endOfMonth(now);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            case 'bulan_lalu': {
                const lastMonth = subMonths(now, 1);
                f = startOfMonth(lastMonth);
                t = endOfMonth(lastMonth);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            }
            case 'triwulan_ini': {
                // Triwulan (Quarter)
                const currentMonth = now.getMonth();
                const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
                f = new Date(now.getFullYear(), quarterStartMonth, 1);
                t = endOfMonth(new Date(now.getFullYear(), quarterStartMonth + 2, 1));
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            }
            case 'tahun_ini':
                f = startOfYear(now);
                t = endOfYear(now);
                strFrom = format(f, 'yyyy-MM-dd');
                strTo = format(t, 'yyyy-MM-dd');
                break;
            case 'semua':
                strFrom = 'semua';
                strTo = 'semua';
                break;
            default:
                return;
        }

        onRangeChange(strFrom, strTo);
        setOpen(false);
    };

    // Determine current active preset
    const activePreset = React.useMemo((): PresetKey | 'custom' => {
        if (from === 'semua' || to === 'semua') return 'semua';
        if (!dateRange?.from) return 'bulan_ini';

        const now = new Date();
        const fStr = format(dateRange.from, 'yyyy-MM-dd');
        const tStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fStr;

        const presets: Array<{ key: PresetKey; from: Date; to: Date }> = [
            { key: 'hari_ini', from: startOfDay(now), to: startOfDay(now) },
            { key: '7_hari', from: startOfDay(subDays(now, 6)), to: startOfDay(now) },
            { key: '30_hari', from: startOfDay(subDays(now, 29)), to: startOfDay(now) },
            { key: 'bulan_ini', from: startOfMonth(now), to: endOfMonth(now) },
            { key: 'bulan_lalu', from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
            { key: 'tahun_ini', from: startOfYear(now), to: endOfYear(now) },
        ];

        for (const p of presets) {
            if (format(p.from, 'yyyy-MM-dd') === fStr && format(p.to, 'yyyy-MM-dd') === tStr) {
                return p.key;
            }
        }

        return 'custom';
    }, [from, to, dateRange]);

    // Trigger button label
    const label = React.useMemo(() => {
        if (from === 'semua' || to === 'semua') return 'Semua waktu';
        if (!dateRange?.from) return 'Pilih rentang tanggal';
        if (dateRange.from && dateRange.to) {
            if (isSameDay(dateRange.from, dateRange.to)) {
                return format(dateRange.from, 'd MMM yyyy', { locale: id });
            }
            return `${format(dateRange.from, 'd MMM yyyy', { locale: id })} – ${format(dateRange.to, 'd MMM yyyy', { locale: id })}`;
        }
        return format(dateRange.from, 'd MMM yyyy', { locale: id });
    }, [from, to, dateRange]);

    const presetsList: Array<{ key: PresetKey; label: string }> = [
        { key: 'hari_ini', label: 'Hari ini' },
        { key: '7_hari', label: '7 hari terakhir' },
        { key: '30_hari', label: '30 hari terakhir' },
        { key: 'bulan_ini', label: 'Bulan ini' },
        { key: 'bulan_lalu', label: 'Bulan lalu' },
        { key: 'triwulan_ini', label: 'Triwulan ini' },
        { key: 'tahun_ini', label: 'Tahun ini' },
        { key: 'semua', label: 'Semua waktu' },
    ];

    return (
        <div className={cn('grid gap-2', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal sm:w-auto',
                            !dateRange && from !== 'semua' && 'text-muted-foreground',
                        )}
                    >
                        <CalendarIcon className="mr-2 size-4" />
                        {label}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col md:flex-row">
                        {/* Preset sidebar */}
                        <div className="flex flex-col gap-1 border-b p-2 md:border-r md:border-b-0">
                            <span className="text-muted-foreground px-2 py-1 text-xs font-semibold">Preset</span>
                            {presetsList.map((preset) => (
                                <Button
                                    key={preset.key}
                                    variant="ghost"
                                    size="sm"
                                    className={cn('justify-between text-left font-normal', activePreset === preset.key && 'bg-accent font-semibold')}
                                    onClick={() => applyPreset(preset.key)}
                                >
                                    {preset.label}
                                    {activePreset === preset.key && <Check className="ml-2 size-3.5" />}
                                </Button>
                            ))}
                        </div>

                        {/* Calendar */}
                        <div className="p-3">
                            <Calendar
                                mode="range"
                                defaultMonth={dateRange?.from ?? new Date()}
                                selected={tempRange}
                                onSelect={handleSelect}
                                numberOfMonths={2}
                                locale={id}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
