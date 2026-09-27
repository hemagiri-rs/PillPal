import { useEffect, useState } from "preact/hooks";
import { ApiError, api, type Me } from "./api";
import { supabase } from "./supabase";

let mePromise: Promise<Me> | null = null;

/**
 * The signed-in user. No session -> /login. Signed in but not in a family yet (403) -> /welcome.
 * Cached per page load.
 */
export function loadMe(): Promise<Me> {
  mePromise ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      location.href = "/login";
      throw new ApiError("Please sign in.", 401);
    }
    try {
      return await api<Me>("/me");
    } catch (e) {
      if ((e as ApiError).status === 403 && location.pathname !== "/welcome") {
        location.href = "/welcome";
      }
      throw e;
    }
  })();
  return mePromise;
}

export function useMe(): { me: Me | null; error: string | null } {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadMe()
      .then(setMe)
      .catch((e: ApiError) => e.status !== 401 && e.status !== 403 && setError(e.message));
  }, []);
  return { me, error };
}

export async function signOut() {
  await supabase.auth.signOut();
  location.href = "/login";
}
