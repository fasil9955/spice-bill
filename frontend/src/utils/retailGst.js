/** Retail (B2C) bill discount: 18% items first (max 80% of those lines), leftover on 5% items, then GST on what remains. */

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function isRate(pct, rate) {
  return Math.abs(Number(pct) - rate) < 0.0001;
}

function allocateByCapacity(lines, alloc, remaining, capacityOf) {
  let left = round2(remaining);
  if (left <= 0) return 0;
  const caps = lines.map((line, i) => Math.max(0, round2(capacityOf(line, i))));
  const totalCap = round2(caps.reduce((s, c) => s + c, 0));
  if (totalCap <= 0) return left;
  const take = Math.min(left, totalCap);
  let pool = take;
  const last = caps.reduce((idx, c, i) => (c > 0 ? i : idx), -1);
  caps.forEach((cap, i) => {
    if (cap <= 0 || pool <= 0) return;
    const share = Math.min(i === last ? pool : round2((take * cap) / totalCap), cap, pool);
    alloc[i] = round2(alloc[i] + share);
    pool = round2(pool - share);
  });
  if (pool > 0 && last >= 0) {
    const room = Math.max(0, round2((Number(lines[last].gross) || 0) - alloc[last]));
    const add = Math.min(pool, room, caps[last]);
    alloc[last] = round2(alloc[last] + add);
    pool = round2(pool - add);
  }
  return round2(left - take + pool);
}

export function allocateRetailDiscount(lines, discount) {
  const alloc = lines.map(() => 0);
  const sum = round2(lines.reduce((s, l) => s + (Number(l.gross) || 0), 0));
  let remaining = Math.min(Math.max(0, round2(Number(discount) || 0)), sum);
  remaining = allocateByCapacity(lines, alloc, remaining, (line, i) =>
    isRate(line.gstPct, 18) ? round2((Number(line.gross) || 0) * 0.8) - alloc[i] : 0
  );
  remaining = allocateByCapacity(lines, alloc, remaining, (line, i) =>
    isRate(line.gstPct, 5) ? (Number(line.gross) || 0) - alloc[i] : 0
  );
  remaining = allocateByCapacity(lines, alloc, remaining, (line, i) =>
    !isRate(line.gstPct, 18) && !isRate(line.gstPct, 5)
      ? (Number(line.gross) || 0) - alloc[i]
      : 0
  );
  remaining = allocateByCapacity(lines, alloc, remaining, (line, i) =>
    isRate(line.gstPct, 18) ? (Number(line.gross) || 0) - alloc[i] : 0
  );
  return alloc;
}

export function retailGstAfterDiscount(cart, discountValue) {
  const lines = (cart || []).map((item) => ({
    gross: round2((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)),
    gstPct: Number(item.category?.gstPercentage ?? item.gstPercentage) || 0,
  }));
  const alloc = allocateRetailDiscount(lines, discountValue);
  let cgst = 0;
  let sgst = 0;
  let taxable = 0;
  lines.forEach((line, i) => {
    const net = Math.max(0, round2(line.gross - alloc[i]));
    const r = (Number(line.gstPct) || 0) / 100;
    const taxBase = r > 0 ? round2(net / (1 + r)) : net;
    const gst = round2(net - taxBase);
    taxable += taxBase;
    cgst += gst / 2;
    sgst += gst / 2;
  });
  return { cgst: round2(cgst), sgst: round2(sgst), taxable: round2(taxable) };
}

export function retailLineGross(item) {
  const qty = Number(item?.quantity) || 0;
  const unit = Number(item?.unitPrice ?? item?.sellingPricePerUnit) || 0;
  return round2(qty * unit);
}
