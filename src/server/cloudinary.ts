import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { getCloudinaryEnv } from "@/lib/env";
import { validateImageFile } from "@/lib/validators/prescription";
import { ApiError } from "./http";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const env = getCloudinaryEnv();
  if (!env) {
    throw new ApiError(
      503,
      "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env."
    );
  }
  cloudinary.config({ cloud_name: env.cloudName, api_key: env.apiKey, api_secret: env.apiSecret, secure: true });
  configured = true;
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

export async function uploadImageFile(file: File, folder: "medicines" | "prescriptions"): Promise<UploadedImage> {
  const problem = validateImageFile(file);
  if (problem) throw new ApiError(400, problem);
  ensureConfigured();

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `pharmacy/${folder}`, resource_type: "image", overwrite: false },
      (error, response) => {
        if (error || !response) reject(error ?? new Error("Upload failed"));
        else resolve(response);
      }
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string | undefined | null): Promise<void> {
  if (!publicId) return;
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("[cloudinary] Failed to delete image", publicId, error);
  }
}