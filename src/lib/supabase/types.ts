export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "platform_tenant_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          bucket: string
          checksum: string | null
          created_at: string
          height: number | null
          id: string
          mime_type: string
          path: string
          provider: Database["public"]["Enums"]["storage_provider"]
          size_bytes: number
          tenant_id: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket: string
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          path: string
          provider?: Database["public"]["Enums"]["storage_provider"]
          size_bytes: number
          tenant_id: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          path?: string
          provider?: Database["public"]["Enums"]["storage_provider"]
          size_bytes?: number
          tenant_id?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "platform_tenant_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          suspended_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          suspended_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          suspended_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "platform_tenant_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string
          deleted_at: string | null
          id: string
          limits: Json
          name: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          storage_bucket: string
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          limits?: Json
          name: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          storage_bucket?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          limits?: Json
          name?: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          storage_bucket?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      users_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_superadmin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_superadmin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_superadmin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      platform_tenant_overview: {
        Row: {
          branding: Json | null
          created_at: string | null
          id: string | null
          last_activity_at: string | null
          limits: Json | null
          name: string | null
          plan: Database["public"]["Enums"]["tenant_plan"] | null
          slug: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          storage_bytes: number | null
          users_count: number | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          id?: string | null
          last_activity_at?: never
          limits?: Json | null
          name?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          storage_bytes?: never
          users_count?: never
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          id?: string | null
          last_activity_at?: never
          limits?: Json | null
          name?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          storage_bytes?: never
          users_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      has_tenant_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["tenant_role"][]
          p_tenant: string
        }
        Returns: boolean
      }
      is_platform_context: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_tenant_manager: { Args: { p_tenant: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant: string }; Returns: boolean }
      user_tenant_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      storage_provider: "SUPABASE" | "S3" | "R2"
      tenant_plan: "FREE" | "PRO" | "ENTERPRISE"
      tenant_role: "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR"
      tenant_status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      storage_provider: ["SUPABASE", "S3", "R2"],
      tenant_plan: ["FREE", "PRO", "ENTERPRISE"],
      tenant_role: ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR"],
      tenant_status: ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"],
    },
  },
} as const

