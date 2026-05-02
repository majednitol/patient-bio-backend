 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     
     // Create service role client for database operations
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
     
     // Get auth header to identify the researcher
     const authHeader = req.headers.get('Authorization');
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'Missing authorization header' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Verify the user's JWT
     const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
       global: { headers: { Authorization: authHeader } }
     });
     
     const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
     if (authError || !user) {
       console.error('Auth error:', authError);
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const researcherId = user.id;
     console.log('Researcher ID:', researcherId);
 
     // Parse request body
      const { disease_category, research_purpose, token_offer_per_patient, total_token_budget } = await req.json();
     
     if (!disease_category || !research_purpose) {
       return new Response(
         JSON.stringify({ error: 'disease_category and research_purpose are required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Broadcasting request for disease category:', disease_category);
      
      // Get base token price if not provided
      let tokenOffer = token_offer_per_patient || 0;
      if (!tokenOffer) {
        const { data: pricing } = await supabaseAdmin
          .from('token_pricing')
          .select('base_price_tokens')
          .eq('disease_category', disease_category)
          .eq('is_active', true)
          .maybeSingle();
        
        tokenOffer = pricing?.base_price_tokens || 10; // Default 10 PBIO
      }
      
      console.log('Token offer per patient:', tokenOffer);
 
     // Step 1: Find all unique patients with matching disease category in health_records
     const { data: matchingRecords, error: recordsError } = await supabaseAdmin
       .from('health_records')
       .select('user_id')
       .eq('disease_category', disease_category);
 
     if (recordsError) {
       console.error('Error fetching health records:', recordsError);
       return new Response(
         JSON.stringify({ error: 'Failed to find matching patients' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Get unique patient IDs (excluding the researcher themselves)
     const uniquePatientIds = [...new Set(matchingRecords?.map(r => r.user_id) || [])]
       .filter(id => id !== researcherId);
 
     console.log('Found', uniquePatientIds.length, 'unique patients with matching data');
 
     // Step 2: Create the broadcast request record
     const { data: broadcastRequest, error: broadcastError } = await supabaseAdmin
       .from('research_broadcast_requests')
       .insert({
         researcher_id: researcherId,
         disease_category,
         research_purpose,
         patients_notified: uniquePatientIds.length,
          status: uniquePatientIds.length > 0 ? 'active' : 'completed',
          token_offer_per_patient: tokenOffer,
          total_token_budget: total_token_budget || (tokenOffer * uniquePatientIds.length),
          tokens_disbursed: 0
       })
       .select()
       .single();
 
     if (broadcastError) {
       console.error('Error creating broadcast request:', broadcastError);
       return new Response(
         JSON.stringify({ error: 'Failed to create broadcast request' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Created broadcast request:', broadcastRequest.id);
 
     // If no patients found, return early with the saved broadcast request
     if (uniquePatientIds.length === 0) {
       return new Response(
         JSON.stringify({ 
           success: true, 
           message: 'No patients found with matching disease category',
           patients_notified: 0,
           broadcast_request_id: broadcastRequest.id
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Step 3: Create individual data_access_requests for each patient
     const accessRequests = uniquePatientIds.map(patientId => ({
       patient_id: patientId,
       requester_id: researcherId,
       requester_type: 'researcher',
       disease_category,
       reason: research_purpose,
       broadcast_request_id: broadcastRequest.id,
        status: 'pending',
        token_offer: tokenOffer
     }));
 
     const { error: requestsError } = await supabaseAdmin
       .from('data_access_requests')
       .insert(accessRequests);
 
     if (requestsError) {
       console.error('Error creating access requests:', requestsError);
       // Rollback: delete the broadcast request
       await supabaseAdmin
         .from('research_broadcast_requests')
         .delete()
         .eq('id', broadcastRequest.id);
       
       return new Response(
         JSON.stringify({ error: 'Failed to create access requests' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Step 4: Create notifications for each patient
     const notifications = uniquePatientIds.map(patientId => ({
       user_id: patientId,
       type: 'research_request',
       title: 'Research Data Request',
        message: `A researcher is requesting access to your ${disease_category} data. Earn ${tokenOffer} PBIO tokens if you approve!`,
       metadata: {
         broadcast_request_id: broadcastRequest.id,
         disease_category,
          research_purpose,
          token_offer: tokenOffer
       }
     }));
 
     const { error: notifError } = await supabaseAdmin
       .from('notifications')
       .insert(notifications);
 
     if (notifError) {
       console.error('Error creating notifications (non-fatal):', notifError);
       // Continue - notifications are nice-to-have
     }
 
     console.log('Successfully broadcast request to', uniquePatientIds.length, 'patients');
 
     return new Response(
       JSON.stringify({
         success: true,
         message: `Request sent to ${uniquePatientIds.length} patients`,
         patients_notified: uniquePatientIds.length,
          broadcast_request_id: broadcastRequest.id,
          token_offer_per_patient: tokenOffer
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Unexpected error:', error);
     return new Response(
       JSON.stringify({ error: 'Internal server error' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });