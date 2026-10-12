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
            <Head title="Masuk">
                <link rel="preload" as="image" href="/melati_big.webp" type="image/webp" media="(min-width: 768px)" />
                <link rel="preload" as="image" href="/desc-melati.webp" type="image/webp" media="(min-width: 768px)" />
            </Head>
            <div className="w-full max-w-sm md:max-w-3xl">
                <LoginForm status={status} noticeReason={noticeReason} throttleSeconds={throttleSeconds} sessionConflict={sessionConflict} />
            </div>
        </div>
    );
}
