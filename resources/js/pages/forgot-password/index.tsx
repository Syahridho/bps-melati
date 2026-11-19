import ForgotPasswordView from '@/components/view/auth/forget-password';
import { ForgotPasswordPageProps } from '@/types/auth';

export default function ForgotPasswordPage(props: ForgotPasswordPageProps) {
    return <ForgotPasswordView {...props} />;
}
