import ResetPasswordView from '@/components/view/auth/reset-password';
import { ResetPasswordPageProps } from '@/types/auth';

export default function ResetPassword(props: ResetPasswordPageProps) {
    return <ResetPasswordView {...props} />;
}
