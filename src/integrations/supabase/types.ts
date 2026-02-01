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
      crypto_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          id: string
          notes: string | null
          payment_request_id: string | null
          token_id: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_request_id?: string | null
          token_id: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_request_id?: string | null
          token_id?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_transactions_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_transactions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "trading_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_addresses: {
        Row: {
          chain_id: number
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          chain_id: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          chain_id?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      meme_coin_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          meme_coin_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          meme_coin_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          meme_coin_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meme_coin_comments_meme_coin_id_fkey"
            columns: ["meme_coin_id"]
            isOneToOne: false
            referencedRelation: "meme_coins"
            referencedColumns: ["id"]
          },
        ]
      }
      meme_coin_holders: {
        Row: {
          created_at: string
          id: string
          meme_coin_id: string
          realized_profit: number
          token_balance: number
          total_bought: number
          total_sold: number
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          meme_coin_id: string
          realized_profit?: number
          token_balance?: number
          total_bought?: number
          total_sold?: number
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          meme_coin_id?: string
          realized_profit?: number
          token_balance?: number
          total_bought?: number
          total_sold?: number
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "meme_coin_holders_meme_coin_id_fkey"
            columns: ["meme_coin_id"]
            isOneToOne: false
            referencedRelation: "meme_coins"
            referencedColumns: ["id"]
          },
        ]
      }
      meme_coin_price_history: {
        Row: {
          created_at: string
          id: string
          meme_coin_id: string
          price: number
          volume: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          meme_coin_id: string
          price: number
          volume?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          meme_coin_id?: string
          price?: number
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meme_coin_price_history_meme_coin_id_fkey"
            columns: ["meme_coin_id"]
            isOneToOne: false
            referencedRelation: "meme_coins"
            referencedColumns: ["id"]
          },
        ]
      }
      meme_coin_trades: {
        Row: {
          created_at: string
          id: string
          meme_coin_id: string
          payment_method: string | null
          payment_request_id: string | null
          price_per_token: number
          sol_amount: number
          status: string
          token_amount: number
          trade_type: string
          tx_signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meme_coin_id: string
          payment_method?: string | null
          payment_request_id?: string | null
          price_per_token: number
          sol_amount: number
          status?: string
          token_amount: number
          trade_type: string
          tx_signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meme_coin_id?: string
          payment_method?: string | null
          payment_request_id?: string | null
          price_per_token?: number
          sol_amount?: number
          status?: string
          token_amount?: number
          trade_type?: string
          tx_signature?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meme_coin_trades_meme_coin_id_fkey"
            columns: ["meme_coin_id"]
            isOneToOne: false
            referencedRelation: "meme_coins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meme_coin_trades_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      meme_coins: {
        Row: {
          audit_url: string | null
          bonding_curve_type: string
          contract_address: string | null
          created_at: string
          creator_id: string
          current_price: number
          description: string | null
          graduated: boolean
          graduated_at: string | null
          graduation_threshold: number
          holder_count: number
          id: string
          image_url: string | null
          initial_price: number
          is_active: boolean
          is_featured: boolean | null
          liquidity_raised: number
          market_cap: number
          raydium_pool_address: string | null
          roadmap: string | null
          team_info: string | null
          telegram_url: string | null
          token_mint: string
          token_name: string
          token_symbol: string
          tokenomics: string | null
          tokens_sold: number
          total_supply: number
          twitter_url: string | null
          updated_at: string
          volatility_percent: number | null
          website_url: string | null
          whitepaper_url: string | null
        }
        Insert: {
          audit_url?: string | null
          bonding_curve_type?: string
          contract_address?: string | null
          created_at?: string
          creator_id: string
          current_price?: number
          description?: string | null
          graduated?: boolean
          graduated_at?: string | null
          graduation_threshold?: number
          holder_count?: number
          id?: string
          image_url?: string | null
          initial_price?: number
          is_active?: boolean
          is_featured?: boolean | null
          liquidity_raised?: number
          market_cap?: number
          raydium_pool_address?: string | null
          roadmap?: string | null
          team_info?: string | null
          telegram_url?: string | null
          token_mint: string
          token_name: string
          token_symbol: string
          tokenomics?: string | null
          tokens_sold?: number
          total_supply?: number
          twitter_url?: string | null
          updated_at?: string
          volatility_percent?: number | null
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Update: {
          audit_url?: string | null
          bonding_curve_type?: string
          contract_address?: string | null
          created_at?: string
          creator_id?: string
          current_price?: number
          description?: string | null
          graduated?: boolean
          graduated_at?: string | null
          graduation_threshold?: number
          holder_count?: number
          id?: string
          image_url?: string | null
          initial_price?: number
          is_active?: boolean
          is_featured?: boolean | null
          liquidity_raised?: number
          market_cap?: number
          raydium_pool_address?: string | null
          roadmap?: string | null
          team_info?: string | null
          telegram_url?: string | null
          token_mint?: string
          token_name?: string
          token_symbol?: string
          tokenomics?: string | null
          tokens_sold?: number
          total_supply?: number
          twitter_url?: string | null
          updated_at?: string
          volatility_percent?: number | null
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Relationships: []
      }
      mpesa_configurations: {
        Row: {
          account_reference: string | null
          consumer_key: string
          consumer_secret: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          passkey: string
          paybill_number: string | null
          payment_type: string
          shortcode: string
          till_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_reference?: string | null
          consumer_key: string
          consumer_secret: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          passkey: string
          paybill_number?: string | null
          payment_type: string
          shortcode: string
          till_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_reference?: string | null
          consumer_key?: string
          consumer_secret?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          passkey?: string
          paybill_number?: string | null
          payment_type?: string
          shortcode?: string
          till_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          checkout_request_id: string | null
          created_at: string | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          released: boolean | null
          released_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          token_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          released?: boolean | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          token_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          checkout_request_id?: string | null
          created_at?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          released?: boolean | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          token_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "trading_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          primary_color: string | null
          site_logo_url: string | null
          site_name: string
          site_tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_color?: string | null
          site_logo_url?: string | null
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_color?: string | null
          site_logo_url?: string | null
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount: number
          created_at: string | null
          gas_fee: number | null
          id: string
          price: number
          status: string | null
          strategy_id: string | null
          token_id: string
          total_value: number
          trade_type: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          gas_fee?: number | null
          id?: string
          price: number
          status?: string | null
          strategy_id?: string | null
          token_id: string
          total_value: number
          trade_type: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          gas_fee?: number | null
          id?: string
          price?: number
          status?: string | null
          strategy_id?: string | null
          token_id?: string
          total_value?: number
          trade_type?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "trading_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_strategies: {
        Row: {
          buy_threshold: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_investment: number | null
          sell_threshold: number | null
          stop_loss: number | null
          strategy_type: string
          take_profit: number | null
          token_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buy_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_investment?: number | null
          sell_threshold?: number | null
          stop_loss?: number | null
          strategy_type: string
          take_profit?: number | null
          token_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buy_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_investment?: number | null
          sell_threshold?: number | null
          stop_loss?: number | null
          strategy_type?: string
          take_profit?: number | null
          token_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "trading_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_tokens: {
        Row: {
          chain_id: number
          created_at: string | null
          id: string
          is_active: boolean | null
          token_address: string
          token_name: string
          token_symbol: string
          updated_at: string | null
        }
        Insert: {
          chain_id: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          token_address: string
          token_name: string
          token_symbol: string
          updated_at?: string | null
        }
        Update: {
          chain_id?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          token_address?: string
          token_name?: string
          token_symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          locked_balance: number
          token_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          locked_balance?: number
          token_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          locked_balance?: number
          token_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "trading_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trading_settings: {
        Row: {
          auto_trading_enabled: boolean | null
          created_at: string | null
          id: string
          max_daily_trades: number | null
          notification_enabled: boolean | null
          risk_level: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_daily_trades?: number | null
          notification_enabled?: boolean | null
          risk_level?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_daily_trades?: number | null
          notification_enabled?: boolean | null
          risk_level?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      transaction_type: "deposit" | "withdrawal" | "buy" | "sell" | "transfer"
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
      app_role: ["admin", "user"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      transaction_type: ["deposit", "withdrawal", "buy", "sell", "transfer"],
    },
  },
} as const
