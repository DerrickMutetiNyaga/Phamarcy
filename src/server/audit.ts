import type { ClientSession } from "mongoose";
import { AuditLog, type AuditMeta } from "@/models";
import type { SessionUser } from "./auth";

interface AuditEntry {
  user: Pick<SessionUser, "id" | "name"> | null;
  action: string;
  entity: string;
  entityId?: string;
  meta?: AuditMeta;
  session?: ClientSession;
}

export async function logAudit({ user, action, entity, entityId, meta, session }: AuditEntry): Promise<void> {
  await AuditLog.create(
    [
      {
        user: user?.id ?? null,
        userName: user?.name ?? "",
        action,
        entity,
        entityId: entityId ?? "",
        meta: meta ?? {},
        timestamp: new Date(),
      },
    ],
    session ? { session } : {}
  );
}
