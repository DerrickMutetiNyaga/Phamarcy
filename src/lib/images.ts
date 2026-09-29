/** Builds a resized Cloudinary delivery URL for thumbnails without an extra upload. */
export function thumbnailUrl(url: string, size = 96): string {
  return url.includes("/upload/") ? url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`) : url;
}
