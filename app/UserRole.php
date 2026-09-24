<?php

namespace App;

enum UserRole: string
{
    case Admin = 'admin';

    case Operator = 'operator';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $role): string => $role->value, self::cases());
    }
}
