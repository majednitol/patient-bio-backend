import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get their ID
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Role check failed:", roleError, "isAdmin:", isAdmin);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for auth.users access
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (req.method === "GET" && action === "list") {
      // List all users with their roles
      console.log("Listing users...");
      
      const { data: authUsers, error: usersError } = await adminClient.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error listing users:", usersError);
        return new Response(
          JSON.stringify({ error: "Failed to list users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all roles
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Get last activity from various tables
      const userIds = authUsers.users.map(u => u.id);
      
      // Query health_records for last upload
      const { data: lastRecords } = await adminClient
        .from("health_records")
        .select("user_id, uploaded_at")
        .in("user_id", userIds)
        .order("uploaded_at", { ascending: false });

      // Query access_logs for last access
      const { data: lastAccess } = await adminClient
        .from("access_logs")
        .select("user_id, accessed_at")
        .in("user_id", userIds)
        .order("accessed_at", { ascending: false });

      // Build activity map - latest of last_sign_in, last record upload, or last access log
      const activityMap = new Map<string, string>();
      
      // Add sign-in times
      authUsers.users.forEach(user => {
        if (user.last_sign_in_at) {
          activityMap.set(user.id, user.last_sign_in_at);
        }
      });

      // Update with more recent record uploads
      lastRecords?.forEach(record => {
        const current = activityMap.get(record.user_id);
        if (!current || new Date(record.uploaded_at) > new Date(current)) {
          activityMap.set(record.user_id, record.uploaded_at);
        }
      });

      // Update with more recent access logs
      lastAccess?.forEach(log => {
        const current = activityMap.get(log.user_id);
        if (!current || new Date(log.accessed_at) > new Date(current)) {
          activityMap.set(log.user_id, log.accessed_at);
        }
      });

      // Map roles to users
      const rolesMap = new Map<string, string>();
      roles?.forEach((r) => rolesMap.set(r.user_id, r.role));

      const users = authUsers.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        last_activity_at: activityMap.get(user.id) || user.last_sign_in_at,
        role: rolesMap.get(user.id) || "user",
        email_confirmed_at: user.email_confirmed_at,
      }));

      console.log(`Found ${users.length} users`);
      
      return new Response(
        JSON.stringify({ users }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && action === "stats") {
      // Get user signup statistics
      console.log("Fetching user stats...");
      
      const { data: authUsers, error: usersError } = await adminClient.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error listing users:", usersError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user stats" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return signup dates for all users
      const signups = authUsers.users.map((user) => ({
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
      }));

      console.log(`Returning stats for ${signups.length} users`);
      
      return new Response(
        JSON.stringify({ signups, totalUsers: signups.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "set-role") {
      const body = await req.json();
      const { targetUserId, role } = body;

      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "Missing targetUserId or role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validRoles = ["admin", "user", "doctor", "hospital_admin", "pathologist", "researcher"];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Setting role for user ${targetUserId} to ${role}`);

      // First, delete existing role for this user
      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);

      if (deleteError) {
        console.error("Error removing existing role:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to update role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If the role is not the default "user", insert the new role
      if (role !== "user") {
        const { error: insertError } = await adminClient
          .from("user_roles")
          .insert({ user_id: targetUserId, role: role });

        if (insertError) {
          console.error("Error setting role:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to set role" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "delete-user") {
      const body = await req.json();
      const { targetUserId } = body;

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "Missing targetUserId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-deletion
      if (targetUserId === userId) {
        return new Response(
          JSON.stringify({ error: "You cannot delete your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Deleting user ${targetUserId}`);

      // Get user info before deletion for audit log
      const { data: userToDelete } = await adminClient.auth.admin.getUserById(targetUserId);
      const userEmail = userToDelete?.user?.email || "unknown";

      // Get user's role before deletion
      const { data: userRoleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .single();
      
      const userRole = userRoleData?.role || "user";

      // Delete the user from auth.users (cascades to user_roles)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the deletion to admin_audit_logs
      const { error: auditError } = await adminClient
        .from("admin_audit_logs")
        .insert({
          admin_id: userId,
          action: "delete_user",
          target_type: "user",
          target_id: targetUserId,
          details: {
            email: userEmail,
            role: userRole,
            deleted_at: new Date().toISOString(),
          },
        });

      if (auditError) {
        console.error("Error logging audit:", auditError);
        // Don't fail the request if audit logging fails
      }

      console.log(`User ${targetUserId} deleted successfully`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bulk delete users
    if (req.method === "POST" && action === "bulk-delete-users") {
      const body = await req.json();
      const { targetUserIds } = body;

      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid targetUserIds array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit: max 50 users per request
      if (targetUserIds.length > 50) {
        return new Response(
          JSON.stringify({ error: "Maximum 50 users per bulk operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter out admin's own ID
      const filteredIds = targetUserIds.filter((id: string) => id !== userId);
      
      console.log(`Bulk deleting ${filteredIds.length} users`);

      let deleted = 0;
      let failed = 0;
      const auditLogs: any[] = [];

      for (const targetId of filteredIds) {
        try {
          // Get user info before deletion
          const { data: userToDelete } = await adminClient.auth.admin.getUserById(targetId);
          const userEmail = userToDelete?.user?.email || "unknown";

          // Get user's role before deletion
          const { data: userRoleData } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", targetId)
            .single();
          
          const userRole = userRoleData?.role || "user";

          // Delete the user
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);

          if (deleteError) {
            console.error(`Error deleting user ${targetId}:`, deleteError);
            failed++;
          } else {
            deleted++;
            auditLogs.push({
              admin_id: userId,
              action: "bulk_delete_user",
              target_type: "user",
              target_id: targetId,
              details: {
                email: userEmail,
                role: userRole,
                deleted_at: new Date().toISOString(),
                batch_operation: true,
              },
            });
          }
        } catch (err) {
          console.error(`Error processing user ${targetId}:`, err);
          failed++;
        }
      }

      // Batch insert audit logs
      if (auditLogs.length > 0) {
        const { error: auditError } = await adminClient
          .from("admin_audit_logs")
          .insert(auditLogs);

        if (auditError) {
          console.error("Error logging bulk audit:", auditError);
        }
      }

      console.log(`Bulk delete complete: ${deleted} deleted, ${failed} failed`);

      return new Response(
        JSON.stringify({ success: true, deleted, failed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bulk set role
    if (req.method === "POST" && action === "bulk-set-role") {
      const body = await req.json();
      const { targetUserIds, role } = body;

      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid targetUserIds array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!role) {
        return new Response(
          JSON.stringify({ error: "Missing role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validRoles = ["admin", "user", "doctor", "hospital_admin", "pathologist", "researcher"];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit: max 50 users per request
      if (targetUserIds.length > 50) {
        return new Response(
          JSON.stringify({ error: "Maximum 50 users per bulk operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter out admin's own ID for role changes
      const filteredIds = targetUserIds.filter((id: string) => id !== userId);
      
      console.log(`Bulk setting role to ${role} for ${filteredIds.length} users`);

      let updated = 0;
      let failed = 0;
      const auditLogs: any[] = [];

      for (const targetId of filteredIds) {
        try {
          // Get current role
          const { data: currentRoleData } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", targetId)
            .single();
          
          const previousRole = currentRoleData?.role || "user";

          // Delete existing role
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", targetId);

          // Insert new role if not default "user"
          if (role !== "user") {
            const { error: insertError } = await adminClient
              .from("user_roles")
              .insert({ user_id: targetId, role: role });

            if (insertError) {
              console.error(`Error setting role for user ${targetId}:`, insertError);
              failed++;
              continue;
            }
          }

          updated++;
          auditLogs.push({
            admin_id: userId,
            action: "bulk_set_role",
            target_type: "user",
            target_id: targetId,
            details: {
              previous_role: previousRole,
              new_role: role,
              batch_operation: true,
            },
          });
        } catch (err) {
          console.error(`Error processing user ${targetId}:`, err);
          failed++;
        }
      }

      // Batch insert audit logs
      if (auditLogs.length > 0) {
        const { error: auditError } = await adminClient
          .from("admin_audit_logs")
          .insert(auditLogs);

        if (auditError) {
          console.error("Error logging bulk audit:", auditError);
        }
      }

      console.log(`Bulk role change complete: ${updated} updated, ${failed} failed`);

      return new Response(
        JSON.stringify({ success: true, updated, failed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
