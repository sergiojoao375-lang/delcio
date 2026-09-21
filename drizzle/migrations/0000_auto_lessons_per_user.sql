ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS focus text;

CREATE INDEX IF NOT EXISTS lessons_owner_id_idx ON public.lessons(owner_id);

DROP POLICY IF EXISTS "users read own generated lessons" ON public.lessons;
CREATE POLICY "users read own generated lessons"
ON public.lessons FOR SELECT TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "users insert own generated lessons" ON public.lessons;
CREATE POLICY "users insert own generated lessons"
ON public.lessons FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND source = 'auto');

DROP POLICY IF EXISTS "users delete own generated lessons" ON public.lessons;
CREATE POLICY "users delete own generated lessons"
ON public.lessons FOR DELETE TO authenticated
USING (owner_id = auth.uid() AND source = 'auto');

DROP POLICY IF EXISTS "anyone reads published lessons" ON public.lessons;
CREATE POLICY "anyone reads published lessons"
ON public.lessons FOR SELECT TO anon, authenticated
USING (published = true AND owner_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT ON public.lessons TO anon;
GRANT ALL ON public.lessons TO service_role;