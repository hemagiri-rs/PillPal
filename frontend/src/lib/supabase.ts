import { createClient } from "@supabase/supabase-js";

// Used only for sign-in/out and to get the access token. All data goes through the FastAPI API.
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
