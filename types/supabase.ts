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
      academic_cycles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          classroom_id: string | null
          created_at: string
          created_by: string | null
          duration_hours: number
          group_subject_id: string
          id: string
          schedule_block_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_hours?: number
          group_subject_id: string
          id?: string
          schedule_block_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_hours?: number
          group_subject_id?: string
          id?: string
          schedule_block_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_group_subject_id_fkey"
            columns: ["group_subject_id"]
            isOneToOne: false
            referencedRelation: "group_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_schedule_block_id_fkey"
            columns: ["schedule_block_id"]
            isOneToOne: false
            referencedRelation: "schedule_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: number
          new_value: Json | null
          old_value: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          normalized_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          normalized_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_requirements: {
        Row: {
          created_at: string
          profile_code: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          profile_code: string
          subject_id: string
        }
        Update: {
          created_at?: string
          profile_code?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_requirements_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "class_requirements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          id: string
          kind: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohort_groups: {
        Row: {
          career_id: string
          created_at: string
          current_quarter: number
          id: string
          modality: string
          name: string
          shift: string
          status: string
          updated_at: string
        }
        Insert: {
          career_id: string
          created_at?: string
          current_quarter?: number
          id?: string
          modality: string
          name: string
          shift: string
          status?: string
          updated_at?: string
        }
        Update: {
          career_id?: string
          created_at?: string
          current_quarter?: number
          id?: string
          modality?: string
          name?: string
          shift?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_groups_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_subject_history: {
        Row: {
          cohort_group_id: string
          completed_at: string
          group_id: string | null
          id: string
          quarter: number
          subject_id: string
        }
        Insert: {
          cohort_group_id: string
          completed_at?: string
          group_id?: string | null
          id?: string
          quarter: number
          subject_id: string
        }
        Update: {
          cohort_group_id?: string
          completed_at?: string
          group_id?: string | null
          id?: string
          quarter?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_subject_history_cohort_group_id_fkey"
            columns: ["cohort_group_id"]
            isOneToOne: false
            referencedRelation: "cohort_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_subject_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_subject_history_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_careers: {
        Row: {
          career_id: string
          coordinator_id: string
          created_at: string
        }
        Insert: {
          career_id: string
          coordinator_id: string
          created_at?: string
        }
        Update: {
          career_id?: string
          coordinator_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_careers_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_careers_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "coordinators"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_teachers: {
        Row: {
          coordinator_id: string
          created_at: string
          teacher_id: string
        }
        Insert: {
          coordinator_id: string
          created_at?: string
          teacher_id: string
        }
        Update: {
          coordinator_id?: string
          created_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_teachers_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "coordinators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinators: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      group_subjects: {
        Row: {
          created_at: string
          group_id: string
          hours_per_week: number
          id: string
          required_profile_code: string | null
          status: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          hours_per_week: number
          id?: string
          required_profile_code?: string | null
          status?: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          hours_per_week?: number
          id?: string
          required_profile_code?: string | null
          status?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_subjects_required_profile_code_fkey"
            columns: ["required_profile_code"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "group_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          academic_cycle_id: string
          career_id: string
          classroom_id: string | null
          cohort_group_id: string | null
          created_at: string
          created_by: string | null
          id: string
          modality: string
          name: string
          quarter: number
          section: string | null
          shift: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_cycle_id: string
          career_id: string
          classroom_id?: string | null
          cohort_group_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modality: string
          name: string
          quarter: number
          section?: string | null
          shift: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_cycle_id?: string
          career_id?: string
          classroom_id?: string | null
          cohort_group_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modality?: string
          name?: string
          quarter?: number
          section?: string | null
          shift?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_academic_cycle_id_fkey"
            columns: ["academic_cycle_id"]
            isOneToOne: false
            referencedRelation: "academic_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_cohort_group_id_fkey"
            columns: ["cohort_group_id"]
            isOneToOne: false
            referencedRelation: "cohort_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          day_of_week: number
          ends_at: string
          id: string
          is_custom: boolean
          label: string
          module: number
          position: number
          starts_at: string
          template_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          day_of_week: number
          ends_at: string
          id?: string
          is_custom?: boolean
          label: string
          module?: number
          position?: number
          starts_at: string
          template_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          ends_at?: string
          id?: string
          is_custom?: boolean
          label?: string
          module?: number
          position?: number
          starts_at?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          active: boolean
          asset_path: string | null
          code: string
          created_at: string
          ends_at: string
          id: string
          label: string
          modality: string
          shift: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_path?: string | null
          code: string
          created_at?: string
          ends_at: string
          id?: string
          label: string
          modality: string
          shift: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_path?: string | null
          code?: string
          created_at?: string
          ends_at?: string
          id?: string
          label?: string
          modality?: string
          shift?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          active: boolean
          career_id: string
          created_at: string
          default_hours: number
          id: string
          name: string
          normalized_name: string
          quarter: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          career_id: string
          created_at?: string
          default_hours?: number
          id?: string
          name: string
          normalized_name: string
          quarter: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          career_id?: string
          created_at?: string
          default_hours?: number
          id?: string
          name?: string
          normalized_name?: string
          quarter?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_available_profiles: {
        Row: {
          created_at: string
          profile_code: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          profile_code: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          profile_code?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_available_profiles_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "teacher_available_profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          code: string
          created_at: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          name?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          active: boolean
          assigned_hours: number
          created_at: string
          email: string | null
          expediente_url: string | null
          id: string
          max_hours: number
          name: string
          normalized_name: string
          notes: string | null
          responsible_coordinator_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_hours?: number
          created_at?: string
          email?: string | null
          expediente_url?: string | null
          id?: string
          max_hours?: number
          name: string
          normalized_name: string
          notes?: string | null
          responsible_coordinator_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_hours?: number
          created_at?: string
          email?: string | null
          expediente_url?: string | null
          id?: string
          max_hours?: number
          name?: string
          normalized_name?: string
          notes?: string | null
          responsible_coordinator_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_responsible_coordinator_id_fkey"
            columns: ["responsible_coordinator_id"]
            isOneToOne: false
            referencedRelation: "coordinators"
            referencedColumns: ["id"]
          },
        ]
      }
      users_profile: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          role_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          email: string
          id: string
          role_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          role_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_academic_cycle_and_advance_cohorts: {
        Args: { p_cycle_id: string }
        Returns: Json
      }
      can_access_career: {
        Args: { target_career_id: string }
        Returns: boolean
      }
      can_access_group_subject: {
        Args: { target_group_subject_id: string }
        Returns: boolean
      }
      can_access_teacher: {
        Args: { target_teacher_id: string }
        Returns: boolean
      }
      can_manage_assignment: {
        Args: { target_group_subject_id: string; target_teacher_id: string }
        Returns: boolean
      }
      check_group_subject_hours: {
        Args: { target_group_id: string }
        Returns: {
          assigned_hours: number
          group_subject_id: string
          hours_per_week: number
          status: string
          subject_name: string
        }[]
      }
      configure_managed_user: {
        Args: {
          p_active: boolean
          p_display_name: string
          p_email: string
          p_role_code: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_group_with_subjects: {
        Args: {
          p_academic_cycle_id: string
          p_career_id: string
          p_classroom_id: string
          p_modality: string
          p_name: string
          p_quarter: number
          p_shift: string
          p_subjects: Json
        }
        Returns: string
      }
      create_initial_cohort_group_with_subjects: {
        Args: {
          p_academic_cycle_id: string
          p_career_id: string
          p_classroom_id: string
          p_cohort_group_id: string
          p_completed_subject_ids: Json
          p_modality: string
          p_name: string
          p_quarter: number
          p_shift: string
          p_subjects: Json
        }
        Returns: string
      }
      current_coordinator_id: { Args: never; Returns: string }
      current_role_code: { Args: never; Returns: string }
      generate_cohort_group_for_active_cycle: {
        Args: { p_cohort_group_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      normalize_key: { Args: { value: string }; Returns: string }
      refresh_teacher_hours: {
        Args: { target_teacher_id: string }
        Returns: undefined
      }
      replace_coordinator_careers: {
        Args: { p_career_ids: string[]; p_coordinator_id: string }
        Returns: undefined
      }
      replace_subject_requirements: {
        Args: { p_profile_codes: string[]; p_subject_id: string }
        Returns: undefined
      }
      replace_teacher_profiles: {
        Args: { p_profile_codes: string[]; p_teacher_id: string }
        Returns: undefined
      }
      unaccent_fallback: { Args: { value: string }; Returns: string }
      upsert_subject_with_requirements: {
        Args: {
          p_career_id: string
          p_default_hours: number
          p_name: string
          p_normalized_name: string
          p_profile_codes: string[]
          p_quarter: number
          p_subject_id: string
        }
        Returns: string
      }
      upsert_teacher_with_profiles: {
        Args: {
          p_email: string
          p_max_hours: number
          p_name: string
          p_normalized_name: string
          p_profile_codes: string[]
          p_teacher_id: string
        }
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
    Enums: {},
  },
} as const

