export interface ForgotPasswordPageProps {
    status?: string;
    noticeReason?: string | null;
    throttleSeconds?: number;
}

export interface ResetPasswordPageProps {
    token?: string;
    email?: string;
    status?: string;
    noticeReason?: string | null;
    throttleSeconds?: number;
}
