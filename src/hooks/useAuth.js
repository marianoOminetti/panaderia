import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Encapsula sesión y acciones de auth de Supabase.
 * Única capa que usa supabase.auth desde la UI.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  // Usuario activo. Sirve para ignorar eventos de auth del MISMO usuario
  // (TOKEN_REFRESHED / SIGNED_IN re-emitido al volver de background). Sin esto,
  // cada refresh de token cambiaba la identidad de `session` y remontaba la app
  // (spinner global), perdiendo el contexto (venta en edición, carrito, scroll).
  const currentUserIdRef = useRef(undefined);

  const loadRole = useCallback(async (nextSession) => {
    if (!nextSession?.user?.id) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();
    if (error) {
      console.error("[auth/loadRole]", error);
      setRole(null);
      setRoleLoading(false);
      return;
    }
    setRole(data?.role || null);
    setRoleLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session: initial } } = await supabase.auth.getSession();
      let session = initial;
      if (session) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session) {
          session = data.session;
        } else if (error) {
          const msg = String(error.message || "").toLowerCase();
          const authExpired =
            error.status === 401 ||
            msg.includes("invalid") ||
            msg.includes("expired") ||
            msg.includes("refresh_token");
          if (authExpired) {
            await supabase.auth.signOut();
            session = null;
          }
        }
      }
      currentUserIdRef.current = session?.user?.id ?? null;
      setSession(session);
      setAuthLoading(false);
      loadRole(session);
    })().catch((err) => {
      console.error("[auth/getSession]", err);
      setAuthLoading(false);
      setRoleLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      const nextUserId = s?.user?.id ?? null;
      // Mismo usuario (refresh de token al volver de foco): la sesión sigue
      // válida y el cliente Supabase ya renovó el token internamente. No tocamos
      // `session` ni el rol para no remontar la app y perder el contexto.
      if (
        currentUserIdRef.current !== undefined &&
        nextUserId === currentUserIdRef.current
      ) {
        return;
      }
      currentUserIdRef.current = nextUserId;
      setSession(s);
      loadRole(s);
    });
    return () => subscription.unsubscribe();
  }, [loadRole]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      console.error("[auth/signIn]", error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, authLoading, signIn, signOut, role, roleLoading };
}
