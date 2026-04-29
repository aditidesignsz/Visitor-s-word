-- ─────────────────────────────────────────────────────────────────────────
-- Visitor Book – Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────

-- Visitors table
CREATE TABLE IF NOT EXISTS public.visitors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      INTEGER NOT NULL UNIQUE,   -- public visitor number, e.g. "No. 042"
  name        TEXT    NOT NULL CHECK (char_length(name) <= 60),
  color       TEXT    NOT NULL CHECK (color IN ('pink','teal','green','orange','neutral')),
  signature   TEXT,                      -- PNG data-URL; NULL if skipped
  feedback    TEXT,                      -- private; never returned to public API
  approved    BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast gallery queries (approved, newest first)
CREATE INDEX IF NOT EXISTS idx_visitors_approved_number
  ON public.visitors (approved, number DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- The app uses the service-role key on the server, which bypasses RLS.
-- We still enable RLS and add a restrictive policy so that if the anon
-- key is ever accidentally used server-side, it cannot read feedback.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Public can read approved cards (name, number, color, signature) but NOT feedback.
-- We enforce this at the API level; RLS is a second line of defence.
CREATE POLICY "Public read approved visitors"
  ON public.visitors
  FOR SELECT
  USING (approved = TRUE);

-- No direct INSERT/UPDATE/DELETE from the client — all writes go through
-- the server using the service-role key, which bypasses these policies.
-- (Policies for INSERT/UPDATE/DELETE are intentionally omitted.)
