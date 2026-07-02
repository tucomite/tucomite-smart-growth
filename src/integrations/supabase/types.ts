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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          record_id: string | null
          restaurant_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_activity: {
        Row: {
          created_at: string
          description: string | null
          id: string
          restaurant_id: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          restaurant_id: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          restaurant_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_activity_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_snapshots: {
        Row: {
          avg_margin: number
          created_at: string
          date: string
          id: string
          recs_applied: number
          recs_pending: number
          restaurant_id: string
          saved_applied: number
          saved_detected: number
          stock_value: number
          updated_at: string
          waste_estimate: number
        }
        Insert: {
          avg_margin?: number
          created_at?: string
          date: string
          id?: string
          recs_applied?: number
          recs_pending?: number
          restaurant_id: string
          saved_applied?: number
          saved_detected?: number
          stock_value?: number
          updated_at?: string
          waste_estimate?: number
        }
        Update: {
          avg_margin?: number
          created_at?: string
          date?: string
          id?: string
          recs_applied?: number
          recs_pending?: number
          restaurant_id?: string
          saved_applied?: number
          saved_detected?: number
          stock_value?: number
          updated_at?: string
          waste_estimate?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_snapshots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_ingredients: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          ingredient_id: string
          quantity: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          ingredient_id: string
          quantity?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          allergens: string[] | null
          category: string | null
          chef_notes: string | null
          cost: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          labor_cost: number
          margin: number | null
          monthly_sales: number
          name: string
          popularity: number
          recommended_price: number | null
          restaurant_id: string
          sale_price: number | null
          status: string
          target_margin: number
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category?: string | null
          chef_notes?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          labor_cost?: number
          margin?: number | null
          monthly_sales?: number
          name: string
          popularity?: number
          recommended_price?: number | null
          restaurant_id: string
          sale_price?: number | null
          status?: string
          target_margin?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category?: string | null
          chef_notes?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          labor_cost?: number
          margin?: number | null
          monthly_sales?: number
          name?: string
          popularity?: number
          recommended_price?: number | null
          restaurant_id?: string
          sale_price?: number | null
          status?: string
          target_margin?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          alternative_price: number | null
          alternative_supplier_id: string | null
          created_at: string
          current_price: number | null
          deleted_at: string | null
          expiration_date: string | null
          id: string
          name: string
          restaurant_id: string
          stock_minimum: number | null
          stock_quantity: number | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          alternative_price?: number | null
          alternative_supplier_id?: string | null
          created_at?: string
          current_price?: number | null
          deleted_at?: string | null
          expiration_date?: string | null
          id?: string
          name: string
          restaurant_id: string
          stock_minimum?: number | null
          stock_quantity?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          alternative_price?: number | null
          alternative_supplier_id?: string | null
          created_at?: string
          current_price?: number | null
          deleted_at?: string | null
          expiration_date?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          stock_minimum?: number | null
          stock_quantity?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_alternative_supplier_id_fkey"
            columns: ["alternative_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string | null
          quantity: number
          reason: string | null
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          quantity: number
          reason?: string | null
          restaurant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          quantity?: number
          reason?: string | null
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          restaurant_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          restaurant_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          restaurant_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          cause: string | null
          created_at: string
          deleted_at: string | null
          economic_impact: number | null
          id: string
          priority: string
          problem: string | null
          restaurant_id: string
          solution: string | null
          status: string
          time_impact: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cause?: string | null
          created_at?: string
          deleted_at?: string | null
          economic_impact?: number | null
          id?: string
          priority?: string
          problem?: string | null
          restaurant_id: string
          solution?: string | null
          status?: string
          time_impact?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cause?: string | null
          created_at?: string
          deleted_at?: string | null
          economic_impact?: number | null
          id?: string
          priority?: string
          problem?: string | null
          restaurant_id?: string
          solution?: string | null
          status?: string
          time_impact?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          cuisine_type: string | null
          employees_count: number | null
          employees_range: string | null
          id: string
          locations_count: string | null
          menu_source: string | null
          name: string
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          cuisine_type?: string | null
          employees_count?: number | null
          employees_range?: string | null
          id?: string
          locations_count?: string | null
          menu_source?: string | null
          name: string
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          cuisine_type?: string | null
          employees_count?: number | null
          employees_range?: string | null
          id?: string
          locations_count?: string | null
          menu_source?: string | null
          name?: string
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          delivery_time: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_time?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_time?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_snapshots_30d: { Args: { rid: string }; Returns: undefined }
      current_restaurant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _restaurant_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_daily_snapshot: { Args: { rid: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "manager" | "kitchen" | "finance" | "staff"
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
      app_role: ["owner", "manager", "kitchen", "finance", "staff"],
    },
  },
} as const
