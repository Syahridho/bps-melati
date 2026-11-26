export interface ChannelNode {
    id: number;
    name: string;
    slug?: string;
    color?: string | null;
    children?: ChannelNode[];
}

export interface ChannelFilterChip {
    key: string;
    label: string;
    color?: string | null;
    ids: number[];
}

export function childIds(channel: ChannelNode): number[] {
    return (channel.children ?? []).map((child) => child.id);
}

export function isChannelFullySelected(channel: ChannelNode, selected: number[]): boolean {
    const ids = childIds(channel);

    if (ids.length === 0) {
        return selected.includes(channel.id);
    }

    // Menyimpan id induk saja tetap dianggap memilih seluruh sub-kanal.
    return selected.includes(channel.id) || ids.every((id) => selected.includes(id));
}

export function isChannelIndeterminate(channel: ChannelNode, selected: number[]): boolean {
    const ids = childIds(channel);

    if (ids.length === 0 || isChannelFullySelected(channel, selected)) {
        return false;
    }

    return selected.includes(channel.id) || ids.some((id) => selected.includes(id));
}

export function isChildSelected(channel: ChannelNode, child: ChannelNode, selected: number[]): boolean {
    return selected.includes(channel.id) || selected.includes(child.id);
}

export function buildChannelFilterChips(channels: ChannelNode[], selected: number[]): ChannelFilterChip[] {
    const known = new Set<number>();
    const chips: ChannelFilterChip[] = [];

    for (const channel of channels) {
        known.add(channel.id);

        const children = channel.children ?? [];

        if (children.length === 0) {
            if (selected.includes(channel.id)) {
                chips.push({ key: `channel-${channel.id}`, label: channel.name, color: channel.color, ids: [channel.id] });
            }
            continue;
        }

        for (const child of children) {
            known.add(child.id);
        }

        if (isChannelFullySelected(channel, selected)) {
            chips.push({
                key: `channel-${channel.id}`,
                label: channel.name,
                color: channel.color,
                ids: [channel.id, ...children.map((child) => child.id)],
            });
            continue;
        }

        for (const child of children) {
            if (selected.includes(child.id)) {
                chips.push({
                    key: `channel-${child.id}`,
                    label: child.name,
                    color: child.color ?? channel.color,
                    ids: [child.id],
                });
            }
        }
    }

    // Id kanal nonaktif yang masih tersimpan di URL tetap bisa dihapus.
    for (const id of selected) {
        if (!known.has(id)) {
            chips.push({ key: `channel-${id}`, label: `Kanal #${id}`, ids: [id] });
        }
    }

    return chips;
}
