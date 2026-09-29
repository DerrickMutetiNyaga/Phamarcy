import {
  ADMIN_ONLY,
  ALL_ROLES,
  COUNTER_ROLES,
  INVENTORY_ROLES,
  type Role,
} from "./roles";

interface AccessRule {
  match: string | RegExp;
  roles: readonly Role[];
  methods?: readonly string[];
}

const READ = ["GET", "HEAD"] as const;

/** Ordered: the first rule whose path and method match decides access. Unmatched paths are admin-only. */
const PAGE_RULES: AccessRule[] = [
  { match: "/dashboard", roles: INVENTORY_ROLES },
  { match: "/pos", roles: COUNTER_ROLES },
  { match: "/sales", roles: COUNTER_ROLES },
  { match: "/invoice", roles: COUNTER_ROLES },
  { match: "/customers", roles: COUNTER_ROLES },
  { match: "/inventory", roles: INVENTORY_ROLES },
  { match: "/suppliers", roles: INVENTORY_ROLES },
  { match: "/purchases", roles: INVENTORY_ROLES },
  { match: "/prescriptions", roles: INVENTORY_ROLES },
  { match: "/reports", roles: INVENTORY_ROLES },
  { match: "/settings", roles: ADMIN_ONLY },
  { match: "/forbidden", roles: ALL_ROLES },
  { match: /^\/$/, roles: ALL_ROLES },
];

const API_RULES: AccessRule[] = [
  { match: "/api/auth", roles: ALL_ROLES },
  { match: "/api/users", roles: ADMIN_ONLY },
  { match: "/api/audit", roles: ADMIN_ONLY },
  { match: "/api/settings", roles: ALL_ROLES, methods: READ },
  { match: "/api/settings", roles: ADMIN_ONLY },
  { match: "/api/medicines", roles: ALL_ROLES, methods: READ },
  { match: "/api/medicines", roles: INVENTORY_ROLES },
  { match: "/api/categories", roles: ALL_ROLES, methods: READ },
  { match: "/api/categories", roles: INVENTORY_ROLES },
  { match: "/api/batches", roles: INVENTORY_ROLES },
  { match: "/api/uploads", roles: INVENTORY_ROLES },
  { match: "/api/suppliers", roles: INVENTORY_ROLES },
  { match: "/api/purchases", roles: INVENTORY_ROLES },
  { match: "/api/reports", roles: INVENTORY_ROLES },
  { match: "/api/customers", roles: COUNTER_ROLES },
  { match: /^\/api\/sales\/[^/]+\/refund$/, roles: ADMIN_ONLY },
  { match: "/api/sales", roles: COUNTER_ROLES },
  { match: "/api/prescriptions", roles: ALL_ROLES, methods: ["GET", "HEAD", "POST"] },
  { match: "/api/prescriptions", roles: INVENTORY_ROLES },
];

function pathMatches(rule: AccessRule, pathname: string): boolean {
  if (typeof rule.match === "string") {
    return pathname === rule.match || pathname.startsWith(`${rule.match}/`);
  }
  return rule.match.test(pathname);
}

function findRule(rules: AccessRule[], pathname: string, method: string): AccessRule | undefined {
  const upper = method.toUpperCase();
  return rules.find((rule) => pathMatches(rule, pathname) && (!rule.methods || rule.methods.includes(upper)));
}

export function canAccessPage(role: Role, pathname: string): boolean {
  const rule = findRule(PAGE_RULES, pathname, "GET");
  return (rule?.roles ?? ADMIN_ONLY).includes(role);
}

export function canAccessApi(role: Role, pathname: string, method: string): boolean {
  const rule = findRule(API_RULES, pathname, method);
  return (rule?.roles ?? ADMIN_ONLY).includes(role);
}

export const PUBLIC_PATHS = ["/login", "/logout", "/api/auth/login"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
