/**
 * Zod validation schemas for API request/response types
 * Part of Code Quality Optimization (Phase 1.2)
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const UUIDSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime().or(z.date());

export const PaginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(25),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    total: z.number().optional(),
  });

// ============================================
// Health Records Schemas
// ============================================

export const DiseaseCategorySchema = z.enum([
  'general',
  'cancer',
  'covid19',
  'diabetes',
  'heart_disease',
  'mental_health',
  'respiratory',
  'other',
]);

// ICD-11 chapter code validation (matches codes from icd11-mapping.ts)
export const ICD11ChapterCodeSchema = z.string().regex(
  /^[0-9A-Z]{1,2}$/,
  'Must be a valid ICD-11 chapter code (e.g., "BA", "5A", "2")'
).nullable();

export const RecordCategorySchema = z.enum([
  'lab_result',
  'prescription',
  'imaging',
  'clinical_note',
  'immunization',
  'procedure',
  'other',
]);

export const HealthRecordSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  file_url: z.string().url(),
  file_type: z.string().nullable(),
  file_size: z.number().nullable(),
  category: RecordCategorySchema.nullable(),
  disease_category: DiseaseCategorySchema.nullable(),
  icd11_chapter_code: ICD11ChapterCodeSchema.optional(),
  provider_name: z.string().nullable(),
  record_date: z.string().nullable(),
  notes: z.string().nullable(),
  is_encrypted: z.boolean().default(false),
  uploaded_at: TimestampSchema,
});

export const CreateHealthRecordSchema = HealthRecordSchema.omit({
  id: true,
  uploaded_at: true,
});

// ============================================
// Access Token Schemas
// ============================================

export const AccessTokenSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  token: z.string().min(32),
  label: z.string().nullable(),
  expires_at: TimestampSchema,
  is_revoked: z.boolean().default(false),
  access_count: z.number().default(0),
  accessed_at: TimestampSchema.nullable(),
  created_at: TimestampSchema,
});

export const CreateAccessTokenSchema = z.object({
  label: z.string().max(100).optional(),
  expiresInHours: z.number().min(1).max(8760), // Max 1 year
});

// ============================================
// Blockchain Transaction Schemas
// ============================================

export const TransactionTypeSchema = z.enum([
  'HEALTH_RECORD_CREATED',
  'HEALTH_RECORD_ACCESSED',
  'HEALTH_RECORD_UPDATED',
  'HEALTH_RECORD_DELETED',
  'ACCESS_GRANTED',
  'ACCESS_REVOKED',
  'CONSENT_GIVEN',
  'CONSENT_WITHDRAWN',
  'DATA_EXPORTED',
  'CROSS_BORDER_TRANSFER',
  'EMERGENCY_ACCESS',
  'PROVIDER_VERIFIED',
]);

export const BlockchainTransactionSchema = z.object({
  id: UUIDSchema,
  transaction_type: TransactionTypeSchema,
  actor_id: UUIDSchema,
  target_resource_type: z.string().nullable(),
  target_resource_id: UUIDSchema.nullable(),
  data_hash: z.string().min(64).max(64), // SHA-256 hex
  previous_hash: z.string().nullable(),
  merkle_root: z.string().nullable(),
  block_number: z.number().nullable(),
  timestamp: TimestampSchema,
  signature: z.string().nullable(),
  is_verified: z.boolean().default(false),
});

export const RecordTransactionRequestSchema = z.object({
  transaction_type: TransactionTypeSchema,
  target_resource_type: z.string().optional(),
  target_resource_id: UUIDSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Merkle Proof Schemas
// ============================================

export const MerkleProofNodeSchema = z.object({
  hash: z.string(),
  position: z.enum(['left', 'right']),
});

export const MerkleProofSchema = z.object({
  recordId: UUIDSchema,
  recordHash: z.string(),
  proof: z.array(MerkleProofNodeSchema),
  root: z.string(),
  blockNumber: z.number(),
  verified: z.boolean(),
});

export const VerifyChainResponseSchema = z.object({
  isValid: z.boolean(),
  totalTransactions: z.number(),
  verifiedTransactions: z.number(),
  brokenLinks: z.array(z.object({
    transactionId: UUIDSchema,
    expectedHash: z.string(),
    actualHash: z.string(),
    timestamp: TimestampSchema,
  })),
  integrityPercentage: z.number().min(0).max(100),
});

// ============================================
// Consent Schemas
// ============================================

export const ConsentTypeSchema = z.enum([
  'data_sharing',
  'research_participation',
  'marketing',
  'emergency_access',
  'provider_access',
]);

export const ConsentScopeSchema = z.object({
  dataCategories: z.array(z.string()).optional(),
  purposes: z.array(z.string()).optional(),
  jurisdictions: z.array(z.string()).optional(),
  providers: z.array(UUIDSchema).optional(),
});

export const ConsentRecordSchema = z.object({
  id: UUIDSchema,
  patient_id: UUIDSchema,
  consent_type: ConsentTypeSchema,
  purpose: z.string(),
  scope: ConsentScopeSchema.nullable(),
  granted_at: TimestampSchema.nullable(),
  expires_at: TimestampSchema.nullable(),
  revoked_at: TimestampSchema.nullable(),
  is_active: z.boolean(),
  digital_signature: z.string().nullable(),
});

// ============================================
// AI/Health Insights Schemas
// ============================================

export const HealthInsightSeveritySchema = z.enum([
  'info',
  'warning',
  'alert',
  'critical',
]);

export const HealthInsightSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  insight_type: z.string(),
  title: z.string(),
  content: z.string(),
  severity: HealthInsightSeveritySchema.nullable(),
  metric_types: z.array(z.string()).nullable(),
  data_summary: z.record(z.unknown()).nullable(),
  is_read: z.boolean().default(false),
  generated_at: TimestampSchema,
  expires_at: TimestampSchema.nullable(),
});

export const MedicationInteractionSchema = z.object({
  medication1: z.string(),
  medication2: z.string(),
  severity: z.enum(['minor', 'moderate', 'major', 'contraindicated']),
  description: z.string(),
  recommendation: z.string(),
});

export const MedicationCheckResponseSchema = z.object({
  medications: z.array(z.string()),
  interactions: z.array(MedicationInteractionSchema),
  warnings: z.array(z.string()),
  checkedAt: TimestampSchema,
});

// ============================================
// API Response Wrappers
// ============================================

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiErrorSchema]);

// ============================================
// Validation Helpers
// ============================================

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation error: ${result.error.message}`);
  }
  return result.data;
}

export function validateOrNull<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

export function validateWithDefault<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}

// Type exports
export type DiseaseCategory = z.infer<typeof DiseaseCategorySchema>;
export type RecordCategory = z.infer<typeof RecordCategorySchema>;
export type HealthRecord = z.infer<typeof HealthRecordSchema>;
export type AccessToken = z.infer<typeof AccessTokenSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type BlockchainTransaction = z.infer<typeof BlockchainTransactionSchema>;
export type MerkleProof = z.infer<typeof MerkleProofSchema>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type HealthInsight = z.infer<typeof HealthInsightSchema>;
export type MedicationInteraction = z.infer<typeof MedicationInteractionSchema>;
