import { Label } from '@/components/ui/label';
import { HierarchicalSearchableSelect } from '@/components/ui/hierarchical-searchable-select';
import { type ChannelGroup } from '@/types/input-data';

interface InputDataChannelSelectProps {
    value: string;
    channels: ChannelGroup[];
    onChange: (value: string) => void;
    error?: string;
}

export function InputDataChannelSelect({ value, channels, onChange, error }: InputDataChannelSelectProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="channel">
                Sumber Kanal <span className="text-destructive">*</span>
            </Label>
            <HierarchicalSearchableSelect
                id="channel"
                value={value}
                channels={channels}
                onChange={onChange}
                error={!!error}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

export { InputDataChannelSelect as ChannelSelect };
