import { model, models, Schema, type Model, type Types } from "mongoose";

export type AuditMeta = Record<string, string | number | boolean | null>;

export interface IAuditLog {
  _id: Types.ObjectId;
  user?: Types.ObjectId | null;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  meta: AuditMeta;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  userName: { type: String, default: "" },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: "" },
  meta: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ user: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ?? model<IAuditLog>("AuditLog", AuditLogSchema);
