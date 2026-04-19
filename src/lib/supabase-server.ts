import { createClient } from "@supabase/supabase-js";

export const getSupabaseService = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[Supabase] URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
  console.log("[Supabase] Service Role Key:", serviceRoleKey ? "✓ Set" : "✗ Missing");

  if (!supabaseUrl || !serviceRoleKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");

    const errorMsg = `Missing environment variables: ${missingVars.join(", ")}. See SUPABASE_SETUP.md for setup instructions.`;
    console.error("[Supabase] " + errorMsg);
    throw new Error(errorMsg);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
