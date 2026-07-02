<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoryHighlightItem extends Model
{
    protected $fillable = ['highlight_id', 'story_id', 'position'];

    public function highlight()
    {
        return $this->belongsTo(StoryHighlight::class, 'highlight_id');
    }

    public function story()
    {
        return $this->belongsTo(Story::class);
    }
}
