import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client for the Crypto Floor robot tables (crypto_floor_events, crypto_floor_params,
 * crypto_floor_snapshot). These live in `public` (created by the robot migrations), not in the
 * awad_command schema the rest of the app uses — and they are service_role-only by design, so the
 * cookie-based user client can never read them (that is why the first live tick returned
 * "Params not found" with the row present). Server routes only; never import from client code.
 */
export function createCryptoFloorDb() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
