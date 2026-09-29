import { Types } from "mongoose";
import type { z } from "zod";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/serialize";
import type {
  prescriptionCreateSchema,
  prescriptionReviewSchema,
  PrescriptionStatus,
} from "@/lib/validators/prescription";
import { Prescription, Sale, User, type IPrescription } from "@/models";
import { logAudit } from "../audit";
import type { SessionUser } from "../auth";
import { deleteImage, uploadImageFile } from "../cloudinary";
import { ApiError } from "../http";
import { dateMatch, PAGE_SIZE, skipFor, type DateRange, type Paginated } from "../query";

export interface PrescriptionRow {
  _id: string;
  customerName: string;
  phone: string;
  imageUrl: string;
  notes: string;
  status: PrescriptionStatus;
  reviewNote: string;
  reviewedByName: string;
  reviewedAt: string | null;
  uploadedByName: string;
  createdAt: string;
}

export interface PrescriptionFilters {
  q?: string;
  status?: PrescriptionStatus | "";
  range?: DateRange;
  page?: number;
  pageSize?: number;
}

export async function listPrescriptions(filters: PrescriptionFilters): Promise<Paginated<PrescriptionRow>> {
  await connectDB();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const match: Record<string, unknown> = {};
  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    match.$or = [{ customerName: rx }, { phone: rx }];
  }
  if (filters.status) match.status = filters.status;
  const created = filters.range ? dateMatch(filters.range) : undefined;
  if (created) match.createdAt = created;

  const [result] = await Prescription.aggregate<{ rows: PrescriptionRow[]; total: { n: number }[] }>([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        rows: [
          { $skip: skipFor(page, pageSize) },
          { $limit: pageSize },
          { $lookup: { from: User.collection.name, localField: "reviewedBy", foreignField: "_id", as: "reviewer" } },
          { $lookup: { from: User.collection.name, localField: "uploadedBy", foreignField: "_id", as: "uploader" } },
          {
            $project: {
              _id: { $toString: "$_id" },
              customerName: 1,
              phone: 1,
              imageUrl: 1,
              notes: { $ifNull: ["$notes", ""] },
              status: 1,
              reviewNote: { $ifNull: ["$reviewNote", ""] },
              reviewedByName: { $ifNull: [{ $first: "$reviewer.name" }, ""] },
              reviewedAt: { $cond: [{ $ifNull: ["$reviewedAt", false] }, { $dateToString: { date: "$reviewedAt" } }, null] },
              uploadedByName: { $ifNull: [{ $first: "$uploader.name" }, ""] },
              createdAt: { $dateToString: { date: "$createdAt" } },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0, page, pageSize };
}

export async function countPendingPrescriptions(): Promise<number> {
  await connectDB();
  return Prescription.countDocuments({ status: "pending" });
}

export async function createPrescription(
  data: z.output<typeof prescriptionCreateSchema>,
  file: File,
  user: SessionUser
): Promise<string> {
  await connectDB();
  const image = await uploadImageFile(file, "prescriptions");
  try {
    const doc = await Prescription.create({
      ...data,
      imageUrl: image.url,
      imagePublicId: image.publicId,
      status: "pending",
      uploadedBy: user.id,
    });
    await logAudit({ user, action: "create", entity: "prescription", entityId: String(doc._id), meta: { customerName: data.customerName } });
    return String(doc._id);
  } catch (error) {
    await deleteImage(image.publicId);
    throw error;
  }
}

export async function reviewPrescription(
  id: string,
  data: z.output<typeof prescriptionReviewSchema>,
  user: SessionUser
): Promise<void> {
  await connectDB();
  const prescription = await Prescription.findById(id).lean<IPrescription>();
  if (!prescription) throw new ApiError(404, "Prescription not found.");
  if (prescription.status === "verified" && data.status === "rejected" && (await Sale.exists({ prescription: prescription._id }))) {
    throw new ApiError(409, "This prescription is attached to a sale and cannot be rejected.");
  }
  await Prescription.updateOne(
    { _id: prescription._id },
    { $set: { status: data.status, reviewNote: data.reviewNote, reviewedBy: new Types.ObjectId(user.id), reviewedAt: new Date() } }
  );
  await logAudit({ user, action: data.status === "verified" ? "verify" : "reject", entity: "prescription", entityId: id, meta: { note: data.reviewNote } });
}

export async function deletePrescription(id: string, user: SessionUser): Promise<void> {
  await connectDB();
  const prescription = await Prescription.findById(id).lean<IPrescription>();
  if (!prescription) throw new ApiError(404, "Prescription not found.");
  if (await Sale.exists({ prescription: prescription._id })) {
    throw new ApiError(409, "This prescription is attached to a sale and must be kept on record.");
  }
  await Prescription.deleteOne({ _id: prescription._id });
  await deleteImage(prescription.imagePublicId);
  await logAudit({ user, action: "delete", entity: "prescription", entityId: id, meta: { customerName: prescription.customerName } });
}
