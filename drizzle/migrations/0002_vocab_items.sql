CREATE TABLE public.vocab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correction text NOT NULL,
  original text,
  box integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocab_items TO authenticated;
GRANT ALL ON public.vocab_items TO service_role;
ALTER TABLE public.vocab_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vocab" ON public.vocab_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_vocab_user_due ON public.vocab_items(user_id, due_at);