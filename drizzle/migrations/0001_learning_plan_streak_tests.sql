CREATE TABLE public.learner_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal_minutes integer NOT NULL DEFAULT 15,
  level text NOT NULL DEFAULT 'beginner',
  onboarding_done boolean NOT NULL DEFAULT false,
  placement_done boolean NOT NULL DEFAULT false,
  points integer NOT NULL DEFAULT 0,
  xp_total integer NOT NULL DEFAULT 0,
  streak_current integer NOT NULL DEFAULT 0,
  streak_best integer NOT NULL DEFAULT 0,
  last_active_date date,
  shields integer NOT NULL DEFAULT 0,
  level_started_at timestamptz NOT NULL DEFAULT now(),
  plan_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.learner_profiles TO authenticated;
GRANT ALL ON public.learner_profiles TO service_role;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own learner profile select" ON public.learner_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own learner profile insert" ON public.learner_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own learner profile update" ON public.learner_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER learner_profiles_updated_at BEFORE UPDATE ON public.learner_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now()::date),
  minutes integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  exercises integer NOT NULL DEFAULT 0,
  goal_met boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity select" ON public.daily_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own activity insert" ON public.daily_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own activity update" ON public.daily_activity FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER daily_activity_updated_at BEFORE UPDATE ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.level_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'levelup',
  from_level text,
  to_level text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  passed boolean,
  feedback text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.level_tests TO authenticated;
GRANT ALL ON public.level_tests TO service_role;
ALTER TABLE public.level_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tests select" ON public.level_tests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tests insert" ON public.level_tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tests update" ON public.level_tests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER level_tests_updated_at BEFORE UPDATE ON public.level_tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_activity_user_day ON public.daily_activity (user_id, day DESC);
CREATE INDEX idx_level_tests_user_created ON public.level_tests (user_id, created_at DESC);