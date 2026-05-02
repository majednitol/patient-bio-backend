/**
 * Shared validation utilities for Edge Functions
 * Part of Microservice Architecture (Phase 3)
 * 
 * Note: Using manual validation since Zod isn't available in Deno runtime
 */

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validate ISO date string
 */
export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate pagination parameters
 */
export interface PaginationInput {
  cursor?: string;
  limit?: number;
  direction?: 'asc' | 'desc';
}

export function validatePagination(input: unknown): ValidationResult<PaginationInput> {
  if (input === null || input === undefined) {
    return { success: true, data: {} };
  }
  
  if (typeof input !== 'object') {
    return { success: false, error: 'Pagination must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const result: PaginationInput = {};

  if (obj.cursor !== undefined) {
    if (typeof obj.cursor !== 'string') {
      return { success: false, error: 'cursor must be a string' };
    }
    result.cursor = obj.cursor;
  }

  if (obj.limit !== undefined) {
    if (typeof obj.limit !== 'number' || obj.limit < 1 || obj.limit > 100) {
      return { success: false, error: 'limit must be a number between 1 and 100' };
    }
    result.limit = obj.limit;
  }

  if (obj.direction !== undefined) {
    if (obj.direction !== 'asc' && obj.direction !== 'desc') {
      return { success: false, error: 'direction must be "asc" or "desc"' };
    }
    result.direction = obj.direction;
  }

  return { success: true, data: result };
}

/**
 * Validate blockchain transaction input
 */
export interface BlockchainTransactionInput {
  transactionType: string;
  actorId: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
}

const VALID_TRANSACTION_TYPES = [
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
] as const;

export function validateBlockchainTransaction(input: unknown): ValidationResult<BlockchainTransactionInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Input must be an object' };
  }

  const obj = input as Record<string, unknown>;

  // Validate transactionType
  if (!obj.transactionType || typeof obj.transactionType !== 'string') {
    return { success: false, error: 'transactionType is required and must be a string' };
  }
  if (!VALID_TRANSACTION_TYPES.includes(obj.transactionType as any)) {
    return { success: false, error: `Invalid transactionType. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}` };
  }

  // Validate actorId
  if (!obj.actorId || !isValidUUID(obj.actorId)) {
    return { success: false, error: 'actorId is required and must be a valid UUID' };
  }

  // Validate optional targetResourceType
  if (obj.targetResourceType !== undefined && typeof obj.targetResourceType !== 'string') {
    return { success: false, error: 'targetResourceType must be a string' };
  }

  // Validate optional targetResourceId
  if (obj.targetResourceId !== undefined && !isValidUUID(obj.targetResourceId)) {
    return { success: false, error: 'targetResourceId must be a valid UUID' };
  }

  // Validate optional metadata
  if (obj.metadata !== undefined && (typeof obj.metadata !== 'object' || obj.metadata === null)) {
    return { success: false, error: 'metadata must be an object' };
  }

  return {
    success: true,
    data: {
      transactionType: obj.transactionType as string,
      actorId: obj.actorId as string,
      targetResourceType: obj.targetResourceType as string | undefined,
      targetResourceId: obj.targetResourceId as string | undefined,
      metadata: obj.metadata as Record<string, unknown> | undefined,
    },
  };
}

/**
 * Validate Merkle proof request
 */
export interface MerkleProofInput {
  recordId: string;
  recordType?: string;
}

export function validateMerkleProofRequest(input: unknown): ValidationResult<MerkleProofInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Input must be an object' };
  }

  const obj = input as Record<string, unknown>;

  if (!obj.recordId || !isValidUUID(obj.recordId)) {
    return { success: false, error: 'recordId is required and must be a valid UUID' };
  }

  if (obj.recordType !== undefined && typeof obj.recordType !== 'string') {
    return { success: false, error: 'recordType must be a string' };
  }

  return {
    success: true,
    data: {
      recordId: obj.recordId as string,
      recordType: obj.recordType as string | undefined,
    },
  };
}

/**
 * Validate chain verification request
 */
export interface ChainVerificationInput {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function validateChainVerification(input: unknown): ValidationResult<ChainVerificationInput> {
  if (input === null || input === undefined) {
    return { success: true, data: {} };
  }

  if (typeof input !== 'object') {
    return { success: false, error: 'Input must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const result: ChainVerificationInput = {};

  if (obj.startDate !== undefined) {
    if (!isValidISODate(obj.startDate)) {
      return { success: false, error: 'startDate must be a valid ISO date string' };
    }
    result.startDate = obj.startDate as string;
  }

  if (obj.endDate !== undefined) {
    if (!isValidISODate(obj.endDate)) {
      return { success: false, error: 'endDate must be a valid ISO date string' };
    }
    result.endDate = obj.endDate as string;
  }

  if (obj.limit !== undefined) {
    if (typeof obj.limit !== 'number' || obj.limit < 1 || obj.limit > 1000) {
      return { success: false, error: 'limit must be a number between 1 and 1000' };
    }
    result.limit = obj.limit;
  }

  return { success: true, data: result };
}

/**
 * Required fields validator helper
 */
export function validateRequired<T extends Record<string, unknown>>(
  input: unknown,
  requiredFields: (keyof T)[]
): ValidationResult<T> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Input must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const missing = requiredFields.filter(field => obj[field as string] === undefined);

  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  return { success: true, data: obj as T };
}
