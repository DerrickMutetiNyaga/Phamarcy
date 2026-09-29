import { model, models, Schema, type Model, type Types } from "mongoose";
import { DEFAULT_CURRENCY } from "@/lib/format";

export const SETTINGS_KEY = "singleton";

export interface ISetting {
  _id: Types.ObjectId;
  key: string;
  pharmacyName: string;
  address: string;
  phone: string;
  taxNumber: string;
  receiptFooter: string;
  currencySymbol: string;
  lowStockDefault: number;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, default: SETTINGS_KEY },
    pharmacyName: { type: String, required: true, default: "My Pharmacy" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    taxNumber: { type: String, default: "" },
    receiptFooter: { type: String, default: "Thank you. Medicines once sold are returnable only with the original invoice." },
    currencySymbol: { type: String, required: true, default: DEFAULT_CURRENCY },
    lowStockDefault: { type: Number, required: true, min: 0, default: 10 },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> =
  (models.Setting as Model<ISetting>) ?? model<ISetting>("Setting", SettingSchema);
