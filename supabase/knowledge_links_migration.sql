-- ─────────────────────────────────────────────────────────────────────────────
-- Knowledge Links Table Migration
-- Run this in the Supabase SQL Editor for your project.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    description TEXT,
    type        TEXT NOT NULL DEFAULT 'other'
                CHECK (type IN ('google_sheet', 'google_doc', 'word_doc', 'pdf', 'other')),
    category    TEXT NOT NULL DEFAULT 'General',
    added_by_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS knowledge_links_type_idx       ON public.knowledge_links (type);
CREATE INDEX IF NOT EXISTS knowledge_links_category_idx   ON public.knowledge_links (category);
CREATE INDEX IF NOT EXISTS knowledge_links_added_by_idx   ON public.knowledge_links (added_by_id);
CREATE INDEX IF NOT EXISTS knowledge_links_created_at_idx ON public.knowledge_links (created_at DESC);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.knowledge_links ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view links
CREATE POLICY "knowledge_links: select for authenticated"
    ON public.knowledge_links FOR SELECT
    USING (auth.role() = 'authenticated');

-- Any authenticated user can add a link
CREATE POLICY "knowledge_links: insert for authenticated"
    ON public.knowledge_links FOR INSERT
    WITH CHECK (auth.uid() = added_by_id);

-- Only the original author can update their link
CREATE POLICY "knowledge_links: update own"
    ON public.knowledge_links FOR UPDATE
    USING (auth.uid() = added_by_id);

-- Only the original author can delete their link
CREATE POLICY "knowledge_links: delete own"
    ON public.knowledge_links FOR DELETE
    USING (auth.uid() = added_by_id);

-- ── Grant access ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_links TO authenticated;