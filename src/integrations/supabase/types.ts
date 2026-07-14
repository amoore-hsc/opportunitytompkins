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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_counts: {
        Row: {
          application_date: string
          count: number
          created_at: string
          id: string
          opportunity_id: string
        }
        Insert: {
          application_date?: string
          count?: number
          created_at?: string
          id?: string
          opportunity_id: string
        }
        Update: {
          application_date?: string
          count?: number
          created_at?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_counts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_opportunities: {
        Row: {
          active: boolean
          created_at: string
          employer: string
          employment_type: string | null
          id: string
          is_manual: boolean
          job_category: string | null
          job_title: string
          location: string | null
          posting_url: string
          source_id: string | null
          source_site: string
          special_requirements: string | null
          updated_at: string
          wage: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          employer: string
          employment_type?: string | null
          id?: string
          is_manual?: boolean
          job_category?: string | null
          job_title: string
          location?: string | null
          posting_url: string
          source_id?: string | null
          source_site?: string
          special_requirements?: string | null
          updated_at?: string
          wage?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          employer?: string
          employment_type?: string | null
          id?: string
          is_manual?: boolean
          job_category?: string | null
          job_title?: string
          location?: string | null
          posting_url?: string
          source_id?: string | null
          source_site?: string
          special_requirements?: string | null
          updated_at?: string
          wage?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          active: boolean
          additional_requirements: string | null
          admin_contact_name: string | null
          admin_email: string | null
          contact_name: string | null
          created_at: string
          days_times_available: string
          deactivated_at: string | null
          description: string
          edit_token: string
          hours_available: string
          id: string
          interest_notification_sent_at: string | null
          location: string
          on_bus_route: boolean
          org_email: string
          org_name: string
          org_phone: string
          position_title: string | null
          positions_filled: number | null
          program_components: string | null
          program_name: string | null
          reminder_sent_at: string | null
          removal_reason: string | null
          role_classification: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          additional_requirements?: string | null
          admin_contact_name?: string | null
          admin_email?: string | null
          contact_name?: string | null
          created_at?: string
          days_times_available: string
          deactivated_at?: string | null
          description: string
          edit_token?: string
          hours_available: string
          id?: string
          interest_notification_sent_at?: string | null
          location: string
          on_bus_route?: boolean
          org_email: string
          org_name: string
          org_phone: string
          position_title?: string | null
          positions_filled?: number | null
          program_components?: string | null
          program_name?: string | null
          reminder_sent_at?: string | null
          removal_reason?: string | null
          role_classification?: string | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          additional_requirements?: string | null
          admin_contact_name?: string | null
          admin_email?: string | null
          contact_name?: string | null
          created_at?: string
          days_times_available?: string
          deactivated_at?: string | null
          description?: string
          edit_token?: string
          hours_available?: string
          id?: string
          interest_notification_sent_at?: string | null
          location?: string
          on_bus_route?: boolean
          org_email?: string
          org_name?: string
          org_phone?: string
          position_title?: string | null
          positions_filled?: number | null
          program_components?: string | null
          program_name?: string | null
          reminder_sent_at?: string | null
          removal_reason?: string | null
          role_classification?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      scrape_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_scraped_at: string | null
          name: string
          scrape_config: Json | null
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          name: string
          scrape_config?: Json | null
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          name?: string
          scrape_config?: Json | null
          url?: string
        }
        Relationships: []
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
      get_public_opportunities: {
        Args: never
        Returns: {
          additional_requirements: string
          created_at: string
          days_times_available: string
          description: string
          hours_available: string
          id: string
          location: string
          on_bus_route: boolean
          org_name: string
          position_title: string
          program_components: string
          program_name: string
          role_classification: string
          type: string
          updated_at: string
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
