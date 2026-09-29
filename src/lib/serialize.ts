import type { Types } from "mongoose";

export type Serialized<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

/** Converts lean Mongoose documents into plain JSON-safe objects for client components. */
export function serialize<T>(value: T): Serialized<T> {
  return JSON.parse(JSON.stringify(value)) as Serialized<T>;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
