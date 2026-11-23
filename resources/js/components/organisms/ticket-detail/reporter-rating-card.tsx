import { StarRatingDisplay } from '@/components/molecules/star-rating';
import { formatFullDate } from '@/lib/incoming-reports-utils';

interface ReporterRatingCardProps {
    rating?: number | null;
    ratedAt?: string | null;
    comment?: string | null;
}

export function ReporterRatingCard({ rating, ratedAt, comment }: ReporterRatingCardProps) {
    const text = comment?.trim();
    if (rating == null && !text) return null;

    return (
        <div className="mx-4 mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 sm:mx-6">
            <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">Penilaian Pelapor</h3>
            {rating != null && <StarRatingDisplay value={rating} />}
            {ratedAt && <p className="text-muted-foreground mt-1 mb-2 text-xs">{formatFullDate(ratedAt)}</p>}
            {text && <p className="text-foreground text-sm whitespace-pre-wrap">{comment}</p>}
        </div>
    );
}
