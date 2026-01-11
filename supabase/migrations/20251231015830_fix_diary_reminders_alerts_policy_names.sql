/*
  # Fix RLS Policy Names for Diaries, Reminders, and Alerts

  1. Changes
    - Drop existing policies with duplicate names
    - Create new policies with unique names for each operation
    - Ensure proper access control for all CRUD operations

  2. Security
    - Maintain public access pattern consistent with other tables
    - Each policy has a unique, descriptive name
*/

-- Drop existing policies for project_diaries
DROP POLICY IF EXISTS "Enable read access for all users" ON project_diaries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON project_diaries;
DROP POLICY IF EXISTS "Enable update access for all users" ON project_diaries;
DROP POLICY IF EXISTS "Enable delete access for all users" ON project_diaries;

-- Drop existing policies for project_reminders
DROP POLICY IF EXISTS "Enable read access for all users" ON project_reminders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON project_reminders;
DROP POLICY IF EXISTS "Enable update access for all users" ON project_reminders;
DROP POLICY IF EXISTS "Enable delete access for all users" ON project_reminders;

-- Drop existing policies for project_alerts
DROP POLICY IF EXISTS "Enable read access for all users" ON project_alerts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON project_alerts;
DROP POLICY IF EXISTS "Enable update access for all users" ON project_alerts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON project_alerts;

-- Create new policies with unique names for project_diaries
CREATE POLICY "project_diaries_select_all" ON project_diaries FOR SELECT USING (true);
CREATE POLICY "project_diaries_insert_all" ON project_diaries FOR INSERT WITH CHECK (true);
CREATE POLICY "project_diaries_update_all" ON project_diaries FOR UPDATE USING (true);
CREATE POLICY "project_diaries_delete_all" ON project_diaries FOR DELETE USING (true);

-- Create new policies with unique names for project_reminders
CREATE POLICY "project_reminders_select_all" ON project_reminders FOR SELECT USING (true);
CREATE POLICY "project_reminders_insert_all" ON project_reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "project_reminders_update_all" ON project_reminders FOR UPDATE USING (true);
CREATE POLICY "project_reminders_delete_all" ON project_reminders FOR DELETE USING (true);

-- Create new policies with unique names for project_alerts
CREATE POLICY "project_alerts_select_all" ON project_alerts FOR SELECT USING (true);
CREATE POLICY "project_alerts_insert_all" ON project_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "project_alerts_update_all" ON project_alerts FOR UPDATE USING (true);
CREATE POLICY "project_alerts_delete_all" ON project_alerts FOR DELETE USING (true);
