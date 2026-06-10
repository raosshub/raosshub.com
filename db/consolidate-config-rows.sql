-- RAOSS Hub -- Consolidate duplicate project_config rows into one
-- Run ONCE as postgres user after applying this patch.
-- Merges all rows (later IDs override earlier for same keys), then
-- deletes all rows and inserts a single consolidated row.
-- After this, the code fix (findFirstByOrderByIdAsc) guarantees
-- only one row ever exists going forward.

DO $$
DECLARE
  merged jsonb := '{}';
  rec record;
BEGIN
  FOR rec IN SELECT config FROM project_config WHERE config IS NOT NULL ORDER BY id ASC LOOP
    merged := merged || rec.config;
  END LOOP;
  DELETE FROM project_config;
  INSERT INTO project_config (config, updated_by) VALUES (merged, 'system-consolidate');
END;
$$;
