import { cache } from "react";
import { connectDB } from "@/lib/db";
import { SETTINGS_KEY, Setting, type ISetting } from "@/models";

export interface SettingsDTO {
  pharmacyName: string;
  address: string;
  phone: string;
  taxNumber: string;
  receiptFooter: string;
  currencySymbol: string;
  lowStockDefault: number;
}

function toDTO(doc: ISetting): SettingsDTO {
  return {
    pharmacyName: doc.pharmacyName,
    address: doc.address,
    phone: doc.phone,
    taxNumber: doc.taxNumber,
    receiptFooter: doc.receiptFooter,
    currencySymbol: doc.currencySymbol,
    lowStockDefault: doc.lowStockDefault,
  };
}

export async function loadSettings(): Promise<SettingsDTO> {
  await connectDB();
  const doc = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean<ISetting>();
  if (!doc) throw new Error("Settings document could not be loaded");
  return toDTO(doc);
}

export const getSettings = cache(loadSettings);

export async function saveSettings(data: SettingsDTO): Promise<SettingsDTO> {
  await connectDB();
  const doc = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: data },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  ).lean<ISetting>();
  if (!doc) throw new Error("Settings could not be saved");
  return toDTO(doc);
}
