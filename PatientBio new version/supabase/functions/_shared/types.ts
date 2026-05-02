/**
 * Shared type definitions for Edge Functions
 * Part of Microservice Architecture (Phase 3.2)
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Blockchain transaction record
 */
export interface BlockchainTransaction {
  id: string;
  transaction_type: string;
  actor_id: string;
  target_resource_type: string | null;
  target_resource_id: string | null;
  data_hash: string;
  previous_hash: string | null;
  merkle_root: string | null;
  block_number: number | null;
  timestamp: string;
  signature: string | null;
  is_verified: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Chain verification result
 */
export interface ChainVerificationResult {
  isValid: boolean;
  totalTransactions: number;
  verifiedTransactions: number;
  brokenLinks: Array<{
    transactionId: string;
    expectedHash: string;
    actualHash: string;
    timestamp: string;
  }>;
  integrityPercentage: number;
  lastVerifiedAt: string;
}

/**
 * Merkle proof
 */
export interface MerkleProof {
  recordId: string;
  recordHash: string;
  proof: Array<{ hash: string; position: 'left' | 'right' }>;
  root: string;
  blockNumber: number;
  verified: boolean;
  generatedAt: string;
}

/**
 * Health record summary (for blockchain)
 */
export interface HealthRecordSummary {
  id: string;
  title: string;
  category: string | null;
  disease_category: string | null;
  uploaded_at: string;
  is_encrypted: boolean;
}

/**
 * Access token summary
 */
export interface AccessTokenSummary {
  id: string;
  label: string | null;
  expires_at: string;
  is_revoked: boolean;
  access_count: number;
}

/**
 * User profile for blockchain identity
 */
export interface BlockchainIdentity {
  userId: string;
  displayName: string;
  publicKeyHash?: string;
  registeredAt: string;
}

/**
 * Audit entry for chain verification
 */
export interface AuditEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  event_hash: string;
  previous_hash: string | null;
  created_at: string;
}
