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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          access_reason: string | null
          access_token_id: string | null
          accessed_at: string
          accessor_email: string | null
          accessor_id: string | null
          accessor_name: string | null
          accessor_type: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
          verified_recipient_name: string | null
          verified_recipient_org: string | null
        }
        Insert: {
          access_reason?: string | null
          access_token_id?: string | null
          accessed_at?: string
          accessor_email?: string | null
          accessor_id?: string | null
          accessor_name?: string | null
          accessor_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
          verified_recipient_name?: string | null
          verified_recipient_org?: string | null
        }
        Update: {
          access_reason?: string | null
          access_token_id?: string | null
          accessed_at?: string
          accessor_email?: string | null
          accessor_id?: string | null
          accessor_name?: string | null
          accessor_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
          verified_recipient_name?: string | null
          verified_recipient_org?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      access_notifications: {
        Row: {
          access_count_at_notification: number | null
          created_at: string
          email_sent_to: string | null
          id: string
          notification_type: string
          sent_at: string
          token_id: string | null
          user_id: string
        }
        Insert: {
          access_count_at_notification?: number | null
          created_at?: string
          email_sent_to?: string | null
          id?: string
          notification_type?: string
          sent_at?: string
          token_id?: string | null
          user_id: string
        }
        Update: {
          access_count_at_notification?: number | null
          created_at?: string
          email_sent_to?: string | null
          id?: string
          notification_type?: string
          sent_at?: string
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_notifications_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      access_tokens: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          created_at: string
          expires_at: string
          id: string
          is_revoked: boolean | null
          label: string | null
          recipient_jurisdiction: string | null
          recipient_type: string | null
          require_verification: boolean | null
          shared_scopes: Json | null
          token: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_revoked?: boolean | null
          label?: string | null
          recipient_jurisdiction?: string | null
          recipient_type?: string | null
          require_verification?: boolean | null
          shared_scopes?: Json | null
          token: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          label?: string | null
          recipient_jurisdiction?: string | null
          recipient_type?: string | null
          require_verification?: boolean | null
          shared_scopes?: Json | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_data_distributions: {
        Row: {
          admin_id: string
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          disease_categories: string[] | null
          id: string
          purpose: string
          recipient_id: string
          recipient_type: string
          record_count: number | null
          status: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          disease_categories?: string[] | null
          id?: string
          purpose: string
          recipient_id: string
          recipient_type: string
          record_count?: number | null
          status?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          disease_categories?: string[] | null
          id?: string
          purpose?: string
          recipient_id?: string
          recipient_type?: string
          record_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      admission_medications: {
        Row: {
          admission_id: string
          created_at: string | null
          dosage: string
          frequency: string
          id: string
          medication_name: string
          notes: string | null
          prescribed_at: string | null
          prescribed_by: string
          route: Database["public"]["Enums"]["medication_route"] | null
          status: Database["public"]["Enums"]["medication_status"] | null
          updated_at: string | null
        }
        Insert: {
          admission_id: string
          created_at?: string | null
          dosage: string
          frequency: string
          id?: string
          medication_name: string
          notes?: string | null
          prescribed_at?: string | null
          prescribed_by: string
          route?: Database["public"]["Enums"]["medication_route"] | null
          status?: Database["public"]["Enums"]["medication_status"] | null
          updated_at?: string | null
        }
        Update: {
          admission_id?: string
          created_at?: string | null
          dosage?: string
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string | null
          prescribed_at?: string | null
          prescribed_by?: string
          route?: Database["public"]["Enums"]["medication_route"] | null
          status?: Database["public"]["Enums"]["medication_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_medications_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_transfers: {
        Row: {
          admission_id: string
          created_at: string
          from_bed_id: string | null
          id: string
          notes: string | null
          to_bed_id: string
          transfer_reason: string
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          from_bed_id?: string | null
          id?: string
          notes?: string | null
          to_bed_id: string
          transfer_reason: string
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          from_bed_id?: string | null
          id?: string
          notes?: string | null
          to_bed_id?: string
          transfer_reason?: string
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_transfers_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_transfers_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_transfers_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      admissions: {
        Row: {
          actual_discharge: string | null
          admission_date: string
          admission_reason: string | null
          admitting_doctor_id: string
          bed_id: string | null
          created_at: string | null
          diagnosis: string | null
          discharge_notes: string | null
          discharged_by: string | null
          expected_discharge: string | null
          hospital_id: string
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["admission_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_discharge?: string | null
          admission_date?: string
          admission_reason?: string | null
          admitting_doctor_id: string
          bed_id?: string | null
          created_at?: string | null
          diagnosis?: string | null
          discharge_notes?: string | null
          discharged_by?: string | null
          expected_discharge?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["admission_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_discharge?: string | null
          admission_date?: string
          admission_reason?: string | null
          admitting_doctor_id?: string
          bed_id?: string | null
          created_at?: string | null
          diagnosis?: string | null
          discharge_notes?: string | null
          discharged_by?: string | null
          expected_discharge?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["admission_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_health_contributions: {
        Row: {
          age_range: string | null
          anonymized_data: Json
          auto_renew: boolean
          contributed_at: string
          contribution_hash: string
          data_categories: string[]
          disease_categories: string[]
          expires_at: string | null
          gender: string | null
          govt_approval_status: string
          govt_reference_number: string | null
          id: string
          is_active: boolean
          patient_id: string
          quality_score: number | null
          requires_govt_approval: boolean
          source_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          anonymized_data?: Json
          auto_renew?: boolean
          contributed_at?: string
          contribution_hash: string
          data_categories?: string[]
          disease_categories?: string[]
          expires_at?: string | null
          gender?: string | null
          govt_approval_status?: string
          govt_reference_number?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          quality_score?: number | null
          requires_govt_approval?: boolean
          source_jurisdiction?: Database["public"]["Enums"]["jurisdiction_code"]
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          anonymized_data?: Json
          auto_renew?: boolean
          contributed_at?: string
          contribution_hash?: string
          data_categories?: string[]
          disease_categories?: string[]
          expires_at?: string | null
          gender?: string | null
          govt_approval_status?: string
          govt_reference_number?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          quality_score?: number | null
          requires_govt_approval?: boolean
          source_jurisdiction?: Database["public"]["Enums"]["jurisdiction_code"]
          updated_at?: string
        }
        Relationships: []
      }
      appointment_intake: {
        Row: {
          additional_notes: string | null
          appointment_id: string
          chief_complaint: string | null
          created_at: string
          id: string
          patient_id: string
          self_medications: string | null
          submitted_at: string
          symptom_duration: string | null
          symptom_severity: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          appointment_id: string
          chief_complaint?: string | null
          created_at?: string
          id?: string
          patient_id: string
          self_medications?: string | null
          submitted_at?: string
          symptom_duration?: string | null
          symptom_severity?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          appointment_id?: string
          chief_complaint?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          self_medications?: string | null
          submitted_at?: string
          symptom_duration?: string | null
          symptom_severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_intake_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminder_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          reminder_hours: number[]
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          reminder_hours?: number[]
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          reminder_hours?: number[]
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          hours_before: number
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          hours_before: number
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          hours_before?: number
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_waitlist: {
        Row: {
          available_appointment_id: string | null
          created_at: string
          doctor_id: string
          id: string
          notified_at: string | null
          patient_id: string
          preferred_date: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          available_appointment_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          notified_at?: string | null
          patient_id: string
          preferred_date: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          available_appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          notified_at?: string | null
          patient_id?: string
          preferred_date?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_waitlist_available_appointment_id_fkey"
            columns: ["available_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          consultation_ended_at: string | null
          consultation_started_at: string | null
          created_at: string | null
          doctor_id: string
          end_time: string
          follow_up_date: string | null
          hospital_id: string | null
          id: string
          notes: string | null
          outcome_notes: string | null
          outcome_status: string | null
          parent_appointment_id: string | null
          patient_id: string
          reason: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          treatment_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          consultation_ended_at?: string | null
          consultation_started_at?: string | null
          created_at?: string | null
          doctor_id: string
          end_time: string
          follow_up_date?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          outcome_notes?: string | null
          outcome_status?: string | null
          parent_appointment_id?: string | null
          patient_id: string
          reason?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          consultation_ended_at?: string | null
          consultation_started_at?: string | null
          created_at?: string | null
          doctor_id?: string
          end_time?: string
          follow_up_date?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          outcome_notes?: string | null
          outcome_status?: string | null
          parent_appointment_id?: string | null
          patient_id?: string
          reason?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_demand_analytics"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_rating_stats"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "patient_running_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_merkle_blocks: {
        Row: {
          block_end: number
          block_start: number
          computed_at: string
          entry_count: number
          first_previous_hash: string
          id: string
          last_event_hash: string
          merkle_root: string
        }
        Insert: {
          block_end: number
          block_start: number
          computed_at?: string
          entry_count: number
          first_previous_hash: string
          id?: string
          last_event_hash: string
          merkle_root: string
        }
        Update: {
          block_end?: number
          block_start?: number
          computed_at?: string
          entry_count?: number
          first_previous_hash?: string
          id?: string
          last_event_hash?: string
          merkle_root?: string
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          block_number: number | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          event_hash: string
          event_type: string
          id: string
          merkle_root: string | null
          previous_hash: string | null
          user_id: string
        }
        Insert: {
          action: string
          block_number?: number | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          event_hash: string
          event_type: string
          id?: string
          merkle_root?: string | null
          previous_hash?: string | null
          user_id: string
        }
        Update: {
          action?: string
          block_number?: number | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          event_hash?: string
          event_type?: string
          id?: string
          merkle_root?: string | null
          previous_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_verification_checkpoints: {
        Row: {
          broken_found: number
          id: string
          last_event_hash: string
          total_verified: number
          verified_at: string
          verified_up_to_block: number
        }
        Insert: {
          broken_found?: number
          id?: string
          last_event_hash: string
          total_verified?: number
          verified_at?: string
          verified_up_to_block: number
        }
        Update: {
          broken_found?: number
          id?: string
          last_event_hash?: string
          total_verified?: number
          verified_at?: string
          verified_up_to_block?: number
        }
        Relationships: []
      }
      auto_sync_schedules: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_run_at: string | null
          next_run_at: string
          smart_session_id: string | null
          system_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          smart_session_id?: string | null
          system_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          smart_session_id?: string | null
          system_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          checksum_sha256: string | null
          cloud_file_id: string | null
          cloud_file_url: string | null
          cloud_upload_status: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          retry_count: number
          row_counts: Json | null
          run_type: string
          schedule_id: string | null
          started_at: string
          status: string
          storage_destination: string | null
          tables_exported: string[] | null
        }
        Insert: {
          checksum_sha256?: string | null
          cloud_file_id?: string | null
          cloud_file_url?: string | null
          cloud_upload_status?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          retry_count?: number
          row_counts?: Json | null
          run_type: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          storage_destination?: string | null
          tables_exported?: string[] | null
        }
        Update: {
          checksum_sha256?: string | null
          cloud_file_id?: string | null
          cloud_file_url?: string | null
          cloud_upload_status?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          retry_count?: number
          row_counts?: Json | null
          run_type?: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          storage_destination?: string | null
          tables_exported?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "backup_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          cloud_folder_id: string | null
          created_at: string
          created_by: string
          export_format: string
          frequency: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          retention_days: number
          storage_destination: string
          tables: string[]
          updated_at: string
        }
        Insert: {
          cloud_folder_id?: string | null
          created_at?: string
          created_by: string
          export_format?: string
          frequency: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          retention_days?: number
          storage_destination?: string
          tables: string[]
          updated_at?: string
        }
        Update: {
          cloud_folder_id?: string | null
          created_at?: string
          created_by?: string
          export_format?: string
          frequency?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          retention_days?: number
          storage_destination?: string
          tables?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      beds: {
        Row: {
          bed_number: string
          bed_type: string | null
          created_at: string | null
          daily_rate: number | null
          hospital_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["bed_status"] | null
          updated_at: string | null
          ward_id: string
        }
        Insert: {
          bed_number: string
          bed_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          hospital_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bed_status"] | null
          updated_at?: string | null
          ward_id: string
        }
        Update: {
          bed_number?: string
          bed_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          hospital_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bed_status"] | null
          updated_at?: string | null
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_transactions: {
        Row: {
          actor_id: string
          block_number: number | null
          created_at: string
          data_hash: string
          id: string
          is_verified: boolean | null
          merkle_root: string | null
          metadata: Json | null
          previous_hash: string | null
          signature: string | null
          target_resource_id: string | null
          target_resource_type: string | null
          timestamp: string
          transaction_type: Database["public"]["Enums"]["blockchain_transaction_type"]
        }
        Insert: {
          actor_id: string
          block_number?: number | null
          created_at?: string
          data_hash: string
          id?: string
          is_verified?: boolean | null
          merkle_root?: string | null
          metadata?: Json | null
          previous_hash?: string | null
          signature?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          timestamp?: string
          transaction_type: Database["public"]["Enums"]["blockchain_transaction_type"]
        }
        Update: {
          actor_id?: string
          block_number?: number | null
          created_at?: string
          data_hash?: string
          id?: string
          is_verified?: boolean | null
          merkle_root?: string | null
          metadata?: Json | null
          previous_hash?: string | null
          signature?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          timestamp?: string
          transaction_type?: Database["public"]["Enums"]["blockchain_transaction_type"]
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_name?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      bulk_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size_bytes: number | null
          id: string
          include_options: Json | null
          output_url: string | null
          processed_resources: number | null
          resource_types: string[] | null
          started_at: string | null
          status: string
          total_resources: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          id?: string
          include_options?: Json | null
          output_url?: string | null
          processed_resources?: number | null
          resource_types?: string[] | null
          started_at?: string | null
          status?: string
          total_resources?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          id?: string
          include_options?: Json | null
          output_url?: string | null
          processed_resources?: number | null
          resource_types?: string[] | null
          started_at?: string | null
          status?: string
          total_resources?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chain_break_alerts: {
        Row: {
          actual_previous_hash: string | null
          created_at: string
          details: Json | null
          expected_previous_hash: string | null
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          transaction_id: string | null
        }
        Insert: {
          actual_previous_hash?: string | null
          created_at?: string
          details?: Json | null
          expected_previous_hash?: string | null
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Update: {
          actual_previous_hash?: string | null
          created_at?: string
          details?: Json | null
          expected_previous_hash?: string | null
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_break_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "blockchain_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      chronic_care_plans: {
        Row: {
          condition_type: Database["public"]["Enums"]["chronic_condition_type"]
          created_at: string | null
          doctor_id: string
          id: string
          milestones: Json
          next_review_date: string | null
          notes: string | null
          patient_id: string
          plan_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          condition_type: Database["public"]["Enums"]["chronic_condition_type"]
          created_at?: string | null
          doctor_id: string
          id?: string
          milestones?: Json
          next_review_date?: string | null
          notes?: string | null
          patient_id: string
          plan_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          condition_type?: Database["public"]["Enums"]["chronic_condition_type"]
          created_at?: string | null
          doctor_id?: string
          id?: string
          milestones?: Json
          next_review_date?: string | null
          notes?: string | null
          patient_id?: string
          plan_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          created_at: string | null
          file_url: string | null
          generated_by: string
          id: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          generated_by: string
          id?: string
          report_data?: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          generated_by?: string
          id?: string
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_type: string
          consent_version: string | null
          created_at: string | null
          digital_signature: string | null
          expires_at: string | null
          granted_at: string | null
          granted_to_id: string | null
          granted_to_type: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          patient_id: string
          purpose: string
          revocation_reason: string | null
          revoked_at: string | null
          scope: Json | null
          signature_method: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          consent_type: string
          consent_version?: string | null
          created_at?: string | null
          digital_signature?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_to_id?: string | null
          granted_to_type?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          patient_id: string
          purpose: string
          revocation_reason?: string | null
          revoked_at?: string | null
          scope?: Json | null
          signature_method?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_type?: string
          consent_version?: string | null
          created_at?: string | null
          digital_signature?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_to_id?: string | null
          granted_to_type?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          patient_id?: string
          purpose?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          scope?: Json | null
          signature_method?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      consent_templates: {
        Row: {
          consent_type: string
          created_at: string
          created_by: string | null
          description: string | null
          expiry_days: number | null
          granted_to_type: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          purpose: string
          scope: string[]
          updated_at: string
        }
        Insert: {
          consent_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiry_days?: number | null
          granted_to_type?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          purpose: string
          scope?: string[]
          updated_at?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiry_days?: number | null
          granted_to_type?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          purpose?: string
          scope?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      consultation_feedback: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          doctor_id: string
          id: string
          is_anonymous: boolean | null
          patient_id: string
          rating: number
          tags: string[] | null
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          is_anonymous?: boolean | null
          patient_id: string
          rating: number
          tags?: string[] | null
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          is_anonymous?: boolean | null
          patient_id?: string
          rating?: number
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          read_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          read_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          read_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      contribution_access_log: {
        Row: {
          accessed_at: string
          contribution_id: string
          id: string
          query_context: string | null
          researcher_id: string
        }
        Insert: {
          accessed_at?: string
          contribution_id: string
          id?: string
          query_context?: string | null
          researcher_id: string
        }
        Update: {
          accessed_at?: string
          contribution_id?: string
          id?: string
          query_context?: string | null
          researcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_access_log_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_health_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_access_log_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_pool_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_schedules: {
        Row: {
          cadence: string
          categories: string[]
          created_at: string
          id: string
          is_paused: boolean
          jurisdiction: string
          last_contribution_id: string | null
          next_run_at: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          cadence: string
          categories: string[]
          created_at?: string
          id?: string
          is_paused?: boolean
          jurisdiction?: string
          last_contribution_id?: string | null
          next_run_at: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          categories?: string[]
          created_at?: string
          id?: string
          is_paused?: boolean
          jurisdiction?: string
          last_contribution_id?: string | null
          next_run_at?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_schedules_last_contribution_id_fkey"
            columns: ["last_contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_health_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_schedules_last_contribution_id_fkey"
            columns: ["last_contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_pool_view"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_requests: {
        Row: {
          broadcast_request_id: string | null
          created_at: string | null
          disease_category: string | null
          id: string
          patient_id: string
          reason: string | null
          requested_at: string | null
          requester_id: string
          requester_type: string
          responded_at: string | null
          status: Database["public"]["Enums"]["data_request_status"] | null
          token_offer: number | null
        }
        Insert: {
          broadcast_request_id?: string | null
          created_at?: string | null
          disease_category?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          requested_at?: string | null
          requester_id: string
          requester_type: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["data_request_status"] | null
          token_offer?: number | null
        }
        Update: {
          broadcast_request_id?: string | null
          created_at?: string | null
          disease_category?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          requested_at?: string | null
          requester_id?: string
          requester_type?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["data_request_status"] | null
          token_offer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_access_requests_broadcast_request_id_fkey"
            columns: ["broadcast_request_id"]
            isOneToOne: false
            referencedRelation: "research_broadcast_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      data_provenance: {
        Row: {
          activity_type: string
          agent_id: string | null
          agent_name: string | null
          agent_type: string
          created_at: string
          id: string
          metadata: Json | null
          policy_reference: string | null
          recorded_at: string
          signature: string | null
          source_document: string | null
          source_system: string | null
          source_version: string | null
          target_resource_id: string
          target_resource_type: string
          user_id: string
        }
        Insert: {
          activity_type: string
          agent_id?: string | null
          agent_name?: string | null
          agent_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          policy_reference?: string | null
          recorded_at?: string
          signature?: string | null
          source_document?: string | null
          source_system?: string | null
          source_version?: string | null
          target_resource_id: string
          target_resource_type: string
          user_id: string
        }
        Update: {
          activity_type?: string
          agent_id?: string | null
          agent_name?: string | null
          agent_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          policy_reference?: string | null
          recorded_at?: string
          signature?: string | null
          source_document?: string | null
          source_system?: string | null
          source_version?: string | null
          target_resource_id?: string
          target_resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      data_request_auto_rules: {
        Row: {
          created_at: string
          disease_categories: string[] | null
          id: string
          is_active: boolean
          patient_id: string
          requester_type: string
          require_anonymized: boolean
          require_connected_provider: boolean
          rule_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disease_categories?: string[] | null
          id?: string
          is_active?: boolean
          patient_id: string
          requester_type: string
          require_anonymized?: boolean
          require_connected_provider?: boolean
          rule_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disease_categories?: string[] | null
          id?: string
          is_active?: boolean
          patient_id?: string
          requester_type?: string
          require_anonymized?: boolean
          require_connected_provider?: boolean
          rule_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_transactions: {
        Row: {
          access_tier: number
          created_at: string
          data_access_request_id: string | null
          disease_category: string | null
          id: string
          is_anonymized: boolean
          patient_id: string
          requester_id: string
          requester_type: string
          tokens_earned: number
          transaction_hash: string | null
        }
        Insert: {
          access_tier?: number
          created_at?: string
          data_access_request_id?: string | null
          disease_category?: string | null
          id?: string
          is_anonymized?: boolean
          patient_id: string
          requester_id: string
          requester_type: string
          tokens_earned?: number
          transaction_hash?: string | null
        }
        Update: {
          access_tier?: number
          created_at?: string
          data_access_request_id?: string | null
          disease_category?: string | null
          id?: string
          is_anonymized?: boolean
          patient_id?: string
          requester_id?: string
          requester_type?: string
          tokens_earned?: number
          transaction_hash?: string | null
        }
        Relationships: []
      }
      data_transfer_agreements: {
        Row: {
          access_token_id: string | null
          acknowledged_at: string | null
          acknowledged_risks: boolean | null
          consent_timestamp: string
          created_at: string
          data_categories: string[]
          destination_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          expires_at: string | null
          id: string
          purpose: string
          recipient_name: string | null
          recipient_type: string | null
          retention_period_days: number | null
          revocation_reason: string | null
          revoked_at: string | null
          source_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          transfer_basis: Database["public"]["Enums"]["transfer_basis"]
          transfer_impact_assessment: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_id?: string | null
          acknowledged_at?: string | null
          acknowledged_risks?: boolean | null
          consent_timestamp?: string
          created_at?: string
          data_categories: string[]
          destination_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          expires_at?: string | null
          id?: string
          purpose: string
          recipient_name?: string | null
          recipient_type?: string | null
          retention_period_days?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          source_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          transfer_basis: Database["public"]["Enums"]["transfer_basis"]
          transfer_impact_assessment?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_id?: string | null
          acknowledged_at?: string | null
          acknowledged_risks?: boolean | null
          consent_timestamp?: string
          created_at?: string
          data_categories?: string[]
          destination_jurisdiction?: Database["public"]["Enums"]["jurisdiction_code"]
          expires_at?: string | null
          id?: string
          purpose?: string
          recipient_name?: string | null
          recipient_type?: string | null
          retention_period_days?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          source_jurisdiction?: Database["public"]["Enums"]["jurisdiction_code"]
          transfer_basis?: Database["public"]["Enums"]["transfer_basis"]
          transfer_impact_assessment?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_transfer_agreements_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      data_use_agreements: {
        Row: {
          agreement_hash: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          data_scope: Json
          expiry_date: string | null
          id: string
          institution_name: string
          purpose: string
          researcher_id: string
          retention_period_days: number
          status: string
          study_id: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          data_scope?: Json
          expiry_date?: string | null
          id?: string
          institution_name: string
          purpose: string
          researcher_id: string
          retention_period_days?: number
          status?: string
          study_id: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          data_scope?: Json
          expiry_date?: string | null
          id?: string
          institution_name?: string
          purpose?: string
          researcher_id?: string
          retention_period_days?: number
          status?: string
          study_id?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_use_agreements_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "researcher_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      db_growth_snapshots: {
        Row: {
          captured_at: string
          id: string
          row_count: number
          table_name: string
        }
        Insert: {
          captured_at?: string
          id?: string
          row_count: number
          table_name: string
        }
        Update: {
          captured_at?: string
          id?: string
          row_count?: number
          table_name?: string
        }
        Relationships: []
      }
      department_referrals: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          from_department_id: string
          hospital_id: string
          id: string
          patient_id: string
          reason: string
          referred_by: string
          response_notes: string | null
          status: string
          to_department_id: string
          updated_at: string
          urgency: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          from_department_id: string
          hospital_id: string
          id?: string
          patient_id: string
          reason: string
          referred_by: string
          response_notes?: string | null
          status?: string
          to_department_id: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          from_department_id?: string
          hospital_id?: string
          id?: string
          patient_id?: string
          reason?: string
          referred_by?: string
          response_notes?: string | null
          status?: string
          to_department_id?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_referrals_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "hospital_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_referrals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_referrals_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "hospital_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_applications: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          experience_years: number | null
          full_name: string
          hospital_id: string
          id: string
          license_number: string | null
          phone: string | null
          qualification: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          experience_years?: number | null
          full_name: string
          hospital_id: string
          id?: string
          license_number?: string | null
          phone?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string
          hospital_id?: string
          id?: string
          license_number?: string | null
          phone?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_applications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          hospital_id: string | null
          id: string
          is_active: boolean | null
          slot_duration_minutes: number
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_connections: {
        Row: {
          created_at: string
          doctor_name: string
          email: string | null
          hospital_clinic: string | null
          id: string
          notes: string | null
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_name: string
          email?: string | null
          hospital_clinic?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_name?: string
          email?: string | null
          hospital_clinic?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_favorite_medications: {
        Row: {
          created_at: string
          default_dosage: string | null
          default_duration: string | null
          default_frequency: string | null
          default_instructions: string | null
          doctor_id: string
          id: string
          is_pinned: boolean
          medication_name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          default_dosage?: string | null
          default_duration?: string | null
          default_frequency?: string | null
          default_instructions?: string | null
          doctor_id: string
          id?: string
          is_pinned?: boolean
          medication_name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          default_dosage?: string | null
          default_duration?: string | null
          default_frequency?: string | null
          default_instructions?: string | null
          doctor_id?: string
          id?: string
          is_pinned?: boolean
          medication_name?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      doctor_pathologist_shares: {
        Row: {
          completed_at: string | null
          disease_category: string | null
          doctor_id: string
          id: string
          notes: string | null
          pathologist_id: string
          patient_id: string
          prescription_id: string | null
          shared_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          disease_category?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          pathologist_id: string
          patient_id: string
          prescription_id?: string | null
          shared_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          disease_category?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          pathologist_id?: string
          patient_id?: string
          prescription_id?: string | null
          shared_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_pathologist_shares_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patient_access: {
        Row: {
          access_token_id: string | null
          doctor_id: string
          granted_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          patient_id: string
        }
        Insert: {
          access_token_id?: string | null
          doctor_id: string
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          patient_id: string
        }
        Update: {
          access_token_id?: string | null
          doctor_id?: string
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patient_access_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patient_messages: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_read: boolean
          message_text: string
          patient_id: string
          sender_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_read?: boolean
          message_text: string
          patient_id: string
          sender_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_read?: boolean
          message_text?: string
          patient_id?: string
          sender_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_patient_notes: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_pinned: boolean | null
          note: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_pinned?: boolean | null
          note: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_pinned?: boolean | null
          note?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          diseases_treated: string[] | null
          experience_years: number | null
          follow_up_fee: number | null
          follow_up_window_days: number
          full_name: string
          id: string
          is_online: boolean
          is_verified: boolean | null
          lab_grade: string | null
          languages_spoken: string[] | null
          last_seen_at: string | null
          license_number: string | null
          phone: string | null
          practice_type: string
          qualification: string | null
          specialty: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          diseases_treated?: string[] | null
          experience_years?: number | null
          follow_up_fee?: number | null
          follow_up_window_days?: number
          full_name: string
          id?: string
          is_online?: boolean
          is_verified?: boolean | null
          lab_grade?: string | null
          languages_spoken?: string[] | null
          last_seen_at?: string | null
          license_number?: string | null
          phone?: string | null
          practice_type?: string
          qualification?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          diseases_treated?: string[] | null
          experience_years?: number | null
          follow_up_fee?: number | null
          follow_up_window_days?: number
          full_name?: string
          id?: string
          is_online?: boolean
          is_verified?: boolean | null
          lab_grade?: string | null
          languages_spoken?: string[] | null
          last_seen_at?: string | null
          license_number?: string | null
          phone?: string | null
          practice_type?: string
          qualification?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      doctor_referrals: {
        Row: {
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          diagnosis: string | null
          hospital_id: string | null
          id: string
          patient_id: string
          reason: string
          referred_to_doctor_id: string
          referring_doctor_id: string
          responded_at: string | null
          response_notes: string | null
          specialty_needed: string | null
          status: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          hospital_id?: string | null
          id?: string
          patient_id: string
          reason: string
          referred_to_doctor_id: string
          referring_doctor_id: string
          responded_at?: string | null
          response_notes?: string | null
          specialty_needed?: string | null
          status?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          hospital_id?: string | null
          id?: string
          patient_id?: string
          reason?: string
          referred_to_doctor_id?: string
          referring_doctor_id?: string
          responded_at?: string | null
          response_notes?: string | null
          specialty_needed?: string | null
          status?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_referrals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_researcher_shares: {
        Row: {
          completed_at: string | null
          disease_category: string | null
          doctor_id: string
          id: string
          is_anonymized: boolean | null
          notes: string | null
          patient_id: string
          prescription_id: string | null
          research_purpose: string | null
          researcher_id: string
          shared_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          disease_category?: string | null
          doctor_id: string
          id?: string
          is_anonymized?: boolean | null
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          research_purpose?: string | null
          researcher_id: string
          shared_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          disease_category?: string | null
          doctor_id?: string
          id?: string
          is_anonymized?: boolean | null
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          research_purpose?: string | null
          researcher_id?: string
          shared_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_researcher_shares_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_settings: {
        Row: {
          auto_confirm_appointments: boolean | null
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          buffer_minutes: number | null
          created_at: string
          default_consultation_minutes: number | null
          email_digest_enabled: boolean | null
          id: string
          max_appointments_per_day: number | null
          min_advance_booking_hours: number | null
          notification_appointment: boolean | null
          notification_new_patient: boolean | null
          notification_prescription: boolean | null
          notification_referral: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_confirm_appointments?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          buffer_minutes?: number | null
          created_at?: string
          default_consultation_minutes?: number | null
          email_digest_enabled?: boolean | null
          id?: string
          max_appointments_per_day?: number | null
          min_advance_booking_hours?: number | null
          notification_appointment?: boolean | null
          notification_new_patient?: boolean | null
          notification_prescription?: boolean | null
          notification_referral?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_confirm_appointments?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          buffer_minutes?: number | null
          created_at?: string
          default_consultation_minutes?: number | null
          email_digest_enabled?: boolean | null
          id?: string
          max_appointments_per_day?: number | null
          min_advance_booking_hours?: number | null
          notification_appointment?: boolean | null
          notification_new_patient?: boolean | null
          notification_prescription?: boolean | null
          notification_referral?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_share_history: {
        Row: {
          doctor_id: string | null
          id: string
          notes: string | null
          shared_at: string
          token_id: string | null
          user_id: string
        }
        Insert: {
          doctor_id?: string | null
          id?: string
          notes?: string | null
          shared_at?: string
          token_id?: string | null
          user_id: string
        }
        Update: {
          doctor_id?: string | null
          id?: string
          notes?: string | null
          shared_at?: string
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_share_history_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_share_history_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_staff: {
        Row: {
          created_at: string | null
          doctor_id: string
          email: string | null
          full_name: string
          id: string
          invite_status: string | null
          invite_token: string | null
          is_active: boolean | null
          permissions: Json | null
          phone: string | null
          role: string
          staff_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          email?: string | null
          full_name: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          phone?: string | null
          role: string
          staff_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          email?: string | null
          full_name?: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          staff_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_time_off: {
        Row: {
          created_at: string | null
          doctor_id: string
          end_date: string
          hospital_id: string | null
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          end_date: string
          hospital_id?: string | null
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          end_date?: string
          hospital_id?: string | null
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_time_off_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_access_logs: {
        Row: {
          accessed_at: string
          data_accessed: Json | null
          emergency_token_id: string
          id: string
          ip_address: unknown
          location_data: Json | null
          patient_id: string
          responder_identifier: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          data_accessed?: Json | null
          emergency_token_id: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          patient_id: string
          responder_identifier?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          data_accessed?: Json | null
          emergency_token_id?: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          patient_id?: string
          responder_identifier?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_access_logs_emergency_token_id_fkey"
            columns: ["emergency_token_id"]
            isOneToOne: false
            referencedRelation: "emergency_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_access_logs_emergency_token_id_fkey"
            columns: ["emergency_token_id"]
            isOneToOne: false
            referencedRelation: "emergency_tokens_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_access_tokens: {
        Row: {
          access_count: number | null
          access_level: string
          accessed_at: string | null
          created_at: string
          created_by: string
          emergency_pin_hash: string | null
          emergency_token: string
          expires_at: string
          id: string
          is_active: boolean | null
          patient_id: string
          responder_identifier: string | null
        }
        Insert: {
          access_count?: number | null
          access_level?: string
          accessed_at?: string | null
          created_at?: string
          created_by?: string
          emergency_pin_hash?: string | null
          emergency_token: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          patient_id: string
          responder_identifier?: string | null
        }
        Update: {
          access_count?: number | null
          access_level?: string
          accessed_at?: string | null
          created_at?: string
          created_by?: string
          emergency_pin_hash?: string | null
          emergency_token?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          patient_id?: string
          responder_identifier?: string | null
        }
        Relationships: []
      }
      emergency_pin_attempts: {
        Row: {
          failed_attempts: number
          id: string
          last_attempt_at: string | null
          locked_until: string | null
          token_id: string
        }
        Insert: {
          failed_attempts?: number
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
          token_id: string
        }
        Update: {
          failed_attempts?: number
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_pin_attempts_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "emergency_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_pin_attempts_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "emergency_tokens_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_gradings: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          grade: string
          graded_by: string
          id: string
          previous_grade: string | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          grade: string
          graded_by: string
          id?: string
          previous_grade?: string | null
          reason: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          grade?: string
          graded_by?: string
          id?: string
          previous_grade?: string | null
          reason?: string
        }
        Relationships: []
      }
      family_link_requests: {
        Row: {
          can_manage_records: boolean
          can_share_data: boolean
          created_at: string
          expires_at: string | null
          id: string
          relationship: string
          requester_id: string
          responded_at: string | null
          status: string
          target_patient_id: string
        }
        Insert: {
          can_manage_records?: boolean
          can_share_data?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          relationship: string
          requester_id: string
          responded_at?: string | null
          status?: string
          target_patient_id: string
        }
        Update: {
          can_manage_records?: boolean
          can_share_data?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          relationship?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_patient_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          account_holder_id: string
          can_manage_records: boolean | null
          can_share_data: boolean | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          patient_id: string
          relationship: string
          updated_at: string | null
        }
        Insert: {
          account_holder_id: string
          can_manage_records?: boolean | null
          can_share_data?: boolean | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          patient_id: string
          relationship: string
          updated_at?: string | null
        }
        Update: {
          account_holder_id?: string
          can_manage_records?: boolean | null
          can_share_data?: boolean | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          patient_id?: string
          relationship?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fhir_subscription_notifications: {
        Row: {
          attempt_count: number | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          resource_id: string
          resource_type: string
          response_body: string | null
          response_status: number | null
          sent_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          resource_id: string
          resource_type: string
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          resource_id?: string
          resource_type?: string
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fhir_subscription_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "fhir_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      fhir_subscriptions: {
        Row: {
          created_at: string
          endpoint_url: string
          error_count: number | null
          expires_at: string | null
          filter_criteria: Json | null
          headers: Json | null
          id: string
          last_error: string | null
          last_triggered_at: string | null
          retry_policy: Json | null
          secret: string | null
          status: string
          subscriber_name: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_url: string
          error_count?: number | null
          expires_at?: string | null
          filter_criteria?: Json | null
          headers?: Json | null
          id?: string
          last_error?: string | null
          last_triggered_at?: string | null
          retry_policy?: Json | null
          secret?: string | null
          status?: string
          subscriber_name: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_url?: string
          error_count?: number | null
          expires_at?: string | null
          filter_criteria?: Json | null
          headers?: Json | null
          id?: string
          last_error?: string | null
          last_triggered_at?: string | null
          retry_policy?: Json | null
          secret?: string | null
          status?: string
          subscriber_name?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follow_up_tasks: {
        Row: {
          appointment_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          patient_id: string
          reminder_at: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          patient_id: string
          reminder_at?: string | null
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          patient_id?: string
          reminder_at?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      global_pool_analytics_cache: {
        Row: {
          computed_at: string
          id: string
          metric_data: Json
          metric_type: string
          sample_size: number
        }
        Insert: {
          computed_at?: string
          id?: string
          metric_data?: Json
          metric_type: string
          sample_size?: number
        }
        Update: {
          computed_at?: string
          id?: string
          metric_data?: Json
          metric_type?: string
          sample_size?: number
        }
        Relationships: []
      }
      health_data: {
        Row: {
          bad_habits: string | null
          birth_defects: string | null
          blood_group: string | null
          chronic_diseases: string | null
          created_at: string | null
          current_medications: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          health_allergies: string | null
          height: string | null
          id: string
          previous_diseases: string | null
          updated_at: string | null
          user_id: string
          weight: string | null
        }
        Insert: {
          bad_habits?: string | null
          birth_defects?: string | null
          blood_group?: string | null
          chronic_diseases?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          health_allergies?: string | null
          height?: string | null
          id?: string
          previous_diseases?: string | null
          updated_at?: string | null
          user_id: string
          weight?: string | null
        }
        Update: {
          bad_habits?: string | null
          birth_defects?: string | null
          blood_group?: string | null
          chronic_diseases?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          health_allergies?: string | null
          height?: string | null
          id?: string
          previous_diseases?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: string | null
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          content: string
          data_summary: Json | null
          expires_at: string | null
          generated_at: string
          id: string
          insight_type: string
          is_read: boolean | null
          metric_types: string[] | null
          severity: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          data_summary?: Json | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type: string
          is_read?: boolean | null
          metric_types?: string[] | null
          severity?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          data_summary?: Json | null
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          is_read?: boolean | null
          metric_types?: string[] | null
          severity?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          created_at: string | null
          id: string
          measured_at: string | null
          metric_type: string
          notes: string | null
          source: string | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          measured_at?: string | null
          metric_type: string
          notes?: string | null
          source?: string | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          measured_at?: string | null
          metric_type?: string
          notes?: string | null
          source?: string | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      health_records: {
        Row: {
          category: Database["public"]["Enums"]["record_category"] | null
          description: string | null
          disease_category:
            | Database["public"]["Enums"]["disease_category"]
            | null
          encryption_iv: string | null
          encryption_salt: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          icd_standard: string | null
          icd11_chapter_code: string | null
          icd11_code: string | null
          id: string
          is_encrypted: boolean | null
          notes: string | null
          ocr_abnormal_flags: Json | null
          ocr_clinical_data: Json | null
          ocr_confidence: number | null
          ocr_extracted_at: string | null
          ocr_extracted_text: string | null
          ocr_field_confidences: Json | null
          ocr_status: string | null
          provider_name: string | null
          record_date: string | null
          title: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["record_category"] | null
          description?: string | null
          disease_category?:
            | Database["public"]["Enums"]["disease_category"]
            | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          icd_standard?: string | null
          icd11_chapter_code?: string | null
          icd11_code?: string | null
          id?: string
          is_encrypted?: boolean | null
          notes?: string | null
          ocr_abnormal_flags?: Json | null
          ocr_clinical_data?: Json | null
          ocr_confidence?: number | null
          ocr_extracted_at?: string | null
          ocr_extracted_text?: string | null
          ocr_field_confidences?: Json | null
          ocr_status?: string | null
          provider_name?: string | null
          record_date?: string | null
          title: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["record_category"] | null
          description?: string | null
          disease_category?:
            | Database["public"]["Enums"]["disease_category"]
            | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          icd_standard?: string | null
          icd11_chapter_code?: string | null
          icd11_code?: string | null
          id?: string
          is_encrypted?: boolean | null
          notes?: string | null
          ocr_abnormal_flags?: Json | null
          ocr_clinical_data?: Json | null
          ocr_confidence?: number | null
          ocr_extracted_at?: string | null
          ocr_extracted_text?: string | null
          ocr_field_confidences?: Json | null
          ocr_status?: string | null
          provider_name?: string | null
          record_date?: string | null
          title?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_score_snapshots: {
        Row: {
          breakdown: Json
          created_at: string
          id: string
          score: number
          snapshot_date: string
          tracked_types: number | null
          user_id: string
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          id?: string
          score: number
          snapshot_date: string
          tracked_types?: number | null
          user_id: string
        }
        Update: {
          breakdown?: Json
          created_at?: string
          id?: string
          score?: number
          snapshot_date?: string
          tracked_types?: number | null
          user_id?: string
        }
        Relationships: []
      }
      hl7v2_import_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          imported_resources: Json | null
          message_control_id: string | null
          message_datetime: string | null
          message_type: string
          parsed_segments: Json | null
          processed_at: string | null
          raw_message: string | null
          sending_application: string | null
          sending_facility: string | null
          status: string
          user_id: string
          warnings: string[] | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          imported_resources?: Json | null
          message_control_id?: string | null
          message_datetime?: string | null
          message_type: string
          parsed_segments?: Json | null
          processed_at?: string | null
          raw_message?: string | null
          sending_application?: string | null
          sending_facility?: string | null
          status?: string
          user_id: string
          warnings?: string[] | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          imported_resources?: Json | null
          message_control_id?: string | null
          message_datetime?: string | null
          message_type?: string
          parsed_segments?: Json | null
          processed_at?: string | null
          raw_message?: string | null
          sending_application?: string | null
          sending_facility?: string | null
          status?: string
          user_id?: string
          warnings?: string[] | null
        }
        Relationships: []
      }
      hospital_departments: {
        Row: {
          created_at: string | null
          description: string | null
          head_staff_id: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          head_staff_id?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          head_staff_id?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_departments_head_staff_id_fkey"
            columns: ["head_staff_id"]
            isOneToOne: false
            referencedRelation: "hospital_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_lab_orders: {
        Row: {
          admission_id: string | null
          clinical_notes: string | null
          completed_at: string | null
          consent_status: Database["public"]["Enums"]["lab_consent_status"]
          created_at: string
          data_access_request_id: string | null
          hospital_id: string
          id: string
          is_internal_lab: boolean
          ordered_by: string
          pathologist_id: string
          patient_id: string
          processing_started_at: string | null
          quality_checked_at: string | null
          received_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          sample_barcode: string | null
          sample_collected_at: string | null
          sample_collected_by: string | null
          status: Database["public"]["Enums"]["lab_order_status"]
          tests: Json
          updated_at: string
          urgency: Database["public"]["Enums"]["lab_order_urgency"]
        }
        Insert: {
          admission_id?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          consent_status?: Database["public"]["Enums"]["lab_consent_status"]
          created_at?: string
          data_access_request_id?: string | null
          hospital_id: string
          id?: string
          is_internal_lab?: boolean
          ordered_by: string
          pathologist_id: string
          patient_id: string
          processing_started_at?: string | null
          quality_checked_at?: string | null
          received_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          sample_barcode?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: Database["public"]["Enums"]["lab_order_status"]
          tests?: Json
          updated_at?: string
          urgency?: Database["public"]["Enums"]["lab_order_urgency"]
        }
        Update: {
          admission_id?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          consent_status?: Database["public"]["Enums"]["lab_consent_status"]
          created_at?: string
          data_access_request_id?: string | null
          hospital_id?: string
          id?: string
          is_internal_lab?: boolean
          ordered_by?: string
          pathologist_id?: string
          patient_id?: string
          processing_started_at?: string | null
          quality_checked_at?: string | null
          received_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          sample_barcode?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: Database["public"]["Enums"]["lab_order_status"]
          tests?: Json
          updated_at?: string
          urgency?: Database["public"]["Enums"]["lab_order_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "hospital_lab_orders_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_orders_data_access_request_id_fkey"
            columns: ["data_access_request_id"]
            isOneToOne: false
            referencedRelation: "data_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_orders_pathologist_id_fkey"
            columns: ["pathologist_id"]
            isOneToOne: false
            referencedRelation: "pathologist_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hospital_lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hospital_lab_results: {
        Row: {
          created_at: string
          health_record_id: string | null
          id: string
          order_id: string
          pathologist_report_id: string | null
          received_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          health_record_id?: string | null
          id?: string
          order_id: string
          pathologist_report_id?: string | null
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          health_record_id?: string | null
          id?: string
          order_id?: string
          pathologist_report_id?: string | null
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_lab_results_health_record_id_fkey"
            columns: ["health_record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "hospital_lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_results_pathologist_report_id_fkey"
            columns: ["pathologist_report_id"]
            isOneToOne: false
            referencedRelation: "pathologist_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_staff: {
        Row: {
          created_at: string | null
          department: string | null
          department_id: string | null
          employee_id: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          employee_id?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          employee_id?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hospital_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lab_grade: string | null
          logo_url: string | null
          name: string
          phone: string | null
          registration_number: string | null
          state: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lab_grade?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lab_grade?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      icd10_codes: {
        Row: {
          aliases: string[] | null
          category: string | null
          chapter: string | null
          code: string
          created_at: string
          description: string
          id: string
          is_billable: boolean | null
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          chapter?: string | null
          code: string
          created_at?: string
          description: string
          id?: string
          is_billable?: boolean | null
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          chapter?: string | null
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_billable?: boolean | null
        }
        Relationships: []
      }
      icd11_codes: {
        Row: {
          aliases: string[] | null
          category: string | null
          chapter: string | null
          code: string
          created_at: string
          description: string
          id: string
          is_billable: boolean | null
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          chapter?: string | null
          code: string
          created_at?: string
          description: string
          id?: string
          is_billable?: boolean | null
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          chapter?: string | null
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_billable?: boolean | null
        }
        Relationships: []
      }
      insurance_plans: {
        Row: {
          coverage_percentage: number
          coverage_type: string
          covers_consultation: boolean | null
          covers_hospitalization: boolean | null
          covers_lab_tests: boolean | null
          covers_medication: boolean | null
          created_at: string
          id: string
          max_annual_limit: number | null
          plan_name: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          coverage_percentage?: number
          coverage_type?: string
          covers_consultation?: boolean | null
          covers_hospitalization?: boolean | null
          covers_lab_tests?: boolean | null
          covers_medication?: boolean | null
          created_at?: string
          id?: string
          max_annual_limit?: number | null
          plan_name: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          coverage_percentage?: number
          coverage_type?: string
          covers_consultation?: boolean | null
          covers_hospitalization?: boolean | null
          covers_lab_tests?: boolean | null
          covers_medication?: boolean | null
          created_at?: string
          id?: string
          max_annual_limit?: number | null
          plan_name?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          category: Database["public"]["Enums"]["invoice_item_category"] | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_date: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["invoice_item_category"] | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          service_date?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["invoice_item_category"] | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_date?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          admission_id: string | null
          amount_paid: number | null
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_date: string | null
          hospital_id: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          admission_id?: string | null
          amount_paid?: number | null
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          hospital_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          admission_id?: string | null
          amount_paid?: number | null
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          hospital_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_at: string | null
          administered_by: string
          admission_medication_id: string
          created_at: string | null
          dose_given: string
          id: string
          notes: string | null
          skip_reason: string | null
          skipped: boolean | null
        }
        Insert: {
          administered_at?: string | null
          administered_by: string
          admission_medication_id: string
          created_at?: string | null
          dose_given: string
          id?: string
          notes?: string | null
          skip_reason?: string | null
          skipped?: boolean | null
        }
        Update: {
          administered_at?: string | null
          administered_by?: string
          admission_medication_id?: string
          created_at?: string | null
          dose_given?: string
          id?: string
          notes?: string | null
          skip_reason?: string | null
          skipped?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_admission_medication_id_fkey"
            columns: ["admission_medication_id"]
            isOneToOne: false
            referencedRelation: "admission_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_prices: {
        Row: {
          avg_price: number
          category: string | null
          created_at: string
          id: string
          medication_name: string
          unit: string
          updated_at: string
        }
        Insert: {
          avg_price?: number
          category?: string | null
          created_at?: string
          id?: string
          medication_name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          avg_price?: number
          category?: string | null
          created_at?: string
          id?: string
          medication_name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      medication_reminder_logs: {
        Row: {
          created_at: string
          id: string
          reminder_id: string | null
          scheduled_for: string
          sent_at: string | null
          skipped_reason: string | null
          snooze_count: number | null
          snoozed_until: string | null
          status: string | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          skipped_reason?: string | null
          snooze_count?: number | null
          snoozed_until?: string | null
          status?: string | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          skipped_reason?: string | null
          snooze_count?: number | null
          snoozed_until?: string | null
          status?: string | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminder_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "medication_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reminders: {
        Row: {
          caregiver_alert_after_minutes: number | null
          caregiver_email: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          created_at: string
          days_of_week: number[] | null
          dosage: string | null
          frequency: string
          id: string
          is_active: boolean | null
          medication_name: string
          notes: string | null
          reminder_times: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          caregiver_alert_after_minutes?: number | null
          caregiver_email?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          created_at?: string
          days_of_week?: number[] | null
          dosage?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          medication_name: string
          notes?: string | null
          reminder_times: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          caregiver_alert_after_minutes?: number | null
          caregiver_email?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          created_at?: string
          days_of_week?: number[] | null
          dosage?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          medication_name?: string
          notes?: string | null
          reminder_times?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medication_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_perfect_date: string | null
          longest_streak: number | null
          milestones_achieved: number[] | null
          total_perfect_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_perfect_date?: string | null
          longest_streak?: number | null
          milestones_achieved?: number[] | null
          total_perfect_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_perfect_date?: string | null
          longest_streak?: number | null
          milestones_achieved?: number[] | null
          total_perfect_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country_code: string | null
          created_at: string
          device_type: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      pathologist_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          test_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          test_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          test_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pathologist_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pathologist_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathologist_invoice_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "pathologist_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      pathologist_invoices: {
        Row: {
          amount_paid: number
          created_at: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pathologist_id: string
          patient_id: string
          report_id: string | null
          status: Database["public"]["Enums"]["pathologist_invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          pathologist_id: string
          patient_id: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["pathologist_invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pathologist_id?: string
          patient_id?: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["pathologist_invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathologist_invoices_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pathologist_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pathologist_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          pathologist_id: string
          payment_date: string
          payment_method: Database["public"]["Enums"]["pathologist_payment_method"]
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          pathologist_id: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["pathologist_payment_method"]
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          pathologist_id?: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["pathologist_payment_method"]
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathologist_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pathologist_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pathologist_profiles: {
        Row: {
          avatar_url: string | null
          certifications: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_verified: boolean | null
          lab_address: string | null
          lab_grade: string | null
          lab_hours: Json | null
          lab_name: string | null
          license_number: string | null
          phone: string | null
          specialization_area: string | null
          total_experience: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          certifications?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_verified?: boolean | null
          lab_address?: string | null
          lab_grade?: string | null
          lab_hours?: Json | null
          lab_name?: string | null
          license_number?: string | null
          phone?: string | null
          specialization_area?: string | null
          total_experience?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          certifications?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          lab_address?: string | null
          lab_grade?: string | null
          lab_hours?: Json | null
          lab_name?: string | null
          license_number?: string | null
          phone?: string | null
          specialization_area?: string | null
          total_experience?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pathologist_report_templates: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pathologist_id: string
          template_structure: Json
          test_type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pathologist_id: string
          template_structure?: Json
          test_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pathologist_id?: string
          template_structure?: Json
          test_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pathologist_reports: {
        Row: {
          abnormal_flags: Json | null
          addenda: Json | null
          ai_analysis: Json | null
          created_at: string | null
          disease_category: string | null
          doctor_id: string | null
          doctor_notified_at: string | null
          doctor_viewed_at: string | null
          file_url: string | null
          findings: string | null
          has_abnormal_values: boolean | null
          hospital_lab_order_id: string | null
          id: string
          is_shared_with_doctor: boolean | null
          is_shared_with_patient: boolean | null
          pathologist_id: string
          patient_id: string
          patient_viewed_at: string | null
          report_name: string
          report_type: string | null
          updated_at: string | null
        }
        Insert: {
          abnormal_flags?: Json | null
          addenda?: Json | null
          ai_analysis?: Json | null
          created_at?: string | null
          disease_category?: string | null
          doctor_id?: string | null
          doctor_notified_at?: string | null
          doctor_viewed_at?: string | null
          file_url?: string | null
          findings?: string | null
          has_abnormal_values?: boolean | null
          hospital_lab_order_id?: string | null
          id?: string
          is_shared_with_doctor?: boolean | null
          is_shared_with_patient?: boolean | null
          pathologist_id: string
          patient_id: string
          patient_viewed_at?: string | null
          report_name: string
          report_type?: string | null
          updated_at?: string | null
        }
        Update: {
          abnormal_flags?: Json | null
          addenda?: Json | null
          ai_analysis?: Json | null
          created_at?: string | null
          disease_category?: string | null
          doctor_id?: string | null
          doctor_notified_at?: string | null
          doctor_viewed_at?: string | null
          file_url?: string | null
          findings?: string | null
          has_abnormal_values?: boolean | null
          hospital_lab_order_id?: string | null
          id?: string
          is_shared_with_doctor?: boolean | null
          is_shared_with_patient?: boolean | null
          pathologist_id?: string
          patient_id?: string
          patient_viewed_at?: string | null
          report_name?: string
          report_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathologist_reports_hospital_lab_order_id_fkey"
            columns: ["hospital_lab_order_id"]
            isOneToOne: false
            referencedRelation: "hospital_lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pathologist_tests: {
        Row: {
          category: string
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          pathologist_id: string
          preparation_instructions: string | null
          price: number
          reference_ranges: string | null
          sample_type: string | null
          template_id: string | null
          turnaround_time: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          pathologist_id: string
          preparation_instructions?: string | null
          price?: number
          reference_ranges?: string | null
          sample_type?: string | null
          template_id?: string | null
          turnaround_time?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pathologist_id?: string
          preparation_instructions?: string | null
          price?: number
          reference_ranges?: string | null
          sample_type?: string | null
          template_id?: string | null
          turnaround_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_background_info: {
        Row: {
          created_at: string
          education_level: string | null
          family_history: string | null
          id: string
          lifestyle_notes: string | null
          occupation: string | null
          occupational_health_note: string | null
          source: string
          source_ref: string | null
          updated_at: string
          user_id: string
          ward_address: string | null
          ward_no: string | null
        }
        Insert: {
          created_at?: string
          education_level?: string | null
          family_history?: string | null
          id?: string
          lifestyle_notes?: string | null
          occupation?: string | null
          occupational_health_note?: string | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id: string
          ward_address?: string | null
          ward_no?: string | null
        }
        Update: {
          created_at?: string
          education_level?: string | null
          family_history?: string | null
          id?: string
          lifestyle_notes?: string | null
          occupation?: string | null
          occupational_health_note?: string | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
          ward_address?: string | null
          ward_no?: string | null
        }
        Relationships: []
      }
      patient_care_team: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          notes: string | null
          physician_name: string | null
          ref_doctor_id: string | null
          referral_date: string | null
          source: string
          source_ref: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          physician_name?: string | null
          ref_doctor_id?: string | null
          referral_date?: string | null
          source?: string
          source_ref?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          physician_name?: string | null
          ref_doctor_id?: string | null
          referral_date?: string | null
          source?: string
          source_ref?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_clinical_investigations: {
        Row: {
          biomarker_results: Json | null
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          has_abnormal_values: boolean | null
          height_cm: number | null
          id: string
          imaging_reference: string | null
          imaging_type: string | null
          investigation_date: string | null
          investigation_type: string | null
          loinc_code: string | null
          notes: string | null
          results: Json | null
          source: string
          source_ref: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          biomarker_results?: Json | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          has_abnormal_values?: boolean | null
          height_cm?: number | null
          id?: string
          imaging_reference?: string | null
          imaging_type?: string | null
          investigation_date?: string | null
          investigation_type?: string | null
          loinc_code?: string | null
          notes?: string | null
          results?: Json | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          biomarker_results?: Json | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          has_abnormal_values?: boolean | null
          height_cm?: number | null
          id?: string
          imaging_reference?: string | null
          imaging_type?: string | null
          investigation_date?: string | null
          investigation_type?: string | null
          loinc_code?: string | null
          notes?: string | null
          results?: Json | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      patient_comorbidities: {
        Row: {
          alcohol_consumption: string | null
          comorbidity_list: string[] | null
          created_at: string
          icd10_mappings: Json | null
          id: string
          other_risk_factors: string | null
          pack_years: number | null
          smoking_status: string | null
          source: string
          source_ref: string | null
          units_per_week: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alcohol_consumption?: string | null
          comorbidity_list?: string[] | null
          created_at?: string
          icd10_mappings?: Json | null
          id?: string
          other_risk_factors?: string | null
          pack_years?: number | null
          smoking_status?: string | null
          source?: string
          source_ref?: string | null
          units_per_week?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alcohol_consumption?: string | null
          comorbidity_list?: string[] | null
          created_at?: string
          icd10_mappings?: Json | null
          id?: string
          other_risk_factors?: string | null
          pack_years?: number | null
          smoking_status?: string | null
          source?: string
          source_ref?: string | null
          units_per_week?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_complications_status: {
        Row: {
          complication_notes: string | null
          created_at: string
          current_complications: string[] | null
          follow_up_required: boolean | null
          icd10_mappings: Json | null
          id: string
          next_follow_up_date: string | null
          notes: string | null
          source: string
          source_ref: string | null
          status_date: string | null
          treatment_response: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          complication_notes?: string | null
          created_at?: string
          current_complications?: string[] | null
          follow_up_required?: boolean | null
          icd10_mappings?: Json | null
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          source?: string
          source_ref?: string | null
          status_date?: string | null
          treatment_response?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          complication_notes?: string | null
          created_at?: string
          current_complications?: string[] | null
          follow_up_required?: boolean | null
          icd10_mappings?: Json | null
          id?: string
          next_follow_up_date?: string | null
          notes?: string | null
          source?: string
          source_ref?: string | null
          status_date?: string | null
          treatment_response?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_digest_preferences: {
        Row: {
          created_at: string
          id: string
          last_sent_at: string | null
          preferred_day: number
          preferred_hour: number
          timezone: string
          updated_at: string
          user_id: string
          weekly_digest_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          last_sent_at?: string | null
          preferred_day?: number
          preferred_hour?: number
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_digest_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          last_sent_at?: string | null
          preferred_day?: number
          preferred_hour?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
      patient_favorite_doctors: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: []
      }
      patient_id_sequences: {
        Row: {
          last_sequence: number
          updated_at: string
          year_month: string
        }
        Insert: {
          last_sequence?: number
          updated_at?: string
          year_month: string
        }
        Update: {
          last_sequence?: number
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      patient_merge_candidates: {
        Row: {
          confidence_score: number
          created_at: string
          hospital_id: string | null
          id: string
          match_factors: Json | null
          patient_id_a: string
          patient_id_b: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          hospital_id?: string | null
          id?: string
          match_factors?: Json | null
          patient_id_a: string
          patient_id_b: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          hospital_id?: string | null
          id?: string
          match_factors?: Json | null
          patient_id_a?: string
          patient_id_b?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_merge_candidates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_merge_history: {
        Row: {
          created_at: string
          id: string
          is_undone: boolean | null
          kept_patient_id: string
          merge_candidate_id: string | null
          merged_by: string
          merged_patient_id: string
          records_moved: Json
          snapshot_before: Json
          undo_deadline: string
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_undone?: boolean | null
          kept_patient_id: string
          merge_candidate_id?: string | null
          merged_by: string
          merged_patient_id: string
          records_moved?: Json
          snapshot_before?: Json
          undo_deadline: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_undone?: boolean | null
          kept_patient_id?: string
          merge_candidate_id?: string | null
          merged_by?: string
          merged_patient_id?: string
          records_moved?: Json
          snapshot_before?: Json
          undo_deadline?: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: []
      }
      patient_pathologist_shares: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          disease_category: string | null
          expires_at: string | null
          id: string
          is_anonymized: boolean | null
          notes: string | null
          pathologist_id: string
          patient_id: string
          shared_at: string | null
          status: string
          viewed_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          disease_category?: string | null
          expires_at?: string | null
          id?: string
          is_anonymized?: boolean | null
          notes?: string | null
          pathologist_id: string
          patient_id: string
          shared_at?: string | null
          status?: string
          viewed_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          disease_category?: string | null
          expires_at?: string | null
          id?: string
          is_anonymized?: boolean | null
          notes?: string | null
          pathologist_id?: string
          patient_id?: string
          shared_at?: string | null
          status?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      patient_queue: {
        Row: {
          appointment_id: string
          called_at: string | null
          checked_in_at: string
          completed_at: string | null
          created_at: string
          doctor_id: string
          hospital_id: string | null
          id: string
          patient_id: string
          priority: string
          queue_position: number
          status: string
        }
        Insert: {
          appointment_id: string
          called_at?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          doctor_id: string
          hospital_id?: string | null
          id?: string
          patient_id: string
          priority?: string
          queue_position?: number
          status?: string
        }
        Update: {
          appointment_id?: string
          called_at?: string | null
          checked_in_at?: string
          completed_at?: string | null
          created_at?: string
          doctor_id?: string
          hospital_id?: string | null
          id?: string
          patient_id?: string
          priority?: string
          queue_position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_researcher_shares: {
        Row: {
          access_token_id: string | null
          completed_at: string | null
          created_at: string | null
          disease_category: string | null
          expires_at: string | null
          id: string
          include_clinical_records: boolean | null
          is_anonymized: boolean | null
          patient_id: string
          research_purpose: string | null
          researcher_id: string
          shared_at: string | null
          status: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          access_token_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          disease_category?: string | null
          expires_at?: string | null
          id?: string
          include_clinical_records?: boolean | null
          is_anonymized?: boolean | null
          patient_id: string
          research_purpose?: string | null
          researcher_id: string
          shared_at?: string | null
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_token_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          disease_category?: string | null
          expires_at?: string | null
          id?: string
          include_clinical_records?: boolean | null
          is_anonymized?: boolean | null
          patient_id?: string
          research_purpose?: string | null
          researcher_id?: string
          shared_at?: string | null
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_researcher_shares_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_running_treatments: {
        Row: {
          created_at: string
          dialysis_frequency: string | null
          dialysis_status: string | null
          dietary_intervention: boolean | null
          dietary_notes: string | null
          id: string
          is_active: boolean | null
          medication_dose: string | null
          medication_frequency: string | null
          medication_name: string | null
          notes: string | null
          source: string
          source_ref: string | null
          therapy_frequency: string | null
          therapy_provider: string | null
          therapy_type: string | null
          treatment_end_date: string | null
          treatment_start_date: string | null
          treatment_types: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dialysis_frequency?: string | null
          dialysis_status?: string | null
          dietary_intervention?: boolean | null
          dietary_notes?: string | null
          id?: string
          is_active?: boolean | null
          medication_dose?: string | null
          medication_frequency?: string | null
          medication_name?: string | null
          notes?: string | null
          source?: string
          source_ref?: string | null
          therapy_frequency?: string | null
          therapy_provider?: string | null
          therapy_type?: string | null
          treatment_end_date?: string | null
          treatment_start_date?: string | null
          treatment_types?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dialysis_frequency?: string | null
          dialysis_status?: string | null
          dietary_intervention?: boolean | null
          dietary_notes?: string | null
          id?: string
          is_active?: boolean | null
          medication_dose?: string | null
          medication_frequency?: string | null
          medication_name?: string | null
          notes?: string | null
          source?: string
          source_ref?: string | null
          therapy_frequency?: string | null
          therapy_provider?: string | null
          therapy_type?: string | null
          treatment_end_date?: string | null
          treatment_start_date?: string | null
          treatment_types?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_vitals: {
        Row: {
          appointment_id: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          doctor_id: string
          heart_rate: number | null
          hospital_id: string | null
          id: string
          notes: string | null
          patient_id: string
          recorded_at: string
          spo2: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          appointment_id?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          doctor_id: string
          heart_rate?: number | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          recorded_at?: string
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          appointment_id?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          doctor_id?: string
          heart_rate?: number | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_at?: string
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_vitals_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_vitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_wallets: {
        Row: {
          created_at: string
          id: string
          token_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          token_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
          wallet_address?: string
        }
        Update: {
          created_at?: string
          id?: string
          token_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          hospital_id: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string | null
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          hospital_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          hospital_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      prescription_templates: {
        Row: {
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          instructions: string | null
          medications: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          instructions?: string | null
          medications?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          instructions?: string | null
          medications?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          advice: string | null
          chief_complaints: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          follow_up_date: string | null
          hospital_id: string | null
          icd_code: string | null
          icd_standard: string | null
          icd11_chapter_code: string | null
          icd11_code: string | null
          id: string
          instructions: string | null
          investigations: string | null
          is_active: boolean | null
          medications: Json
          notes: string | null
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          advice?: string | null
          chief_complaints?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          follow_up_date?: string | null
          hospital_id?: string | null
          icd_code?: string | null
          icd_standard?: string | null
          icd11_chapter_code?: string | null
          icd11_code?: string | null
          id?: string
          instructions?: string | null
          investigations?: string | null
          is_active?: boolean | null
          medications?: Json
          notes?: string | null
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          advice?: string | null
          chief_complaints?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          follow_up_date?: string | null
          hospital_id?: string | null
          icd_code?: string | null
          icd_standard?: string | null
          icd11_chapter_code?: string | null
          icd11_code?: string | null
          id?: string
          instructions?: string | null
          investigations?: string | null
          is_active?: boolean | null
          medications?: Json
          notes?: string | null
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number
          error_details: Json | null
          id: string
          import_type: string
          imported_count: number
          metadata: Json | null
          provider_id: string
          provider_type: string
          skipped_count: number
          source_filename: string | null
          source_format: string
          status: string
          total_records: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number
          error_details?: Json | null
          id?: string
          import_type: string
          imported_count?: number
          metadata?: Json | null
          provider_id: string
          provider_type: string
          skipped_count?: number
          source_filename?: string | null
          source_format: string
          status?: string
          total_records?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number
          error_details?: Json | null
          id?: string
          import_type?: string
          imported_count?: number
          metadata?: Json | null
          provider_id?: string
          provider_type?: string
          skipped_count?: number
          source_filename?: string | null
          source_format?: string
          status?: string
          total_records?: number
        }
        Relationships: []
      }
      provider_import_records: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          import_log_id: string
          source_data: Json
          source_row_number: number | null
          status: string
          target_record_id: string | null
          target_table: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_log_id: string
          source_data: Json
          source_row_number?: number | null
          status?: string
          target_record_id?: string | null
          target_table: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_log_id?: string
          source_data?: Json
          source_row_number?: number | null
          status?: string
          target_record_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_import_records_import_log_id_fkey"
            columns: ["import_log_id"]
            isOneToOne: false
            referencedRelation: "provider_import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verifications: {
        Row: {
          additional_documents: string[] | null
          created_at: string | null
          document_url: string | null
          id: string
          issuing_authority: string | null
          issuing_country: string | null
          license_expiry_date: string | null
          license_number: string | null
          notes: string | null
          provider_type: Database["public"]["Enums"]["provider_type"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_documents?: string[] | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          issuing_authority?: string | null
          issuing_country?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          notes?: string | null
          provider_type: Database["public"]["Enums"]["provider_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_documents?: string[] | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          issuing_authority?: string | null
          issuing_country?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          notes?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      record_tags: {
        Row: {
          created_at: string
          id: string
          record_id: string
          tag_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_id: string
          tag_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          record_id?: string
          tag_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_tags_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
        ]
      }
      research_broadcast_requests: {
        Row: {
          created_at: string | null
          disease_category: string
          id: string
          patients_approved: number | null
          patients_notified: number | null
          patients_rejected: number | null
          research_purpose: string
          researcher_id: string
          status: string
          token_offer_per_patient: number | null
          tokens_disbursed: number | null
          total_token_budget: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disease_category: string
          id?: string
          patients_approved?: number | null
          patients_notified?: number | null
          patients_rejected?: number | null
          research_purpose: string
          researcher_id: string
          status?: string
          token_offer_per_patient?: number | null
          tokens_disbursed?: number | null
          total_token_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disease_category?: string
          id?: string
          patients_approved?: number | null
          patients_notified?: number | null
          patients_rejected?: number | null
          research_purpose?: string
          researcher_id?: string
          status?: string
          token_offer_per_patient?: number | null
          tokens_disbursed?: number | null
          total_token_budget?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_sharing_preferences: {
        Row: {
          created_at: string | null
          id: string
          notification_frequency: string | null
          notify_auto_approved: boolean | null
          notify_earnings: boolean | null
          notify_new_requests: boolean | null
          require_anonymization: boolean | null
          share_allergies: boolean | null
          share_demographics: boolean | null
          share_diagnoses: boolean | null
          share_lab_results: boolean | null
          share_prescriptions: boolean | null
          share_vitals: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_frequency?: string | null
          notify_auto_approved?: boolean | null
          notify_earnings?: boolean | null
          notify_new_requests?: boolean | null
          require_anonymization?: boolean | null
          share_allergies?: boolean | null
          share_demographics?: boolean | null
          share_diagnoses?: boolean | null
          share_lab_results?: boolean | null
          share_prescriptions?: boolean | null
          share_vitals?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_frequency?: string | null
          notify_auto_approved?: boolean | null
          notify_earnings?: boolean | null
          notify_new_requests?: boolean | null
          require_anonymization?: boolean | null
          share_allergies?: boolean | null
          share_demographics?: boolean | null
          share_diagnoses?: boolean | null
          share_lab_results?: boolean | null
          share_prescriptions?: boolean | null
          share_vitals?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      researcher_api_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          researcher_id: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          researcher_id: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          researcher_id?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      researcher_note_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          note_id: string
          researcher_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          note_id: string
          researcher_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          note_id?: string
          researcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "researcher_study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          institution_name: string | null
          institution_type: string | null
          is_verified: boolean | null
          license_number: string | null
          phone: string | null
          primary_domain: string | null
          research_focus: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          institution_name?: string | null
          institution_type?: string | null
          is_verified?: boolean | null
          license_number?: string | null
          phone?: string | null
          primary_domain?: string | null
          research_focus?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          institution_name?: string | null
          institution_type?: string | null
          is_verified?: boolean | null
          license_number?: string | null
          phone?: string | null
          primary_domain?: string | null
          research_focus?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      researcher_saved_charts: {
        Row: {
          chart_type: string
          config: Json
          created_at: string
          id: string
          name: string
          researcher_id: string
        }
        Insert: {
          chart_type: string
          config?: Json
          created_at?: string
          id?: string
          name: string
          researcher_id: string
        }
        Update: {
          chart_type?: string
          config?: Json
          created_at?: string
          id?: string
          name?: string
          researcher_id?: string
        }
        Relationships: []
      }
      researcher_saved_cohorts: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          researcher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          researcher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          researcher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      researcher_saved_datasets: {
        Row: {
          created_at: string
          description: string | null
          filter_config: Json
          id: string
          name: string
          record_count: number | null
          researcher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filter_config?: Json
          id?: string
          name: string
          record_count?: number | null
          researcher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filter_config?: Json
          id?: string
          name?: string
          record_count?: number | null
          researcher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      researcher_scheduled_reports: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          report_config: Json
          researcher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          report_config?: Json
          researcher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          report_config?: Json
          researcher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      researcher_studies: {
        Row: {
          actual_end_date: string | null
          cohort_filters: Json | null
          consent_scopes: string[] | null
          created_at: string | null
          current_sample_size: number | null
          description: string | null
          disease_categories: string[] | null
          expected_end_date: string | null
          id: string
          notes: string | null
          research_domains: string[] | null
          researcher_id: string
          start_date: string | null
          status: string
          study_type: string
          target_sample_size: number | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          cohort_filters?: Json | null
          consent_scopes?: string[] | null
          created_at?: string | null
          current_sample_size?: number | null
          description?: string | null
          disease_categories?: string[] | null
          expected_end_date?: string | null
          id?: string
          notes?: string | null
          research_domains?: string[] | null
          researcher_id: string
          start_date?: string | null
          status?: string
          study_type: string
          target_sample_size?: number | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          cohort_filters?: Json | null
          consent_scopes?: string[] | null
          created_at?: string | null
          current_sample_size?: number | null
          description?: string | null
          disease_categories?: string[] | null
          expected_end_date?: string | null
          id?: string
          notes?: string | null
          research_domains?: string[] | null
          researcher_id?: string
          start_date?: string | null
          status?: string
          study_type?: string
          target_sample_size?: number | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_studies_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "study_protocol_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_study_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_order: number
          name: string
          notes: string | null
          status: string
          study_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_order?: number
          name: string
          notes?: string | null
          status?: string
          study_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_order?: number
          name?: string
          notes?: string | null
          status?: string
          study_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_study_milestones_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "researcher_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_study_note_versions: {
        Row: {
          change_summary: string | null
          changed_by: string
          content: string | null
          created_at: string
          findings: string | null
          id: string
          methodology: string | null
          note_id: string
          publication_status: string | null
          snapshot: Json
          tags: string[] | null
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by: string
          content?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          methodology?: string | null
          note_id: string
          publication_status?: string | null
          snapshot?: Json
          tags?: string[] | null
          title: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string
          content?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          methodology?: string | null
          note_id?: string
          publication_status?: string | null
          snapshot?: Json
          tags?: string[] | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "researcher_study_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "researcher_study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_study_notes: {
        Row: {
          created_at: string | null
          data_references: Json | null
          findings: string | null
          id: string
          is_published: boolean | null
          is_shared: boolean
          methodology: string | null
          publication_status: string
          publication_url: string | null
          researcher_id: string
          sample_size: number | null
          share_id: string | null
          study_title: string
          tags: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_references?: Json | null
          findings?: string | null
          id?: string
          is_published?: boolean | null
          is_shared?: boolean
          methodology?: string | null
          publication_status?: string
          publication_url?: string | null
          researcher_id: string
          sample_size?: number | null
          share_id?: string | null
          study_title: string
          tags?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_references?: Json | null
          findings?: string | null
          id?: string
          is_published?: boolean | null
          is_shared?: boolean
          methodology?: string | null
          publication_status?: string
          publication_url?: string | null
          researcher_id?: string
          sample_size?: number | null
          share_id?: string | null
          study_title?: string
          tags?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_study_notes_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "patient_researcher_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_thank_you_messages: {
        Row: {
          contribution_id: string
          created_at: string
          custom_text: string | null
          id: string
          message_template: string
          researcher_id: string
          study_area: string | null
        }
        Insert: {
          contribution_id: string
          created_at?: string
          custom_text?: string | null
          id?: string
          message_template: string
          researcher_id: string
          study_area?: string | null
        }
        Update: {
          contribution_id?: string
          created_at?: string
          custom_text?: string | null
          id?: string
          message_template?: string
          researcher_id?: string
          study_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_thank_you_messages_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_health_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researcher_thank_you_messages_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "anonymous_pool_view"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_thread_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "researcher_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          linked_milestone_id: string | null
          linked_share_id: string | null
          study_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          linked_milestone_id?: string | null
          linked_share_id?: string | null
          study_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          linked_milestone_id?: string | null
          linked_share_id?: string | null
          study_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_threads_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "researcher_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_webhook_logs: {
        Row: {
          delivered_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          delivered_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          delivered_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "researcher_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          filter_criteria: Json | null
          id: string
          is_active: boolean
          label: string
          last_triggered_at: string | null
          researcher_id: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          filter_criteria?: Json | null
          id?: string
          is_active?: boolean
          label: string
          last_triggered_at?: string | null
          researcher_id: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          filter_criteria?: Json | null
          id?: string
          is_active?: boolean
          label?: string
          last_triggered_at?: string | null
          researcher_id?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      sample_tracking_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          order_id: string
          performed_by: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          order_id: string
          performed_by?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          order_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "hospital_lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_tracking_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      site_content: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      smart_launch_sessions: {
        Row: {
          access_token_encrypted: string | null
          client_id: string
          created_at: string
          ehr_url: string
          encounter_context: string | null
          error_message: string | null
          expires_at: string
          fhir_user: string | null
          id: string
          launch_token: string
          patient_context: string | null
          refresh_token_encrypted: string | null
          scope: string[]
          state: string
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          client_id: string
          created_at?: string
          ehr_url: string
          encounter_context?: string | null
          error_message?: string | null
          expires_at?: string
          fhir_user?: string | null
          id?: string
          launch_token: string
          patient_context?: string | null
          refresh_token_encrypted?: string | null
          scope: string[]
          state: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          client_id?: string
          created_at?: string
          ehr_url?: string
          encounter_context?: string | null
          error_message?: string | null
          expires_at?: string
          fhir_user?: string | null
          id?: string
          launch_token?: string
          patient_context?: string | null
          refresh_token_encrypted?: string | null
          scope?: string[]
          state?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          expires_at: string
          hospital_id: string
          id: string
          invited_by: string
          name: string | null
          role: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          expires_at?: string
          hospital_id: string
          id?: string
          invited_by: string
          name?: string | null
          role?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          expires_at?: string
          hospital_id?: string
          id?: string
          invited_by?: string
          name?: string | null
          role?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          hospital_id: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          hospital_id: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_type?: string
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "hospital_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      study_collaborators: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_by: string
          researcher_id: string
          role: string
          status: string
          study_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by: string
          researcher_id: string
          role?: string
          status?: string
          study_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string
          researcher_id?: string
          role?: string
          status?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_collaborators_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "researcher_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_protocol_templates: {
        Row: {
          created_at: string | null
          default_cohort_filters: Json | null
          default_consent_scopes: string[] | null
          default_disease_categories: string[] | null
          default_milestones: Json
          description: string | null
          estimated_duration_days: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          min_sample_size: number | null
          name: string
          study_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_cohort_filters?: Json | null
          default_consent_scopes?: string[] | null
          default_disease_categories?: string[] | null
          default_milestones?: Json
          description?: string | null
          estimated_duration_days?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          min_sample_size?: number | null
          name: string
          study_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_cohort_filters?: Json | null
          default_consent_scopes?: string[] | null
          default_disease_categories?: string[] | null
          default_milestones?: Json
          description?: string | null
          estimated_duration_days?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          min_sample_size?: number | null
          name?: string
          study_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      symptom_screenings: {
        Row: {
          booked_appointment: boolean | null
          created_at: string
          duration: string | null
          estimated_savings: string | null
          home_remedies: string[] | null
          id: string
          reasoning: string | null
          recommendations: string[] | null
          severity: string | null
          summary: string | null
          symptoms: string
          urgency: string
          urgency_label: string | null
          user_id: string
          warning_signs: string[] | null
        }
        Insert: {
          booked_appointment?: boolean | null
          created_at?: string
          duration?: string | null
          estimated_savings?: string | null
          home_remedies?: string[] | null
          id?: string
          reasoning?: string | null
          recommendations?: string[] | null
          severity?: string | null
          summary?: string | null
          symptoms: string
          urgency: string
          urgency_label?: string | null
          user_id: string
          warning_signs?: string[] | null
        }
        Update: {
          booked_appointment?: boolean | null
          created_at?: string
          duration?: string | null
          estimated_savings?: string | null
          home_remedies?: string[] | null
          id?: string
          reasoning?: string | null
          recommendations?: string[] | null
          severity?: string | null
          summary?: string | null
          symptoms?: string
          urgency?: string
          urgency_label?: string | null
          user_id?: string
          warning_signs?: string[] | null
        }
        Relationships: []
      }
      sync_conflicts: {
        Row: {
          conflict_fields: string[]
          created_at: string
          id: string
          local_data: Json
          remote_data: Json
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string | null
          resource_type: string
          source_system: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conflict_fields?: string[]
          created_at?: string
          id?: string
          local_data?: Json
          remote_data?: Json
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type: string
          source_system?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conflict_fields?: string[]
          created_at?: string
          id?: string
          local_data?: Json
          remote_data?: Json
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type?: string
          source_system?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number
          email: string | null
          github_url: string | null
          gradient: string | null
          id: string
          is_advisor: boolean
          is_visible: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          profile_image_url: string | null
          role: string
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          github_url?: string | null
          gradient?: string | null
          id?: string
          is_advisor?: boolean
          is_visible?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          role: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          github_url?: string | null
          gradient?: string | null
          id?: string
          is_advisor?: boolean
          is_visible?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          role?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      token_pricing: {
        Row: {
          base_price_tokens: number
          created_at: string
          data_type: string
          disease_category: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          base_price_tokens?: number
          created_at?: string
          data_type?: string
          disease_category: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          base_price_tokens?: number
          created_at?: string
          data_type?: string
          disease_category?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_biometric_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          clinical_completeness_score: number | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          id: string
          insurance_plan_id: string | null
          is_guest_patient: boolean | null
          location: string | null
          national_id: string | null
          notification_email_enabled: boolean
          notification_preferences: Json | null
          notification_push_enabled: boolean | null
          occupation: string | null
          patient_passport_id: string | null
          phone: string | null
          registered_by_hospital_id: string | null
          spending_alert_threshold: number | null
          updated_at: string | null
          user_id: string
          weight: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          clinical_completeness_score?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_guest_patient?: boolean | null
          location?: string | null
          national_id?: string | null
          notification_email_enabled?: boolean
          notification_preferences?: Json | null
          notification_push_enabled?: boolean | null
          occupation?: string | null
          patient_passport_id?: string | null
          phone?: string | null
          registered_by_hospital_id?: string | null
          spending_alert_threshold?: number | null
          updated_at?: string | null
          user_id: string
          weight?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          clinical_completeness_score?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_guest_patient?: boolean | null
          location?: string | null
          national_id?: string | null
          notification_email_enabled?: boolean
          notification_preferences?: Json | null
          notification_push_enabled?: boolean | null
          occupation?: string | null
          patient_passport_id?: string | null
          phone?: string | null
          registered_by_hospital_id?: string | null
          spending_alert_threshold?: number | null
          updated_at?: string | null
          user_id?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_registered_by_hospital_id_fkey"
            columns: ["registered_by_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
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
      visit_summaries: {
        Row: {
          appointment_id: string
          approved_at: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          follow_up_instructions: string | null
          id: string
          is_approved: boolean
          medications_summary: string | null
          patient_id: string
          summary_text: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          approved_at?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          follow_up_instructions?: string | null
          id?: string
          is_approved?: boolean
          medications_summary?: string | null
          patient_id: string
          summary_text: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          approved_at?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          follow_up_instructions?: string | null
          id?: string
          is_approved?: boolean
          medications_summary?: string | null
          patient_id?: string
          summary_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_summaries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string | null
          description: string | null
          floor: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          total_beds: number
          type: Database["public"]["Enums"]["ward_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          floor?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          total_beds?: number
          type?: Database["public"]["Enums"]["ward_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          floor?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          total_beds?: number
          type?: Database["public"]["Enums"]["ward_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      anonymous_pool_view: {
        Row: {
          age_range: string | null
          anonymized_data: Json | null
          contributed_at: string | null
          contribution_hash: string | null
          data_categories: string[] | null
          disease_categories: string[] | null
          gender: string | null
          govt_approval_status: string | null
          id: string | null
          quality_score: number | null
          source_jurisdiction:
            | Database["public"]["Enums"]["jurisdiction_code"]
            | null
        }
        Insert: {
          age_range?: string | null
          anonymized_data?: Json | null
          contributed_at?: string | null
          contribution_hash?: string | null
          data_categories?: string[] | null
          disease_categories?: string[] | null
          gender?: string | null
          govt_approval_status?: string | null
          id?: string | null
          quality_score?: number | null
          source_jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_code"]
            | null
        }
        Update: {
          age_range?: string | null
          anonymized_data?: Json | null
          contributed_at?: string | null
          contribution_hash?: string | null
          data_categories?: string[] | null
          disease_categories?: string[] | null
          gender?: string | null
          govt_approval_status?: string | null
          id?: string | null
          quality_score?: number | null
          source_jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_code"]
            | null
        }
        Relationships: []
      }
      doctor_demand_analytics: {
        Row: {
          appointments_30d: number | null
          appointments_90d: number | null
          avg_visits_per_patient: number | null
          doctor_id: string | null
          full_name: string | null
          lab_grade: string | null
          repeat_patient_pct: number | null
          repeat_patients: number | null
          specialty: string | null
          total_appointments: number | null
          unique_patients: number | null
        }
        Relationships: []
      }
      doctor_rating_stats: {
        Row: {
          avg_rating: number | null
          doctor_id: string | null
          recent_avg: number | null
          total_reviews: number | null
        }
        Relationships: []
      }
      emergency_tokens_safe: {
        Row: {
          access_count: number | null
          access_level: string | null
          accessed_at: string | null
          created_at: string | null
          created_by: string | null
          emergency_token: string | null
          expires_at: string | null
          has_pin: boolean | null
          id: string | null
          is_active: boolean | null
          patient_id: string | null
          responder_identifier: string | null
        }
        Insert: {
          access_count?: number | null
          access_level?: string | null
          accessed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          emergency_token?: string | null
          expires_at?: string | null
          has_pin?: never
          id?: string | null
          is_active?: boolean | null
          patient_id?: string | null
          responder_identifier?: string | null
        }
        Update: {
          access_count?: number | null
          access_level?: string | null
          accessed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          emergency_token?: string | null
          expires_at?: string | null
          has_pin?: never
          id?: string | null
          is_active?: boolean | null
          patient_id?: string | null
          responder_identifier?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_audit_entry: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_user_id: string
        }
        Returns: string
      }
      assign_own_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      calculate_luhn_check_digit: {
        Args: { input_str: string }
        Returns: number
      }
      can_access_portal: {
        Args: { _portal: string; _user_id: string }
        Returns: boolean
      }
      capture_db_growth_snapshot: { Args: never; Returns: undefined }
      compute_audit_hash: {
        Args: {
          p_action: string
          p_details: Json
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_previous_hash: string
          p_timestamp: string
          p_user_id: string
        }
        Returns: string
      }
      compute_audit_merkle_block: {
        Args: { p_block_end: number; p_block_start: number }
        Returns: string
      }
      credit_patient_wallet: {
        Args: { p_patient_id: string; p_tokens: number }
        Returns: undefined
      }
      extract_hospital_id_from_path: { Args: { path: string }; Returns: string }
      generate_consent_signature: {
        Args: {
          p_consent_type: string
          p_patient_id: string
          p_purpose: string
          p_scope: Json
          p_timestamp: string
        }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_hospital_id: string }
        Returns: string
      }
      generate_pathologist_invoice_number: {
        Args: { p_pathologist_id: string }
        Returns: string
      }
      generate_patient_passport_id: { Args: never; Returns: string }
      generate_sample_barcode: { Args: never; Returns: string }
      get_active_user_counts: {
        Args: never
        Returns: {
          daily_active: number
          hourly_active: number
          monthly_active: number
          total_users: number
          weekly_active: number
        }[]
      }
      get_recent_access_count: { Args: never; Returns: number }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_portal: { Args: { _user_id: string }; Returns: string }
      has_active_doctor_access: {
        Args: { _doctor_id: string; _patient_id: string }
        Returns: boolean
      }
      has_patient_approved_sharing: {
        Args: {
          _patient_id: string
          _requester_id: string
          _requester_type: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_broadcast_approvals: {
        Args: { broadcast_id: string }
        Returns: undefined
      }
      increment_broadcast_rejections: {
        Args: { broadcast_id: string }
        Returns: undefined
      }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_staff:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _hospital_id: string; _user_id: string }; Returns: boolean }
      is_hospital_staff_for_path: {
        Args: { path: string; user_id: string }
        Returns: boolean
      }
      record_blockchain_transaction: {
        Args: {
          p_actor_id: string
          p_metadata?: Json
          p_target_resource_id?: string
          p_target_resource_type?: string
          p_transaction_type: Database["public"]["Enums"]["blockchain_transaction_type"]
        }
        Returns: string
      }
      record_blockchain_transaction_batch: {
        Args: { p_transactions: Json }
        Returns: {
          transaction_ids: string[]
        }[]
      }
      record_provenance: {
        Args: {
          p_activity: string
          p_agent_id?: string
          p_agent_type: string
          p_metadata?: Json
          p_source_document?: string
          p_source_system?: string
          p_target_id: string
          p_target_type: string
          p_user_id: string
        }
        Returns: string
      }
      repair_audit_trail_chain: {
        Args: never
        Returns: {
          repaired_records: number
          total_records: number
        }[]
      }
      repair_blockchain_chain: {
        Args: never
        Returns: {
          repaired_records: number
          total_records: number
        }[]
      }
      requires_cross_border_consent: {
        Args: {
          p_destination_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
          p_source_jurisdiction: Database["public"]["Enums"]["jurisdiction_code"]
        }
        Returns: boolean
      }
      should_notify_doctor_abnormal_result: {
        Args: { report_id: string }
        Returns: boolean
      }
      verify_audit_chain: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_valid: boolean
        }[]
      }
      verify_audit_parallel: {
        Args: { p_block_size?: number }
        Returns: {
          broken_block_ranges: string[]
          broken_inter_links: string[]
          inter_block_valid: boolean
          invalid_blocks: number
          overall_valid: boolean
          total_blocks: number
          valid_blocks: number
        }[]
      }
      verify_audit_trail_incremental: {
        Args: never
        Returns: {
          broken_chain_count: number
          checkpoint_block: number
          integrity_percentage: number
          is_incremental: boolean
          total_new_entries: number
          verified_entries: number
        }[]
      }
      verify_audit_trail_integrity: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          broken_chain_count: number
          first_broken_at: string
          integrity_percentage: number
          total_entries: number
          verified_entries: number
        }[]
      }
      verify_blockchain_integrity: {
        Args: never
        Returns: {
          broken_links: number
          integrity_percentage: number
          total_transactions: number
          verified_transactions: number
        }[]
      }
      verify_cross_chain_consistency: {
        Args: never
        Returns: {
          audit_only: number
          blockchain_only: number
          consistency_percentage: number
          matched: number
          total_audit: number
          total_blockchain: number
        }[]
      }
    }
    Enums: {
      admission_status: "admitted" | "discharged" | "transferred"
      app_role:
        | "admin"
        | "user"
        | "hospital_admin"
        | "doctor"
        | "pathologist"
        | "researcher"
        | "doctor_staff"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      bed_status: "available" | "occupied" | "maintenance" | "reserved"
      blockchain_transaction_type:
        | "HEALTH_RECORD_CREATED"
        | "HEALTH_RECORD_ACCESSED"
        | "HEALTH_RECORD_UPDATED"
        | "HEALTH_RECORD_DELETED"
        | "ACCESS_GRANTED"
        | "ACCESS_REVOKED"
        | "CONSENT_GIVEN"
        | "CONSENT_WITHDRAWN"
        | "DATA_EXPORTED"
        | "CROSS_BORDER_TRANSFER"
        | "EMERGENCY_ACCESS"
        | "PROVIDER_VERIFIED"
      chronic_condition_type:
        | "diabetes"
        | "hypertension"
        | "asthma"
        | "arthritis"
        | "cancer"
        | "copd"
        | "other"
      data_request_status: "pending" | "approved" | "rejected"
      disease_category:
        | "general"
        | "cancer"
        | "covid19"
        | "diabetes"
        | "heart_disease"
        | "other"
      invoice_item_category:
        | "consultation"
        | "bed_charge"
        | "medication"
        | "procedure"
        | "lab_test"
        | "other"
      invoice_status: "draft" | "pending" | "partial" | "paid" | "cancelled"
      jurisdiction_code:
        | "EU"
        | "US"
        | "UK"
        | "IN"
        | "CN"
        | "JP"
        | "AU"
        | "CA"
        | "BR"
        | "SG"
        | "AE"
        | "ZA"
        | "OTHER"
        | "BD"
      lab_consent_status: "pending" | "approved" | "rejected"
      lab_order_status:
        | "pending_consent"
        | "ordered"
        | "sample_collected"
        | "processing"
        | "completed"
        | "cancelled"
      lab_order_urgency: "routine" | "urgent" | "stat"
      medication_route:
        | "oral"
        | "iv"
        | "im"
        | "sc"
        | "topical"
        | "inhalation"
        | "rectal"
        | "other"
      medication_status: "active" | "discontinued" | "completed"
      pathologist_invoice_status:
        | "draft"
        | "pending"
        | "partial"
        | "paid"
        | "cancelled"
      pathologist_payment_method: "cash" | "card" | "upi" | "bank_transfer"
      payment_method: "cash" | "card" | "upi" | "bank_transfer" | "insurance"
      portal_type:
        | "patient"
        | "doctor"
        | "hospital"
        | "pathologist"
        | "researcher"
      provider_type: "doctor" | "pathologist" | "hospital_admin" | "researcher"
      record_category:
        | "prescription"
        | "lab_result"
        | "imaging"
        | "vaccination"
        | "other"
      transfer_basis:
        | "explicit_consent"
        | "standard_contractual_clauses"
        | "binding_corporate_rules"
        | "adequacy_decision"
        | "derogation_vital_interests"
        | "derogation_public_interest"
      verification_status: "pending" | "approved" | "rejected" | "expired"
      ward_type:
        | "general"
        | "icu"
        | "emergency"
        | "maternity"
        | "pediatric"
        | "private"
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
      admission_status: ["admitted", "discharged", "transferred"],
      app_role: [
        "admin",
        "user",
        "hospital_admin",
        "doctor",
        "pathologist",
        "researcher",
        "doctor_staff",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      bed_status: ["available", "occupied", "maintenance", "reserved"],
      blockchain_transaction_type: [
        "HEALTH_RECORD_CREATED",
        "HEALTH_RECORD_ACCESSED",
        "HEALTH_RECORD_UPDATED",
        "HEALTH_RECORD_DELETED",
        "ACCESS_GRANTED",
        "ACCESS_REVOKED",
        "CONSENT_GIVEN",
        "CONSENT_WITHDRAWN",
        "DATA_EXPORTED",
        "CROSS_BORDER_TRANSFER",
        "EMERGENCY_ACCESS",
        "PROVIDER_VERIFIED",
      ],
      chronic_condition_type: [
        "diabetes",
        "hypertension",
        "asthma",
        "arthritis",
        "cancer",
        "copd",
        "other",
      ],
      data_request_status: ["pending", "approved", "rejected"],
      disease_category: [
        "general",
        "cancer",
        "covid19",
        "diabetes",
        "heart_disease",
        "other",
      ],
      invoice_item_category: [
        "consultation",
        "bed_charge",
        "medication",
        "procedure",
        "lab_test",
        "other",
      ],
      invoice_status: ["draft", "pending", "partial", "paid", "cancelled"],
      jurisdiction_code: [
        "EU",
        "US",
        "UK",
        "IN",
        "CN",
        "JP",
        "AU",
        "CA",
        "BR",
        "SG",
        "AE",
        "ZA",
        "OTHER",
        "BD",
      ],
      lab_consent_status: ["pending", "approved", "rejected"],
      lab_order_status: [
        "pending_consent",
        "ordered",
        "sample_collected",
        "processing",
        "completed",
        "cancelled",
      ],
      lab_order_urgency: ["routine", "urgent", "stat"],
      medication_route: [
        "oral",
        "iv",
        "im",
        "sc",
        "topical",
        "inhalation",
        "rectal",
        "other",
      ],
      medication_status: ["active", "discontinued", "completed"],
      pathologist_invoice_status: [
        "draft",
        "pending",
        "partial",
        "paid",
        "cancelled",
      ],
      pathologist_payment_method: ["cash", "card", "upi", "bank_transfer"],
      payment_method: ["cash", "card", "upi", "bank_transfer", "insurance"],
      portal_type: [
        "patient",
        "doctor",
        "hospital",
        "pathologist",
        "researcher",
      ],
      provider_type: ["doctor", "pathologist", "hospital_admin", "researcher"],
      record_category: [
        "prescription",
        "lab_result",
        "imaging",
        "vaccination",
        "other",
      ],
      transfer_basis: [
        "explicit_consent",
        "standard_contractual_clauses",
        "binding_corporate_rules",
        "adequacy_decision",
        "derogation_vital_interests",
        "derogation_public_interest",
      ],
      verification_status: ["pending", "approved", "rejected", "expired"],
      ward_type: [
        "general",
        "icu",
        "emergency",
        "maternity",
        "pediatric",
        "private",
      ],
    },
  },
} as const
