import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Verify the requesting user
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const doctorUserId = claimsData.claims.sub;

    // Verify the user is a doctor using service role (bypasses RLS, trusted check)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', doctorUserId).maybeSingle();
    if (!roleData || roleData.role !== 'doctor') {
      return new Response(JSON.stringify({ error: 'Only doctors can create staff accounts' }), { status: 403, headers: corsHeaders });
    }

    // Also verify doctor has an active profile
    const { data: doctorProfile } = await supabaseAdmin.from('doctor_profiles').select('id').eq('user_id', doctorUserId).maybeSingle();
    if (!doctorProfile) {
      return new Response(JSON.stringify({ error: 'Doctor profile not found' }), { status: 403, headers: corsHeaders });
    }

    const { full_name, email, phone, role } = await req.json();

    if (!full_name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), { status: 400, headers: corsHeaders });
    }

    // Generate a secure random password server-side to avoid credential exposure
    const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);

    const validRoles = ['nurse', 'receptionist', 'assistant'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: corsHeaders });
    }

    // supabaseAdmin already created above for role verification

    // Create auth user with random password (staff will set their own via reset email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        portal_type: 'doctor_staff',
      },
    });

    if (createError) {
      let message = createError.message;
      if (message.includes('already been registered') || message.includes('already exists')) {
        message = 'A user with this email already exists.';
      }
      return new Response(JSON.stringify({ error: message }), { status: 400, headers: corsHeaders });
    }

    const staffUserId = newUser.user.id;

    // Insert into doctor_staff table linking staff to doctor
    const { error: staffError } = await supabaseAdmin.from('doctor_staff').insert({
      doctor_id: doctorUserId,
      staff_user_id: staffUserId,
      full_name,
      email,
      phone: phone || null,
      role,
      invite_status: 'accepted',
      is_active: true,
    });

    if (staffError) {
      // Cleanup: delete the auth user if staff record fails
      await supabaseAdmin.auth.admin.deleteUser(staffUserId);
      return new Response(JSON.stringify({ error: 'Failed to create staff record: ' + staffError.message }), { status: 500, headers: corsHeaders });
    }

    // Send password reset email so staff can set their own password
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    return new Response(JSON.stringify({ success: true, staff_user_id: staffUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
