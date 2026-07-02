<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoryHighlight extends Model
{
    protected $fillable = ['user_id', 'title', 'cover_image'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(StoryHighlightItem::class, 'highlight_id')->orderBy('position');
    }

    public function stories()
    {
        return $this->belongsToMany(Story::class, 'story_highlight_items', 'highlight_id', 'story_id')
            ->withPivot('position')
            ->orderByPivot('position');
    }
}
