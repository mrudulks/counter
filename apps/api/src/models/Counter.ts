import { Schema, model } from 'mongoose';

// Per-restaurant sequence used for human-friendly order numbers
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);

export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc!.seq;
}
