/*
  # Update risk_score handling for remediation-only scoring

  1. Changes
    - Modify `watchlist_metrics.risk_score` to allow NULL values
    - Update all existing records where project is NOT in remediation status to have NULL risk_score
    - Add comment clarifying that risk_score is only used for remediation projects
  
  2. Notes
    - Risk scores are manually assigned by remediation team when project enters remediation
    - Non-remediation projects (performing, watchlist, closed) should have NULL risk_score
    - Risk score ranges determine workout stages:
      - Assessment: Risk < 40
      - Active Monitoring: Risk 40-59
      - Negotiation: Risk 60-79
      - Critical Action: Risk ≥ 80
*/

-- Set risk_score to NULL for all projects that are NOT in remediation status
UPDATE watchlist_metrics
SET risk_score = NULL
WHERE project_id IN (
  SELECT id FROM projects WHERE current_status != 'remediation-required'
);

-- Add comment to clarify usage
COMMENT ON COLUMN watchlist_metrics.risk_score IS 'Manually assigned risk score (0-100) for remediation projects only. NULL for non-remediation projects. Determines workout stage urgency.';
