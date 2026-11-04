// Reusable multi‑select for chat months – mirrors RekapPeriodikFilter UI
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PeriodOption {
    value: string;
    label: string;
}

interface RekapChatMultiSelectProps {
    // months currently selected in the main month filter
    selectedMonths: string[];
    // all month options (same as filter component provides)
    monthOptions: PeriodOption[];
    // currently chosen chat months (comma‑separated string passed from page)
    value: string[]; // array of month values
    onChange: (vals: string[]) => void;
    triggerClassName?: string;
    disabled?: boolean;
}

export function RekapChatMultiSelect({
    selectedMonths,
    monthOptions,
    value,
    onChange,
    triggerClassName = 'w-36 bg-background',
    disabled = false,
}: RekapChatMultiSelectProps) {
    // local state mirrors UI before applying
    const [open, setOpen] = useState(false);
    const [localSelected, setLocalSelected] = useState<string[]>(value);

    // sync when parent updates or when popover opens
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setLocalSelected(value);
        }
        setOpen(isOpen);
    };

    const toggleMonth = (monthVal: string) => {
        setLocalSelected((prev) => {
            if (prev.includes(monthVal)) {
                if (prev.length <= 1) return prev; // require at least one
                return prev.filter((m) => m !== monthVal);
            }
            const next = [...prev, monthVal];
            return next.sort((a, b) => Number(a) - Number(b));
        });
    };

    const selectAll = () => {
        setLocalSelected(selectedMonths);
    };

    const reset = () => {
        // default to first selected month if any, else empty
        setLocalSelected(selectedMonths.length ? [selectedMonths[0]] : []);
    };

    const apply = () => {
        if (localSelected.length === 0) return;
        onChange(localSelected);
        setOpen(false);
    };

    const summaryLabel = useMemo(() => {
        const filtered = value.filter((v) => selectedMonths.includes(v));
        if (filtered.length === selectedMonths.length && selectedMonths.length > 0) {
            return `Semua Chat (${filtered.length})`;
        }
        if (filtered.length === 1) {
            const opt = monthOptions.find((m) => m.value === filtered[0]);
            return opt ? opt.label : `Chat ${filtered[0]}`;
        }
        return `${filtered.length} Chat Dipilih`;
    }, [value, monthOptions, selectedMonths]);

    // options limited to months currently selected in main filter
    const availableOptions = monthOptions.filter((m) => selectedMonths.includes(m.value));

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={triggerClassName + ' justify-between font-normal'}
                >
                    <span className="flex items-center gap-2 truncate text-sm">
                        <Calendar className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{summaryLabel}</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-semibold text-foreground">Pilih Chat</span>
                        <div className="flex items-center gap-1.5">
                            <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="h-6 px-1.5 text-[11px] text-primary">
                                Pilih Semua
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-6 px-1.5 text-[11px] text-muted-foreground">
                                Reset
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {availableOptions.map((month) => {
                            const checked = localSelected.includes(month.value);
                            return (
                                <label key={month.value} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/60 cursor-pointer text-xs select-none">
                                    <Checkbox checked={checked} onCheckedChange={() => toggleMonth(month.value)} />
                                    <span className={checked ? 'font-medium text-foreground' : 'text-muted-foreground'}>{month.label}</span>
                                </label>
                            );
                        })}
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{localSelected.filter((v) => selectedMonths.includes(v)).length} dipilih</span>
                        <Button type="button" size="sm" onClick={apply} disabled={localSelected.length === 0} className="h-7 text-xs px-3">
                            Terapkan
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
