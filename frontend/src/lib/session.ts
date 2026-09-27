import { useEffect, useState } from "preact/hooks";
import { ApiError, api, type Me } from "./api";
import { supabase } from "./supabase";

let mePromise: Promise<Me> | null = null;

/** The signed-in user; redirects to /login when there is no session. Cached per page load. */
export function loadMe(): Promise<Me> {
  mePromise ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      location.href = "/login";
      throw new ApiError("Please sign in.", 401);
    }
    return api<Me>("/me");
  })();
  return mePromise;
}

export function useMe(): { me: Me | null; error: string | null } {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadMe()
      .then(setMe)
      .catch((e: ApiError) => e.status !== 401 && setError(e.message));
  }, []);
  return { me, error };
}

export async function signOut() {
  await supabase.auth.signOut();
  location.href = "/login";
}
