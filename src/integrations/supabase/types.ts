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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          body_markdown: string | null
          context_notes: string | null
          created_at: string
          framework: string
          id: string
          klaviyo_campaign_id: string | null
          language: string
          name: string
          notion_url: string | null
          preview_text: string | null
          shopify_product_ids: string[] | null
          status: string
          subject_line: string | null
          subject_tone: string | null
          type: string
          updated_at: string
          whatsapp_copy: string | null
        }
        Insert: {
          body_markdown?: string | null
          context_notes?: string | null
          created_at?: string
          framework?: string
          id?: string
          klaviyo_campaign_id?: string | null
          language?: string
          name: string
          notion_url?: string | null
          preview_text?: string | null
          shopify_product_ids?: string[] | null
          status?: string
          subject_line?: string | null
          subject_tone?: string | null
          type: string
          updated_at?: string
          whatsapp_copy?: string | null
        }
        Update: {
          body_markdown?: string | null
          context_notes?: string | null
          created_at?: string
          framework?: string
          id?: string
          klaviyo_campaign_id?: string | null
          language?: string
          name?: string
          notion_url?: string | null
          preview_text?: string | null
          shopify_product_ids?: string[] | null
          status?: string
          subject_line?: string | null
          subject_tone?: string | null
          type?: string
          updated_at?: string
          whatsapp_copy?: string | null
        }
        Relationships: []
      }
      corrections: {
        Row: {
          campaign_id: string | null
          category: string
          corrected_text: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          note: string | null
          original_text: string
        }
        Insert: {
          campaign_id?: string | null
          category?: string
          corrected_text: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          note?: string | null
          original_text: string
        }
        Update: {
          campaign_id?: string | null
          category?: string
          corrected_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          note?: string | null
          original_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_emails: {
        Row: {
          body_markdown: string | null
          campaign_id: string | null
          campaign_name: string
          created_at: string
          framework: string | null
          id: string
          language: string | null
          model_used: string | null
          preview_text: string | null
          subject_line: string | null
          whatsapp_copy: string | null
        }
        Insert: {
          body_markdown?: string | null
          campaign_id?: string | null
          campaign_name: string
          created_at?: string
          framework?: string | null
          id?: string
          language?: string | null
          model_used?: string | null
          preview_text?: string | null
          subject_line?: string | null
          whatsapp_copy?: string | null
        }
        Update: {
          body_markdown?: string | null
          campaign_id?: string | null
          campaign_name?: string
          created_at?: string
          framework?: string | null
          id?: string
          language?: string | null
          model_used?: string | null
          preview_text?: string | null
          subject_line?: string | null
          whatsapp_copy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
