import { model, models, Schema, type ClientSession, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) ?? model<ICounter>("Counter", CounterSchema);

export async function nextSequence(name: string, prefix: string, session?: ClientSession): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session }
  ).lean<ICounter>();
  if (!counter) throw new Error(`Could not allocate ${name} number`);
  return `${prefix}-${String(counter.seq).padStart(6, "0")}`;
}
