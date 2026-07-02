<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationSetting extends Model
{
    protected $fillable = ['user_id', 'partner_id', 'is_muted', 'is_archived', 'is_pinned'];

    protected $casts = [
        'is_muted' => 'boolean',
        'is_archived' => 'boolean',
        'is_pinned' => 'boolean',
    ];
}
