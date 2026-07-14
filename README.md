<p align="center">
  <img src="assets/logo.png" alt="Sonix Logo" width="120" height="120" />
</p>

<h1 align="center">Sonix — Full-Stack Social Media Platform</h1>

<p align="center">
  A production-ready social media application built with <strong>Laravel 13</strong> (Backend API) and <strong>React Native / Expo SDK 57</strong> (Mobile App).
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#customization">Customization</a> •
  <a href="#license">License</a>
</p>

---

## Overview

Sonix is a **full-featured social media platform** comparable to Instagram, Snapchat, and TikTok. It includes:

- **35 screens** with smooth animations
- **95+ API endpoints** with rate limiting
- **33 database models** with 56 migrations
- **Full RTL support** (Arabic + English)
- **Voice messages** with animated waveform
- **Vanish mode** (auto-delete messages)
- **Group chat** with real-time indicators
- **Stories** with stickers, drawing, and analytics
- **Docker deployment** ready

---

## Features

### Core
| Feature | Status |
|---------|--------|
| Authentication (Register, Login, Password Reset) | ✅ |
| 2FA Authentication | ✅ |
| Profile Management (Avatar, Bio, Username) | ✅ |
| Private Accounts | ✅ |
| Push Notifications | ✅ |

### Social
| Feature | Status |
|---------|--------|
| Create Posts (Text/Image/Video) | ✅ |
| Like/Unlike Posts | ✅ |
| Comments with @Mentions | ✅ |
| Bookmarks/Saved Posts | ✅ |
| Share Posts (Native Share Sheet) | ✅ |
| Hashtag Feed (#Tag) | ✅ |
| Post Statistics & View Tracking | ✅ |
| Pin/Unpin Posts | ✅ |

### Stories
| Feature | Status |
|---------|--------|
| Create Stories (Image/Video/Text) | ✅ |
| Story Reactions | ✅ |
| Story Analytics | ✅ |
| Story Highlights | ✅ |
| Forward Stories | ✅ |

### Messaging
| Feature | Status |
|---------|--------|
| 1:1 Direct Messages | ✅ |
| Voice Messages (Record & Play) | ✅ |
| Image Messages | ✅ |
| Message Reactions (Emoji) | ✅ |
| Typing Indicators | ✅ |
| Read Receipts | ✅ |
| Vanish Mode (Auto-Delete) | ✅ |
| Forward Messages | ✅ |
| Mute/Pin Conversations | ✅ |
| Delete Conversation | ✅ |

### Group Chat
| Feature | Status |
|---------|--------|
| Create Groups | ✅ |
| Add/Remove Members | ✅ |
| Group Messages | ✅ |

### Discovery
| Feature | Status |
|---------|--------|
| Explore/Discover Page | ✅ |
| Trending Posts | ✅ |
| Suggested Users | ✅ |
| User Search (with History) | ✅ |

### Safety
| Feature | Status |
|---------|--------|
| Block Users | ✅ |
| Report Content | ✅ |
| Bad Word Filter | ✅ |
| Anti-Scraping Middleware | ✅ |
| Security Headers | ✅ |

### Additional
| Feature | Status |
|---------|--------|
| Profile Visitors | ✅ |
| User Badges | ✅ |
| Profile Templates | ✅ |
| Short Video Reels | ✅ |
| Full RTL Support (Arabic) | ✅ |
| Dual Language (EN/AR) | ✅ |

---

## Tech Stack

### Backend
- **Language:** PHP 8.3
- **Framework:** Laravel 13.8
- **Database:** PostgreSQL 15+ (MySQL compatible)
- **Auth:** Laravel Sanctum 4.3
- **Media:** Cloudinary
- **Queue/Cache:** Redis
- **Real-time:** Laravel Reverb
- **Server:** PHP-FPM + Nginx
- **Container:** Docker

### Mobile App
- **Framework:** React Native 0.86
- **SDK:** Expo 57
- **Navigation:** React Navigation 7
- **Animations:** React Native Reanimated 4.5
- **HTTP Client:** Axios 1.7
- **Camera:** expo-camera 57
- **Audio:** expo-audio 57
- **Video:** expo-video 57

---

## Requirements

### Backend
- PHP 8.3+
- Composer 2.x
- PostgreSQL 15+ (or MySQL 8+)
- Redis (optional)

### Mobile App
- Node.js 20+
- npm or yarn
- Expo CLI

---

## Installation

### 1. Backend Setup

```bash
cd laravel-backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your `.env` file:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sonix
DB_USERNAME=postgres
DB_PASSWORD=secret

CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

Run migrations:

```bash
php artisan migrate
```

Start the server:

```bash
php artisan serve
```

### 2. Mobile App Setup

```bash
cd expo-app
npm install
```

Create `expo-app/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

Start Expo:

```bash
npx expo start
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Send reset code |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/change-password` | Change password |
| DELETE | `/api/auth/account` | Delete account |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/search` | Search users |
| GET | `/api/users/me` | Current user |
| POST | `/api/users/profile` | Update profile |
| GET | `/api/users/{id}` | User profile |
| GET | `/api/users/{id}/stats` | User stats |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Feed posts |
| POST | `/api/posts` | Create post |
| GET | `/api/posts/{id}` | Single post |
| PUT | `/api/posts/{id}` | Update post |
| DELETE | `/api/posts/{id}` | Delete post |
| GET | `/api/posts/hashtag/{tag}` | Posts by hashtag |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send message |
| GET | `/api/messages/conversations` | Conversation list |
| GET | `/api/messages/{userId}` | Message history |
| POST | `/api/messages/{id}/react` | Add reaction |
| POST | `/api/messages/{id}/vanish` | Toggle vanish mode |

### Stories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Feed stories |
| POST | `/api/stories` | Create story |
| POST | `/api/stories/{id}/view` | Mark viewed |
| POST | `/api/stories/{id}/react` | React to story |

### Group Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | My groups |
| POST | `/api/groups` | Create group |
| POST | `/api/groups/{id}/members` | Add members |
| POST | `/api/groups/{id}/messages` | Send message |

**Full API documentation:** See [README Backend](laravel-backend/README.md)

---

## Project Structure

```
sonix/
├── expo-app/                    # React Native / Expo Mobile App
│   ├── App.js                   # Entry point
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # EAS Build configuration
│   ├── package.json             # Dependencies
│   └── src/
│       ├── api/                 # API client, cache, media, notifications, websocket
│       ├── components/          # Reusable components
│       ├── context/             # React Context (Auth, Language)
│       ├── i18n/                # Translations (EN/AR)
│       ├── navigation/          # App navigation
│       ├── screens/             # 35 screens
│       └── utils/               # Utilities
│
├── laravel-backend/             # Laravel API Backend
│   ├── app/
│   │   ├── Console/Commands/    # Custom commands
│   │   ├── Helpers/             # Helpers
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # 22 controllers
│   │   │   └── Middleware/       # Security middleware
│   │   ├── Models/              # 33 models
│   │   └── Services/            # Services
│   ├── config/                  # Configuration
│   ├── database/migrations/     # 56 migrations
│   └── routes/api.php           # 95+ routes
│
├── Dockerfile                   # Docker configuration
├── docker-entrypoint.sh         # Startup script
├── supervisord.conf             # Process manager
├── nginx-site.conf              # Nginx configuration
├── railway.json                 # Railway config
├── README.md                    # This file
├── SALES_PITCH.md               # Detailed sales document
├── INSTALL.md                   # Installation guide
├── DEPLOY.md                    # Deployment guide
├── CONFIG.md                    # Configuration guide
├── CUSTOMIZATION.md             # Customization guide
└── LICENSE                      # License
```

---

## Deployment

### Docker (Recommended)

```bash
docker build -t sonix .
docker run -p 80:80 sonix
```

### EAS Build (APK)

```bash
cd expo-app
npx eas build --platform android --profile production
```

### Cloud Platforms

| Platform | Type | Cost |
|----------|------|------|
| Railway | Backend | $5-20/mo |
| DigitalOcean | Backend | $5-25/mo |
| EAS Build | APK | Free tier available |
| Cloudinary | Media | Free tier available |

---

## Customization

### Change App Name
1. Edit `expo-app/app.json` — change `name` and `slug`
2. Edit `expo-app/src/i18n/translations.js` — change `sonix` key

### Change Colors
Edit `expo-app/src/components/Theme.js`:

```js
export const COLORS = {
  primary: "#6C63FF",   // Your brand color
  background: "#0D1117", // Dark background
  surface: "#161B22",    // Card background
  accent: "#FF6B6B",     // Accent color
};
```

### Add New Language
1. Add translation object in `expo-app/src/i18n/translations.js`
2. Add language to `expo-app/src/context/LanguageContext.js`

---

## What You Get

### Source Code
- ✅ Complete Laravel backend
- ✅ Complete React Native / Expo mobile app
- ✅ 56 database migrations
- ✅ Docker configuration
- ✅ Environment templates

### Documentation
- ✅ INSTALL.md
- ✅ DEPLOY.md
- ✅ CONFIG.md
- ✅ CUSTOMIZATION.md
- ✅ SALES_PITCH.md (detailed product overview)

### Support (Premium)
- ✅ 2 months technical support
- ✅ 1 hour training session
- ✅ Critical bug fixes

---

## License

All Rights Reserved. This source code is the property of the copyright holder. Distribution, modification, or commercial use without explicit written permission is prohibited.

---

## Contact

For technical inquiries or purchase information, please contact the repository owner.

**Repository:** [github.com/HEYTHEM2009/sonix](https://github.com/HEYTHEM2009/sonix)
