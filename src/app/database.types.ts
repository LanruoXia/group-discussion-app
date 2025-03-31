export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          school: string | null
          grade: string | null
          created_at: string
          updated_at: string
          username: string | null
        }
        Insert: {
          id: string
          name?: string | null
          school?: string | null
          grade?: string | null
          created_at?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          school?: string | null
          grade?: string | null
          created_at?: string
          updated_at?: string
          username?: string | null
        }
      }
      sessions: {
        Row: {
          id: string  // uuid
          created_at: string | null  // timestamp with time zone
          created_by: string  // uuid, references auth.users
          status: 'waiting' | 'preparation' | 'discussion' | 'evaluation' | 'completed' | null  // text with check constraint
          ai_count: number  // integer
          session_code: string  // text, unique
          instructions: string | null  // text
          test_topic: string  // text
          expires_at: string | null  // timestamp with time zone
        }
        Insert: {
          id?: string
          created_at?: string | null
          created_by: string
          status?: 'waiting' | 'preparation' | 'discussion' | 'evaluation' | 'completed' | null
          ai_count?: number
          session_code: string
          instructions?: string | null
          test_topic: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          created_by?: string
          status?: 'waiting' | 'preparation' | 'discussion' | 'evaluation' | 'completed' | null
          ai_count?: number
          session_code?: string
          instructions?: string | null
          test_topic?: string
          expires_at?: string | null
        }
      }
      participants: {
        Row: {
          id: string
          created_at: string
          session_id: string
          user_id: string
          is_ai: boolean
          ai_prompt?: string
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          user_id: string
          is_ai: boolean
          ai_prompt?: string
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          user_id?: string
          is_ai?: boolean
          ai_prompt?: string
        }
      }
      recordings: {
        Row: {
          id: string
          created_at: string
          session_id: string
          user_id: string
          channel_name: string
          recording_url: string
          transcript?: string
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          user_id: string
          channel_name: string
          recording_url: string
          transcript?: string
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          user_id?: string
          channel_name?: string
          recording_url?: string
          transcript?: string
        }
      }
      evaluations: {
        Row: {
          id: string
          created_at: string
          session_id: string
          user_id: string
          evaluation_text: string
          score: number
          feedback: string
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          user_id: string
          evaluation_text: string
          score: number
          feedback: string
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          user_id?: string
          evaluation_text?: string
          score?: number
          feedback?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 