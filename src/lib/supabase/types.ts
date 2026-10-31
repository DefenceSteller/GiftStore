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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          kind: string
          message: string | null
          meta: Json | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          meta?: Json | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          meta?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          max_price_cents: number
          min_price_cents: number
          name: string
          product_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_price_cents?: number
          min_price_cents?: number
          name: string
          product_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_price_cents?: number
          min_price_cents?: number
          name?: string
          product_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          profiles_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          profiles_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          profiles_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          path: string
          referrer: string | null
          revenue_cents: number
          source: string
          type: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          path: string
          referrer?: string | null
          revenue_cents?: number
          source: string
          type: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          path?: string
          referrer?: string | null
          revenue_cents?: number
          source?: string
          type?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          emoji: string | null
          gradient: string | null
          id: string
          line_total_cents: number
          name: string
          order_id: string
          product_id: string
          qty: number
          slug: string | null
          unit_price_cents: number
        }
        Insert: {
          emoji?: string | null
          gradient?: string | null
          id?: string
          line_total_cents: number
          name: string
          order_id: string
          product_id: string
          qty: number
          slug?: string | null
          unit_price_cents: number
        }
        Update: {
          emoji?: string | null
          gradient?: string | null
          id?: string
          line_total_cents?: number
          name?: string
          order_id?: string
          product_id?: string
          qty?: number
          slug?: string | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address1: string
          address2: string | null
          city: string
          client_token: string | null
          country: string
          currency: string
          customer_id: string
          delivery_method: string
          discount_cents: number
          email: string
          id: string
          item_count: number
          name: string
          order_number: string
          paid_at: string | null
          payment_brand: string | null
          payment_last4: string | null
          payment_method: string
          payment_ref: string | null
          payment_status: string
          phone: string | null
          placed_at: string
          postal_code: string
          promo_code: string | null
          shipping_cents: number
          source: string
          state: string
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          address1: string
          address2?: string | null
          city: string
          client_token?: string | null
          country?: string
          currency?: string
          customer_id: string
          delivery_method?: string
          discount_cents?: number
          email: string
          id?: string
          item_count?: number
          name: string
          order_number: string
          paid_at?: string | null
          payment_brand?: string | null
          payment_last4?: string | null
          payment_method: string
          payment_ref?: string | null
          payment_status?: string
          phone?: string | null
          placed_at?: string
          postal_code: string
          promo_code?: string | null
          shipping_cents?: number
          source?: string
          state: string
          status?: string
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          updated_at?: string
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          client_token?: string | null
          country?: string
          currency?: string
          customer_id?: string
          delivery_method?: string
          discount_cents?: number
          email?: string
          id?: string
          item_count?: number
          name?: string
          order_number?: string
          paid_at?: string | null
          payment_brand?: string | null
          payment_last4?: string | null
          payment_method?: string
          payment_ref?: string | null
          payment_status?: string
          phone?: string | null
          placed_at?: string
          postal_code?: string
          promo_code?: string | null
          shipping_cents?: number
          source?: string
          state?: string
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_fkey"
            columns: ["promo_code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          compare_at_cents: number | null
          created_at: string
          description: string | null
          emoji: string | null
          gradient: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          rating: number | null
          review_count: number
          slug: string
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          category: string
          compare_at_cents?: number | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          gradient: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          rating?: number | null
          review_count?: number
          slug: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string
          compare_at_cents?: number | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          gradient?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          rating?: number | null
          review_count?: number
          slug?: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          min_subtotal_cents: number
          type: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          min_subtotal_cents?: number
          type: string
          uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          min_subtotal_cents?: number
          type?: string
          uses?: number
          value?: number
        }
        Relationships: []
      }
      traffic_events: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          revenue_cents: number
          source: string
          type: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          revenue_cents?: number
          source: string
          type: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          revenue_cents?: number
          source?: string
          type?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_order: { Args: { p_order_id: string }; Returns: string }
      place_order: {
        Args: { p_customer_id: string; p_order_data: string }
        Returns: string
      }
      refund_order: {
        Args: { p_amount_cents: number; p_order_id: string }
        Returns: string
      }
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
    Enums: {},
  },
} as const
