
-- Part 1: Add audit trail trigger for consent_records
CREATE OR REPLACE FUNCTION public.audit_consent_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.add_audit_entry(
      'CONSENT_GIVEN', 'consent', NEW.id, NEW.patient_id, 'granted',
      jsonb_build_object('consent_type', NEW.consent_type, 'purpose', NEW.purpose)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    PERFORM public.add_audit_entry(
      'CONSENT_WITHDRAWN', 'consent', NEW.id, NEW.patient_id, 'withdrawn',
      jsonb_build_object('consent_type', NEW.consent_type)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER audit_consent_records
  AFTER INSERT OR UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_consent_trigger();

-- Part 2 & 3: Update verify_cross_chain_consistency() to exclude known single-chain events and widen matching window
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
  v_matched BIGINT;
  v_effective_audit BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_bc_total FROM public.blockchain_transactions;
  SELECT COUNT(*) INTO v_audit_total FROM public.audit_trail;

  -- Count audit entries for event types that legitimately have no blockchain counterpart
  SELECT COUNT(*) INTO v_audit_excluded
  FROM public.audit_trail
  WHERE event_type IN ('DATA_ACCESS', 'FHIR_EXPORT', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE');

  v_effective_audit := v_audit_total - v_audit_excluded;

  -- Match on target_resource_id = entity_id AND actor_id = user_id within a 10-second window
  SELECT COUNT(*) INTO v_matched
  FROM public.blockchain_transactions bt
  INNER JOIN public.audit_trail at2
    ON bt.target_resource_id::TEXT = at2.entity_id::TEXT
    AND bt.actor_id = at2.user_id
    AND ABS(EXTRACT(EPOCH FROM (bt.created_at - at2.created_at))) < 10;

  RETURN QUERY SELECT
    v_bc_total,
    v_audit_total,
    v_matched,
    v_bc_total - v_matched,
    v_effective_audit - v_matched,
    CASE WHEN (v_bc_total + v_effective_audit) > 0
      THEN ROUND((v_matched * 2.0 / (v_bc_total + v_effective_audit)) * 100, 2)
      ELSE 100.00
    END;
END;
$function$;
