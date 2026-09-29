export const ROLES = ["admin", "pharmacist", "cashier"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pharmacist: "Pharmacist",
  cashier: "Cashier",
};

export const ALL_ROLES: readonly Role[] = ROLES;
export const ADMIN_ONLY: readonly Role[] = ["admin"];
export const INVENTORY_ROLES: readonly Role[] = ["admin", "pharmacist"];
export const COUNTER_ROLES: readonly Role[] = ["admin", "cashier"];

export const SESSION_COOKIE = "pms_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function homeForRole(role: Role): string {
  return role === "cashier" ? "/pos" : "/dashboard";
}
