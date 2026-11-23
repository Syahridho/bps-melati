export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export const RATING_LABELS: Record<number, string> = {
    1: 'Sangat kurang',
    2: 'Kurang',
    3: 'Cukup',
    4: 'Baik',
    5: 'Sangat baik',
};

export const hasRatingFeedback = (t: { rating?: number | null; rating_comment?: string | null }) =>
    t.rating != null || Boolean(t.rating_comment?.trim());
