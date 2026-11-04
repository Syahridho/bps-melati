import { type SessionConflictInfo } from '@/components/session/session-conflict-card';
import LoginView from '@/components/view/auth/login';

interface LoginPageProps {
    canResetPassword: boolean;
    status?: string;
    noticeReason?: string | null;
    throttleSeconds?: number;
    sessionConflict?: SessionConflictInfo | null;
}

export default function LoginPage({ status, noticeReason, throttleSeconds, sessionConflict, canResetPassword }: LoginPageProps) {
    return (
        <>
            <LoginView
                status={status}
                noticeReason={noticeReason}
                throttleSeconds={throttleSeconds}
                sessionConflict={sessionConflict}
                canResetPassword={canResetPassword}
            />
        </>
    );
}
