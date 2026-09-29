import { round2 } from "./format";

export interface PricingLineInput {
  unitPrice: number;
  quantity: number;
  discount: number;
  taxPercent: number;
}

export interface PricedLine extends PricingLineInput {
  gross: number;
  billDiscountShare: number;
  taxable: number;
  tax: number;
  total: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  lineDiscountTotal: number;
  billDiscount: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

/**
 * Prices are tax-exclusive. Line discounts apply first; the bill discount is then
 * spread across lines in proportion to their net value so tax is charged on the
 * amount the customer actually pays.
 */
export function priceCart(inputs: PricingLineInput[], billDiscountInput: number): PricedCart {
  const base = inputs.map((line) => {
    const gross = round2(line.unitPrice * line.quantity);
    const discount = round2(Math.min(Math.max(line.discount, 0), gross));
    return { ...line, discount, gross, net: round2(gross - discount) };
  });

  const netSum = round2(base.reduce((sum, l) => sum + l.net, 0));
  const billDiscount = round2(Math.min(Math.max(billDiscountInput, 0), netSum));

  let allocated = 0;
  const lastIndex = base.reduce((idx, l, i) => (l.net > 0 ? i : idx), -1);

  const lines: PricedLine[] = base.map((l, i) => {
    let share = 0;
    if (billDiscount > 0 && netSum > 0 && l.net > 0) {
      share = i === lastIndex ? round2(billDiscount - allocated) : round2((billDiscount * l.net) / netSum);
      allocated = round2(allocated + share);
    }
    const taxable = round2(l.net - share);
    const tax = round2((taxable * l.taxPercent) / 100);
    return {
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      discount: l.discount,
      taxPercent: l.taxPercent,
      gross: l.gross,
      billDiscountShare: share,
      taxable,
      tax,
      total: round2(taxable + tax),
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.gross, 0));
  const lineDiscountTotal = round2(lines.reduce((s, l) => s + l.discount, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.tax, 0));
  const discountTotal = round2(lineDiscountTotal + billDiscount);

  return {
    lines,
    subtotal,
    lineDiscountTotal,
    billDiscount,
    discountTotal,
    taxTotal,
    grandTotal: round2(subtotal - discountTotal + taxTotal),
  };
}

/** Splits an amount across parts proportionally to weights, giving the rounding remainder to the last part. */
export function splitAmount(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return weights.map(() => 0);
  let allocated = 0;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return round2(amount - allocated);
    const part = round2((amount * w) / totalWeight);
    allocated = round2(allocated + part);
    return part;
  });
}
