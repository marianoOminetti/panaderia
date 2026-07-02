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
  // true una vez que el rol se resolvió por primera vez (ok o error). Sirve para
  // que el spinner de pantalla completa solo aparezca en el arranque inicial y
  // nunca más re-monte la app, aunque en el futuro se vuelva a cargar el rol.
  const [roleResolvedOnce, setRoleResolvedOnce] = useState(false);
  // Usuario activo actual. Sirve para ignorar eventos de auth del MISMO usuario
  // (TOKEN_REFRESHED / re-emisión de SIGNED_IN al volver de background), que si no
  // dispararían setSession + loadRole → spinner global → remount y pérdida de contexto.
  const currentUserIdRef = useRef(undefined);

  const loadRole = useCallback(async (nextSession) => {
    if (!nextSession?.user?.id) {
      setRole(null);
      setRoleLoading(false);
      setRoleResolvedOnce(true);
      return;
    }
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", nextSession.user.id)
        .maybeSingle();
      if (error) {
        console.error("[auth/loadRole]", error);
        setRole(null);
        return;
      }
      setRole(data?.role || null);
    } catch (err) {
      console.error("[auth/loadRole]", err);
      setRole(null);
    } finally {
      // Garantiza que el spinner nunca quede colgado aunque la query rechace.
      setRoleLoading(false);
      setRoleResolvedOnce(true);
    }
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
      // Mismo usuario (TOKEN_REFRESHED o SIGNED_IN re-emitido al volver de
      // background): la sesión sigue siendo válida y el cliente Supabase ya
      // actualizó el token internamente. No tocamos session ni el rol para
      // evitar el remount que borraba el contexto (carrito, comprobante, scroll).
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

  return { session, authLoading, signIn, signOut, role, roleLoading, roleResolvedOnce };
}
