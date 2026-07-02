<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('messages.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('typing.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('notifications.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('stories.{userId}', function ($user, $userId) {
    return true;
});

Broadcast::channel('presence.users', function ($user) {
    return [
        'id' => $user->id,
        'username' => $user->username,
        'avatar' => $user->avatar,
    ];
});
