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
      assessments: {
        Row: {
          class_id: string
          conducted_at: string | null
          created_at: string
          id: string
          max_score: number
          title: string
          total_items: number
          type: Database["public"]["Enums"]["assessment_type"] | null
        }
        Insert: {
          class_id: string
          conducted_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          title: string
          total_items?: number
          type?: Database["public"]["Enums"]["assessment_type"] | null
        }
        Update: {
          class_id?: string
          conducted_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          title?: string
          total_items?: number
          type?: Database["public"]["Enums"]["assessment_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      ched_curricula: {
        Row: {
          code: string
          created_at: string
          degree_program: string
          document_url: string | null
          effectivity_year: number | null
          id: string
          raw_content: Json | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          degree_program: string
          document_url?: string | null
          effectivity_year?: number | null
          id?: string
          raw_content?: Json | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          degree_program?: string
          document_url?: string | null
          effectivity_year?: number | null
          id?: string
          raw_content?: Json | null
          title?: string
        }
        Relationships: []
      }
      ched_subjects: {
        Row: {
          code: string
          course_outcomes: Json | null
          created_at: string
          curriculum_id: string
          id: string
          semester: number | null
          title: string
          units: number | null
          year_level: number | null
        }
        Insert: {
          code: string
          course_outcomes?: Json | null
          created_at?: string
          curriculum_id: string
          id?: string
          semester?: number | null
          title: string
          units?: number | null
          year_level?: number | null
        }
        Update: {
          code?: string
          course_outcomes?: Json | null
          created_at?: string
          curriculum_id?: string
          id?: string
          semester?: number | null
          title?: string
          units?: number | null
          year_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ched_subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "ched_curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          created_at: string
          id: string
          name: string
          semester: string | null
          subject: string | null
          syllabus_id: string | null
          teacher_id: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          id?: string
          name: string
          semester?: string | null
          subject?: string | null
          syllabus_id?: string | null
          teacher_id: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          id?: string
          name?: string
          semester?: string | null
          subject?: string | null
          syllabus_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "school_syllabi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_syllabi: {
        Row: {
          academic_year: string | null
          ched_subject_id: string | null
          college: string | null
          created_at: string
          department: string | null
          id: string
          institution: string
          learning_outcomes: Json | null
          semester: number | null
          subject_code: string
          subject_title: string
          topics: Json | null
        }
        Insert: {
          academic_year?: string | null
          ched_subject_id?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          id?: string
          institution: string
          learning_outcomes?: Json | null
          semester?: number | null
          subject_code: string
          subject_title: string
          topics?: Json | null
        }
        Update: {
          academic_year?: string | null
          ched_subject_id?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          id?: string
          institution?: string
          learning_outcomes?: Json | null
          semester?: number | null
          subject_code?: string
          subject_title?: string
          topics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "school_syllabi_ched_subject_id_fkey"
            columns: ["ched_subject_id"]
            isOneToOne: false
            referencedRelation: "ched_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone_number: string | null
          student_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone_number?: string | null
          student_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assessment_id: string
          created_at: string
          email_sent_at: string | null
          graded_at: string | null
          id: string
          ocr_result: Json | null
          raw_score: number | null
          scan_url: string | null
          student_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          email_sent_at?: string | null
          graded_at?: string | null
          id?: string
          ocr_result?: Json | null
          raw_score?: number | null
          scan_url?: string | null
          student_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          email_sent_at?: string | null
          graded_at?: string | null
          id?: string
          ocr_result?: Json | null
          raw_score?: number | null
          scan_url?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_tasks: {
        Row: {
          id: string
          created_at: string
          submission_id: string | null
          ocr_result: Json | null
          review_status: "pending" | "reviewed" | null
          review_results: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          submission_id?: string | null
          ocr_result?: Json | null
          review_status?: "pending" | "reviewed" | null
          review_results?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          submission_id?: string | null
          ocr_result?: Json | null
          review_status?: "pending" | "reviewed" | null
          review_results?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          institution: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          institution?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          institution?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assessment_type:
        | "quiz"
        | "activity"
        | "seatwork"
        | "exam"
        | "long_exam"
        | "lab_report"
        | "recitation"
        | "project"
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
      assessment_type: [
        "quiz",
        "activity",
        "seatwork",
        "exam",
        "long_exam",
        "lab_report",
        "recitation",
        "project",
      ],
    },
  },
} as const
