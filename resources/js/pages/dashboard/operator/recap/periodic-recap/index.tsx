import PeriodicRecapView from '@/components/view/dashboard/recap/periodic-recap';
import { PeriodicRecapProps } from '@/types/recap';

export default function PeriodicRecapOperatorPage(props: PeriodicRecapProps) {
    return <PeriodicRecapView {...props} />;
}
