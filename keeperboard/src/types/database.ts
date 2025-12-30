// Database types matching the KeeperBoard schema
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          game_id: string;
          environment: 'dev' | 'prod';
          key_prefix: string;
          key_hash: string;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          environment: 'dev' | 'prod';
          key_prefix: string;
          key_hash: string;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          environment?: 'dev' | 'prod';
          key_prefix?: string;
          key_hash?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
      };
      leaderboards: {
        Row: {
          id: string;
          game_id: string;
          name: string;
          slug: string;
          sort_order: 'asc' | 'desc';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          name?: string;
          slug?: string;
          sort_order?: 'asc' | 'desc';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          name?: string;
          slug?: string;
          sort_order?: 'asc' | 'desc';
          created_at?: string;
          updated_at?: string;
        };
      };
      scores: {
        Row: {
          id: string;
          leaderboard_id: string;
          player_guid: string | null;
          player_name: string;
          score: number;
          metadata: Json;
          is_migrated: boolean;
          migrated_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          leaderboard_id: string;
          player_guid?: string | null;
          player_name: string;
          score: number;
          metadata?: Json;
          is_migrated?: boolean;
          migrated_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          leaderboard_id?: string;
          player_guid?: string | null;
          player_name?: string;
          score?: number;
          metadata?: Json;
          is_migrated?: boolean;
          migrated_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
