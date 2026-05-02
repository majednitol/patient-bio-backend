/**
 * Client-side blockchain transaction batching utility
 * Improvement #4: Transaction Rate Limiting and Batching
 * 
 * Queues transactions and flushes every N items or T milliseconds
 */

import { supabase } from "@/integrations/supabase/client";

interface PendingTransaction {
  transaction_type: string;
  actor_id: string;
  target_resource_type?: string | null;
  target_resource_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface BatchConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  flushIntervalMs: 2000,
};

class BlockchainBatchQueue {
  private queue: PendingTransaction[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: BatchConfig;
  private flushing = false;

  constructor(config?: Partial<BatchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a transaction to the batch queue
   */
  enqueue(tx: PendingTransaction): void {
    this.queue.push(tx);

    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  /**
   * Flush all queued transactions as a single batch
   */
  async flush(): Promise<string[] | null> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0 || this.flushing) return null;

    this.flushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const payload = batch.map((tx) => ({
        transaction_type: tx.transaction_type,
        actor_id: tx.actor_id,
        target_resource_type: tx.target_resource_type || null,
        target_resource_id: tx.target_resource_id || null,
        metadata: (tx.metadata || {}) as Record<string, string>,
      }));

      const { data, error } = await supabase.rpc("record_blockchain_transaction_batch", {
        p_transactions: payload as unknown as import("@/integrations/supabase/types").Json,
      });

      if (error) {
        console.error("[BlockchainBatch] Flush failed:", error);
        // Re-queue failed transactions
        this.queue = [...batch, ...this.queue];
        return null;
      }

      const result = data as unknown as Array<{ transaction_ids: string[] }> | null;
      const ids = Array.isArray(result) ? result[0]?.transaction_ids : null;
      return ids || [];
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Get current queue size
   */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Force flush and destroy the queue
   */
  async destroy(): Promise<void> {
    await this.flush();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// Singleton instance
export const blockchainBatch = new BlockchainBatchQueue();

export { BlockchainBatchQueue, type PendingTransaction, type BatchConfig };
