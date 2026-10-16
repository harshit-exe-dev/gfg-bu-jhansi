# GFG BU Jhansi — Chapter 02 Website

The official website of the **GeeksforGeeks Campus Body, Bundelkhand University, Jhansi** (Chapter 02).

**Live:** https://gfgbujhansi.vercel.app
**Admin panel:** https://gfgbujhansi.vercel.app/admin.html

Site built by Harshit Bharti.

## What it is

A single-page chapter site with a real backend: hero, team (core + supporting), programs, learn links, gallery, promo film, and a native join system backed by MongoDB. No Google Forms — students join right on the page and the count updates instantly.

## Features

**Public site**
- Hero with chapter identity and promo film
- Team section — all 13 members plus faculty coordinator thanks
- Programs and learn-links sections
- Gallery fed by the admin upload panel
- **Join form** — name, branch, year. Duplicate joins (same name + branch + year, case-insensitive) are blocked with a friendly message
- **Member counter** — hidden while under 10 members, appears automatically at 10+

**Admin panel** (`/admin.html`, password-protected)
- Password login issuing a 12-hour HMAC token (no sessions, no cookies)
- Member list with total count and remove-member action
- Gallery upload UI — uploads go browser → Cloudinary → MongoDB, listed publicly on the site

## Tech stack

- **Frontend:** plain HTML/CSS/JS, no build step, no framework
- **Backend:** Vercel serverless functions (`/api`)
- **Database:** MongoDB Atlas (`gfg` database)
- **Media storage:** Cloudinary (unsigned upload preset)
- **Auth:** HMAC-SHA256 bearer tokens, 12-hour TTL

## Project structure

```
index.html          Public site
admin.html          Admin panel (login, members, gallery uploads)
styles.css          All styling
script.js           Public-site JS (join form, counter, gallery)
api/
  join.js           POST /api/join {name, branch, year} · GET /api/join {count}
  admin-login.js    POST /api/admin-login {password} -> {token}
  admin-members.js  GET/DELETE /api/admin-members (admin only)
  media.js          GET /api/media (public) · POST/DELETE (admin only)
lib/
  db.js             Shared cached MongoDB client
  auth.js           HMAC token issue/verify, requireAdmin middleware
package.json        mongodb driver
assets/             Fonts, team photos, poster, promo video
```

## API reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/join` | — | `{ ok, count }` |
| POST | `/api/join` | — | `{name, branch, year}` → saves member, blocks duplicates, per-IP throttle |
| POST | `/api/admin-login` | — | `{password}` → `{ ok, token }` (12h), timing-safe compare + delay on failure |
| GET | `/api/admin-members` | Admin | `{ ok, count, members[] }` |
| DELETE | `/api/admin-members?id=` | Admin | Removes one member |
| GET | `/api/media` | — | `{ ok, items[] }` public gallery |
| POST | `/api/media` | Admin | `{url, kind, caption}` → saves gallery item (URL must be http/https) |
| DELETE | `/api/media?id=` | Admin | Removes one gallery item |

Admin auth: `Authorization: Bearer <token>` header.

## Setup

1. Create a MongoDB Atlas database (or cluster database) for the site.
2. Set these **environment variables** on Vercel (Production) — never commit them:
   - `MONGODB_URI` — Atlas connection string
   - `ADMIN_PASSWORD` — admin panel password
   - `ADMIN_SECRET` — long random string for HMAC token signing
3. Create a Cloudinary **unsigned** upload preset and set the cloud name + preset in `admin.html`.
4. Deploy (Vercel picks up `api/` as serverless functions automatically).

Note: on Vercel, if an encrypted env var misbehaves after editing, delete it and re-create it rather than patching — patched encrypted values can silently break.

## Security notes

- All secrets live in Vercel env vars; nothing sensitive is in this repo.
- Password comparison is timing-safe; failed logins are delayed to blunt brute force.
- Member and gallery inputs are length-capped, control characters stripped, branch/year whitelisted.
- Join endpoint has a best-effort per-IP throttle (5/min per serverless instance).
- Gallery uploads go direct to Cloudinary via an unsigned preset restricted to the site's folder; only the resulting URL is stored.

## License

Private chapter site. All rights reserved.
