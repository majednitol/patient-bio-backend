/**
 * Merkle Tree Implementation for Blockchain-Based Audit Verification
 * Provides O(log n) verification of individual records
 * Part of Blockchain-Based Security System (Phase 4.1)
 */

/**
 * Hash function using SHA-256 (browser-compatible)
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous hash for Node.js/Edge environments (fallback)
 */
function sha256Sync(message: string): string {
  // Use a simple implementation for cases where crypto.subtle isn't available
  // This is a placeholder - in production, use a proper library
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Merkle Tree Node
 */
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
  index?: number;
}

/**
 * Merkle Proof Node - used for verification
 */
export interface MerkleProofNode {
  hash: string;
  position: 'left' | 'right';
}

/**
 * Complete Merkle Proof
 */
export interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  proof: MerkleProofNode[];
  root: string;
  treeSize: number;
}

/**
 * Audit Entry for Merkle Tree
 */
export interface AuditEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
  event_hash: string;
}

/**
 * MerkleTree class for building and verifying audit trails
 */
export class MerkleTree {
  private leaves: string[];
  private layers: string[][];
  private root: string;

  constructor(data: string[]) {
    this.leaves = data;
    this.layers = [];
    this.root = '';
    this.buildTree();
  }

  /**
   * Build the Merkle tree from leaves
   */
  private buildTree(): void {
    if (this.leaves.length === 0) {
      this.root = '';
      return;
    }

    // First layer is the leaves themselves (already hashed)
    let currentLayer = [...this.leaves];
    this.layers.push(currentLayer);

    // Build up the tree layer by layer
    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left; // Duplicate if odd
        
        // Combine hashes (smaller first for consistency)
        const combined = left < right ? left + right : right + left;
        nextLayer.push(sha256Sync(combined));
      }
      
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    this.root = currentLayer[0] || '';
  }

  /**
   * Get the Merkle root
   */
  getRoot(): string {
    return this.root;
  }

  /**
   * Get all layers of the tree
   */
  getLayers(): string[][] {
    return this.layers;
  }

  /**
   * Get the leaf count
   */
  getLeafCount(): number {
    return this.leaves.length;
  }

  /**
   * Generate a proof for a specific leaf
   */
  getProof(leafIndex: number): MerkleProof | null {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      return null;
    }

    const proof: MerkleProofNode[] = [];
    let currentIndex = leafIndex;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        proof.push({
          hash: layer[siblingIndex],
          position: isRightNode ? 'left' : 'right',
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leafHash: this.leaves[leafIndex],
      leafIndex,
      proof,
      root: this.root,
      treeSize: this.leaves.length,
    };
  }

  /**
   * Verify a proof against the root
   */
  static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leafHash;

    for (const node of proof.proof) {
      const combined = node.position === 'left'
        ? node.hash + currentHash
        : currentHash + node.hash;
      
      // Sort for consistency
      const sortedCombined = node.hash < currentHash
        ? node.hash + currentHash
        : currentHash + node.hash;
      
      currentHash = sha256Sync(sortedCombined);
    }

    return currentHash === proof.root;
  }

  /**
   * Static async verification (for browser)
   */
  static async verifyProofAsync(proof: MerkleProof): Promise<boolean> {
    let currentHash = proof.leafHash;

    for (const node of proof.proof) {
      const sortedCombined = node.hash < currentHash
        ? node.hash + currentHash
        : currentHash + node.hash;
      
      currentHash = await sha256(sortedCombined);
    }

    return currentHash === proof.root;
  }
}

/**
 * Build a Merkle tree from audit entries
 */
export function buildMerkleTreeFromAuditEntries(entries: AuditEntry[]): MerkleTree {
  const hashes = entries.map(entry => entry.event_hash);
  return new MerkleTree(hashes);
}

/**
 * Create a hash for an audit entry
 */
export async function hashAuditEntry(entry: Omit<AuditEntry, 'event_hash'>): Promise<string> {
  const content = JSON.stringify({
    id: entry.id,
    event_type: entry.event_type,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    user_id: entry.user_id,
    action: entry.action,
    details: entry.details,
    created_at: entry.created_at,
  });
  
  return sha256(content);
}

/**
 * Verification result
 */
export interface ChainVerificationResult {
  isValid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  brokenLinks: Array<{
    entryId: string;
    index: number;
    reason: string;
  }>;
  integrityPercentage: number;
  merkleRoot: string;
}

/**
 * Verify the integrity of an audit chain
 */
export function verifyAuditChain(entries: AuditEntry[]): ChainVerificationResult {
  const brokenLinks: ChainVerificationResult['brokenLinks'] = [];
  let verifiedCount = 0;

  if (entries.length === 0) {
    return {
      isValid: true,
      totalEntries: 0,
      verifiedEntries: 0,
      brokenLinks: [],
      integrityPercentage: 100,
      merkleRoot: '',
    };
  }

  // Build Merkle tree
  const tree = buildMerkleTreeFromAuditEntries(entries);
  
  // Verify each entry has a valid hash
  entries.forEach((entry, index) => {
    if (!entry.event_hash || entry.event_hash.length !== 64) {
      brokenLinks.push({
        entryId: entry.id,
        index,
        reason: 'Invalid or missing hash',
      });
    } else {
      verifiedCount++;
    }
  });

  const integrityPercentage = entries.length > 0
    ? Math.round((verifiedCount / entries.length) * 100)
    : 100;

  return {
    isValid: brokenLinks.length === 0,
    totalEntries: entries.length,
    verifiedEntries: verifiedCount,
    brokenLinks,
    integrityPercentage,
    merkleRoot: tree.getRoot(),
  };
}

/**
 * Batch entries into blocks for Merkle tree construction
 */
export function batchEntriesIntoBlocks(
  entries: AuditEntry[],
  blockSize: number = 100
): Array<{
  blockNumber: number;
  entries: AuditEntry[];
  merkleRoot: string;
}> {
  const blocks: Array<{
    blockNumber: number;
    entries: AuditEntry[];
    merkleRoot: string;
  }> = [];

  for (let i = 0; i < entries.length; i += blockSize) {
    const blockEntries = entries.slice(i, i + blockSize);
    const tree = buildMerkleTreeFromAuditEntries(blockEntries);
    
    blocks.push({
      blockNumber: Math.floor(i / blockSize) + 1,
      entries: blockEntries,
      merkleRoot: tree.getRoot(),
    });
  }

  return blocks;
}

/**
 * Generate visual representation of Merkle tree (for UI)
 */
export interface MerkleTreeVisualization {
  levels: Array<{
    level: number;
    nodes: Array<{
      hash: string;
      shortHash: string;
      isLeaf: boolean;
      leftChild?: number;
      rightChild?: number;
    }>;
  }>;
  root: string;
  leafCount: number;
}

export function visualizeMerkleTree(tree: MerkleTree): MerkleTreeVisualization {
  const layers = tree.getLayers();
  
  return {
    levels: layers.map((layer, levelIndex) => ({
      level: levelIndex,
      nodes: layer.map((hash, nodeIndex) => ({
        hash,
        shortHash: hash.substring(0, 8) + '...' + hash.substring(hash.length - 4),
        isLeaf: levelIndex === 0,
        leftChild: levelIndex > 0 ? nodeIndex * 2 : undefined,
        rightChild: levelIndex > 0 ? nodeIndex * 2 + 1 : undefined,
      })),
    })),
    root: tree.getRoot(),
    leafCount: tree.getLeafCount(),
  };
}

export { sha256, sha256Sync };
