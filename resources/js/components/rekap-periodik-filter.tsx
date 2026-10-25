import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronDown, RotateCcw } from 'lucide-react';
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
        <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tahun */}
            <Select value={year} onValueChange={onYearChange} disabled={isLoading}>
                <SelectTrigger className="w-36 bg-background">
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
                        className="w-56 justify-between bg-background font-normal"
                    >
                        <span className="flex items-center gap-2 truncate text-sm">
                            <Calendar className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{monthSummaryLabel}</span>
                        </span>
                        <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-semibold text-foreground">Pilih Bulan</span>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAll}
                                    className="h-6 px-1.5 text-[11px] text-primary"
                                >
                                    Pilih Semua
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetToOne}
                                    className="h-6 px-1.5 text-[11px] text-muted-foreground"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {monthOptions.map((month) => {
                                const isChecked = localSelected.includes(month.value);
                                return (
                                    <label
                                        key={month.value}
                                        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/60 cursor-pointer text-xs select-none"
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={() => toggleMonth(month.value)}
                                        />
                                        <span className={isChecked ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                                            {month.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="border-t pt-2 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                                {localSelected.length} dipilih
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApply}
                                disabled={localSelected.length === 0}
                                className="h-7 text-xs px-3"
                            >
                                Terapkan
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
