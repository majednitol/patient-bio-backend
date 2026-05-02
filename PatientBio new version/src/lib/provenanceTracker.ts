import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type DataProvenanceRow = Database["public"]["Tables"]["data_provenance"]["Row"];
type DataProvenanceInsert = Database["public"]["Tables"]["data_provenance"]["Insert"];

export type ActivityType = 'create' | 'update' | 'delete' | 'import' | 'export' | 'share';
export type AgentType = 'patient' | 'doctor' | 'pathologist' | 'researcher' | 'hospital' | 'system' | 'external_ehr';

export interface ProvenanceRecord {
  id: string;
  user_id: string;
  target_resource_type: string;
  target_resource_id: string;
  activity_type: ActivityType;
  agent_type: AgentType;
  agent_id: string | null;
  agent_name: string | null;
  source_system: string | null;
  source_document: string | null;
  source_version: string | null;
  policy_reference: string | null;
  recorded_at: string;
  signature: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecordProvenanceParams {
  targetResourceType: string;
  targetResourceId: string;
  activityType: ActivityType;
  agentType: AgentType;
  agentId?: string;
  agentName?: string;
  sourceSystem?: string;
  sourceDocument?: string;
  sourceVersion?: string;
  policyReference?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records provenance for a data operation
 * Maps to FHIR Provenance resource
 */
export async function recordProvenance(params: RecordProvenanceParams): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user for provenance recording");
      return null;
    }

    const insertData: DataProvenanceInsert = {
      user_id: user.id,
      target_resource_type: params.targetResourceType,
      target_resource_id: params.targetResourceId,
      activity_type: params.activityType,
      agent_type: params.agentType,
      agent_id: params.agentId || user.id,
      agent_name: params.agentName,
      source_system: params.sourceSystem || 'manual',
      source_document: params.sourceDocument,
      source_version: params.sourceVersion,
      policy_reference: params.policyReference,
      metadata: (params.metadata || {}) as Json,
    };

    const { data, error } = await supabase
      .from("data_provenance")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to record provenance:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("Provenance recording error:", err);
    return null;
  }
}

/**
 * Get provenance history for a specific resource
 */
export async function getResourceProvenance(
  resourceType: string,
  resourceId: string
): Promise<ProvenanceRecord[]> {
  const { data, error } = await supabase
    .from("data_provenance")
    .select("id, user_id, target_resource_type, target_resource_id, activity_type, agent_type, agent_id, agent_name, source_system, source_document, source_version, policy_reference, signature, metadata, recorded_at, created_at")
    .eq("target_resource_type", resourceType)
    .eq("target_resource_id", resourceId)
    .order("recorded_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch provenance:", error);
    return [];
  }

  return data as ProvenanceRecord[];
}

/**
 * Get all provenance records for the current user
 */
export async function getUserProvenance(limit = 50): Promise<ProvenanceRecord[]> {
  const { data, error } = await supabase
    .from("data_provenance")
    .select("id, user_id, target_resource_type, target_resource_id, activity_type, agent_type, agent_id, agent_name, source_system, source_document, source_version, policy_reference, signature, metadata, recorded_at, created_at")
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch user provenance:", error);
    return [];
  }

  return data as ProvenanceRecord[];
}

/**
 * Maps internal provenance to FHIR Provenance resource
 */
export function mapToFHIRProvenance(record: ProvenanceRecord): object {
  const activityCodeMap: Record<ActivityType, { code: string; display: string }> = {
    create: { code: "CREATE", display: "create" },
    update: { code: "UPDATE", display: "revise" },
    delete: { code: "DELETE", display: "delete" },
    import: { code: "IMPORT", display: "import" },
    export: { code: "EXPORT", display: "export" },
    share: { code: "SHARE", display: "transmit" },
  };

  const agentRoleMap: Record<AgentType, { code: string; display: string }> = {
    patient: { code: "PAT", display: "Patient" },
    doctor: { code: "PROV", display: "Healthcare Provider" },
    pathologist: { code: "PROV", display: "Healthcare Provider" },
    researcher: { code: "ASSIGNED", display: "Assigned Entity" },
    hospital: { code: "CST", display: "Custodian" },
    system: { code: "AUT", display: "Author" },
    external_ehr: { code: "INF", display: "Informant" },
  };

  const activity = activityCodeMap[record.activity_type] || { code: "UNKNOWN", display: "unknown" };
  const agentRole = agentRoleMap[record.agent_type] || { code: "UNKNOWN", display: "Unknown" };

  return {
    resourceType: "Provenance",
    id: record.id,
    recorded: record.recorded_at,
    activity: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
        code: activity.code,
        display: activity.display,
      }],
    },
    agent: [{
      type: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          code: agentRole.code,
          display: agentRole.display,
        }],
      },
      who: {
        identifier: {
          value: record.agent_id || "unknown",
        },
        display: record.agent_name || record.agent_type,
      },
    }],
    target: [{
      reference: `${record.target_resource_type}/${record.target_resource_id}`,
    }],
    ...(record.source_system && {
      entity: [{
        role: "source",
        what: {
          display: record.source_system,
          ...(record.source_document && {
            identifier: { value: record.source_document },
          }),
        },
      }],
    }),
    ...(record.policy_reference && {
      policy: [record.policy_reference],
    }),
    ...(record.signature && {
      signature: [{
        type: [{
          system: "urn:iso-astm:E1762-95:2013",
          code: "1.2.840.10065.1.12.1.1",
          display: "Author's Signature",
        }],
        when: record.recorded_at,
        data: record.signature,
      }],
    }),
  };
}

/**
 * Get activity type display name
 */
export function getActivityDisplayName(activity: ActivityType): string {
  const displayNames: Record<ActivityType, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    import: "Imported",
    export: "Exported",
    share: "Shared",
  };
  return displayNames[activity] || activity;
}

/**
 * Get agent type display name
 */
export function getAgentDisplayName(agent: AgentType): string {
  const displayNames: Record<AgentType, string> = {
    patient: "Patient",
    doctor: "Doctor",
    pathologist: "Pathologist",
    researcher: "Researcher",
    hospital: "Hospital",
    system: "System",
    external_ehr: "External EHR",
  };
  return displayNames[agent] || agent;
}

/**
 * Get source system display name
 */
export function getSourceSystemDisplayName(source: string | null): string {
  if (!source) return "Unknown";
  
  const displayNames: Record<string, string> = {
    manual: "Manual Entry",
    fhir_import: "FHIR Import",
    ccda_import: "C-CDA Import",
    hl7v2_import: "HL7 v2 Import",
  };
  
  return displayNames[source] || source;
}
