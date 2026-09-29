const REQUIRED_SERVER_ENV = ["MONGODB_URI", "JWT_SECRET"] as const;

export function getMissingServerEnv(): string[] {
  return REQUIRED_SERVER_ENV.filter((key) => !process.env[key]?.trim());
}

export function missingEnvMessage(keys: string[]): string {
  return `Missing required environment variable(s): ${keys.join(", ")}. Fill them in the .env file at the project root (see .env.example), then start again.`;
}

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error(missingEnvMessage(["MONGODB_URI"]));
  return uri;
}

let cachedSecret: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error(missingEnvMessage(["JWT_SECRET"]));
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export function getCloudinaryEnv(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export const isProduction = process.env.NODE_ENV === "production";
