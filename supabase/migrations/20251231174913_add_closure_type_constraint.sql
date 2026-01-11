/*
  # Add Closure Type Constraint

  ## Changes
  Add database-level constraint to ensure closure_type is required when current_status = 'closed'

  ## Security
  This enforces data integrity at the database level, preventing any closed projects without a closure type
*/

-- Add constraint to ensure closure_type is required when status is closed
ALTER TABLE projects
ADD CONSTRAINT projects_closure_type_required_when_closed
CHECK (
  (current_status = 'closed' AND closure_type IS NOT NULL) OR
  (current_status != 'closed')
);