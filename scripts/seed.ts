import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import mongoose, { Types } from "mongoose";
import { getCloudinaryEnv, missingEnvMessage } from "../src/lib/env";
import { DEFAULT_CURRENCY, round2 } from "../src/lib/format";
import { priceCart, splitAmount } from "../src/lib/pricing";
import { paymentStatusFor } from "../src/lib/validators/purchase";
import type { PaymentMethod } from "../src/lib/validators/sale";
import type { MedicineUnit } from "../src/lib/validators/medicine";
import {
  AuditLog,
  Batch,
  Category,
  Counter,
  Customer,
  Medicine,
  Prescription,
  Purchase,
  Sale,
  Setting,
  SETTINGS_KEY,
  Supplier,
  User,
  type ISaleItem,
} from "../src/models";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return new Date(d.getTime() - days * DAY);
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * DAY);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const USERS = [
  { key: "admin", name: "Daniel Brooks", email: "admin@pharmacy.com", password: "Admin@123", role: "admin" },
  { key: "pharmacist", name: "Sarah Mitchell", email: "pharmacist@pharmacy.com", password: "Pharma@123", role: "pharmacist" },
  { key: "cashier", name: "James Carter", email: "cashier@pharmacy.com", password: "Cashier@123", role: "cashier" },
] as const;
type UserKey = (typeof USERS)[number]["key"];

const CATEGORIES = [
  { key: "otc", name: "Pain Relief & OTC", description: "Analgesics, antipyretics, cold, allergy and digestive care." },
  { key: "anti", name: "Antibiotics", description: "Prescription-only anti-infectives." },
  { key: "chronic", name: "Chronic Care", description: "Diabetes, cardiovascular and cholesterol medication." },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

const SUPPLIERS = [
  { key: "medline", name: "MedLine Distributors", phone: "+15550142201", email: "orders@medline-dist.com", address: "44 Harbor Road, Unit 5, Springfield" },
  { key: "healthbridge", name: "HealthBridge Pharma Supply", phone: "+15550178834", email: "sales@healthbridge.com", address: "210 Commerce Park, Riverside" },
  { key: "apex", name: "Apex Wholesale Drugs", phone: "+15550199120", email: "accounts@apexwholesale.com", address: "9 Industrial Estate, North Hill" },
] as const;
type SupplierKey = (typeof SUPPLIERS)[number]["key"];

interface MedicineSeed {
  key: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  category: CategoryKey;
  unit: MedicineUnit;
  strength: string;
  barcode: string;
  salePrice: number;
  purchasePrice: number;
  taxPercent: number;
  prescriptionRequired: boolean;
  reorderLevel: number;
}

const MEDICINES: MedicineSeed[] = [
  { key: "panadol", name: "Panadol", genericName: "Paracetamol", brand: "Panadol", manufacturer: "GSK", category: "otc", unit: "strip", strength: "500mg", barcode: "8901030865278", salePrice: 60, purchasePrice: 40, taxPercent: 5, prescriptionRequired: false, reorderLevel: 30 },
  { key: "brufen", name: "Brufen", genericName: "Ibuprofen", brand: "Brufen", manufacturer: "Abbott", category: "otc", unit: "strip", strength: "400mg", barcode: "8901043002141", salePrice: 80, purchasePrice: 52, taxPercent: 5, prescriptionRequired: false, reorderLevel: 20 },
  { key: "zyrtec", name: "Zyrtec", genericName: "Cetirizine Hydrochloride", brand: "Zyrtec", manufacturer: "UCB", category: "otc", unit: "strip", strength: "10mg", barcode: "8901117081034", salePrice: 150, purchasePrice: 95, taxPercent: 5, prescriptionRequired: false, reorderLevel: 15 },
  { key: "benadryl", name: "Benadryl Cough Syrup", genericName: "Diphenhydramine", brand: "Benadryl", manufacturer: "Johnson & Johnson", category: "otc", unit: "syrup", strength: "100ml", barcode: "8901012116381", salePrice: 450, purchasePrice: 310, taxPercent: 12, prescriptionRequired: false, reorderLevel: 10 },
  { key: "gaviscon", name: "Gaviscon Liquid", genericName: "Sodium Alginate + Sodium Bicarbonate", brand: "Gaviscon", manufacturer: "Reckitt", category: "otc", unit: "bottle", strength: "200ml", barcode: "5000158062375", salePrice: 850, purchasePrice: 600, taxPercent: 12, prescriptionRequired: false, reorderLevel: 8 },
  { key: "celin", name: "Celin Vitamin C", genericName: "Ascorbic Acid", brand: "Celin", manufacturer: "GSK", category: "otc", unit: "tablet", strength: "500mg", barcode: "8901030501237", salePrice: 5, purchasePrice: 2.5, taxPercent: 5, prescriptionRequired: false, reorderLevel: 100 },
  { key: "amoxil", name: "Amoxil", genericName: "Amoxicillin", brand: "Amoxil", manufacturer: "GSK", category: "anti", unit: "strip", strength: "500mg", barcode: "8901030701149", salePrice: 250, purchasePrice: 160, taxPercent: 5, prescriptionRequired: true, reorderLevel: 15 },
  { key: "augmentin", name: "Augmentin", genericName: "Amoxicillin + Clavulanic Acid", brand: "Augmentin", manufacturer: "GSK", category: "anti", unit: "strip", strength: "625mg", barcode: "8901030702337", salePrice: 1200, purchasePrice: 850, taxPercent: 5, prescriptionRequired: true, reorderLevel: 10 },
  { key: "azithral", name: "Azithral", genericName: "Azithromycin", brand: "Azithral", manufacturer: "Alembic", category: "anti", unit: "strip", strength: "500mg", barcode: "8901296001243", salePrice: 450, purchasePrice: 290, taxPercent: 5, prescriptionRequired: true, reorderLevel: 10 },
  { key: "ciprobid", name: "Ciprobid", genericName: "Ciprofloxacin", brand: "Ciprobid", manufacturer: "Zydus", category: "anti", unit: "strip", strength: "500mg", barcode: "8901043120159", salePrice: 300, purchasePrice: 190, taxPercent: 5, prescriptionRequired: true, reorderLevel: 10 },
  { key: "glucophage", name: "Glucophage", genericName: "Metformin Hydrochloride", brand: "Glucophage", manufacturer: "Merck", category: "chronic", unit: "strip", strength: "500mg", barcode: "8901148200416", salePrice: 120, purchasePrice: 75, taxPercent: 5, prescriptionRequired: true, reorderLevel: 25 },
  { key: "lipitor", name: "Lipitor", genericName: "Atorvastatin", brand: "Lipitor", manufacturer: "Pfizer", category: "chronic", unit: "strip", strength: "10mg", barcode: "8901117200305", salePrice: 950, purchasePrice: 650, taxPercent: 5, prescriptionRequired: true, reorderLevel: 12 },
  { key: "norvasc", name: "Norvasc", genericName: "Amlodipine", brand: "Norvasc", manufacturer: "Pfizer", category: "chronic", unit: "strip", strength: "5mg", barcode: "8901117200503", salePrice: 350, purchasePrice: 220, taxPercent: 5, prescriptionRequired: true, reorderLevel: 15 },
  { key: "cozaar", name: "Cozaar", genericName: "Losartan Potassium", brand: "Cozaar", manufacturer: "Organon", category: "chronic", unit: "strip", strength: "50mg", barcode: "8901148300512", salePrice: 550, purchasePrice: 370, taxPercent: 5, prescriptionRequired: true, reorderLevel: 12 },
];

const CUSTOMERS = [
  { key: "emily", name: "Emily Johnson", phone: "+15550123456", email: "emily.johnson@example.com", address: "18 Oak Avenue, Springfield" },
  { key: "robert", name: "Robert Wilson", phone: "+15550198765", email: "", address: "7 Pine Street, Springfield" },
  { key: "maria", name: "Maria Garcia", phone: "+15550134567", email: "maria.g@example.com", address: "" },
  { key: "ahmed", name: "Ahmed Khan", phone: "+15550145678", email: "", address: "52 Lake View Road, Riverside" },
  { key: "linda", name: "Linda Thompson", phone: "+15550156789", email: "linda.t@example.com", address: "3 Elm Court, North Hill" },
] as const;
type CustomerKey = (typeof CUSTOMERS)[number]["key"];

interface PurchaseSeed {
  supplier: SupplierKey;
  supplierInvoiceNo: string;
  daysAgo: number;
  paid: "full" | "half" | "none";
  items: { medicine: string; batchNo: string; expiresIn: number; quantity: number; unitCost?: number }[];
}

// expiresIn is days from today; negative means already expired.
const PURCHASES: PurchaseSeed[] = [
  {
    supplier: "medline",
    supplierInvoiceNo: "ML-88213",
    daysAgo: 150,
    paid: "full",
    items: [
      { medicine: "zyrtec", batchNo: "ZY2301", expiresIn: -12, quantity: 20 },
      { medicine: "panadol", batchNo: "PN2402", expiresIn: 21, quantity: 60 },
      { medicine: "celin", batchNo: "CL2311", expiresIn: 75, quantity: 300 },
    ],
  },
  {
    supplier: "healthbridge",
    supplierInvoiceNo: "HB/2026/4471",
    daysAgo: 60,
    paid: "full",
    items: [
      { medicine: "amoxil", batchNo: "AMX5521", expiresIn: 26, quantity: 30 },
      { medicine: "augmentin", batchNo: "AUG7710", expiresIn: 320, quantity: 25 },
      { medicine: "azithral", batchNo: "AZ3319", expiresIn: 410, quantity: 12 },
      { medicine: "ciprobid", batchNo: "CPB1180", expiresIn: 55, quantity: 20 },
    ],
  },
  {
    supplier: "apex",
    supplierInvoiceNo: "APX-10392",
    daysAgo: 35,
    paid: "half",
    items: [
      { medicine: "glucophage", batchNo: "GLU4402", expiresIn: 540, quantity: 80 },
      { medicine: "lipitor", batchNo: "LIP2209", expiresIn: 480, quantity: 14 },
      { medicine: "norvasc", batchNo: "NRV6603", expiresIn: 85, quantity: 40 },
      { medicine: "cozaar", batchNo: "CZR1147", expiresIn: 600, quantity: 30 },
    ],
  },
  {
    supplier: "medline",
    supplierInvoiceNo: "ML-89120",
    daysAgo: 20,
    paid: "full",
    items: [
      { medicine: "panadol", batchNo: "PN2508", expiresIn: 610, quantity: 120 },
      { medicine: "brufen", batchNo: "BRF0925", expiresIn: 45, quantity: 40 },
      { medicine: "zyrtec", batchNo: "ZY2507", expiresIn: 500, quantity: 50 },
      { medicine: "benadryl", batchNo: "BND3304", expiresIn: 280, quantity: 24 },
      { medicine: "gaviscon", batchNo: "GVS1902", expiresIn: 365, quantity: 7 },
    ],
  },
  {
    supplier: "healthbridge",
    supplierInvoiceNo: "HB/2026/4630",
    daysAgo: 6,
    paid: "none",
    items: [
      { medicine: "amoxil", batchNo: "AMX5608", expiresIn: 700, quantity: 40 },
      { medicine: "brufen", batchNo: "BRF1011", expiresIn: 720, quantity: 60, unitCost: 50 },
    ],
  },
];

interface SaleSeed {
  daysAgo: number;
  hour: number;
  minute: number;
  customer: CustomerKey | null;
  soldBy: UserKey;
  paymentMethod: PaymentMethod;
  billDiscount?: number;
  prescription?: number;
  items: { medicine: string; quantity: number; discount?: number }[];
  refund?: string;
}

const SALES: SaleSeed[] = [
  { daysAgo: 13, hour: 9, minute: 42, customer: "emily", soldBy: "cashier", paymentMethod: "cash", items: [{ medicine: "panadol", quantity: 3 }, { medicine: "zyrtec", quantity: 2 }] },
  { daysAgo: 11, hour: 17, minute: 5, customer: null, soldBy: "cashier", paymentMethod: "card", items: [{ medicine: "benadryl", quantity: 1 }, { medicine: "celin", quantity: 20 }] },
  { daysAgo: 10, hour: 11, minute: 30, customer: "robert", soldBy: "admin", paymentMethod: "upi", prescription: 0, items: [{ medicine: "glucophage", quantity: 6 }, { medicine: "norvasc", quantity: 3 }] },
  { daysAgo: 8, hour: 14, minute: 12, customer: "maria", soldBy: "cashier", paymentMethod: "cash", prescription: 1, items: [{ medicine: "augmentin", quantity: 2 }, { medicine: "brufen", quantity: 2, discount: 10 }] },
  { daysAgo: 7, hour: 10, minute: 8, customer: null, soldBy: "cashier", paymentMethod: "cash", items: [{ medicine: "panadol", quantity: 2 }, { medicine: "gaviscon", quantity: 1 }] },
  { daysAgo: 5, hour: 18, minute: 44, customer: "ahmed", soldBy: "cashier", paymentMethod: "card", billDiscount: 100, prescription: 2, items: [{ medicine: "lipitor", quantity: 4 }, { medicine: "cozaar", quantity: 3 }] },
  { daysAgo: 4, hour: 12, minute: 20, customer: "emily", soldBy: "cashier", paymentMethod: "upi", items: [{ medicine: "brufen", quantity: 3 }, { medicine: "celin", quantity: 30 }], refund: "Customer returned unopened packs; wrong strength bought." },
  { daysAgo: 3, hour: 9, minute: 55, customer: "linda", soldBy: "admin", paymentMethod: "card", prescription: 3, items: [{ medicine: "azithral", quantity: 3 }, { medicine: "amoxil", quantity: 2 }] },
  { daysAgo: 2, hour: 16, minute: 32, customer: null, soldBy: "cashier", paymentMethod: "cash", items: [{ medicine: "panadol", quantity: 4 }, { medicine: "zyrtec", quantity: 3 }, { medicine: "benadryl", quantity: 2, discount: 50 }] },
  { daysAgo: 1, hour: 11, minute: 15, customer: "robert", soldBy: "cashier", paymentMethod: "cash", prescription: 0, items: [{ medicine: "glucophage", quantity: 6 }, { medicine: "lipitor", quantity: 2 }] },
  { daysAgo: 0, hour: 9, minute: 20, customer: "maria", soldBy: "cashier", paymentMethod: "upi", items: [{ medicine: "gaviscon", quantity: 2 }, { medicine: "brufen", quantity: 1 }] },
];

interface PrescriptionSeed {
  customer: CustomerKey;
  doctor: string;
  lines: string[];
  daysAgo: number;
  status: "verified" | "pending" | "rejected";
  reviewNote?: string;
}

// Indexes 0-3 are referenced by SALES.prescription.
const PRESCRIPTIONS: PrescriptionSeed[] = [
  { customer: "robert", doctor: "Dr. Alan Pierce", lines: ["Metformin 500mg - 1 tab twice daily", "Amlodipine 5mg - 1 tab daily"], daysAgo: 11, status: "verified" },
  { customer: "maria", doctor: "Dr. Priya Nair", lines: ["Amoxicillin + Clavulanic Acid 625mg - 1 tab thrice daily x 5 days", "Ibuprofen 400mg - SOS"], daysAgo: 8, status: "verified" },
  { customer: "ahmed", doctor: "Dr. Helen Ford", lines: ["Atorvastatin 10mg - 1 tab at night", "Losartan 50mg - 1 tab daily"], daysAgo: 6, status: "verified" },
  { customer: "linda", doctor: "Dr. Priya Nair", lines: ["Azithromycin 500mg - 1 tab daily x 3 days", "Amoxicillin 500mg - 1 cap thrice daily"], daysAgo: 3, status: "verified" },
  { customer: "emily", doctor: "Dr. Alan Pierce", lines: ["Ciprofloxacin 500mg - 1 tab twice daily x 7 days"], daysAgo: 0, status: "pending" },
  { customer: "ahmed", doctor: "Unknown", lines: ["Illegible - no doctor signature or date"], daysAgo: 2, status: "rejected", reviewNote: "No prescriber signature or date. Ask the patient for a valid prescription." },
];

// ---------------------------------------------------------------------------

function prescriptionSvg(p: PrescriptionSeed, patient: string, date: Date): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = p.lines
    .map((l, i) => `<text x="60" y="${330 + i * 44}" font-size="22" fill="#1f2937">${escape(`${i + 1}. ${l}`)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
<rect width="800" height="1000" fill="#fffef8"/>
<text x="60" y="90" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#111827">${escape(p.doctor)}</text>
<text x="60" y="125" font-family="Arial" font-size="18" fill="#4b5563">General Physician - Reg. No. MC-${40000 + p.lines.join("").length}</text>
<line x1="60" y1="150" x2="740" y2="150" stroke="#9ca3af" stroke-width="2"/>
<text x="60" y="200" font-family="Arial" font-size="20" fill="#111827">Patient: ${escape(patient)}</text>
<text x="520" y="200" font-family="Arial" font-size="20" fill="#111827">Date: ${date.toISOString().slice(0, 10)}</text>
<text x="60" y="275" font-family="Georgia, serif" font-size="56" font-style="italic" fill="#111827">Rx</text>
<g font-family="Arial">${lines}</g>
<line x1="480" y1="880" x2="740" y2="880" stroke="#6b7280" stroke-width="1.5"/>
<text x="540" y="910" font-family="Arial" font-size="16" fill="#6b7280">Signature</text>
</svg>`;
}

async function uploadPrescriptionImage(svg: string, index: number): Promise<{ url: string; publicId: string }> {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: "pharmacy/prescriptions",
    public_id: `seed-rx-${index + 1}`,
    overwrite: true,
    format: "png",
    resource_type: "image",
  });
  return { url: res.secure_url, publicId: res.public_id };
}

interface BatchState {
  _id: Types.ObjectId;
  medicine: Types.ObjectId;
  medicineKey: string;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
  purchasePrice: number;
  supplier: Types.ObjectId;
  createdAt: Date;
}

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  if (!process.env.MONGODB_URI?.trim()) {
    console.error(`\n${missingEnvMessage(["MONGODB_URI"])}\n`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("\nRefusing to seed with NODE_ENV=production because seeding erases all data. Re-run with --force to override.\n");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI.trim(), { serverSelectionTimeoutMS: 10_000 });
  console.log(`Connected to ${mongoose.connection.name}. Clearing existing data...`);

  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name);
    await model.deleteMany({});
    await model.syncIndexes();
  }

  await Setting.create({
    key: SETTINGS_KEY,
    pharmacyName: "City Care Pharmacy",
    address: "12 Market Street, Springfield",
    phone: "+1 555 0100",
    taxNumber: "TX-4589-221",
    receiptFooter: "Medicines are returnable only with this invoice within 7 days, unopened.\nThank you and get well soon.",
    currencySymbol: DEFAULT_CURRENCY,
    lowStockDefault: 10,
  });

  const users = {} as Record<UserKey, Types.ObjectId>;
  for (const u of USERS) {
    const doc = await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await bcrypt.hash(u.password, 12),
      isActive: true,
      createdAt: daysAgo(180),
    });
    users[u.key] = doc._id;
  }

  const categories = {} as Record<CategoryKey, Types.ObjectId>;
  for (const c of CATEGORIES) categories[c.key] = (await Category.create({ name: c.name, description: c.description }))._id;

  const suppliers = {} as Record<SupplierKey, Types.ObjectId>;
  for (const s of SUPPLIERS) {
    const { key, ...data } = s;
    suppliers[key] = (await Supplier.create({ ...data, createdAt: daysAgo(170) }))._id;
  }

  const customers = {} as Record<CustomerKey, { _id: Types.ObjectId; name: string; phone: string }>;
  for (const c of CUSTOMERS) {
    const { key, ...data } = c;
    const doc = await Customer.create({ ...data, createdAt: daysAgo(30) });
    customers[key] = { _id: doc._id, name: doc.name, phone: doc.phone };
  }

  const medicines = new Map<string, MedicineSeed & { _id: Types.ObjectId }>();
  for (const m of MEDICINES) {
    const { key, category, ...data } = m;
    const doc = await Medicine.create({ ...data, category: categories[category], isActive: true, createdAt: daysAgo(160) });
    medicines.set(key, { ...m, _id: doc._id });
  }
  const med = (key: string) => {
    const m = medicines.get(key);
    if (!m) throw new Error(`Unknown medicine key ${key}`);
    return m;
  };

  // Purchases create the batches. Quantities are then reduced by the seeded sales below.
  const batches: BatchState[] = [];
  let purchaseSeq = 0;
  for (const p of [...PURCHASES].sort((a, b) => b.daysAgo - a.daysAgo)) {
    const date = daysAgo(p.daysAgo, 11);
    const items = p.items.map((item) => {
      const m = med(item.medicine);
      const unitCost = item.unitCost ?? m.purchasePrice;
      const batch: BatchState = {
        _id: new Types.ObjectId(),
        medicine: m._id,
        medicineKey: item.medicine,
        batchNo: item.batchNo,
        expiryDate: daysFromNow(item.expiresIn),
        quantity: item.quantity,
        purchasePrice: unitCost,
        supplier: suppliers[p.supplier],
        createdAt: date,
      };
      batches.push(batch);
      return {
        medicine: m._id,
        name: [m.name, m.strength].filter(Boolean).join(" "),
        batch: batch._id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        quantity: item.quantity,
        unitCost,
        lineTotal: round2(item.quantity * unitCost),
      };
    });
    const total = round2(items.reduce((s, i) => s + i.lineTotal, 0));
    const amountPaid = p.paid === "full" ? total : p.paid === "half" ? round2(total / 2) : 0;
    purchaseSeq += 1;
    await Purchase.create({
      purchaseNo: `PO-${String(purchaseSeq).padStart(6, "0")}`,
      supplier: suppliers[p.supplier],
      supplierInvoiceNo: p.supplierInvoiceNo,
      date,
      items,
      total,
      amountPaid,
      paymentStatus: paymentStatusFor(total, amountPaid),
      payments: amountPaid > 0 ? [{ amount: amountPaid, date, note: p.paid === "full" ? "Paid on delivery" : "Advance payment", user: users.pharmacist }] : [],
      notes: "",
      createdBy: users.pharmacist,
      createdAt: date,
    });
    for (const item of p.items) {
      await Medicine.updateOne({ _id: med(item.medicine)._id }, { $set: { purchasePrice: item.unitCost ?? med(item.medicine).purchasePrice } });
    }
  }

  // Prescriptions need real images, so they are only created when Cloudinary is configured.
  const prescriptionIds: (Types.ObjectId | null)[] = PRESCRIPTIONS.map(() => null);
  const cloud = getCloudinaryEnv();
  if (cloud) {
    cloudinary.config({ cloud_name: cloud.cloudName, api_key: cloud.apiKey, api_secret: cloud.apiSecret, secure: true });
    console.log("Uploading sample prescription images to Cloudinary...");
    for (const [i, p] of PRESCRIPTIONS.entries()) {
      const customer = customers[p.customer];
      const createdAt = daysAgo(p.daysAgo, 9);
      const image = await uploadPrescriptionImage(prescriptionSvg(p, customer.name, createdAt), i);
      const reviewed = p.status !== "pending";
      const doc = await Prescription.create({
        customerName: customer.name,
        phone: customer.phone,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        notes: p.doctor,
        status: p.status,
        reviewNote: p.reviewNote ?? (p.status === "verified" ? "Checked prescriber and dosage." : ""),
        reviewedBy: reviewed ? users.pharmacist : null,
        reviewedAt: reviewed ? new Date(createdAt.getTime() + 20 * 60 * 1000) : null,
        uploadedBy: users.cashier,
        createdAt,
      });
      prescriptionIds[i] = doc._id;
    }
  } else {
    console.log("Cloudinary is not configured: skipping sample prescriptions and prescription-only items in seeded sales.");
  }

  let invoiceSeq = 0;
  for (const s of SALES) {
    const createdAt = daysAgo(s.daysAgo, s.hour, s.minute);
    const prescription = s.prescription !== undefined ? prescriptionIds[s.prescription] : null;
    const lines = s.items
      .map((i) => ({ ...i, medicine: med(i.medicine), key: i.medicine }))
      .filter((l) => !l.medicine.prescriptionRequired || prescription);
    if (lines.length === 0) continue;

    const priced = priceCart(
      lines.map((l) => ({ unitPrice: l.medicine.salePrice, quantity: l.quantity, discount: l.discount ?? 0, taxPercent: l.medicine.taxPercent })),
      s.billDiscount ?? 0
    );

    const items: ISaleItem[] = [];
    lines.forEach((line, index) => {
      const p = priced.lines[index];
      const available = batches
        .filter((b) => b.medicineKey === line.key && b.quantity > 0 && b.expiryDate > createdAt && b.createdAt <= createdAt)
        .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
      let remaining = line.quantity;
      const allocations: { batch: BatchState; quantity: number }[] = [];
      for (const b of available) {
        if (remaining === 0) break;
        const take = Math.min(b.quantity, remaining);
        allocations.push({ batch: b, quantity: take });
        remaining -= take;
      }
      if (remaining > 0) throw new Error(`Seed data error: not enough stock of ${line.key} for sale on ${createdAt.toDateString()}`);
      if (!s.refund) for (const a of allocations) a.batch.quantity -= a.quantity;

      const weights = allocations.map((a) => a.quantity);
      const discounts = splitAmount(round2(p.discount + p.billDiscountShare), weights);
      const taxes = splitAmount(p.tax, weights);
      const totals = splitAmount(p.total, weights);
      allocations.forEach((a, i) =>
        items.push({
          medicine: line.medicine._id,
          batch: a.batch._id,
          batchNo: a.batch.batchNo,
          expiryDate: a.batch.expiryDate,
          name: [line.medicine.name, line.medicine.strength].filter(Boolean).join(" "),
          quantity: a.quantity,
          unitPrice: line.medicine.salePrice,
          costPrice: a.batch.purchasePrice,
          taxPercent: line.medicine.taxPercent,
          tax: taxes[i],
          discount: discounts[i],
          total: totals[i],
        })
      );
    });

    const customer = s.customer ? customers[s.customer] : null;
    const tendered = s.paymentMethod === "cash" ? Math.ceil(priced.grandTotal / 100) * 100 : null;
    invoiceSeq += 1;
    await Sale.create({
      invoiceNo: `INV-${String(invoiceSeq).padStart(6, "0")}`,
      customer: customer?._id ?? null,
      customerName: customer?.name ?? "Walk-in customer",
      customerPhone: customer?.phone ?? "",
      items,
      subtotal: priced.subtotal,
      taxTotal: priced.taxTotal,
      discountTotal: priced.discountTotal,
      billDiscount: priced.billDiscount,
      grandTotal: priced.grandTotal,
      paymentMethod: s.paymentMethod,
      amountTendered: tendered,
      prescription,
      soldBy: users[s.soldBy],
      status: s.refund ? "refunded" : "completed",
      refundReason: s.refund ?? "",
      refundedBy: s.refund ? users.admin : null,
      refundedAt: s.refund ? new Date(createdAt.getTime() + 3 * 60 * 60 * 1000) : null,
      createdAt,
    });
  }

  await Batch.insertMany(
    batches.map((b) => ({
      _id: b._id,
      medicine: b.medicine,
      batchNo: b.batchNo,
      expiryDate: b.expiryDate,
      quantity: b.quantity,
      purchasePrice: b.purchasePrice,
      supplier: b.supplier,
      createdAt: b.createdAt,
    }))
  );

  await Counter.insertMany([
    { _id: "invoice", seq: invoiceSeq },
    { _id: "purchase", seq: purchaseSeq },
  ]);

  await AuditLog.create({
    user: users.admin,
    userName: USERS[0].name,
    action: "seed",
    entity: "settings",
    entityId: "",
    meta: { medicines: MEDICINES.length, batches: batches.length, sales: invoiceSeq, purchases: purchaseSeq },
    timestamp: new Date(),
  });

  console.log(
    `Seeded ${USERS.length} users, ${CATEGORIES.length} categories, ${SUPPLIERS.length} suppliers, ${MEDICINES.length} medicines, ` +
      `${batches.length} batches, ${purchaseSeq} purchases, ${CUSTOMERS.length} customers, ` +
      `${prescriptionIds.filter(Boolean).length} prescriptions and ${invoiceSeq} sales.`
  );
  console.log("\nSign in with:");
  for (const u of USERS) console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(26)} ${u.password}`);
}

main()
  .catch((error: unknown) => {
    console.error("\nSeeding failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
