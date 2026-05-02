/**
 * Security Test Helpers
 * Shared mocks and utilities for security/authorization testing.
 */

// ── Types ──

export type AppRole = "admin" | "user" | "hospital_admin" | "doctor" | "doctor_staff" | "pathologist" | "researcher";
export type PortalType = "patient" | "doctor" | "hospital" | "pathologist" | "researcher" | "admin";

export interface MockUser {
  id: string;
  role: AppRole;
  email: string;
  hospitalId?: string;
}

export interface MockJWT {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export interface MockAccessToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  is_emergency?: boolean;
  pin?: string;
}

export interface RLSResult {
  allowed: boolean;
  reason: string;
}

// ── User Factory ──

let userCounter = 0;
export function makeUser(role: AppRole, overrides?: Partial<MockUser>): MockUser {
  userCounter++;
  return {
    id: `user-${role}-${userCounter}`,
    role,
    email: `${role}-${userCounter}@test.com`,
    ...overrides,
  };
}

// ── Portal ↔ Role Mapping ──

export const portalRoleMap: Record<PortalType, AppRole[]> = {
  patient: ["user"],
  doctor: ["doctor", "doctor_staff"],
  hospital: ["hospital_admin"],
  pathologist: ["pathologist"],
  researcher: ["researcher"],
  admin: ["admin"],
};

export const rolePortalNameMap: Record<string, string> = {
  user: "Patient",
  doctor: "Doctor",
  doctor_staff: "Doctor",
  hospital_admin: "Hospital",
  pathologist: "Diagnostic Center",
  researcher: "Researcher",
  admin: "Admin",
};

export function canAccessPortal(role: AppRole | null, portal: PortalType): boolean {
  if (role === null) return false;
  return portalRoleMap[portal].includes(role);
}

// ── RLS Simulation ──

interface RLSContext {
  userId: string;
  role: AppRole;
  hospitalId?: string;
  doctorAccessMap?: Record<string, string[]>; // doctorId -> patientIds with active access
  pathologistReports?: Record<string, string>; // reportId -> creatorId
  approvedSharing?: Array<{ patientId: string; requesterId: string; requesterType: string }>;
  hospitalStaff?: Array<{ userId: string; hospitalId: string }>;
}

export function simulateRLS(
  table: string,
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  targetOwnerId: string,
  ctx: RLSContext
): RLSResult {
  const { userId, role } = ctx;

  // Anonymous = no access
  if (!userId) return { allowed: false, reason: "No authenticated user" };

  // Admin override for SELECT
  if (role === "admin" && operation === "SELECT") {
    return { allowed: true, reason: "Admin override" };
  }

  switch (table) {
    case "health_records": {
      if (operation === "SELECT" || operation === "INSERT") {
        // Patient: own records only
        if (role === "user") {
          const allowed = userId === targetOwnerId;
          return { allowed, reason: allowed ? "Owner match" : "user_id mismatch" };
        }
        // Doctor: needs active access
        if (role === "doctor" || role === "doctor_staff") {
          const accessList = ctx.doctorAccessMap?.[userId] ?? [];
          const allowed = accessList.includes(targetOwnerId);
          return { allowed, reason: allowed ? "Active doctor access" : "No active doctor access" };
        }
        // Researcher: needs approved sharing
        if (role === "researcher") {
          const approved = ctx.approvedSharing?.some(
            (s) => s.patientId === targetOwnerId && s.requesterId === userId && s.requesterType === "researcher"
          ) ?? false;
          return { allowed: approved, reason: approved ? "Patient approved sharing" : "No approved sharing" };
        }
        // Hospital admin: hospital scoping
        if (role === "hospital_admin") {
          const isStaff = ctx.hospitalStaff?.some(
            (s) => s.userId === userId && s.hospitalId === ctx.hospitalId
          ) ?? false;
          return { allowed: isStaff, reason: isStaff ? "Hospital staff match" : "Wrong hospital" };
        }
      }
      return { allowed: false, reason: "Operation not permitted for role" };
    }

    case "pathologist_reports": {
      if (operation === "SELECT") {
        if (role === "pathologist") {
          const creatorId = ctx.pathologistReports?.[targetOwnerId];
          const allowed = creatorId === userId;
          return { allowed, reason: allowed ? "Creator match" : "Not report creator" };
        }
      }
      return { allowed: false, reason: "Operation not permitted for role" };
    }

    case "doctor_profiles": {
      if (operation === "UPDATE") {
        const allowed = (role === "doctor" || role === "doctor_staff") && userId === targetOwnerId;
        return { allowed, reason: allowed ? "Own profile" : "Cannot update other doctor's profile" };
      }
      return { allowed: false, reason: "Operation not permitted" };
    }

    case "access_tokens": {
      if (operation === "DELETE") {
        const allowed = userId === targetOwnerId;
        return { allowed, reason: allowed ? "Owner can delete" : "Not token owner" };
      }
      return { allowed: false, reason: "Operation not permitted" };
    }

    default:
      return { allowed: false, reason: `Unknown table: ${table}` };
  }
}

// ── JWT / Token Helpers ──

export function makeJWT(claims: Partial<MockJWT>, expiresInSec?: number): MockJWT {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: claims.sub ?? "default-sub",
    email: claims.email ?? "test@test.com",
    role: claims.role ?? "authenticated",
    iat: claims.iat ?? now,
    exp: expiresInSec !== undefined ? now + expiresInSec : claims.exp,
  };
}

export function isJWTValid(jwt: MockJWT): { valid: boolean; reason: string } {
  if (!jwt.sub) return { valid: false, reason: "Missing sub claim" };
  if (jwt.exp === undefined) return { valid: false, reason: "Missing exp claim" };
  const now = Math.floor(Date.now() / 1000);
  if (jwt.exp <= now) return { valid: false, reason: "Token expired" };
  return { valid: true, reason: "Valid" };
}

export function isTokenExpired(jwt: MockJWT): boolean {
  if (jwt.exp === undefined) return true;
  return jwt.exp <= Math.floor(Date.now() / 1000);
}

export function isAccessTokenActive(token: MockAccessToken): { active: boolean; reason: string } {
  if (token.is_revoked) return { active: false, reason: "Token revoked" };
  const now = new Date();
  const expires = new Date(token.expires_at);
  if (expires <= now) return { active: false, reason: "Token expired" };
  return { active: true, reason: "Active" };
}

export function makeAccessToken(overrides?: Partial<MockAccessToken>): MockAccessToken {
  const now = new Date();
  return {
    id: "token-" + Math.random().toString(36).slice(2, 8),
    user_id: "user-1",
    token: "tok_" + Math.random().toString(36).slice(2, 12),
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    is_revoked: false,
    created_at: now.toISOString(),
    ...overrides,
  };
}

export function validateEmergencyToken(
  token: MockAccessToken,
  pin?: string
): { valid: boolean; reason: string } {
  if (token.is_revoked) return { valid: false, reason: "Revoked" };
  const created = new Date(token.created_at).getTime();
  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000;
  if (now - created > fourHours) return { valid: false, reason: "Emergency window expired" };
  if (token.pin && pin !== token.pin) return { valid: false, reason: "PIN mismatch" };
  return { valid: true, reason: "Valid emergency access" };
}

export function verifyTokenIntegrity(
  jwt: MockJWT,
  originalRole: string
): { valid: boolean; reason: string } {
  if (jwt.role !== originalRole) return { valid: false, reason: "Role tampered" };
  return { valid: true, reason: "Integrity OK" };
}

export function bulkRevoke(tokens: MockAccessToken[]): MockAccessToken[] {
  return tokens.map((t) => ({ ...t, is_revoked: true }));
}

// ── Input Sanitization ──

export function sanitizeInput(input: string): string {
  if (!input || !input.trim()) throw new Error("Input cannot be empty or whitespace-only");

  let sanitized = input;

  // Strip null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Strip unicode control characters (except common whitespace)
  sanitized = sanitized.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");

  // Strip script tags (including nested/encoded)
  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, "");
  // Second pass for double-encoded
  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, "");

  // Strip event handler attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // Strip CRLF
  sanitized = sanitized.replace(/\r\n|\r|\n/g, " ");

  // Length limit (10KB)
  if (sanitized.length > 10240) {
    sanitized = sanitized.slice(0, 10240);
  }

  return sanitized;
}

export function encodeForURL(input: string): string {
  return encodeURIComponent(input);
}

export function validateFileName(name: string): { valid: boolean; reason: string } {
  if (name.includes("..")) return { valid: false, reason: "Path traversal detected" };
  if (name.includes("/") || name.includes("\\")) return { valid: false, reason: "Directory separator in filename" };
  return { valid: true, reason: "Valid filename" };
}

export function safeJSONParse(input: string): { success: boolean; data?: unknown; error?: string } {
  try {
    const data = JSON.parse(input);
    return { success: true, data };
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
}

export function neutralizeSQLInjection(input: string): string {
  // Parameterized queries handle this, but for display/search we strip dangerous patterns
  return input
    .replace(/['";]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC|UNION|SELECT)\b/gi, "");
}

// ── Trigger Simulation ──

export function simulateHandleNewUser(portalType: string | null): AppRole {
  if (!portalType) return "user";
  const map: Record<string, AppRole> = {
    patient: "user",
    doctor: "doctor",
    doctor_staff: "doctor_staff",
    hospital: "hospital_admin",
    pathologist: "pathologist",
    researcher: "researcher",
  };
  return map[portalType] ?? "user";
}

export function simulateRoleInsert(
  existingRoles: Array<{ userId: string; role: AppRole }>,
  newUserId: string,
  newRole: AppRole
): { inserted: boolean; reason: string } {
  const exists = existingRoles.some((r) => r.userId === newUserId && r.role === newRole);
  if (exists) return { inserted: false, reason: "ON CONFLICT - duplicate" };
  return { inserted: true, reason: "Inserted" };
}

// ── Consent & Data Sharing Simulation ──

export type JurisdictionCode = "IN" | "US" | "EU" | "UK" | "AU" | "CA" | "OTHER";

export interface MockConsentRecord {
  id: string;
  patient_id: string;
  consent_type: string;
  purpose: string;
  scope: string[];
  is_active: boolean;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  granted_to_id: string | null;
  granted_to_type: string | null;
  digital_signature: string;
}

export interface MockDataAccessRequest {
  id: string;
  patient_id: string;
  requester_id: string;
  requester_type: string;
  status: "pending" | "approved" | "rejected";
  disease_category: string | null;
}

export interface MockTransferAgreement {
  id: string;
  user_id: string;
  source_jurisdiction: JurisdictionCode;
  destination_jurisdiction: JurisdictionCode;
  data_categories: string[];
  purpose: string;
  acknowledged_risks: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  retention_period_days: number | null;
  access_token_id: string | null;
  recipient_type: string | null;
  transfer_impact_assessment: Record<string, unknown> | null;
}

export function makeConsentRecord(overrides?: Partial<MockConsentRecord>): MockConsentRecord {
  const now = new Date();
  const id = "consent-" + Math.random().toString(36).slice(2, 8);
  const record: MockConsentRecord = {
    id,
    patient_id: "patient-1",
    consent_type: "data_sharing",
    purpose: "Treatment",
    scope: ["health_records", "prescriptions"],
    is_active: true,
    granted_at: now.toISOString(),
    revoked_at: null,
    expires_at: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    granted_to_id: null,
    granted_to_type: null,
    digital_signature: "",
    ...overrides,
  };
  record.digital_signature = generateConsentSignature(record.patient_id, record.consent_type, record.purpose, record.scope, record.granted_at);
  return record;
}

export function generateConsentSignature(
  patientId: string,
  consentType: string,
  purpose: string,
  scope: string[],
  timestamp: string
): string {
  // Simulates the DB function generate_consent_signature using a deterministic hash
  const input = `${patientId}|${consentType}|${purpose}|${JSON.stringify(scope)}|${timestamp}`;
  // Simple deterministic hash for testing (not crypto-secure, mirrors DB logic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return "sig_" + Math.abs(hash).toString(16).padStart(16, "0");
}

export function verifyConsentSignature(consent: MockConsentRecord): boolean {
  const expected = generateConsentSignature(
    consent.patient_id,
    consent.consent_type,
    consent.purpose,
    consent.scope,
    consent.granted_at
  );
  return consent.digital_signature === expected;
}

export function isConsentActive(consent: MockConsentRecord): { active: boolean; reason: string } {
  if (!consent.is_active) return { active: false, reason: "Consent deactivated" };
  if (consent.revoked_at) return { active: false, reason: "Consent revoked" };
  if (consent.expires_at && new Date(consent.expires_at) <= new Date()) {
    return { active: false, reason: "Consent expired" };
  }
  return { active: true, reason: "Active" };
}

export function hasPatientApprovedSharing(
  requests: MockDataAccessRequest[],
  patientId: string,
  requesterId: string,
  requesterType: string
): boolean {
  return requests.some(
    (r) => r.patient_id === patientId && r.requester_id === requesterId && r.requester_type === requesterType && r.status === "approved"
  );
}

export function makeDataAccessRequest(overrides?: Partial<MockDataAccessRequest>): MockDataAccessRequest {
  return {
    id: "dar-" + Math.random().toString(36).slice(2, 8),
    patient_id: "patient-1",
    requester_id: "doctor-1",
    requester_type: "doctor",
    status: "pending",
    disease_category: null,
    ...overrides,
  };
}

// ── Cross-Border Compliance ──

export function requiresCrossBorderConsent(
  source: JurisdictionCode,
  destination: JurisdictionCode
): boolean {
  if (source === destination) return false;
  if (source === "EU" && (destination === "EU" || destination === "UK")) return false;
  return true;
}

export function makeTransferAgreement(overrides?: Partial<MockTransferAgreement>): MockTransferAgreement {
  return {
    id: "ta-" + Math.random().toString(36).slice(2, 8),
    user_id: "patient-1",
    source_jurisdiction: "IN",
    destination_jurisdiction: "US",
    data_categories: ["health_records"],
    purpose: "Treatment abroad",
    acknowledged_risks: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    revoked_at: null,
    revocation_reason: null,
    retention_period_days: 90,
    access_token_id: null,
    recipient_type: "doctor",
    transfer_impact_assessment: null,
    ...overrides,
  };
}

export function isTransferAgreementValid(ta: MockTransferAgreement): { valid: boolean; reason: string } {
  if (ta.revoked_at) return { valid: false, reason: "Transfer revoked" };
  if (!ta.acknowledged_risks) return { valid: false, reason: "Risks not acknowledged" };
  if (ta.expires_at && new Date(ta.expires_at) <= new Date()) return { valid: false, reason: "Transfer expired" };
  if (ta.retention_period_days !== null && ta.retention_period_days <= 0) return { valid: false, reason: "Invalid retention period" };
  return { valid: true, reason: "Valid" };
}

// ── Audit Trail & Blockchain Simulation ──

export interface MockAuditEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  previous_hash: string;
  event_hash: string;
  created_at: string;
}

export function computeAuditHash(
  eventType: string,
  entityType: string,
  entityId: string,
  userId: string,
  action: string,
  details: Record<string, unknown>,
  previousHash: string,
  timestamp: string
): string {
  const input = `${eventType}|${entityType}|${entityId}|${userId}|${action}|${JSON.stringify(details)}|${previousHash}|${timestamp}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

const GENESIS_HASH = "GENESIS_0000000000000000000000000000000000000000000000000000000000000000";

export function buildAuditChain(events: Array<{
  event_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
}>): MockAuditEntry[] {
  const chain: MockAuditEntry[] = [];
  let previousHash = GENESIS_HASH;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const timestamp = new Date(Date.now() + i * 1000).toISOString();
    const eventHash = computeAuditHash(
      e.event_type, e.entity_type, e.entity_id, e.user_id, e.action, e.details, previousHash, timestamp
    );
    chain.push({
      id: `audit-${i}`,
      event_type: e.event_type,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      user_id: e.user_id,
      action: e.action,
      details: e.details,
      previous_hash: previousHash,
      event_hash: eventHash,
      created_at: timestamp,
    });
    previousHash = eventHash;
  }
  return chain;
}

export function verifyAuditChain(chain: MockAuditEntry[]): { valid: boolean; brokenAt: number | null; integrityPct: number } {
  if (chain.length === 0) return { valid: true, brokenAt: null, integrityPct: 100 };

  let verified = 0;
  let brokenAt: number | null = null;

  // First entry should link to genesis
  if (chain[0].previous_hash !== GENESIS_HASH) {
    brokenAt = 0;
  } else {
    const expectedHash = computeAuditHash(
      chain[0].event_type, chain[0].entity_type, chain[0].entity_id,
      chain[0].user_id, chain[0].action, chain[0].details,
      chain[0].previous_hash, chain[0].created_at
    );
    if (chain[0].event_hash === expectedHash) verified++;
    else if (brokenAt === null) brokenAt = 0;
  }

  for (let i = 1; i < chain.length; i++) {
    const entry = chain[i];
    // Check chain linking
    if (entry.previous_hash !== chain[i - 1].event_hash) {
      if (brokenAt === null) brokenAt = i;
      continue;
    }
    // Check hash integrity
    const expectedHash = computeAuditHash(
      entry.event_type, entry.entity_type, entry.entity_id,
      entry.user_id, entry.action, entry.details,
      entry.previous_hash, entry.created_at
    );
    if (entry.event_hash === expectedHash) verified++;
    else if (brokenAt === null) brokenAt = i;
  }

  return {
    valid: brokenAt === null,
    brokenAt,
    integrityPct: chain.length > 0 ? Math.round((verified / chain.length) * 100) : 100,
  };
}

// ── Merkle Tree Simulation ──

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function buildMerkleTree(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) return { root: "", layers: [] };
  let currentLayer = leaves.map((l) => simpleHash(l));
  const layers: string[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      nextLayer.push(simpleHash(left + right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return { root: currentLayer[0], layers };
}

export function getMerkleProof(layers: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < layer.length) {
      proof.push(layer[siblingIdx]);
    } else {
      proof.push(layer[idx]); // duplicate for odd
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyMerkleProof(leafHash: string, proof: string[], root: string, leafIndex: number): boolean {
  let current = leafHash;
  let idx = leafIndex;
  for (const sibling of proof) {
    if (idx % 2 === 0) {
      current = simpleHash(current + sibling);
    } else {
      current = simpleHash(sibling + current);
    }
    idx = Math.floor(idx / 2);
  }
  return current === root;
}

// ── Multi-Table RLS Simulation ──

export interface MultiTableContext {
  userId: string;
  role: AppRole;
  hospitalId?: string;
  doctorAccess: Array<{ doctor_id: string; patient_id: string; is_active: boolean }>;
  dataAccessRequests: MockDataAccessRequest[];
  prescriptions: Array<{ id: string; doctor_id: string; patient_id: string }>;
  appointments: Array<{ id: string; doctor_id: string; patient_id: string; hospital_id: string | null }>;
  doctorNotes: Array<{ id: string; doctor_id: string; patient_id: string }>;
  intakeForms: Array<{ id: string; appointment_id: string; patient_id: string }>;
  referrals: Array<{ id: string; referring_doctor_id: string; referred_to_doctor_id: string; patient_id: string }>;
  notifications: Array<{ id: string; user_id: string }>;
  wallets: Array<{ user_id: string }>;
  auditLogs: Array<{ id: string; admin_id: string }>;
}

export function simulateMultiTableRLS(
  table: string,
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  resourceId: string,
  ctx: MultiTableContext
): RLSResult {
  const { userId, role } = ctx;
  if (!userId) return { allowed: false, reason: "No authenticated user" };

  switch (table) {
    case "prescriptions": {
      const rx = ctx.prescriptions.find((p) => p.id === resourceId);
      if (!rx) return { allowed: false, reason: "Prescription not found" };
      if (operation === "SELECT") {
        if (role === "user" && rx.patient_id === userId) return { allowed: true, reason: "Patient owns prescription" };
        if ((role === "doctor" || role === "doctor_staff") && rx.doctor_id === userId) return { allowed: true, reason: "Prescribing doctor" };
        if ((role === "doctor" || role === "doctor_staff") && ctx.doctorAccess.some((a) => a.doctor_id === userId && a.patient_id === rx.patient_id && a.is_active))
          return { allowed: true, reason: "Active doctor access" };
        if (role === "admin") return { allowed: true, reason: "Admin override" };
      }
      if (operation === "INSERT") {
        if ((role === "doctor" || role === "doctor_staff") && rx.doctor_id === userId) return { allowed: true, reason: "Doctor creating prescription" };
      }
      return { allowed: false, reason: "Access denied" };
    }

    case "appointments": {
      const apt = ctx.appointments.find((a) => a.id === resourceId);
      if (!apt) return { allowed: false, reason: "Appointment not found" };
      if (operation === "SELECT") {
        if (role === "user" && apt.patient_id === userId) return { allowed: true, reason: "Patient's appointment" };
        if ((role === "doctor" || role === "doctor_staff") && apt.doctor_id === userId) return { allowed: true, reason: "Doctor's appointment" };
        if (role === "hospital_admin" && apt.hospital_id === ctx.hospitalId) return { allowed: true, reason: "Hospital appointment" };
        if (role === "admin") return { allowed: true, reason: "Admin override" };
      }
      return { allowed: false, reason: "Access denied" };
    }

    case "doctor_patient_notes": {
      const note = ctx.doctorNotes.find((n) => n.id === resourceId);
      if (!note) return { allowed: false, reason: "Note not found" };
      if ((role === "doctor" || role === "doctor_staff") && note.doctor_id === userId) return { allowed: true, reason: "Own note" };
      return { allowed: false, reason: "Notes are private to the authoring doctor" };
    }

    case "appointment_intake": {
      const intake = ctx.intakeForms.find((f) => f.id === resourceId);
      if (!intake) return { allowed: false, reason: "Intake not found" };
      if (role === "user" && intake.patient_id === userId) return { allowed: true, reason: "Patient's intake" };
      // Doctor can see if they're assigned to the appointment
      const apt = ctx.appointments.find((a) => a.id === intake.appointment_id);
      if (apt && (role === "doctor" || role === "doctor_staff") && apt.doctor_id === userId) return { allowed: true, reason: "Assigned doctor" };
      return { allowed: false, reason: "Access denied" };
    }

    case "doctor_referrals": {
      const ref = ctx.referrals.find((r) => r.id === resourceId);
      if (!ref) return { allowed: false, reason: "Referral not found" };
      if ((role === "doctor" || role === "doctor_staff") && (ref.referring_doctor_id === userId || ref.referred_to_doctor_id === userId))
        return { allowed: true, reason: "Involved doctor" };
      if (role === "user" && ref.patient_id === userId) return { allowed: true, reason: "Patient can view referral" };
      return { allowed: false, reason: "Access denied" };
    }

    case "notifications": {
      const notif = ctx.notifications.find((n) => n.id === resourceId);
      if (!notif) return { allowed: false, reason: "Notification not found" };
      if (notif.user_id === userId) return { allowed: true, reason: "Own notification" };
      return { allowed: false, reason: "Not recipient" };
    }

    case "patient_wallets": {
      const wallet = ctx.wallets.find((w) => w.user_id === resourceId);
      if (!wallet) return { allowed: false, reason: "Wallet not found" };
      if (role === "user" && wallet.user_id === userId) return { allowed: true, reason: "Own wallet" };
      return { allowed: false, reason: "Wallet is private" };
    }

    case "admin_audit_logs": {
      if (role === "admin") return { allowed: true, reason: "Admin access" };
      return { allowed: false, reason: "Admin only" };
    }

    case "consent_records": {
      if (role === "user") {
        // Patient can CRUD their own consents
        return { allowed: true, reason: "Patient manages own consent" };
      }
      if (operation === "SELECT") {
        // Granted-to party can read
        return { allowed: true, reason: "Granted party can view" };
      }
      return { allowed: false, reason: "Only patients can modify consents" };
    }

    default:
      return { allowed: false, reason: `Unknown table: ${table}` };
  }
}
