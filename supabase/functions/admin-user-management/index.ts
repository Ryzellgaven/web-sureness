import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Accept action from body (POST) or query string (legacy)
    const url = new URL(req.url);
    const bodyRaw = req.method !== "GET" ? await req.json() : {};
    const action = bodyRaw.action || url.searchParams.get("action");

    if (action === "create") {
      const { email, password, full_name, phone, role, address } = bodyRaw;
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: role || "resident" },
      });
      if (error) throw error;

      await supabaseAdmin.from("profiles").update({
        full_name, phone, role: role || "resident", address,
      }).eq("id", newUser.user.id);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id, action: "user_created", table_name: "profiles",
        record_id: newUser.user.id, new_values: { email, role },
      });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { target_user_id, new_role } = bodyRaw;
      await supabaseAdmin.from("profiles").update({ role: new_role }).eq("id", target_user_id);
      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id, action: "role_updated", table_name: "profiles",
        record_id: target_user_id, new_values: { role: new_role },
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { target_user_id, is_active } = bodyRaw;
      await supabaseAdmin.from("profiles").update({ is_active }).eq("id", target_user_id);
      if (!is_active) await supabaseAdmin.auth.admin.updateUserById(target_user_id, { ban_duration: "876600h" });
      else await supabaseAdmin.auth.admin.updateUserById(target_user_id, { ban_duration: "none" });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
