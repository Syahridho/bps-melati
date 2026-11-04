import RekapPeriodikView from '@/components/view/dashboard/rekap/rekap-periodik';
import { PeriodOption, RekapMatrixPeriodColumn, RekapMatrixRow, RekapMatrixTotals, RekapViewMode } from '@/types/rekap';

interface RekapPeriodikProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    year: string;
    selectedMonths: string[];
    years: PeriodOption[];
    monthOptions: PeriodOption[];
    periodeLabel: string;
    tampilan: RekapViewMode;
    chat?: string;
}

export default function RekapPeriodikPage(props: RekapPeriodikProps) {
    return (
        <>
            <RekapPeriodikView {...props} />
        </>
    );
}
