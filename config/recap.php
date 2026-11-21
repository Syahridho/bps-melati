<?php

return [
    'chat_default' => (int) env('RECAP_CHAT_DEFAULT', 500),
    'chat_warning_threshold' => (int) env('RECAP_CHAT_WARNING_THRESHOLD', 500),
    'chat_max' => (int) env('RECAP_CHAT_MAX', 2000),
];
