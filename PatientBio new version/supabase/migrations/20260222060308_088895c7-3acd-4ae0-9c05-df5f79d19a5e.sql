
CREATE OR REPLACE FUNCTION public.verify_cross_chain_consistency()
 RETURNS TABLE(total_blockchain bigint, total_audit bigint, matched bigint, blockchain_only bigint, audit_only bigint, consistency_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bc_total BIGINT;
  v_audit_total BIGINT;
  v_audit_excluded BIGINT;
  v_bc_matched BIGINT;
  v_audit_matched BIGINT;
  v_matched_avg BIGINT;
  v_effective_audit BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_bc_total FROM public.blockchain_transactions;
  SELECT COUNT(*) INTO v_audit_total FROM public.audit_trail;

  -- Count audit entries for event types that legitimately have no blockchain counterpart
  SELECT COUNT(*) INTO v_audit_excluded
  FROM public.audit_trail
  WHERE event_type IN ('DATA_ACCESS', 'FHIR_EXPORT', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE');

  v_effective_audit := v_audit_total - v_audit_excluded;

  -- Count distinct blockchain transactions that have a matching audit entry (by entity + actor)
  SELECT COUNT(DISTINCT bt.id) INTO v_bc_matched
  FROM public.blockchain_transactions bt
  WHERE EXISTS (
    SELECT 1 FROM public.audit_trail at2
    WHERE bt.target_resource_id::TEXT = at2.entity_id::TEXT
      AND bt.actor_id = at2.user_id
  );

  -- Count distinct audit entries (excluding operational) that have a matching blockchain tx
  SELECT COUNT(DISTINCT at2.id) INTO v_audit_matched
  FROM public.audit_trail at2
  WHERE at2.event_type NOT IN ('DATA_ACCESS', 'FHIR_EXPORT', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE')
  AND EXISTS (
    SELECT 1 FROM public.blockchain_transactions bt
    WHERE bt.target_resource_id::TEXT = at2.entity_id::TEXT
      AND bt.actor_id = at2.user_id
  );

  -- Use average of both sides for the matched count
  v_matched_avg := (v_bc_matched + v_audit_matched) / 2;

  RETURN QUERY SELECT
    v_bc_total,
    v_audit_total,
    v_matched_avg,
    v_bc_total - v_bc_matched,
    v_effective_audit - v_audit_matched,
    CASE WHEN (v_bc_total + v_effective_audit) > 0
      THEN ROUND(((v_bc_matched + v_audit_matched)::NUMERIC / (v_bc_total + v_effective_audit)::NUMERIC) * 100, 2)
      ELSE 100.00
    END;
END;
$function$;
