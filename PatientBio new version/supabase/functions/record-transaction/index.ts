import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsHeaders, 
  jsonResponse, 
  errorResponse,
  sha256,
  type TransactionType 
} from '../_shared/blockchain.ts';
import { 
  getCorrelationId, 
  createLogger,
  withCorrelationHeaders 
} from '../_shared/correlationId.ts';
import { validateBlockchainTransaction } from '../_shared/validation.ts';

/**
 * Record Transaction Edge Function
 * Logs critical events to the blockchain ledger
 * Part of Microservice Architecture (Phase 3) + Blockchain Security (Phase 4)
 */

Deno.serve(async (req) => {
  const correlationId = getCorrelationId(req);
  const logger = createLogger(correlationId, 'record-transaction');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withCorrelationHeaders(corsHeaders, correlationId) });
  }

  try {
    logger.info('Processing blockchain transaction request');
    
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

    // Parse and validate request body
    const body = await req.json();
    
    // Map incoming request to validation schema
    const validationInput = {
      transactionType: body.transaction_type,
      actorId: user.id,
      targetResourceType: body.target_resource_type,
      targetResourceId: body.target_resource_id,
      metadata: body.metadata,
    };
    
    const validation = validateBlockchainTransaction(validationInput);
    if (!validation.success) {
      logger.warn('Validation failed', { error: validation.error });
      return errorResponse(validation.error!, 400);
    }

    const { transactionType, targetResourceType, targetResourceId, metadata = {} } = validation.data!;

    // Get previous transaction hash
    const { data: lastTx } = await supabase
      .from('blockchain_transactions')
      .select('data_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const previousHash = lastTx?.data_hash || 
      'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    // Create transaction data
    const timestamp = new Date().toISOString();
    const hashInput = [
      transactionType,
      user.id,
      targetResourceType || 'NULL',
      targetResourceId || 'NULL',
      previousHash,
      JSON.stringify(metadata),
      timestamp,
    ].join('|');

    const dataHash = await sha256(hashInput);
    const signature = await sha256(`${dataHash}|${user.id}|${timestamp}`);

    // Insert transaction
    const { data: transaction, error: insertError } = await supabase
      .from('blockchain_transactions')
      .insert({
        transaction_type: transactionType as TransactionType,
        actor_id: user.id,
        target_resource_type: targetResourceType,
        target_resource_id: targetResourceId,
        data_hash: dataHash,
        previous_hash: previousHash,
        signature,
        metadata: { ...metadata, correlationId },
        timestamp,
        is_verified: true,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert transaction', { error: insertError.message });
      return errorResponse('Failed to record transaction', 500);
    }

    logger.info('Transaction recorded successfully', { 
      transactionId: transaction.id,
      type: transactionType 
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transactionId: transaction.id,
          dataHash,
          previousHash,
          timestamp,
          correlationId,
        },
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        } 
      }
    );
  } catch (error) {
    logger.error('Unexpected error', { error: (error as Error).message });
    return errorResponse('Internal server error', 500);
  }
});
