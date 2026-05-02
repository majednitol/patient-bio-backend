/**
 * Shared blockchain utilities for Edge Functions
 * Part of Microservice Architecture (Phase 3.2)
 */

/**
 * Compute SHA-256 hash using Web Crypto API (Deno compatible)
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Merkle Tree Node
 */
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

/**
 * Build a Merkle tree from leaf hashes
 */
export async function buildMerkleTree(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return '';
  if (leaves.length === 1) return leaves[0];

  let layer = [...leaves];

  while (layer.length > 1) {
    const nextLayer: string[] = [];
    
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      const combined = left < right ? left + right : right + left;
      nextLayer.push(await sha256(combined));
    }
    
    layer = nextLayer;
  }

  return layer[0];
}

/**
 * Generate Merkle proof for a leaf
 */
export async function generateMerkleProof(
  leaves: string[],
  leafIndex: number
): Promise<{ proof: Array<{ hash: string; position: 'left' | 'right' }>; root: string }> {
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error('Invalid leaf index');
  }

  const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
  let layer = [...leaves];
  let currentIndex = leafIndex;

  while (layer.length > 1) {
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < layer.length) {
      proof.push({
        hash: layer[siblingIndex],
        position: isRightNode ? 'left' : 'right',
      });
    }

    // Build next layer
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      const combined = left < right ? left + right : right + left;
      nextLayer.push(await sha256(combined));
    }

    layer = nextLayer;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return { proof, root: layer[0] };
}

/**
 * Verify a Merkle proof
 */
export async function verifyMerkleProof(
  leafHash: string,
  proof: Array<{ hash: string; position: 'left' | 'right' }>,
  root: string
): Promise<boolean> {
  let currentHash = leafHash;

  for (const node of proof) {
    const combined = node.hash < currentHash
      ? node.hash + currentHash
      : currentHash + node.hash;
    currentHash = await sha256(combined);
  }

  return currentHash === root;
}

/**
 * Transaction types for blockchain logging
 */
export type TransactionType =
  | 'HEALTH_RECORD_CREATED'
  | 'HEALTH_RECORD_ACCESSED'
  | 'HEALTH_RECORD_UPDATED'
  | 'HEALTH_RECORD_DELETED'
  | 'ACCESS_GRANTED'
  | 'ACCESS_REVOKED'
  | 'CONSENT_GIVEN'
  | 'CONSENT_WITHDRAWN'
  | 'DATA_EXPORTED'
  | 'CROSS_BORDER_TRANSFER'
  | 'EMERGENCY_ACCESS'
  | 'PROVIDER_VERIFIED';

/**
 * Create a digital signature for a transaction
 */
export async function signTransaction(
  transactionType: TransactionType,
  actorId: string,
  targetResourceType: string | null,
  targetResourceId: string | null,
  previousHash: string,
  timestamp: string
): Promise<string> {
  const content = [
    transactionType,
    actorId,
    targetResourceType || 'NULL',
    targetResourceId || 'NULL',
    previousHash,
    timestamp,
  ].join('|');

  return sha256(content);
}

/**
 * CORS headers for Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Create standard JSON response
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create error response
 */
export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
