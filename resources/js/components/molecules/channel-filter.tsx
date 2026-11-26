import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    buildChannelFilterChips,
    childIds,
    isChannelFullySelected,
    isChannelIndeterminate,
    isChildSelected,
    type ChannelNode,
} from '@/lib/channel-filter';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface ChannelFilterProps {
    channels: ChannelNode[];
    value: number[];
    onApply: (ids: number[]) => void;
}

export function ChannelFilter({ channels, value, onApply }: ChannelFilterProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<number[]>(value);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) {
            setDraft(value);
        }
    }, [value, open]);

    const chips = useMemo(() => buildChannelFilterChips(channels, value), [channels, value]);
    const hasSelection = value.length > 0;
    const triggerLabel = !hasSelection ? 'Semua kanal' : chips.length === 1 ? chips[0].label : `Kanal: ${chips.length}`;

    const filteredChannels = useMemo(() => {
        const keyword = query.trim().toLowerCase();

        if (!keyword) {
            return channels.map((channel) => ({ channel, children: channel.children ?? [] }));
        }

        return channels
            .map((channel): { channel: ChannelNode; children: ChannelNode[] } | null => {
                const children = channel.children ?? [];
                const parentMatches = channel.name.toLowerCase().includes(keyword);
                const matchingChildren = parentMatches
                    ? children
                    : children.filter((child) => child.name.toLowerCase().includes(keyword));

                if (!parentMatches && matchingChildren.length === 0) {
                    return null;
                }

                return { channel, children: matchingChildren };
            })
            .filter((entry): entry is { channel: ChannelNode; children: ChannelNode[] } => entry !== null);
    }, [channels, query]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setDraft(value);
            setQuery('');
        }
    };

    const toggleRoot = (channel: ChannelNode) => {
        const ids = childIds(channel);

        if (isChannelFullySelected(channel, draft)) {
            setDraft(draft.filter((id) => id !== channel.id && !ids.includes(id)));
            return;
        }

        setDraft([...new Set([...draft.filter((id) => id !== channel.id), ...(ids.length > 0 ? ids : [channel.id])])]);
    };

    const toggleChild = (channel: ChannelNode, child: ChannelNode) => {
        const ids = childIds(channel);
        const isSelected = isChildSelected(channel, child, draft);

        if (isSelected && draft.includes(channel.id)) {
            // Induk terpilih berarti semua anaknya terpilih. Saat satu anak
            // dilepas, simpan sisa anak secara eksplisit.
            const remaining = draft.filter((id) => id !== channel.id && !ids.includes(id));
            setDraft([...new Set([...remaining, ...ids.filter((id) => id !== child.id)])]);
            return;
        }

        setDraft(isSelected ? draft.filter((id) => id !== child.id) : [...new Set([...draft, child.id])]);
    };

    const handleApply = () => {
        onApply(draft);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    aria-label={`${triggerLabel}, buka filter sumber kanal`}
                    className={cn(
                        'max-w-56 justify-between gap-2 font-normal',
                        hasSelection && 'border-primary/60 text-primary',
                    )}
                >
                    <span className="truncate">{triggerLabel}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" collisionPadding={8} className="w-80 max-w-[calc(100vw-2rem)] p-0">
                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari kanal..."
                            aria-label="Cari sumber kanal"
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                    {filteredChannels.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">Kanal tidak ditemukan.</p>
                    ) : (
                        filteredChannels.map(({ channel, children }) => {
                            return (
                                <div key={channel.id} className="py-0.5">
                                    <div className="hover:bg-accent flex items-center gap-2 rounded-sm px-1.5 py-1.5">
                                        <Checkbox
                                            id={`channel-${channel.id}`}
                                            checked={
                                                isChannelFullySelected(channel, draft)
                                                    ? true
                                                    : isChannelIndeterminate(channel, draft)
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            onCheckedChange={() => toggleRoot(channel)}
                                            aria-label={`Pilih ${channel.name}`}
                                        />
                                        <label
                                            htmlFor={`channel-${channel.id}`}
                                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-sm font-medium"
                                        >
                                            {channel.color && (
                                                <span
                                                    className="size-2 shrink-0 rounded-full"
                                                    style={{ backgroundColor: channel.color }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span className="truncate">{channel.name}</span>
                                        </label>
                                    </div>

                                    {children.length > 0 && (
                                        <div className="ml-3.5 space-y-0.5 border-l pl-3">
                                            {children.map((child) => (
                                                <div
                                                    key={child.id}
                                                    className="hover:bg-accent flex items-center gap-2 rounded-sm px-1.5 py-1"
                                                >
                                                    <Checkbox
                                                        id={`channel-${child.id}`}
                                                        checked={isChildSelected(channel, child, draft)}
                                                        onCheckedChange={() => toggleChild(channel, child)}
                                                        aria-label={`Pilih ${child.name}`}
                                                    />
                                                    <label
                                                        htmlFor={`channel-${child.id}`}
                                                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-sm"
                                                    >
                                                        {(child.color ?? channel.color) && (
                                                            <span
                                                                className="size-2 shrink-0 rounded-full"
                                                                style={{ backgroundColor: child.color ?? channel.color ?? undefined }}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <span className="truncate">{child.name}</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center justify-between border-t p-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft([])}>
                        Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleApply}>
                        Terapkan
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
