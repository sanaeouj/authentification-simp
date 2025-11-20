export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          role: 'admin' | 'agent' | 'user' | 'support'
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          role?: 'admin' | 'agent' | 'user' | 'support'
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          role?: 'admin' | 'agent' | 'user' | 'support'
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: {
          id: string
          status: 'active' | 'inactive' | 'suspended'
          phone: string | null
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: 'active' | 'inactive' | 'suspended'
          phone?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'active' | 'inactive' | 'suspended'
          phone?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          agent_id: string
          email: string
          full_name: string
          phone: string | null
          company: string | null
          status: 'active' | 'inactive' | 'archived'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          email: string
          full_name: string
          phone?: string | null
          company?: string | null
          status?: 'active' | 'inactive' | 'archived'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          email?: string
          full_name?: string
          phone?: string | null
          company?: string | null
          status?: 'active' | 'inactive' | 'archived'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      magic_links: {
        Row: {
          id: string
          agent_id: string
          client_id: string
          token: string
          status: 'pending' | 'used' | 'expired' | 'revoked' | 'issued'
          expires_at: string | null
          used_at: string | null
          revoked_at: string | null
          revoked_by: string | null
          created_at: string
          temporary_password: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          client_id: string
          token?: string
          status?: 'pending' | 'used' | 'expired' | 'revoked' | 'issued'
          expires_at?: string | null
          used_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          created_at?: string
          temporary_password?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          client_id?: string
          token?: string
          status?: 'pending' | 'used' | 'expired' | 'revoked' | 'issued'
          expires_at?: string | null
          used_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          created_at?: string
          temporary_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magic_links_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_links_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      form_submissions: {
        Row: {
          id: string
          magic_link_id: string
          data: Json
          status: 'pending' | 'processed' | 'failed'
          ip_address: string | null
          user_agent: string | null
          submitted_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          magic_link_id: string
          data: Json
          status?: 'pending' | 'processed' | 'failed'
          ip_address?: string | null
          user_agent?: string | null
          submitted_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          magic_link_id?: string
          data?: Json
          status?: 'pending' | 'processed' | 'failed'
          ip_address?: string | null
          user_agent?: string | null
          submitted_at?: string
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_magic_link_id_fkey"
            columns: ["magic_link_id"]
            referencedRelation: "magic_links"
            referencedColumns: ["id"]
          }
        ]
      }
      client_todos: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          completed: boolean
          priority: 'low' | 'medium' | 'high' | null
          due_date: string | null
          created_by: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          completed?: boolean
          priority?: 'low' | 'medium' | 'high' | null
          due_date?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          priority?: 'low' | 'medium' | 'high' | null
          due_date?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_todos_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_todos_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
      user_role: 'admin' | 'agent' | 'user' | 'support'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Type alias for UserRole
export type UserRole = 'admin' | 'agent' | 'user' | 'support'

export interface Agent {
  id: string
  status: 'active' | 'inactive' | 'suspended'
  phone: string | null
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  agent_id: string
  email: string
  full_name: string
  phone: string | null
  company: string | null
  status: 'active' | 'inactive' | 'archived'
  notes: string | null
  created_at: string
  updated_at: string
  agents?: Agent
}

export interface MagicLink {
  id: string
  agent_id: string
  client_id: string
  token: string
  status: 'pending' | 'used' | 'expired' | 'revoked' | 'issued'
  expires_at: string | null
  used_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  created_at: string
  temporary_password: string | null
  clients?: Client
}

export interface FormSubmission {
  id: string
  magic_link_id: string
  data: Json
  status: 'pending' | 'processed' | 'failed'
  ip_address: string | null
  user_agent: string | null
  submitted_at: string
  processed_at: string | null
}

export interface ClientTodo {
  id: string
  client_id: string
  title: string
  description: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high' | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
}
