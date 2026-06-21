-- AnyGrade v1 schema

CREATE TABLE exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_token text NOT NULL,
  subject text NOT NULL,
  exam_name text NOT NULL,
  blank_questionnaire_path text,
  answer_key jsonb NOT NULL,
  -- answer_key shape: [{item: 1, answer: "42.7", tolerance: 0.5, type: "numeric"|"mcq"}]
  created_at timestamptz DEFAULT now()
);

CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  student_id text NOT NULL,
  email text,
  paper_image_path text,
  annotated_image_path text,
  raw_score numeric DEFAULT 0,
  max_score numeric,
  ocr_status text DEFAULT 'pending',
  -- pending | processing | done | failed | needs_review
  ocr_failure_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

CREATE TABLE student_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  item_number int NOT NULL,
  extracted_answer text,
  correct_answer text,
  is_correct boolean,
  confidence numeric,
  needs_review boolean DEFAULT false,
  corrected_answer text,
  corrected_at timestamptz,
  UNIQUE(student_id, item_number)
);

CREATE TABLE access_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  token text UNIQUE DEFAULT gen_random_uuid()::text,
  email_sent_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  UNIQUE(exam_id, student_id)
);

-- Item analysis view
CREATE VIEW item_analysis AS
SELECT
  e.id AS exam_id,
  sa.item_number,
  COUNT(*) AS total_students,
  SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) AS correct_count,
  ROUND(
    100.0 * SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1
  ) AS pct_correct
FROM student_answers sa
JOIN students s ON s.id = sa.student_id
JOIN exams e ON e.id = s.exam_id
GROUP BY e.id, sa.item_number
ORDER BY sa.item_number;
