import LoginForm from '@/components/login-form';
import { type SessionConflictInfo } from '@/components/session-conflict-card';
import { Head } from '@inertiajs/react';

interface LoginPageProps {
    canResetPassword: boolean;
    status?: string;
    noticeReason?: string | null;
    throttleSeconds?: number;
    sessionConflict?: SessionConflictInfo | null;
}

export default function LoginPage({ status, noticeReason, throttleSeconds, sessionConflict }: LoginPageProps) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <Head title="Masuk" />
            <div className="w-full max-w-sm md:max-w-3xl">
                <LoginForm status={status} noticeReason={noticeReason} throttleSeconds={throttleSeconds} sessionConflict={sessionConflict} />
            </div>
        </div>
    );
}
