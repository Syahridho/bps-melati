import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id="channel">
                    <SelectValue placeholder="Pilih sumber kanal" />
                </SelectTrigger>
                <SelectContent>
                    {channels.map((group, index) => (
                        <div key={group.id}>
                            {index > 0 && <SelectSeparator />}
                            {group.children.length > 0 ? (
                                <SelectGroup>
                                    <SelectLabel>{group.name}</SelectLabel>
                                    {group.children.map((child) => (
                                        <SelectItem key={child.id} value={String(child.id)}>
                                            {child.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ) : (
                                <SelectItem value={String(group.id)}>{group.name}</SelectItem>
                            )}
                        </div>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

export { InputDataChannelSelect as ChannelSelect };
