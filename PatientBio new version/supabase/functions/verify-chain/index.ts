import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsHeaders, 
  jsonResponse, 
  errorResponse 
} from '../_shared/blockchain.ts';
import { 
  getCorrelationId, 
  createLogger,
  withCorrelationHeaders 
} from '../_shared/correlationId.ts';
import { validateChainVerification } from '../_shared/validation.ts';

/**
 * Verify Chain Edge Function
 * Verifies the integrity of the blockchain transaction chain
 * Part of Microservice Architecture (Phase 3) + Blockchain Security (Phase 4)
 */

Deno.serve(async (req) => {
  const correlationId = getCorrelationId(req);
  const logger = createLogger(correlationId, 'verify-chain');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withCorrelationHeaders(corsHeaders, correlationId) });
  }

  try {
    logger.info('Processing chain verification request');
    
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

    // Parse and validate query params
    const url = new URL(req.url);
    const queryParams = {
      startDate: url.searchParams.get('start_date') || undefined,
      endDate: url.searchParams.get('end_date') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    };
    
    const validation = validateChainVerification(queryParams);
    if (!validation.success) {
      logger.warn('Validation failed', { error: validation.error });
      return errorResponse(validation.error!, 400);
    }

    const { startDate, endDate, limit = 1000 } = validation.data!;
    const userOnly = url.searchParams.get('user_only') === 'true';

    // Build query
    let query = supabase
      .from('blockchain_transactions')
      .select('id, data_hash, previous_hash, timestamp, transaction_type, actor_id')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (userOnly) {
      query = query.eq('actor_id', user.id);
    }
    
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: transactions, error: fetchError } = await query;

    if (fetchError) {
      logger.error('Failed to fetch transactions', { error: fetchError.message });
      return errorResponse('Failed to fetch transactions', 500);
    }

    if (!transactions || transactions.length === 0) {
      logger.info('No transactions found');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isValid: true,
            totalTransactions: 0,
            verifiedTransactions: 0,
            brokenLinks: [],
            integrityPercentage: 100,
            lastVerifiedAt: new Date().toISOString(),
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

    // Verify chain integrity
    const brokenLinks: Array<{
      transactionId: string;
      expectedHash: string;
      actualHash: string;
      timestamp: string;
    }> = [];

    let verifiedCount = 0;
    let previousHash: string | null = null;

    for (const tx of transactions) {
      if (previousHash === null) {
        // First transaction should have genesis hash or null
        if (tx.previous_hash?.startsWith('GENESIS') || tx.previous_hash === null) {
          verifiedCount++;
        } else {
          brokenLinks.push({
            transactionId: tx.id,
            expectedHash: 'GENESIS_...',
            actualHash: tx.previous_hash || 'null',
            timestamp: tx.timestamp,
          });
        }
      } else {
        // Subsequent transactions should link to previous
        if (tx.previous_hash === previousHash) {
          verifiedCount++;
        } else {
          brokenLinks.push({
            transactionId: tx.id,
            expectedHash: previousHash,
            actualHash: tx.previous_hash || 'null',
            timestamp: tx.timestamp,
          });
        }
      }

      previousHash = tx.data_hash;
    }

    const totalTransactions = transactions.length;
    const integrityPercentage = totalTransactions > 0
      ? Math.round((verifiedCount / totalTransactions) * 100 * 100) / 100
      : 100;

    logger.info('Chain verification complete', {
      total: totalTransactions,
      verified: verifiedCount,
      integrity: integrityPercentage,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          isValid: brokenLinks.length === 0,
          totalTransactions,
          verifiedTransactions: verifiedCount,
          brokenLinks,
          integrityPercentage,
          lastVerifiedAt: new Date().toISOString(),
          correlationId,
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
