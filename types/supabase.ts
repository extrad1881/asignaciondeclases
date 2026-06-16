export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users_profile: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role_code: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          role_code: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role_code?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coordinators: {
        Row: {
          id: string;
          profile_id: string | null;
          name: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          name: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          name?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      careers: {
        Row: {
          id: string;
          code: string;
          name: string;
          normalized_name: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          normalized_name: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          normalized_name?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coordinator_careers: {
        Row: {
          coordinator_id: string;
          career_id: string;
          created_at: string;
        };
        Insert: {
          coordinator_id: string;
          career_id: string;
          created_at?: string;
        };
        Update: {
          coordinator_id?: string;
          career_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teacher_profiles: {
        Row: {
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          email: string | null;
          expediente_url: string | null;
          max_hours: number;
          assigned_hours: number;
          responsible_coordinator_id: string | null;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          normalized_name: string;
          email?: string | null;
          expediente_url?: string | null;
          max_hours?: number;
          assigned_hours?: number;
          responsible_coordinator_id?: string | null;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          normalized_name?: string;
          email?: string | null;
          expediente_url?: string | null;
          max_hours?: number;
          assigned_hours?: number;
          responsible_coordinator_id?: string | null;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coordinator_teachers: {
        Row: {
          coordinator_id: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          coordinator_id: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: {
          coordinator_id?: string;
          teacher_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teacher_available_profiles: {
        Row: {
          teacher_id: string;
          profile_code: string;
          created_at: string;
        };
        Insert: {
          teacher_id: string;
          profile_code: string;
          created_at?: string;
        };
        Update: {
          teacher_id?: string;
          profile_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      academic_cycles: {
        Row: {
          id: string;
          code: string;
          name: string;
          starts_at: string | null;
          ends_at: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          starts_at?: string | null;
          ends_at?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      classrooms: {
        Row: {
          id: string;
          name: string;
          capacity: number | null;
          kind: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          capacity?: number | null;
          kind?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          capacity?: number | null;
          kind?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          career_id: string;
          quarter: number;
          name: string;
          normalized_name: string;
          default_hours: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          career_id: string;
          quarter: number;
          name: string;
          normalized_name: string;
          default_hours?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          career_id?: string;
          quarter?: number;
          name?: string;
          normalized_name?: string;
          default_hours?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      class_requirements: {
        Row: {
          subject_id: string;
          profile_code: string;
          created_at: string;
        };
        Insert: {
          subject_id: string;
          profile_code: string;
          created_at?: string;
        };
        Update: {
          subject_id?: string;
          profile_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          academic_cycle_id: string;
          career_id: string;
          quarter: number;
          modality: string;
          shift: string;
          name: string;
          classroom_id: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_cycle_id: string;
          career_id: string;
          quarter: number;
          modality: string;
          shift: string;
          name: string;
          classroom_id?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academic_cycle_id?: string;
          career_id?: string;
          quarter?: number;
          modality?: string;
          shift?: string;
          name?: string;
          classroom_id?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_subjects: {
        Row: {
          id: string;
          group_id: string;
          subject_id: string;
          hours_per_week: number;
          required_profile_code: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          subject_id: string;
          hours_per_week: number;
          required_profile_code?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          subject_id?: string;
          hours_per_week?: number;
          required_profile_code?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedule_templates: {
        Row: {
          id: string;
          code: string;
          label: string;
          modality: string;
          shift: string;
          starts_at: string;
          ends_at: string;
          asset_path: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          label: string;
          modality: string;
          shift: string;
          starts_at: string;
          ends_at: string;
          asset_path?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          label?: string;
          modality?: string;
          shift?: string;
          starts_at?: string;
          ends_at?: string;
          asset_path?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedule_blocks: {
        Row: {
          id: string;
          template_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          label: string;
          position: number;
          active: boolean;
          is_custom: boolean | null;
          created_by: string | null;
          module: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          label: string;
          position?: number;
          active?: boolean;
          is_custom?: boolean | null;
          created_by?: string | null;
          module?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          day_of_week?: number;
          starts_at?: string;
          ends_at?: string;
          label?: string;
          position?: number;
          active?: boolean;
          is_custom?: boolean | null;
          created_by?: string | null;
          module?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          group_subject_id: string;
          teacher_id: string;
          schedule_block_id: string;
          classroom_id: string | null;
          duration_hours: number;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_subject_id: string;
          teacher_id: string;
          schedule_block_id: string;
          classroom_id?: string | null;
          duration_hours?: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_subject_id?: string;
          teacher_id?: string;
          schedule_block_id?: string;
          classroom_id?: string | null;
          duration_hours?: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          user_id: string | null;
          action_type: string;
          table_name: string;
          record_id: string;
          old_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          action_type: string;
          table_name: string;
          record_id: string;
          old_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          action_type?: string;
          table_name?: string;
          record_id?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      unaccent_fallback: {
        Args: { value: string };
        Returns: string;
      };
      normalize_key: {
        Args: { value: string };
        Returns: string;
      };
      current_role_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      current_coordinator_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      can_access_career: {
        Args: { target_career_id: string };
        Returns: boolean;
      };
      can_access_teacher: {
        Args: { target_teacher_id: string };
        Returns: boolean;
      };
      can_access_group_subject: {
        Args: { target_group_subject_id: string };
        Returns: boolean;
      };
      can_manage_assignment: {
        Args: { target_group_subject_id: string; target_teacher_id: string };
        Returns: boolean;
      };
      refresh_teacher_hours: {
        Args: { target_teacher_id: string };
        Returns: void;
      };
      create_group_with_subjects: {
        Args: {
          p_academic_cycle_id: string;
          p_career_id: string;
          p_quarter: number;
          p_modality: string;
          p_shift: string;
          p_name: string;
          p_classroom_id: string;
          p_subjects: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
