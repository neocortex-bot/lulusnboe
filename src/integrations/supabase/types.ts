export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      case_ai_recommendations: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          decisions: Json
          id: string
          kind: string
          result: Json
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          decisions?: Json
          id?: string
          kind: string
          result?: Json
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          decisions?: Json
          id?: string
          kind?: string
          result?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_ai_recommendations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_answer_keys: {
        Row: {
          answer_key_edited_at: string | null
          answer_key_text: string
          case_id: string
          checklist_rubric: Json
          created_at: string
          id: string
          previous_answer_key_text: string | null
          previous_rubric_items: Json | null
          rubric_edited_at: string | null
        }
        Insert: {
          answer_key_edited_at?: string | null
          answer_key_text?: string
          case_id: string
          checklist_rubric?: Json
          created_at?: string
          id?: string
          previous_answer_key_text?: string | null
          previous_rubric_items?: Json | null
          rubric_edited_at?: string | null
        }
        Update: {
          answer_key_edited_at?: string | null
          answer_key_text?: string
          case_id?: string
          checklist_rubric?: Json
          created_at?: string
          id?: string
          previous_answer_key_text?: string | null
          previous_rubric_items?: Json | null
          rubric_edited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_answer_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_assets: {
        Row: {
          answer_text: string
          asset_type: string
          asset_url: string
          case_id: string
          category: string
          created_at: string
          id: string
          trigger_keywords: string[]
        }
        Insert: {
          answer_text?: string
          asset_type?: string
          asset_url: string
          case_id: string
          category?: string
          created_at?: string
          id?: string
          trigger_keywords?: string[]
        }
        Update: {
          answer_text?: string
          asset_type?: string
          asset_url?: string
          case_id?: string
          category?: string
          created_at?: string
          id?: string
          trigger_keywords?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "case_assets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_final_reviews: {
        Row: {
          case_id: string
          checked_by: string | null
          content_hash: string
          created_at: string
          passed: boolean
          result: Json
          stale: boolean
          updated_at: string
        }
        Insert: {
          case_id: string
          checked_by?: string | null
          content_hash: string
          created_at?: string
          passed?: boolean
          result: Json
          stale?: boolean
          updated_at?: string
        }
        Update: {
          case_id?: string
          checked_by?: string | null
          content_hash?: string
          created_at?: string
          passed?: boolean
          result?: Json
          stale?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_final_reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_cases: {
        Row: {
          answer_key_text: string
          category: string | null
          checklist_rubric: Json
          created_at: string
          created_by: string | null
          exam_mode: string
          id: string
          initial_prompt: string
          is_nboe: boolean
          nboe_period: string | null
          properties: string[]
          property_sync_checked_at: string | null
          questions_text: string
          reading_time_seconds: number
          reviewed_at: string | null
          reviewed_by: string | null
          rubric_mode: string
          show_results_to_candidate: boolean
          source: string
          status: string
          time_limit_seconds: number
          title: string
        }
        Insert: {
          answer_key_text?: string
          category?: string | null
          checklist_rubric?: Json
          created_at?: string
          created_by?: string | null
          exam_mode?: string
          id?: string
          initial_prompt?: string
          is_nboe?: boolean
          nboe_period?: string | null
          properties?: string[]
          property_sync_checked_at?: string | null
          questions_text?: string
          reading_time_seconds?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_mode?: string
          show_results_to_candidate?: boolean
          source?: string
          status?: string
          time_limit_seconds?: number
          title: string
        }
        Update: {
          answer_key_text?: string
          category?: string | null
          checklist_rubric?: Json
          created_at?: string
          created_by?: string | null
          exam_mode?: string
          id?: string
          initial_prompt?: string
          is_nboe?: boolean
          nboe_period?: string | null
          properties?: string[]
          property_sync_checked_at?: string | null
          questions_text?: string
          reading_time_seconds?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_mode?: string
          show_results_to_candidate?: boolean
          source?: string
          status?: string
          time_limit_seconds?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_access: {
        Row: {
          allowed: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          allowed?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          allowed?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exam_deployment_requests: {
        Row: {
          created_at: string
          payload: Json
          request_id: string
        }
        Insert: {
          created_at?: string
          payload: Json
          request_id: string
        }
        Update: {
          created_at?: string
          payload?: Json
          request_id?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          ai_eval_error: string | null
          ai_eval_queued_at: string | null
          ai_eval_started_at: string | null
          ai_eval_status: string | null
          ai_score_report: Json | null
          audio_file_url: string | null
          candidate_id: string
          created_at: string
          id: string
          session_id: string
          transcript: string | null
        }
        Insert: {
          ai_eval_error?: string | null
          ai_eval_queued_at?: string | null
          ai_eval_started_at?: string | null
          ai_eval_status?: string | null
          ai_score_report?: Json | null
          audio_file_url?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          session_id: string
          transcript?: string | null
        }
        Update: {
          ai_eval_error?: string | null
          ai_eval_queued_at?: string | null
          ai_eval_started_at?: string | null
          ai_eval_status?: string | null
          ai_score_report?: Json | null
          audio_file_url?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          session_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sequence_items: {
        Row: {
          case_id: string
          created_at: string
          deployment_id: string
          id: string
          sequence_order: number
          session_id: string | null
          station_token: string
        }
        Insert: {
          case_id: string
          created_at?: string
          deployment_id: string
          id?: string
          sequence_order: number
          session_id?: string | null
          station_token: string
        }
        Update: {
          case_id?: string
          created_at?: string
          deployment_id?: string
          id?: string
          sequence_order?: number
          session_id?: string | null
          station_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sequence_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sequence_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          case_id: string
          created_at: string
          current_candidate_id: string | null
          examiner_id: string | null
          id: string
          session_start_time: string | null
          show_examiner_panel: boolean
          show_results_to_candidate_override: boolean
          station_token: string
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          current_candidate_id?: string | null
          examiner_id?: string | null
          id?: string
          session_start_time?: string | null
          show_examiner_panel?: boolean
          show_results_to_candidate_override?: boolean
          station_token: string
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          current_candidate_id?: string | null
          examiner_id?: string | null
          id?: string
          session_start_time?: string | null
          show_examiner_panel?: boolean
          show_results_to_candidate_override?: boolean
          station_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "clinical_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_current_candidate_id_fkey"
            columns: ["current_candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          dob: string | null
          email: string
          full_name: string
          id: string
          nim: string | null
        }
        Insert: {
          created_at?: string
          dob?: string | null
          email: string
          full_name: string
          id: string
          nim?: string | null
        }
        Update: {
          created_at?: string
          dob?: string | null
          email?: string
          full_name?: string
          id?: string
          nim?: string | null
        }
        Relationships: []
      }
      station_deployment_resets: {
        Row: {
          completed_deployment_id: string
          created_at: string
          next_deployment_id: string
          next_session_id: string
          next_station_token: string
        }
        Insert: {
          completed_deployment_id: string
          created_at?: string
          next_deployment_id: string
          next_session_id: string
          next_station_token: string
        }
        Update: {
          completed_deployment_id?: string
          created_at?: string
          next_deployment_id?: string
          next_session_id?: string
          next_station_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_deployment_resets_next_session_id_fkey"
            columns: ["next_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_station_sequence: {
        Args: { _completed_sequence_order: number; _station_token: string }
        Returns: {
          next_case_id: string
          next_id: string
          next_is_last: boolean
          next_sequence_order: number
          next_session_start_time: string
          next_station_token: string
          next_status: string
          outcome: string
        }[]
      }
      apply_final_case_review: {
        Args: { _case_id: string }
        Returns: undefined
      }
      can_view_case_at_station: {
        Args: { _case_id: string; _station_token: string }
        Returns: boolean
      }
      claim_ai_evaluation: { Args: { _result_id: string }; Returns: string }
      claim_exam_session: {
        Args: { _candidate_id: string; _session_id: string }
        Returns: Json
      }
      claim_next_ai_evaluation: { Args: never; Returns: string }
      deploy_exam_batch: {
        Args: { _request_id: string; _stations: Json }
        Returns: {
          id: string
          station_token: string
        }[]
      }
      exam_waiting_deadline: { Args: { _session_id: string }; Returns: string }
      final_case_ready: { Args: { _case_id: string }; Returns: boolean }
      get_case_assets_for_display: {
        Args: { _case_id: string; _station_token?: string }
        Returns: {
          answer_text: string
          asset_type: string
          asset_url: string
          category: string
          id: string
          trigger_keywords: string[]
        }[]
      }
      get_case_digital_properties: {
        Args: { _case_id: string; _station_token?: string }
        Returns: Json
      }
      get_case_display: {
        Args: { _case_id: string }
        Returns: {
          exam_mode: string
          initial_prompt: string
          questions_text: string
          reading_time_seconds: number
          show_results_to_candidate: boolean
          time_limit_seconds: number
          title: string
        }[]
      }
      get_final_case_input: { Args: { _case_id: string }; Returns: Json }
      get_session_by_token: {
        Args: { _token: string }
        Returns: {
          case_id: string
          deployment_id: string
          expires_at: string
          id: string
          sequence_order: number
          sequence_total: number
          session_start_time: string
          show_examiner_panel: boolean
          status: string
        }[]
      }
      get_station_sequence_items: {
        Args: { _station_token: string }
        Returns: {
          deployment_id: string
          sequence_order: number
          session_id: string
          station_token: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_deployment_participant: {
        Args: { _deployment_id: string }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      reconcile_rubric_report: {
        Args: { _report: Json; _rubric: Json }
        Returns: Json
      }
      record_final_case_review: {
        Args: {
          _case_id: string
          _checked_by: string
          _input: Json
          _result: Json
        }
        Returns: undefined
      }
      regenerate_station_session:
        | {
            Args: { _case_id: string; _new_token: string }
            Returns: {
              case_id: string
              id: string
              session_start_time: string
              status: string
            }[]
          }
        | {
            Args: {
              _case_id: string
              _new_token: string
              _previous_station_token: string
            }
            Returns: {
              case_id: string
              id: string
              session_start_time: string
              status: string
            }[]
          }
      reset_completed_station_sequence: {
        Args: { _new_tokens: string[]; _station_token: string }
        Returns: {
          case_id: string
          deployment_id: string
          id: string
          session_start_time: string
          station_token: string
          status: string
        }[]
      }
      reset_window_open: { Args: { _station_token: string }; Returns: boolean }
      rubric_text_head: { Args: { _text: string }; Returns: string }
      rubric_text_projection: { Args: { _rubric: Json }; Returns: Json }
      start_exam_timer: { Args: { _session_id: string }; Returns: string }
      start_preparation_practice: {
        Args: { _case_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "candidate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "candidate"],
    },
  },
} as const
