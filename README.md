# Visitor Book

A standalone portfolio visitor system. Visitors sign a card with their name,
a canvas signature, and an optional private feedback message. Cards are
displayed in a public gallery after owner approval. Feedback is stored
privately and only accessible via an admin API.

**Stack:** Next.js 14 · TypeScript · Supabase (Postgres) · Vercel

---

## Project structure

```
visitor-app/
├── lib/
│   ├── supabase.ts        # Supabase client factory (server-side only)
│   ├── types.ts           # Shared types, CardColor, PALETTE, toPublic()
│   ├── validation.ts      # Pure validation helpers (name, signature, feedback)
│   ├── visitor-name.ts    # Random whimsical name generator
│   └── db.ts              # All database operations (server-side only)
├── pages/
│   ├── _app.tsx           # Global CSS import
│   ├── index.tsx          # Full visitor UI (form + gallery)
│   └── api/
│       ├── visit.ts       # GET / POST / DELETE — visitor's own card
│       ├── visitors.ts    # GET — public approved gallery feed
│       └── admin/
│           └── visitors.ts  # GET / PATCH — admin endpoint with feedback
├── styles/
│   └── globals.css        # Full design system (paper & ink aesthetic)
├── supabase-schema.sql    # Run once to set up your database
├── .env.local.example     # Copy to .env.local and fill in values
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 1 · Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project** and note your project name and region.
3. Once the project is ready, open **SQL Editor** → **New Query**.
4. Paste the contents of `supabase-schema.sql` and click **Run**.
5. Go to **Project Settings** → **API** and copy:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2 · Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_TOKEN=your-secret-token          # generate with: openssl rand -hex 32
```

> **Important:** `.env.local` is git-ignored. Never commit real keys.

---

## 3 · Run locally

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 4 · Deploy on Vercel

### Option A — Vercel CLI (recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Follow the prompts. When asked about environment variables, add them manually
in the next step.

### Option B — GitHub + Vercel dashboard

1. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/your-username/visitor-app.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel will detect Next.js automatically — no framework settings to change.
4. **Before deploying**, add environment variables in
   **Settings → Environment Variables**:
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase dashboard |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase dashboard |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard |
   | `ADMIN_TOKEN` | your secret token |
5. Click **Deploy**.

---

## 5 · Admin API

All admin routes require the `Authorization: Bearer <ADMIN_TOKEN>` header.

### List all visitors with feedback

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-app.vercel.app/api/admin/visitors
```

Response:
```json
{
  "visitors": [
    {
      "id": "uuid",
      "number": 1,
      "name": "flower dreamer",
      "color": "teal",
      "signature": "data:image/png;base64,...",
      "feedback": "Hello from the internet!",
      "approved": false,
      "issued_at": "2024-05-01T12:00:00.000Z"
    }
  ],
  "total": 1,
  "offset": 0
}
```

### Approve a single card

```bash
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
     "https://your-app.vercel.app/api/admin/visitors?action=approve&id=VISITOR_UUID"
```

### Approve all pending cards

```bash
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
     "https://your-app.vercel.app/api/admin/visitors?action=approve-all"
```

---

## 6 · How it works

| Concern | Implementation |
|---------|---------------|
| Visitor identity | HttpOnly cookie `vid` set on first POST; lasts 1 year |
| Returning visitors | GET /api/visit checks cookie → returns existing card |
| Feedback privacy | `feedback` column excluded from every public SELECT; stripped before any public API response |
| Approval flow | New cards have `approved = false`; only approved cards appear in the public gallery |
| Admin auth | Bearer token compared with `ADMIN_TOKEN` env var; fails closed if not set |
| Signature storage | PNG data-URL stored in Supabase text column (max 60 KB) |

---

## 7 · Customisation

- **Card colours** — edit `PALETTE` in `lib/types.ts`
- **Name word lists** — edit `adjectives` / `nouns` in `lib/visitor-name.ts`
- **Feedback word limit** — change `FEEDBACK_MAX_WORDS` in `lib/types.ts`
- **Auto-approve cards** — change `approved: false` to `approved: true` in `lib/db.ts → createVisitor()`
- **Design** — all visual tokens are CSS custom properties in `styles/globals.css`
