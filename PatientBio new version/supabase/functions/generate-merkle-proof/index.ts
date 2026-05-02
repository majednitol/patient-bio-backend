import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsHeaders, 
  errorResponse,
  generateMerkleProof,
  verifyMerkleProof 
} from '../_shared/blockchain.ts';
import { 
  getCorrelationId, 
  createLogger,
  withCorrelationHeaders 
} from '../_shared/correlationId.ts';
import { validateMerkleProofRequest, isValidUUID } from '../_shared/validation.ts';

/**
 * Generate Merkle Proof Edge Function
 * Generates a cryptographic proof for a specific record
 * Part of Microservice Architecture (Phase 3) + Blockchain Security (Phase 4)
 */

Deno.serve(async (req) => {
  const correlationId = getCorrelationId(req);
  const logger = createLogger(correlationId, 'generate-merkle-proof');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withCorrelationHeaders(corsHeaders, correlationId) });
  }

  try {
    logger.info('Processing Merkle proof request');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      return errorResponse('Missing authorization header', 401);
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      logger.warn('Authentication failed', { error: authError?.message });
      return errorResponse('Unauthorized', 401);
    }

    logger.info('User authenticated', { userId: user.id });

    // Get and validate parameters
    const url = new URL(req.url);
    const recordId = url.searchParams.get('record_id');
    const resourceType = url.searchParams.get('resource_type') || 'health_record';

    // Validate input
    const validation = validateMerkleProofRequest({ 
      recordId, 
      recordType: resourceType 
    });
    
    if (!validation.success) {
      logger.warn('Validation failed', { error: validation.error });
      return errorResponse(validation.error!, 400);
    }

    // Verify user owns the record
    if (resourceType === 'health_record') {
      const { data: record, error: recordError } = await supabase
        .from('health_records')
        .select('id, user_id')
        .eq('id', recordId)
        .single();

      if (recordError || !record || record.user_id !== user.id) {
        logger.warn('Record not found or access denied', { recordId });
        return errorResponse('Record not found or access denied', 404);
      }
    }

    // Fetch all transactions for this resource to build Merkle tree
    const { data: transactions, error: txError } = await supabase
      .from('blockchain_transactions')
      .select('id, data_hash, created_at')
      .eq('target_resource_type', resourceType)
      .eq('target_resource_id', recordId)
      .order('created_at', { ascending: true });

    if (txError) {
      logger.error('Failed to fetch transactions', { error: txError.message });
      return errorResponse('Failed to fetch transactions', 500);
    }

    if (!transactions || transactions.length === 0) {
      logger.info('No transactions found for record', { recordId });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            recordId,
            message: 'No blockchain transactions found for this record',
            proof: null,
            correlationId,
          },
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          } 
        }
      );
    }

    // Build Merkle tree from transaction hashes
    const leaves = transactions.map(tx => tx.data_hash);
    const leafIndex = 0; // Proof for the first (creation) transaction

    // Generate proof
    const { proof, root } = await generateMerkleProof(leaves, leafIndex);

    // Verify the proof
    const isVerified = await verifyMerkleProof(leaves[leafIndex], proof, root);

    logger.info('Merkle proof generated', { 
      recordId,
      transactionCount: transactions.length,
      verified: isVerified 
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recordId,
          recordHash: leaves[leafIndex],
          proof,
          root,
          transactionCount: transactions.length,
          verified: isVerified,
          generatedAt: new Date().toISOString(),
          correlationId,
          firstTransaction: {
            id: transactions[0].id,
            hash: transactions[0].data_hash,
            timestamp: transactions[0].created_at,
          },
          lastTransaction: {
            id: transactions[transactions.length - 1].id,
            hash: transactions[transactions.length - 1].data_hash,
            timestamp: transactions[transactions.length - 1].created_at,
          },
        },
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=120',
          'x-correlation-id': correlationId,
        } 
      }
    );
  } catch (error) {
    logger.error('Unexpected error', { error: (error as Error).message });
    return errorResponse('Internal server error', 500);
  }
});
