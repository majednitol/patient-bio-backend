import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const limit = Math.min(body.limit || 10, 20); // Max 20 per batch
    const autoSave = body.auto_save !== false; // Default true

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find unprocessed records for this user
    const { data: pendingRecords, error: fetchError } = await adminClient
      .from('health_records')
      .select('id, title, category, disease_category, file_url, file_type, is_encrypted')
      .eq('user_id', user.id)
      .or('ocr_status.eq.pending,ocr_status.is.null')
      .eq('is_encrypted', false) // Skip encrypted records
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch records' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return new Response(JSON.stringify({
        message: 'No unprocessed records found',
        processed: 0, total_pending: 0,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as processing
    const recordIds = pendingRecords.map(r => r.id);
    await adminClient.from('health_records')
      .update({ ocr_status: 'processing' })
      .in('id', recordIds);

    // Process each record by calling extract-clinical-from-document
    const results: Array<{ id: string; title: string; status: string; confidence?: number; abnormal_count?: number }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const record of pendingRecords) {
      try {
        // For images, get a signed URL and download to get base64
        let imageBase64: string | undefined;
        let mimeType: string | undefined;

        if (record.file_type?.startsWith('image/') && record.file_url) {
          const { data: signedData } = await adminClient.storage
            .from('health-records')
            .createSignedUrl(record.file_url, 60);

          if (signedData?.signedUrl) {
            try {
              const imgRes = await fetch(signedData.signedUrl);
              if (imgRes.ok) {
                const buffer = await imgRes.arrayBuffer();
                imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                mimeType = record.file_type;
              }
            } catch (e) {
              console.error(`Failed to download image for ${record.id}:`, e);
            }
          }
        }

        // Call the extraction function internally
        const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-clinical-from-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            document_title: record.title,
            document_category: record.category,
            image_base64: imageBase64,
            mime_type: mimeType,
            record_id: record.id,
            auto_save: autoSave,
          }),
        });

        const extractData = await extractRes.json();

        if (extractData.extracted) {
          successCount++;
          results.push({
            id: record.id,
            title: record.title,
            status: 'completed',
            confidence: extractData.overall_confidence,
            abnormal_count: extractData.abnormal_flags?.length || 0,
          });
        } else {
          failCount++;
          results.push({ id: record.id, title: record.title, status: 'no_data' });
        }
      } catch (e) {
        console.error(`Batch OCR error for ${record.id}:`, e);
        failCount++;
        await adminClient.from('health_records')
          .update({ ocr_status: 'failed', ocr_extracted_at: new Date().toISOString() })
          .eq('id', record.id);
        results.push({ id: record.id, title: record.title, status: 'error' });
      }

      // Rate limit: small delay between records
      await new Promise(r => setTimeout(r, 500));
    }

    // Count remaining pending
    const { count } = await adminClient
      .from('health_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('ocr_status.eq.pending,ocr_status.is.null');

    return new Response(JSON.stringify({
      message: `Processed ${successCount + failCount} records: ${successCount} extracted, ${failCount} failed`,
      processed: successCount + failCount,
      success: successCount,
      failed: failCount,
      remaining_pending: count || 0,
      results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Batch OCR error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
