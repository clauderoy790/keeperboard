-- Migration 002: Enable RLS and policies for environments

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environments'
      AND policyname = 'environments_select_own'
  ) THEN
    CREATE POLICY environments_select_own
      ON public.environments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.games g
          WHERE g.id = environments.game_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environments'
      AND policyname = 'environments_insert_own'
  ) THEN
    CREATE POLICY environments_insert_own
      ON public.environments
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.games g
          WHERE g.id = environments.game_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environments'
      AND policyname = 'environments_update_own'
  ) THEN
    CREATE POLICY environments_update_own
      ON public.environments
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.games g
          WHERE g.id = environments.game_id
            AND g.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.games g
          WHERE g.id = environments.game_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environments'
      AND policyname = 'environments_delete_own'
  ) THEN
    CREATE POLICY environments_delete_own
      ON public.environments
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.games g
          WHERE g.id = environments.game_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;
END $$;
