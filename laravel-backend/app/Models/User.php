<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'username',
        'email',
        'password',
        'bio',
        'avatar',
        'is_private',
        'typing_at',
        'typing_to_user_id',
        'push_token',
        'online_at',
        'notification_prefs',
    ];

    protected function casts(): array
    {
        return [
            'is_private' => 'boolean',
            'email_verified_at' => 'datetime',
            'online_at' => 'datetime',
            'password' => 'hashed',
            'notification_prefs' => 'object',
        ];
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function followers()
    {
        return $this->hasMany(Follow::class, 'following_id');
    }

    public function following()
    {
        return $this->hasMany(Follow::class, 'follower_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    public function stories()
    {
        return $this->hasMany(Story::class);
    }

    public function profileVisitors()
    {
        return $this->hasMany(ProfileVisitor::class, 'user_id');
    }

    public function visits()
    {
        return $this->hasMany(ProfileVisitor::class, 'visitor_id');
    }

    public function badges()
    {
        return $this->hasMany(UserBadge::class);
    }

    public function profileTemplates()
    {
        return $this->hasMany(ProfileTemplate::class);
    }

    public function profileTemplate()
    {
        return $this->hasOne(ProfileTemplate::class)->where('is_active', true);
    }
}
