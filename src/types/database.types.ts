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
          participant: string
          pronunciation_delivery_score: number
          pronunciation_delivery_comment: string
          communication_strategies_score: number
          communication_strategies_comment: string
          vocabulary_patterns_score: number
          vocabulary_patterns_comment: string
          ideas_organization_score: number
          ideas_organization_comment: string
          user_id: string | null
          session_id: string | null
          speaking_time: number | null
          word_count: number | null
        }
        Insert: {
          id?: string
          participant: string
          pronunciation_delivery_score: number
          pronunciation_delivery_comment: string
          communication_strategies_score: number
          communication_strategies_comment: string
          vocabulary_patterns_score: number
          vocabulary_patterns_comment: string
          ideas_organization_score: number
          ideas_organization_comment: string
          user_id?: string | null
          session_id?: string | null
          speaking_time?: number | null
          word_count?: number | null
        }
        Update: {
          id?: string
          participant?: string
          pronunciation_delivery_score?: number
          pronunciation_delivery_comment?: string
          communication_strategies_score?: number
          communication_strategies_comment?: string
          vocabulary_patterns_score?: number
          vocabulary_patterns_comment?: string
          ideas_organization_score?: number
          ideas_organization_comment?: string
          user_id?: string | null
          session_id?: string | null
          speaking_time?: number | null
          word_count?: number | null
        }
      }
      merged_transcripts: {
        Row: {
          id: string
          session_id: string
          merged_transcript: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          merged_transcript: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          merged_transcript?: string
          created_at?: string
        }
      }
      prompt: {
        Row: {
          id: string
          test_topic: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          test_topic: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          test_topic?: string
          content?: string
          created_at?: string | null
        }
      }
      rubric: {
        Row: {
          id: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          content?: string
          created_at?: string | null
        }
      }
      transcripts: {
        Row: {
          id: string
          session_id: string
          user_id: string
          transcript: Json
          start_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          transcript: Json
          start_at: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          transcript?: Json
          start_at?: string
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