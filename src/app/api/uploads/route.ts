import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { uploadImageFile } from "@/server/cloudinary";
import { apiRoute, ApiError, ok } from "@/server/http";

export const POST = apiRoute(INVENTORY_ROLES, async ({ req }) => {
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Upload must be sent as multipart form data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image to upload");
  const image = await uploadImageFile(file, "medicines");
  return ok(image, 201);
});
