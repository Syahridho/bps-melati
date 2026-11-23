import RekapPeriodikView from '@/components/view/dashboard/recap/periodic-recap';
import { PeriodicRecapProps } from '@/types/recap';

export default function PeriodicRecapAdminPage(props: PeriodicRecapProps) {
    return <RekapPeriodikView {...props} />;
}
