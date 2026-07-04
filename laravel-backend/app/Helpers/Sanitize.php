<?php

namespace App\Helpers;

class Sanitize
{
    public static function text(?string $input): ?string
    {
        if ($input === null) return null;

        $input = strip_tags($input);
        $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        $input = trim($input);

        return $input === '' ? null : $input;
    }

    public static function content(?string $input): ?string
    {
        if ($input === null) return null;

        $input = strip_tags($input, '<b><i><u><em><strong><br><p>');
        $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        $input = trim($input);

        return $input === '' ? null : $input;
    }
}
