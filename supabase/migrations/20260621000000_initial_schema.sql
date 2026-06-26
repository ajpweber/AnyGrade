-- Migration: initial schema
-- Requires: pgvector extension (enabled in Supabase dashboard under Database > Extensions)
-- Date: 2026-06-21 (retroactive — applied manually via Supabase dashboard at project start)
-- This file was written 2026-06-26 based on the live production schema.
-- Source: SELECT table_name, column_name, data_type FROM information_schema.columns
--         WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
-- USER-DEFINED columns (enums) are noted — retrieve the exact enum values from
-- the Supabase dashboard under Database > Types before running in a fresh environment.

-- ------------------------------------------------------------
-- CHED curriculum reference tables
-- Used by AnyQuiz for topic and outcome lookup
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ched_curricula (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code             text,
  title            text,
  degree_program   text,
  effectivity_year integer,
  document_url     text,
  raw_content      jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ched_subjects (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id    uuid REFERENCES ched_curricula(id),
  code             text,
  title            text,
  units            numeric,
  year_level       integer,
  semester         integer,
  course_outcomes  jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cmo_topic_chunks (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_code     text,
  subject_title    text,
  curriculum_code  text,
  topic_path       text,
  topic_title      text,
  level            integer,
  full_context     text,
  embedding        vector,   -- USER-DEFINED: pgvector extension
  created_at       timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Teacher accounts
-- Separate from Supabase auth.users
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teachers (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text,
  full_name   text,
  institution text,
  created_at  timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Syllabi and classes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_syllabi (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ched_subject_id   uuid REFERENCES ched_subjects(id),
  institution       text,
  department        text,
  college           text,
  subject_code      text,
  subject_title     text,
  academic_year     text,
  semester          integer,
  topics            jsonb DEFAULT '[]'::jsonb,
  learning_outcomes jsonb DEFAULT '[]'::jsonb,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id    uuid,   -- references auth.users
  name          text,
  subject       text,
  academic_year text,
  semester      text,
  syllabus_id   uuid REFERENCES school_syllabi(id),
  join_code     text,
  created_at    timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Students
-- Linked to classes, not exams
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     uuid REFERENCES classes(id) ON DELETE CASCADE,
  full_name    text,
  student_id   text,
  email        text,
  phone_number text,
  created_at   timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Assessments and submissions
-- ------------------------------------------------------------

CREATE TYPE assessment_type AS ENUM (
  'quiz', 'activity', 'seatwork', 'exam', 'long_exam', 'lab_report', 'recitation', 'project'
);

CREATE TABLE IF NOT EXISTS assessments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     uuid REFERENCES classes(id) ON DELETE CASCADE,
  title        text,
  total_items  integer,
  max_score    numeric,
  conducted_at date,
  type         assessment_type,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  student_id    uuid REFERENCES students(id) ON DELETE CASCADE,
  raw_score     numeric,
  scan_url      text,
  ocr_result    jsonb,
  graded_at     timestamptz,
  email_sent_at timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Correction tasks
-- Handles the teacher correction flow via token URL (/correct/[token])
-- Replaces the access_tokens + student_answers model from the original plan
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS correction_tasks (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token               text,
  student_name        text,
  student_email       text,
  assessment_title    text,
  assessment_type     text,
  scan_path           text,
  grade_results       jsonb,
  corrected_bboxes    jsonb,
  status              text,
  reading_corrections jsonb,
  review_status       text,
  review_results      jsonb,
  reviewed_at         timestamptz,
  reviewed_by         text,
  created_at          timestamptz DEFAULT now(),
  completed_at        timestamptz
);
