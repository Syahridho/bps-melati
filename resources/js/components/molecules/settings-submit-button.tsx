import { Button } from '@/components/ui/button';
import { Transition } from '@headlessui/react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { type ReactNode } from 'react';

interface SettingsSubmitButtonProps {
    processing: boolean;
    recentlySuccessful?: boolean;
    successMessage?: string | null;
    label?: ReactNode;
    className?: string;
    disabled?: boolean;
}

export function SettingsSubmitButton({
    processing,
    recentlySuccessful = false,
    successMessage,
    label = 'Simpan Pengaturan',
    className = '',
    disabled = false,
}: SettingsSubmitButtonProps) {
    return (
        <div className={`flex items-center gap-4 pt-2 ${className}`}>
            <Button type="submit" disabled={processing || disabled}>
                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {label}
            </Button>

            <Transition
                show={recentlySuccessful || !!successMessage}
                enter="transition ease-in-out duration-300"
                enterFrom="opacity-0"
                leave="transition ease-in-out duration-300"
                leaveTo="opacity-0"
            >
                <p className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {successMessage || 'Tersimpan'}
                </p>
            </Transition>
        </div>
    );
}
