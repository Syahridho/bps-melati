import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PeriodOption {
    value: string;
    label: string;
}

interface RekapPeriodikFilterProps {
    year: string;
    years: PeriodOption[];
    onYearChange: (year: string) => void;
    selectedMonths: string[];
    monthOptions: PeriodOption[];
    onMonthsChange: (months: string[]) => void;
    isLoading?: boolean;
}

export function RekapPeriodikFilter({
    year,
    years,
    onYearChange,
    selectedMonths,
    monthOptions,
    onMonthsChange,
    isLoading = false,
}: RekapPeriodikFilterProps) {
    const [open, setOpen] = useState(false);
    // Local copy of selected months inside popover for comfortable selection before applying
    const [localSelected, setLocalSelected] = useState<string[]>(selectedMonths);

    // Sync when prop updates
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setLocalSelected(selectedMonths);
        }
        setOpen(isOpen);
    };

    const toggleMonth = (monthVal: string) => {
        setLocalSelected((prev) => {
            if (prev.includes(monthVal)) {
                if (prev.length <= 1) {
                    return prev; // minimal 1 bulan
                }
                return prev.filter((m) => m !== monthVal);
            }
            const next = [...prev, monthVal];
            return next.sort((a, b) => Number(a) - Number(b));
        });
    };

    const selectAll = () => {
        setLocalSelected(monthOptions.map((m) => m.value));
    };

    const resetToOne = () => {
        // default ke bulan 1
        setLocalSelected(['1']);
    };

    const handleApply = () => {
        if (localSelected.length === 0) return;
        onMonthsChange(localSelected);
        setOpen(false);
    };

    const monthSummaryLabel = useMemo(() => {
        if (selectedMonths.length === 12) {
            return 'Semua Bulan (12)';
        }
        if (selectedMonths.length === 1) {
            const found = monthOptions.find((m) => m.value === selectedMonths[0]);
            return found ? found.label : `Bulan ${selectedMonths[0]}`;
        }
        return `${selectedMonths.length} Bulan Dipilih`;
    }, [selectedMonths, monthOptions]);

    return (
        <div className="flex items-center gap-1">
            {/* Filter Tahun */}
            <Select value={year} onValueChange={onYearChange} disabled={isLoading}>
                <SelectTrigger className="bg-background w-36">
                    <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                    {years.map((y) => (
                        <SelectItem key={y.value} value={y.value}>
                            {y.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Filter Bulan Multi-select */}
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={isLoading}
                        className="bg-background w-auto justify-between font-normal"
                    >
                        <span className="flex items-center gap-2 truncate text-sm">
                            <Calendar className="text-muted-foreground size-4 shrink-0" />
                            <span className="truncate">{monthSummaryLabel}</span>
                        </span>
                        <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-foreground text-xs font-semibold">Pilih Bulan</span>
                            <div className="flex items-center gap-1.5">
                                <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-primary h-6 px-1.5 text-[11px]">
                                    Pilih Semua
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetToOne}
                                    className="text-muted-foreground h-6 px-1.5 text-[11px]"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                            {monthOptions.map((month) => {
                                const isChecked = localSelected.includes(month.value);
                                return (
                                    <label
                                        key={month.value}
                                        className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-xs select-none"
                                    >
                                        <Checkbox checked={isChecked} onCheckedChange={() => toggleMonth(month.value)} />
                                        <span className={isChecked ? 'text-foreground font-medium' : 'text-muted-foreground'}>{month.label}</span>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t pt-2">
                            <span className="text-muted-foreground text-[11px]">{localSelected.length} dipilih</span>
                            <Button type="button" size="sm" onClick={handleApply} disabled={localSelected.length === 0} className="h-7 px-3 text-xs">
                                Terapkan
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
