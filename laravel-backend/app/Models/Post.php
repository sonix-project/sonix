<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = ['content', 'type', 'image', 'thumbnail', 'video', 'user_id', 'location', 'mentions', 'views_count', 'is_pinned'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }
}
