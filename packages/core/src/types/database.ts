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
      exec_categories: {
        Row: {
          id: string
          label: Json
          sort: number
          user_id: string | null
        }
        Insert: {
          id: string
          label: Json
          sort?: number
          user_id?: string | null
        }
        Update: {
          id?: string
          label?: Json
          sort?: number
          user_id?: string | null
        }
        Relationships: []
      }
      exec_strategies: {
        Row: {
          category_id: string | null
          color: string | null
          id: string
          name: Json
          sort: number
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          id: string
          name: Json
          sort?: number
        }
        Update: {
          category_id?: string | null
          color?: string | null
          id?: string
          name?: Json
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "exec_strategies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exec_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      executions: {
        Row: {
          amount: number | null
          created_at: string
          exec_date: string
          id: string
          note: string | null
          plan_id: string
          price: number
          quantity: number | null
          round_no: number | null
          side: Database["public"]["Enums"]["exec_side_t"]
        }
        Insert: {
          amount?: number | null
          created_at?: string
          exec_date: string
          id?: string
          note?: string | null
          plan_id: string
          price: number
          quantity?: number | null
          round_no?: number | null
          side: Database["public"]["Enums"]["exec_side_t"]
        }
        Update: {
          amount?: number | null
          created_at?: string
          exec_date?: string
          id?: string
          note?: string | null
          plan_id?: string
          price?: number
          quantity?: number | null
          round_no?: number | null
          side?: Database["public"]["Enums"]["exec_side_t"]
        }
        Relationships: [
          {
            foreignKeyName: "executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_positions"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_triage: {
        Row: {
          muted_at: string | null
          note_key: string
          read_at: string | null
          resolved_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          muted_at?: string | null
          note_key: string
          read_at?: string | null
          resolved_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          muted_at?: string | null
          note_key?: string
          read_at?: string | null
          resolved_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intraday_prices: {
        Row: {
          change_pct: number | null
          price: number
          ticker: string
          ts: string
        }
        Insert: {
          change_pct?: number | null
          price: number
          ticker: string
          ts: string
        }
        Update: {
          change_pct?: number | null
          price?: number
          ticker?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "intraday_prices_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          plan_id: string | null
          price_snapshot: number | null
          tags: Json
          ticker: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          plan_id?: string | null
          price_snapshot?: number | null
          tags?: Json
          ticker?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          plan_id?: string | null
          price_snapshot?: number | null
          tags?: Json
          ticker?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_positions"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "journal_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      live_quotes: {
        Row: {
          change_pct: number | null
          price: number
          ticker: string
          ts: string
        }
        Insert: {
          change_pct?: number | null
          price: number
          ticker: string
          ts?: string
        }
        Update: {
          change_pct?: number | null
          price?: number
          ticker?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_quotes_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: true
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      notifications: {
        Row: {
          body: Json | null
          created_at: string
          id: string
          kind: string
          payload: Json | null
          plan_id: string | null
          read_at: string | null
          rule_id: string | null
          ticker: string | null
          title: Json | null
          user_id: string
        }
        Insert: {
          body?: Json | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json | null
          plan_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          ticker?: string | null
          title?: Json | null
          user_id: string
        }
        Update: {
          body?: Json | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          plan_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          ticker?: string | null
          title?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_positions"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          archived_at: string | null
          closed_at: string | null
          created_at: string
          currency: string
          custom_fields: Json
          deleted_at: string | null
          eps: number | null
          exec_id: string | null
          human_id: string | null
          id: string
          name: Json
          portfolio_id: string | null
          realized_pl: number | null
          shares_out: number | null
          status: Database["public"]["Enums"]["plan_status_t"]
          strategy_id: string | null
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          closed_at?: string | null
          created_at?: string
          currency: string
          custom_fields?: Json
          deleted_at?: string | null
          eps?: number | null
          exec_id?: string | null
          human_id?: string | null
          id?: string
          name: Json
          portfolio_id?: string | null
          realized_pl?: number | null
          shares_out?: number | null
          status?: Database["public"]["Enums"]["plan_status_t"]
          strategy_id?: string | null
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json
          deleted_at?: string | null
          eps?: number | null
          exec_id?: string | null
          human_id?: string | null
          id?: string
          name?: Json
          portfolio_id?: string | null
          realized_pl?: number | null
          shares_out?: number | null
          status?: Database["public"]["Enums"]["plan_status_t"]
          strategy_id?: string | null
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_exec_id_fkey"
            columns: ["exec_id"]
            isOneToOne: false
            referencedRelation: "exec_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      portfolios: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          name: string
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          name: string
          sort?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          email_verified: boolean
          id: string
          onboarded: boolean
          prefs: Json
          provider: Database["public"]["Enums"]["auth_provider_t"]
          sidebar: Json
          subscription_tier: Database["public"]["Enums"]["sub_tier_t"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          email_verified?: boolean
          id: string
          onboarded?: boolean
          prefs?: Json
          provider?: Database["public"]["Enums"]["auth_provider_t"]
          sidebar?: Json
          subscription_tier?: Database["public"]["Enums"]["sub_tier_t"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          email_verified?: boolean
          id?: string
          onboarded?: boolean
          prefs?: Json
          provider?: Database["public"]["Enums"]["auth_provider_t"]
          sidebar?: Json
          subscription_tier?: Database["public"]["Enums"]["sub_tier_t"]
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          action: Json
          condition: Json
          created_at: string
          edited: boolean
          enabled: boolean
          id: string
          is_auto: boolean
          last_fired: string | null
          plan_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          action: Json
          condition: Json
          created_at?: string
          edited?: boolean
          enabled?: boolean
          id?: string
          is_auto?: boolean
          last_fired?: string | null
          plan_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          action?: Json
          condition?: Json
          created_at?: string
          edited?: boolean
          enabled?: boolean
          id?: string
          is_auto?: boolean
          last_fired?: string | null
          plan_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_positions"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          filters: Json
          grouping: string | null
          id: string
          name: string
          ordering: string | null
          scope: Database["public"]["Enums"]["view_scope_t"]
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          grouping?: string | null
          id?: string
          name: string
          ordering?: string | null
          scope: Database["public"]["Enums"]["view_scope_t"]
          sort?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          grouping?: string | null
          id?: string
          name?: string
          ordering?: string | null
          scope?: Database["public"]["Enums"]["view_scope_t"]
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          case_t: Database["public"]["Enums"]["scenario_case_t"]
          color: string | null
          id: string
          is_auto: boolean
          label: Json
          plan_id: string | null
          sort: number
          status: Database["public"]["Enums"]["scenario_status_t"]
          target: number
          thesis: Json | null
          ticker: string | null
          user_id: string | null
        }
        Insert: {
          case_t: Database["public"]["Enums"]["scenario_case_t"]
          color?: string | null
          id?: string
          is_auto?: boolean
          label: Json
          plan_id?: string | null
          sort?: number
          status?: Database["public"]["Enums"]["scenario_status_t"]
          target: number
          thesis?: Json | null
          ticker?: string | null
          user_id?: string | null
        }
        Update: {
          case_t?: Database["public"]["Enums"]["scenario_case_t"]
          color?: string | null
          id?: string
          is_auto?: boolean
          label?: Json
          plan_id?: string | null
          sort?: number
          status?: Database["public"]["Enums"]["scenario_status_t"]
          target?: number
          thesis?: Json | null
          ticker?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_positions"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "scenarios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      securities: {
        Row: {
          currency: string
          exchange: string | null
          gics: Json | null
          last_close: number | null
          market: Database["public"]["Enums"]["market_t"]
          name: Json
          sector: Json | null
          shares_out: number | null
          ticker: string
          updated_at: string
        }
        Insert: {
          currency: string
          exchange?: string | null
          gics?: Json | null
          last_close?: number | null
          market: Database["public"]["Enums"]["market_t"]
          name: Json
          sector?: Json | null
          shares_out?: number | null
          ticker: string
          updated_at?: string
        }
        Update: {
          currency?: string
          exchange?: string | null
          gics?: Json | null
          last_close?: number | null
          market?: Database["public"]["Enums"]["market_t"]
          name?: Json
          sector?: Json | null
          shares_out?: number | null
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_financials: {
        Row: {
          as_of: string | null
          current_ratio: number | null
          debt_ratio: number | null
          dividend_yield: number | null
          fiscal_year: number
          gross_margin: number | null
          net_margin: number | null
          operating_margin: number | null
          revenue: number | null
          revenue_growth: number | null
          roe: number | null
          source: Database["public"]["Enums"]["fin_source_t"]
          ticker: string
          unit: string | null
        }
        Insert: {
          as_of?: string | null
          current_ratio?: number | null
          debt_ratio?: number | null
          dividend_yield?: number | null
          fiscal_year: number
          gross_margin?: number | null
          net_margin?: number | null
          operating_margin?: number | null
          revenue?: number | null
          revenue_growth?: number | null
          roe?: number | null
          source?: Database["public"]["Enums"]["fin_source_t"]
          ticker: string
          unit?: string | null
        }
        Update: {
          as_of?: string | null
          current_ratio?: number | null
          debt_ratio?: number | null
          dividend_yield?: number | null
          fiscal_year?: number
          gross_margin?: number | null
          net_margin?: number | null
          operating_margin?: number | null
          revenue?: number | null
          revenue_growth?: number | null
          roe?: number | null
          source?: Database["public"]["Enums"]["fin_source_t"]
          ticker?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_financials_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      security_price_history: {
        Row: {
          as_of: string
          close: number
          date: string
          high: number | null
          low: number | null
          open: number | null
          source: string | null
          ticker: string
          volume: number | null
        }
        Insert: {
          as_of?: string
          close: number
          date: string
          high?: number | null
          low?: number | null
          open?: number | null
          source?: string | null
          ticker: string
          volume?: number | null
        }
        Update: {
          as_of?: string
          close?: number
          date?: string
          high?: number | null
          low?: number | null
          open?: number | null
          source?: string | null
          ticker?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "security_price_history_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
      strategies: {
        Row: {
          color: string | null
          grade_focus: string[] | null
          id: string
          model: string | null
          name: Json
          sort: number
          thresholds: Json | null
        }
        Insert: {
          color?: string | null
          grade_focus?: string[] | null
          id: string
          model?: string | null
          name: Json
          sort?: number
          thresholds?: Json | null
        }
        Update: {
          color?: string | null
          grade_focus?: string[] | null
          id?: string
          model?: string | null
          name?: Json
          sort?: number
          thresholds?: Json | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          group_name: string | null
          id: string
          sort: number
          ticker: string
          user_id: string
        }
        Insert: {
          added_at?: string
          group_name?: string | null
          id?: string
          sort?: number
          ticker: string
          user_id: string
        }
        Update: {
          added_at?: string
          group_name?: string | null
          id?: string
          sort?: number
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
    }
    Views: {
      plan_positions: {
        Row: {
          bought: number | null
          net_qty: number | null
          plan_id: string | null
          sold: number | null
          ticker: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["ticker"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      auth_provider_t: "google" | "apple" | "kakao" | "naver" | "email"
      exec_side_t: "buy" | "sell"
      fin_source_t: "dart" | "edgar" | "seed"
      market_t: "KR" | "US"
      plan_status_t:
        | "research"
        | "planning"
        | "active"
        | "paused"
        | "closing"
        | "closed"
      scenario_case_t: "bull" | "base" | "bear"
      scenario_status_t:
        | "pending"
        | "tracking"
        | "approaching"
        | "realized"
        | "invalidated"
      sub_tier_t: "free" | "pro"
      view_scope_t: "plans" | "screener"
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
      auth_provider_t: ["google", "apple", "kakao", "naver", "email"],
      exec_side_t: ["buy", "sell"],
      fin_source_t: ["dart", "edgar", "seed"],
      market_t: ["KR", "US"],
      plan_status_t: [
        "research",
        "planning",
        "active",
        "paused",
        "closing",
        "closed",
      ],
      scenario_case_t: ["bull", "base", "bear"],
      scenario_status_t: [
        "pending",
        "tracking",
        "approaching",
        "realized",
        "invalidated",
      ],
      sub_tier_t: ["free", "pro"],
      view_scope_t: ["plans", "screener"],
    },
  },
} as const

