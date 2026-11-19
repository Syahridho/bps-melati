import MonthlyRecapView from '@/components/view/dashboard/recap/monthly-recap';
import { MonthlyRecapProps } from '@/types/recap';

export default function MonthlyRecapOperatorPage(props: MonthlyRecapProps) {
    return <MonthlyRecapView {...props} />;
}
