<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Story extends Model
{
    protected $fillable = [
        'user_id', 'type', 'image', 'video', 'text_overlay', 'text_color',
        'bg_color', 'duration', 'stickers', 'drawing_data', 'is_highlight'
    ];

    protected $appends = ['media_url'];

    protected $casts = [
        'stickers' => 'array',
        'drawing_data' => 'array',
        'is_highlight' => 'boolean',
    ];

    public function getMediaUrlAttribute()
    {
        return $this->type === 'video' ? $this->video : $this->image;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function views()
    {
        return $this->hasMany(StoryView::class);
    }

    public function reactions()
    {
        return $this->hasMany(StoryReaction::class);
    }

    public function highlightItems()
    {
        return $this->hasMany(StoryHighlightItem::class);
    }

    public function highlights()
    {
        return $this->belongsToMany(StoryHighlight::class, 'story_highlight_items', 'story_id', 'highlight_id');
    }

    public function scopeActive($query)
    {
        return $query->where('created_at', '>=', now()->subHours(12));
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
