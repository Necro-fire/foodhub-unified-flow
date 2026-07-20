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
      cash_movements: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          order_id: string | null
          session_id: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          order_id?: string | null
          session_id: string
          tipo: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          order_id?: string | null
          session_id?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          aberto_em: string
          aberto_por: string | null
          created_at: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacoes: string
          saldo_esperado: number | null
          saldo_final: number | null
          saldo_inicial: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aberto_em?: string
          aberto_por?: string | null
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          aberto_em?: string
          aberto_por?: string | null
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          custo_fixo_mensal: number
          email_empresa: string
          endereco_empresa: string
          id: string
          logo_url: string
          margem_custo_percentual: number
          nome_empresa: string
          telefone_empresa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_fixo_mensal?: number
          email_empresa?: string
          endereco_empresa?: string
          id?: string
          logo_url?: string
          margem_custo_percentual?: number
          nome_empresa?: string
          telefone_empresa?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo_fixo_mensal?: number
          email_empresa?: string
          endereco_empresa?: string
          id?: string
          logo_url?: string
          margem_custo_percentual?: number
          nome_empresa?: string
          telefone_empresa?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          preco_unitario: number
          product_id: string | null
          produto_nome: string
          quantidade: number
          subtotal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          preco_unitario?: number
          product_id?: string | null
          produto_nome: string
          quantidade?: number
          subtotal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          preco_unitario?: number
          product_id?: string | null
          produto_nome?: string
          quantidade?: number
          subtotal?: number
          updated_at?: string
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
          bairro: string | null
          cliente_endereco: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string
          desconto: number
          finalizado_em: string | null
          forma_pagamento: string | null
          horario_retirada: string | null
          id: string
          mesa_id: string | null
          numero: number
          observacoes: string | null
          origem: string
          status: string
          subtotal: number
          taxa_entrega: number
          tipo: string
          total: number
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          desconto?: number
          finalizado_em?: string | null
          forma_pagamento?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          numero?: number
          observacoes?: string | null
          origem?: string
          status?: string
          subtotal?: number
          taxa_entrega?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          desconto?: number
          finalizado_em?: string | null
          forma_pagamento?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          numero?: number
          observacoes?: string | null
          origem?: string
          status?: string
          subtotal?: number
          taxa_entrega?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          category_id: string | null
          created_at: string
          descricao: string | null
          disponivel: boolean
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          preco: number
          preco_promo: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          preco?: number
          preco_promo?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          preco?: number
          preco_promo?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          cor_tema: string
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          cor_tema?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          cor_tema?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacidade: number
          created_at: string
          id: string
          numero: number
          status: string
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          id?: string
          numero: number
          status?: string
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          id?: string
          numero?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          aparelho: string
          cliente: string
          codigo: string
          created_at: string
          data_entrada: string
          hora_final: string | null
          hora_inicio: string | null
          id: string
          marca: string
          modelo: string
          observacoes: string
          problema: string
          status: string
          tecnico: string
          telefone: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          aparelho: string
          cliente: string
          codigo: string
          created_at?: string
          data_entrada?: string
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          marca?: string
          modelo?: string
          observacoes?: string
          problema?: string
          status?: string
          tecnico?: string
          telefone?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          aparelho?: string
          cliente?: string
          codigo?: string
          created_at?: string
          data_entrada?: string
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          marca?: string
          modelo?: string
          observacoes?: string
          problema?: string
          status?: string
          tecnico?: string
          telefone?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          aceita_pedidos_online: boolean
          created_at: string
          descricao: string | null
          endereco: string | null
          horario_funcionamento: string | null
          id: number
          nome_estabelecimento: string
          taxa_entrega: number
          telefone: string | null
          updated_at: string
          whatsapp_suporte: string
        }
        Insert: {
          aceita_pedidos_online?: boolean
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          horario_funcionamento?: string | null
          id: number
          nome_estabelecimento?: string
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp_suporte?: string
        }
        Update: {
          aceita_pedidos_online?: boolean
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          horario_funcionamento?: string | null
          id?: number
          nome_estabelecimento?: string
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp_suporte?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_os_code: { Args: { p_user_id: string }; Returns: string }
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
