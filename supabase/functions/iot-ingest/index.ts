import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { device_code, value, unit } = body;

    if (!device_code || value === undefined) {
      return new Response(JSON.stringify({ error: "device_code and value required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get device
    const { data: device, error: devErr } = await supabase
      .from("iot_devices")
      .select("id, alert_threshold, name, sensor_type")
      .eq("device_code", device_code)
      .maybeSingle();

    if (devErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const is_alert = value >= device.alert_threshold;

    // Insert reading
    await supabase.from("sensor_readings").insert({
      device_id: device.id,
      value,
      unit: unit || "m",
      is_alert,
      recorded_at: new Date().toISOString(),
    });

    // Update device last reading
    await supabase.from("iot_devices").update({
      last_reading: value,
      last_reading_at: new Date().toISOString(),
    }).eq("id", device.id);

    // Trigger alert notification if threshold exceeded
    if (is_alert) {
      const { data: config } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "flood_alert_message")
        .maybeSingle();

      const alertMsg = config?.value ||
        `ALERT: ${device.name} reading ${value} ${unit || "m"} exceeds threshold ${device.alert_threshold}.`;

      await supabase.from("notifications").insert({
        title: `⚠️ IoT Alert: ${device.name}`,
        body: alertMsg,
        channel: "in_app",
        status: "sent",
        target_role: null,
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, is_alert }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
