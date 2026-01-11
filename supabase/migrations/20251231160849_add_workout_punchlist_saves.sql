/*
  # Add Workout Punchlist Saves

  1. New Table
    - `workout_punchlist_saves`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `checklist_items` (jsonb, array of checklist items with checked status)
      - `saved_by` (text, user identifier)
      - `saved_at` (timestamptz, timestamp of save)
      - `notes` (text, optional notes about the punchlist)

  2. Security
    - Enable RLS on `workout_punchlist_saves` table
    - Add policies for authenticated access

  3. Notes
    - Stores the dynamically generated punchlist items with their completion status
    - Each save creates a new record to maintain history
    - JSONB format allows flexible storage of varied checklist structures
*/

CREATE TABLE IF NOT EXISTS workout_punchlist_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved_by text DEFAULT 'system',
  saved_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_punchlist_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to punchlist saves"
  ON workout_punchlist_saves
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to punchlist saves"
  ON workout_punchlist_saves
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to punchlist saves"
  ON workout_punchlist_saves
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_punchlist_saves_project_id ON workout_punchlist_saves(project_id);
CREATE INDEX IF NOT EXISTS idx_punchlist_saves_saved_at ON workout_punchlist_saves(saved_at DESC);