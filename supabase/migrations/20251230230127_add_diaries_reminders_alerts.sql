/*
  # Add Diaries, Reminders, and Alerts Support

  1. New Tables
    - `project_diaries`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `entry_date` (timestamptz)
      - `content` (text)
      - `created_by` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_reminders`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `reminder_date` (date)
      - `description` (text)
      - `is_active` (boolean)
      - `created_by` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_alerts`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `alert_date` (date)
      - `description` (text)
      - `is_read` (boolean)
      - `created_from_reminder_id` (uuid, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for public read access
*/

-- Create project_diaries table
CREATE TABLE IF NOT EXISTS project_diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date timestamptz DEFAULT now(),
  content text NOT NULL,
  created_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_reminders table
CREATE TABLE IF NOT EXISTS project_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true,
  created_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_alerts table
CREATE TABLE IF NOT EXISTS project_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  alert_date date NOT NULL,
  description text NOT NULL,
  is_read boolean DEFAULT false,
  created_from_reminder_id uuid REFERENCES project_reminders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching existing pattern)
CREATE POLICY "Enable read access for all users" ON project_diaries FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON project_diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON project_diaries FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON project_diaries FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON project_reminders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON project_reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON project_reminders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON project_reminders FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON project_alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON project_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON project_alerts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON project_alerts FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_diaries_project_id ON project_diaries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_diaries_entry_date ON project_diaries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_reminders_project_id ON project_reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reminders_date ON project_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_project_alerts_project_id ON project_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_alerts_date ON project_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_project_alerts_is_read ON project_alerts(is_read);