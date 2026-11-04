import RekapBulananView from '@/components/view/dashboard/rekap/rekap-bulanan';
import { PeriodOption, RekapRow, RekapTotals } from '@/types/rekap';

interface RekapBulananProps {
    rows: RekapRow[];
    totals: RekapTotals;
    year: string;
    month: string;
    years: PeriodOption[];
    months: PeriodOption[];
    periodLabel: string;
}

export default function RekapBulananPage(props: RekapBulananProps) {
    return (
        <>
            <RekapBulananView {...props} />
        </>
    );
}
