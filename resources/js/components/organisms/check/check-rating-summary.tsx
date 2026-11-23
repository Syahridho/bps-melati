import { StarRatingDisplay } from '@/components/molecules/star-rating';
import { Card, CardContent } from '@/components/ui/card';

export function CheckRatingSummary({ rating, comment }: { rating?: number | null; comment?: string | null }) {
    return (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="space-y-2 p-6">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Terima kasih atas penilaian Anda.</p>
                {rating != null && <StarRatingDisplay value={rating} />}
                {comment?.trim() && <p className="text-muted-foreground text-sm whitespace-pre-wrap">{comment}</p>}
            </CardContent>
        </Card>
    );
}
