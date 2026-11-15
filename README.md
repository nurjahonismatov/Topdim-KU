# Topdik-KU — Modern Lost & Found Platform

Premium Liquid Glass UI Lost & Found website built with **HTML5, CSS3, Vanilla JavaScript**.

Supports **Uzbek (default)**, **Russian**, and **English**. Light / Dark mode. Fully responsive.

## Features

- Attractive landing page with live search, stats, categories, How it works
- Found & Lost listings with advanced filters, sorting, active chips
- Multi-step Report form with image preview — **guest posting allowed**
- My Collects (favorites)
- Internal messaging tied to listings
- Smart Match (category + keywords + location + date proximity)
- Auth (email + password, OTP shown on screen in demo, Google placeholder)
- User profile dashboard
- Basic Admin panel
- 3 languages (UZ / RU / EN) with localStorage persistence
- Light / Dark Liquid Glass theme with system preference detection
- Mobile-friendly navigation & layout

## Quick Start (Demo mode)

No backend required for the demo. Data is stored in **localStorage** (same browser only).

1. Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge).
2. Or serve locally:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080`.

### Guest posting

You can report items **without an account**. Optional name/phone is stored with the listing.

### Auth (demo)

Register any email + password (min 6 chars). The **6-digit OTP is shown on the screen** (demo mode). In production use real SMS/Email via Supabase Edge Functions.

### Multi-device / multi-user

localStorage is per-browser. Listings posted on one device will **not** appear on another until you connect **Supabase** (see Production section below). Same browser works fully.

## Project Structure

```
topdik-ku/
├── index.html          # Home
├── found.html          # Found items + filters
├── lost.html           # Lost items + filters
├── item.html           # Item details + Smart Match
├── report.html         # Multi-step report form
├── auth.html           # Login / Register / OTP
├── profile.html        # User dashboard
├── collects.html       # Saved items
├── messages.html       # Messaging
├── admin.html          # Admin panel
├── css/
│   ├── variables.css   # Design tokens (light/dark)
│   ├── base.css
│   ├── components.css  # Glass, buttons, cards, modals
│   └── layout.css      # Header, footer, hero, grids
├── js/
│   ├── theme.js        # Theme toggle + system preference
│   ├── i18n.js         # UZ / RU / EN dictionaries
│   ├── data.js         # Data layer + Smart Match + OTP demo
│   └── ui.js           # Header/footer, cards, toasts
└── README.md
```

## Production: Supabase Integration

The current data layer uses localStorage for a complete offline demo. For production:

### 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com)
- Create project
- Copy Project URL and anon key

### 2. Database schema (SQL)

```sql
-- users handled by auth.users

create table items (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('lost', 'found')) not null,
  title text not null,
  category text not null,
  description text not null,
  location text not null,
  city text,
  date date not null,
  time time,
  images text[] default '{}',
  status text default 'active' check (status in ('active', 'returned', 'pending')),
  user_id uuid references auth.users(id) on delete cascade,
  contact_pref text default 'messages',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table collects (
  user_id uuid references auth.users(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  primary key (user_id, item_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references auth.users(id),
  to_id uuid references auth.users(id),
  item_id uuid references items(id),
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  title text,
  body text,
  item_id uuid,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS and write policies for authenticated users
alter table items enable row level security;
-- ... add policies for select/insert/update/delete
```

### 3. Storage

Create a public bucket `item-images` with appropriate policies for authenticated uploads.

### 4. Auth

- Enable Email + Phone providers
- Enable Google OAuth (redirect URL)
- For OTP: use Supabase Auth phone/email magic links or custom Edge Functions that send SMS via Twilio / email via Resend. **Never store OTP secrets in frontend JS.**

### 5. Client setup

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabase = window.supabase.createClient(
    'YOUR_SUPABASE_URL',
    'YOUR_SUPABASE_ANON_KEY'
  );
</script>
```

Replace `DataStore` methods with Supabase queries (`from('items').select()`, `auth.signInWithPassword`, storage upload, realtime for messages, etc.).

## Security Notes

- OTP verification must run on the server (Edge Function / backend). Frontend only receives success/failure.
- Use Row Level Security on all tables.
- Sanitize user input; never trust client-side data for authorization.
- Rate-limit auth and report endpoints.
- Do not expose private phone numbers publicly; only through the messaging system after mutual interest.

## Browser Support

Modern evergreen browsers (last 2 versions of Chrome, Firefox, Safari, Edge).

## License

MIT — free to use and modify for personal and commercial projects.

---

Built with care for Uzbekistan 🇺🇿 — Topdik-KU
