import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Caller {
  userId: string;
  email: string;
  isServiceRole?: boolean;
}

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Adds CORS headers to a Response produced by this helper.
 */
export function withCors(res: Response, corsHeaders: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

/**
 * Verifies the CALLER (from their JWT) is an active super_admin.
 * Throws a Response (caught by the handler) on any failure.
 *
 * Identity is resolved with a SEPARATE anon-key client bound to the caller's
 * token — never the service-role client — so the identity is the caller's.
 *
 * Exception: server-to-server invocations that present the service-role key
 * itself are treated as trusted internal callers (used by other edge functions).
 */
export async function requireSuperAdmin(req: Request): Promise<Caller> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw jsonError(401, "AUTH_REQUIRED", "Authorization required");
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceRoleKey && token === serviceRoleKey) {
    return { userId: "00000000-0000-0000-0000-000000000000", email: "service_role", isServiceRole: true };
  }

  const authed = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data: { user }, error } = await authed.auth.getUser();
  if (error || !user) {
    throw jsonError(401, "AUTH_INVALID", "Invalid or expired session");
  }

  // Role check via service-role client so RLS cannot hide the row, but keyed
  // to the VERIFIED caller id from the token above.
  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: admin, error: adminErr } = await svc
    .from("admin_users")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminErr) throw jsonError(500, "ROLE_CHECK_FAILED", adminErr.message);
  if (!admin || !admin.is_active || admin.role !== "super_admin") {
    throw jsonError(403, "FORBIDDEN", "super_admin privilege required");
  }

  return { userId: user.id, email: user.email ?? "" };
}

/**
 * Best-effort audit row for privileged admin mutations. Never throws.
 */
export async function auditAdminAction(params: {
  caller: Caller | null;
  action: string;
  targetAdminId?: string | null;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await svc.from("admin_audit_logs").insert({
      admin_id: params.caller && !params.caller.isServiceRole ? params.caller.userId : null,
      target_admin_id: params.targetAdminId ?? null,
      action: params.action,
      details: {
        ...(params.details ?? {}),
        actor_email: params.caller?.email ?? null,
        actor_kind: params.caller?.isServiceRole ? "service_role" : "super_admin",
        at: new Date().toISOString(),
      },
      ip_address: params.ip && params.ip !== "unknown" ? params.ip.split(",")[0].trim() : null,
      user_agent: params.userAgent ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to write admin_audit_logs:", e);
  }
}

/**
 * Blocks demoting/deactivating the last remaining active super_admin.
 * Returns a Response when the operation must be refused, otherwise null.
 */
export async function guardLastSuperAdmin(
  svc: any,
  targetId: string | null | undefined,
  opts: { deactivating?: boolean; newRole?: string | null },
): Promise<Response | null> {
  if (!targetId) return null;

  const { data: target } = await svc
    .from("admin_users")
    .select("id, role, is_active")
    .eq("id", targetId)
    .maybeSingle();

  const losingSuper =
    target?.role === "super_admin" &&
    (opts.deactivating === true || (!!opts.newRole && opts.newRole !== "super_admin"));

  if (!losingSuper) return null;

  const { count } = await svc
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true);

  if ((count ?? 0) <= 1) {
    return jsonError(409, "LAST_SUPER_ADMIN", "Cannot deactivate or demote the only active super_admin");
  }
  return null;
}
