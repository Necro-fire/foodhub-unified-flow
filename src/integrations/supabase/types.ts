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
      cash_movements: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          forma_pagamento: Database["public"]["Enums"]["payment_method"] | null
          id: string
          order_id: string | null
          session_id: string
          tipo: Database["public"]["Enums"]["cash_movement_type"]
          valor: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          order_id?: string | null
          session_id: string
          tipo: Database["public"]["Enums"]["cash_movement_type"]
          valor: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          order_id?: string | null
          session_id?: string
          tipo?: Database["public"]["Enums"]["cash_movement_type"]
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
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacoes: string | null
          saldo_esperado: number | null
          saldo_final: number | null
          saldo_inicial: number
          status: Database["public"]["Enums"]["cash_session_status"]
        }
        Insert: {
          aberto_em?: string
          aberto_por?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["cash_session_status"]
        }
        Update: {
          aberto_em?: string
          aberto_por?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["cash_session_status"]
        }
        Relationships: []
      }
      categories: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          order_id: string
          preco_unitario: number
          product_id: string | null
          produto_nome: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          order_id: string
          preco_unitario: number
          product_id?: string | null
          produto_nome: string
          quantidade: number
          subtotal: number
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          order_id?: string
          preco_unitario?: number
          product_id?: string | null
          produto_nome?: string
          quantidade?: number
          subtotal?: number
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
          cancelado_em: string | null
          cep: string | null
          cidade: string | null
          cliente_endereco: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          complemento: string | null
          created_at: string
          customer_id: string | null
          desconto: number
          estado: string | null
          finalizado_em: string | null
          forma_pagamento: Database["public"]["Enums"]["payment_method"]
          garcom_id: string | null
          horario_retirada: string | null
          id: string
          mesa_id: string | null
          motivo_cancelamento: string | null
          numero: number
          numero_endereco: string | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["order_origin"]
          pagamento_detalhes: Json | null
          pagamentos: Json | null
          ponto_referencia: string | null
          rua: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          taxa_entrega: number
          tipo: Database["public"]["Enums"]["order_type"]
          total: number
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cancelado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          complemento?: string | null
          created_at?: string
          customer_id?: string | null
          desconto?: number
          estado?: string | null
          finalizado_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          garcom_id?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          numero_endereco?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["order_origin"]
          pagamento_detalhes?: Json | null
          pagamentos?: Json | null
          ponto_referencia?: string | null
          rua?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_type"]
          total?: number
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cancelado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          complemento?: string | null
          created_at?: string
          customer_id?: string | null
          desconto?: number
          estado?: string | null
          finalizado_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
          garcom_id?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          numero_endereco?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["order_origin"]
          pagamento_detalhes?: Json | null
          pagamentos?: Json | null
          ponto_referencia?: string | null
          rua?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_type"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
          preco: number
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
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacidade: number
          created_at: string
          garcom_id: string | null
          id: string
          mesa_pai_id: string | null
          numero: number
          observacao: string | null
          ocupada_em: string | null
          pos_x: number
          pos_y: number
          reserva_horario: string | null
          reserva_nome: string | null
          reserva_telefone: string | null
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          garcom_id?: string | null
          id?: string
          mesa_pai_id?: string | null
          numero: number
          observacao?: string | null
          ocupada_em?: string | null
          pos_x?: number
          pos_y?: number
          reserva_horario?: string | null
          reserva_nome?: string | null
          reserva_telefone?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          garcom_id?: string | null
          id?: string
          mesa_pai_id?: string | null
          numero?: number
          observacao?: string | null
          ocupada_em?: string | null
          pos_x?: number
          pos_y?: number
          reserva_horario?: string | null
          reserva_nome?: string | null
          reserva_telefone?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_mesa_pai_id_fkey"
            columns: ["mesa_pai_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          aceita_pedidos_online: boolean
          banner_url: string | null
          cor_primaria: string | null
          descricao: string | null
          endereco: string | null
          horario_funcionamento: string | null
          id: number
          logo_url: string | null
          nome_estabelecimento: string
          taxa_entrega: number
          telefone: string | null
          updated_at: string
          whatsapp_suporte: string | null
        }
        Insert: {
          aceita_pedidos_online?: boolean
          banner_url?: string | null
          cor_primaria?: string | null
          descricao?: string | null
          endereco?: string | null
          horario_funcionamento?: string | null
          id?: number
          logo_url?: string | null
          nome_estabelecimento?: string
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp_suporte?: string | null
        }
        Update: {
          aceita_pedidos_online?: boolean
          banner_url?: string | null
          cor_primaria?: string | null
          descricao?: string | null
          endereco?: string | null
          horario_funcionamento?: string | null
          id?: number
          logo_url?: string | null
          nome_estabelecimento?: string
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp_suporte?: string | null
        }
        Relationships: []
      }
      support_categories: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_problems: {
        Row: {
          ativo: boolean
          category_id: string
          causas: string[]
          created_at: string
          descricao: string | null
          doc_url: string | null
          id: string
          imagem_url: string | null
          observacoes: string | null
          ordem: number
          passos: string[]
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          category_id: string
          causas?: string[]
          created_at?: string
          descricao?: string | null
          doc_url?: string | null
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          ordem?: number
          passos?: string[]
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          category_id?: string
          causas?: string[]
          created_at?: string
          descricao?: string | null
          doc_url?: string | null
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          ordem?: number
          passos?: string[]
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_problems_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ratings: {
        Row: {
          comentario: string | null
          created_at: string
          estrelas: number
          ticket_id: string
          user_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          estrelas: number
          ticket_id: string
          user_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          estrelas?: number
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          categoria_nome: string | null
          category_id: string | null
          created_at: string
          descricao_adicional: string | null
          encaminhado_whatsapp: boolean
          id: string
          problem_id: string | null
          problema_titulo: string | null
          resolvido: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria_nome?: string | null
          category_id?: string | null
          created_at?: string
          descricao_adicional?: string | null
          encaminhado_whatsapp?: boolean
          id?: string
          problem_id?: string | null
          problema_titulo?: string | null
          resolvido?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria_nome?: string | null
          category_id?: string | null
          created_at?: string
          descricao_adicional?: string | null
          encaminhado_whatsapp?: boolean
          id?: string
          problem_id?: string | null
          problema_titulo?: string | null
          resolvido?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "support_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      table_history: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          mesa_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          mesa_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          mesa_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_history_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "operador"
        | "caixa"
        | "proprietario"
        | "gerente"
        | "garcom"
        | "cozinha"
        | "producao"
        | "estoque"
        | "financeiro"
      cash_movement_type: "entrada" | "saida" | "sangria" | "reforco" | "venda"
      cash_session_status: "aberta" | "fechada"
      order_origin: "pdv" | "mesa" | "online"
      order_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "saiu_entrega"
        | "finalizado"
        | "cancelado"
        | "entregue"
      order_type: "retirada" | "local" | "entrega"
      payment_method:
        | "pix"
        | "dinheiro"
        | "credito"
        | "debito"
        | "vale"
        | "multiplo"
        | "nao_definido"
      table_status: "livre" | "ocupada" | "reservada"
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
      app_role: [
        "admin",
        "operador",
        "caixa",
        "proprietario",
        "gerente",
        "garcom",
        "cozinha",
        "producao",
        "estoque",
        "financeiro",
      ],
      cash_movement_type: ["entrada", "saida", "sangria", "reforco", "venda"],
      cash_session_status: ["aberta", "fechada"],
      order_origin: ["pdv", "mesa", "online"],
      order_status: [
        "novo",
        "confirmado",
        "em_preparo",
        "pronto",
        "saiu_entrega",
        "finalizado",
        "cancelado",
        "entregue",
      ],
      order_type: ["retirada", "local", "entrega"],
      payment_method: [
        "pix",
        "dinheiro",
        "credito",
        "debito",
        "vale",
        "multiplo",
        "nao_definido",
      ],
      table_status: ["livre", "ocupada", "reservada"],
    },
  },
} as const
