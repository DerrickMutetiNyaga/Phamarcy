import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/serialize";
import { AuditLog, type IAuditLog } from "@/models";
import { dateMatch, PAGE_SIZE, skipFor, type DateRange, type Paginated } from "../query";

export const AUDIT_ENTITIES = [
  "sale",
  "purchase",
  "medicine",
  "batch",
  "customer",
  "supplier",
  "category",
  "prescription",
  "user",
  "settings",
] as const;

export interface AuditRow {
  _id: string;
  timestamp: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface AuditFilters {
  q?: string;
  entity?: string;
  range?: DateRange;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(filters: AuditFilters): Promise<Paginated<AuditRow>> {
  await connectDB();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const match: Record<string, unknown> = {};
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    match.$or = [{ userName: rx }, { action: rx }, { entityId: rx }];
  }
  if (filters.entity && (AUDIT_ENTITIES as readonly string[]).includes(filters.entity)) match.entity = filters.entity;
  const ts = filters.range ? dateMatch(filters.range) : undefined;
  if (ts) match.timestamp = ts;

  const [docs, total] = await Promise.all([
    AuditLog.find(match).sort({ timestamp: -1 }).skip(skipFor(page, pageSize)).limit(pageSize).lean<IAuditLog[]>(),
    AuditLog.countDocuments(match),
  ]);

  return {
    rows: docs.map((d) => ({
      _id: String(d._id),
      timestamp: d.timestamp.toISOString(),
      userName: d.userName,
      action: d.action,
      entity: d.entity,
      entityId: d.entityId ?? "",
      details: Object.entries(d.meta ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    })),
    total,
    page,
    pageSize,
  };
}
