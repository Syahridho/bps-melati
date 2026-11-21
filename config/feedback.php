<?php

$ratingCommentMax = (int) env('TICKET_RATING_COMMENT_MAX', 1000);

return [
    'rating_comment_max' => $ratingCommentMax,
    'comment_max' => $ratingCommentMax,
    'comment_max_length' => $ratingCommentMax,
    'max_comment_length' => $ratingCommentMax,
];
