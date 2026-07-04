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
          actor: string | null
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          event_type: string | null
          id: string
          ip: unknown
          metadata: Json | null
          method: string | null
          record_id: string | null
          request_id: string | null
          restaurant_id: string | null
          result: string | null
          severity: string | null
          source: string | null
          status_code: number | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          event_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          method?: string | null
          record_id?: string | null
          request_id?: string | null
          restaurant_id?: string | null
          result?: string | null
          severity?: string | null
          source?: string | null
          status_code?: number | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          event_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          method?: string | null
          record_id?: string | null
          request_id?: string | null
          restaurant_id?: string | null
          result?: string | null
          severity?: string | null
          source?: string | null
          status_code?: number | null
          table_name?: string | null
          user_agent?: string | null
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
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          restaurant_id: string
          runs_count: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          restaurant_id: string
          runs_count?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          restaurant_id?: string
          runs_count?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_tasks: {
        Row: {
          applied_at: string | null
          created_at: string
          dedupe_key: string | null
          detail: string | null
          id: string
          mode: string
          payload: Json
          reason: string | null
          recommendation_id: string | null
          restaurant_id: string
          reverted_at: string | null
          rule_id: string | null
          scheduled_for: string | null
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          detail?: string | null
          id?: string
          mode?: string
          payload?: Json
          reason?: string | null
          recommendation_id?: string | null
          restaurant_id: string
          reverted_at?: string | null
          rule_id?: string | null
          scheduled_for?: string | null
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          detail?: string | null
          id?: string
          mode?: string
          payload?: Json
          reason?: string | null
          recommendation_id?: string | null
          restaurant_id?: string
          reverted_at?: string | null
          rule_id?: string | null
          scheduled_for?: string | null
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_tasks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
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
      committee_briefs: {
        Row: {
          body: string | null
          brief_date: string
          created_at: string
          headline: string
          id: string
          metrics: Json
          period: string
          restaurant_id: string
        }
        Insert: {
          body?: string | null
          brief_date: string
          created_at?: string
          headline: string
          id?: string
          metrics?: Json
          period: string
          restaurant_id: string
        }
        Update: {
          body?: string | null
          brief_date?: string
          created_at?: string
          headline?: string
          id?: string
          metrics?: Json
          period?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_briefs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          reason: string | null
          restaurant_id: string
          result: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id: string
          result?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id?: string
          result?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_log_restaurant_id_fkey"
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
      hmac_nonces: {
        Row: {
          bucket: string
          created_at: string
          expires_at: string
          signature: string
          signed_ts: number
        }
        Insert: {
          bucket: string
          created_at?: string
          expires_at: string
          signature: string
          signed_ts: number
        }
        Update: {
          bucket?: string
          created_at?: string
          expires_at?: string
          signature?: string
          signed_ts?: number
        }
        Relationships: []
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
          invoice_item_id: string | null
          quantity: number
          reason: string | null
          restaurant_id: string
          source_id: string | null
          source_type: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          invoice_item_id?: string | null
          quantity: number
          reason?: string | null
          restaurant_id: string
          source_id?: string | null
          source_type?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          invoice_item_id?: string | null
          quantity?: number
          reason?: string | null
          restaurant_id?: string
          source_id?: string | null
          source_type?: string | null
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
            foreignKeyName: "inventory_movements_invoice_item_fk"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
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
      invoice_application_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          performed_by: string | null
          restaurant_id: string
          run_type: string
          status: string
          summary: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          performed_by?: string | null
          restaurant_id: string
          run_type: string
          status: string
          summary?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          performed_by?: string | null
          restaurant_id?: string
          run_type?: string
          status?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_application_runs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_application_runs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          base_quantity: number | null
          base_unit: string | null
          confidence_score: number | null
          conversion_factor: number | null
          created_at: string
          description: string | null
          id: string
          ignored_reason: string | null
          invoice_id: string
          line_number: number | null
          matched_ingredient_id: string | null
          net_amount: number | null
          package_size: number | null
          quantity: number | null
          raw_text: string | null
          restaurant_id: string
          review_status: Database["public"]["Enums"]["invoice_item_review"]
          supplier_product_code: string | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          base_quantity?: number | null
          base_unit?: string | null
          confidence_score?: number | null
          conversion_factor?: number | null
          created_at?: string
          description?: string | null
          id?: string
          ignored_reason?: string | null
          invoice_id: string
          line_number?: number | null
          matched_ingredient_id?: string | null
          net_amount?: number | null
          package_size?: number | null
          quantity?: number | null
          raw_text?: string | null
          restaurant_id: string
          review_status?: Database["public"]["Enums"]["invoice_item_review"]
          supplier_product_code?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          base_quantity?: number | null
          base_unit?: string | null
          confidence_score?: number | null
          conversion_factor?: number | null
          created_at?: string
          description?: string | null
          id?: string
          ignored_reason?: string | null
          invoice_id?: string
          line_number?: number | null
          matched_ingredient_id?: string | null
          net_amount?: number | null
          package_size?: number | null
          quantity?: number | null
          raw_text?: string | null
          restaurant_id?: string
          review_status?: Database["public"]["Enums"]["invoice_item_review"]
          supplier_product_code?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          confidence_score: number | null
          created_at: string
          currency: string
          error_code: string | null
          error_message: string | null
          file_checksum: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          ocr_mode: string
          ocr_provider: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          restaurant_id: string
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          storage_path: string
          subtotal: number | null
          supplier_id: string | null
          tax_total: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          file_checksum?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          ocr_mode?: string
          ocr_provider?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          restaurant_id: string
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storage_path: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          file_checksum?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          ocr_mode?: string
          ocr_provider?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          restaurant_id?: string
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storage_path?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_total?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          restaurant_id: string
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          restaurant_id: string
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          restaurant_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
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
      rate_limit_hits: {
        Row: {
          bucket: string
          id: number
          occurred_at: string
        }
        Insert: {
          bucket: string
          id?: number
          occurred_at?: string
        }
        Update: {
          bucket?: string
          id?: number
          occurred_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          automation_mode: string | null
          automation_state: string | null
          cause: string | null
          created_at: string
          deleted_at: string | null
          economic_impact: number | null
          id: string
          priority: string
          problem: string | null
          restaurant_id: string
          scheduled_for: string | null
          solution: string | null
          status: string
          time_impact: string | null
          title: string
          updated_at: string
        }
        Insert: {
          automation_mode?: string | null
          automation_state?: string | null
          cause?: string | null
          created_at?: string
          deleted_at?: string | null
          economic_impact?: number | null
          id?: string
          priority?: string
          problem?: string | null
          restaurant_id: string
          scheduled_for?: string | null
          solution?: string | null
          status?: string
          time_impact?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          automation_mode?: string | null
          automation_state?: string | null
          cause?: string | null
          created_at?: string
          deleted_at?: string | null
          economic_impact?: number | null
          id?: string
          priority?: string
          problem?: string | null
          restaurant_id?: string
          scheduled_for?: string | null
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
      apply_invoice: {
        Args: { _invoice_id: string }
        Returns: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          performed_by: string | null
          restaurant_id: string
          run_type: string
          status: string
          summary: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "invoice_application_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      backfill_snapshots_30d: { Args: { rid: string }; Returns: undefined }
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_sec: number }
        Returns: boolean
      }
      claim_hmac_nonce: {
        Args: {
          _bucket: string
          _signature: string
          _signed_ts: number
          _window_sec: number
        }
        Returns: boolean
      }
      current_restaurant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _restaurant_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_audit_event: {
        Args: {
          _actor?: string
          _correlation_id?: string
          _duration_ms?: number
          _endpoint?: string
          _event_type: string
          _ip?: string
          _metadata?: Json
          _method?: string
          _request_id?: string
          _restaurant_id?: string
          _result?: string
          _severity?: string
          _source?: string
          _status_code?: number
          _user_agent?: string
          _user_id?: string
        }
        Returns: string
      }
      refresh_daily_snapshot: { Args: { rid: string }; Returns: undefined }
      reverse_invoice: {
        Args: { _invoice_id: string }
        Returns: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          performed_by: string | null
          restaurant_id: string
          run_type: string
          status: string
          summary: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "invoice_application_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "kitchen" | "finance" | "staff"
      invoice_item_review:
        | "pending"
        | "confirmed"
        | "ignored"
        | "needs_attention"
      invoice_status:
        | "uploaded"
        | "processing"
        | "needs_review"
        | "ready_to_apply"
        | "applied"
        | "failed"
        | "reversed"
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
      invoice_item_review: [
        "pending",
        "confirmed",
        "ignored",
        "needs_attention",
      ],
      invoice_status: [
        "uploaded",
        "processing",
        "needs_review",
        "ready_to_apply",
        "applied",
        "failed",
        "reversed",
      ],
    },
  },
} as const
