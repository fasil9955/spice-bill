export function buildPaymentChoices(upiAccounts) {
  const named = normalizeUpiAccounts(upiAccounts);
  return [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    ...(named.length
      ? named.map((a) => ({ value: 'UPI', label: a.label, upiLabel: a.label }))
      : [{ value: 'UPI', label: 'UPI' }]),
    { value: 'MIXED', label: 'Mixed' },
  ];
}

export function normalizeUpiAccounts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const row of list) {
    const label = String(row?.label || '').trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({
      label: label.slice(0, 40),
      upiId: String(row?.upiId || '').trim().slice(0, 80),
    });
    if (out.length >= 12) break;
  }
  return out;
}

export function formatInvoicePayment(invoice) {
  const method = invoice?.paymentMethod || 'CASH';
  const acc = String(invoice?.upiAccount || '').trim();
  if (method === 'CASH') return 'Cash';
  if (method === 'CARD') return 'Card';
  if (method === 'UPI') {
    return acc && !acc.startsWith('[') ? acc : 'UPI';
  }
  if (method === 'MIXED') {
    const cash = Number(invoice?.cashAmount) || 0;
    const card = Number(invoice?.cardAmount) || 0;
    const bits = [];
    if (cash > 0) bits.push(`Cash ₹${cash.toFixed(2)}`);
    if (card > 0) bits.push(`Card ₹${card.toFixed(2)}`);
    if (acc.startsWith('[')) {
      try {
        const parts = JSON.parse(acc);
        if (Array.isArray(parts)) {
          parts.forEach((p) => {
            const amt = Number(p.amount) || 0;
            if (amt > 0) bits.push(`${p.label || 'UPI'} ₹${amt.toFixed(2)}`);
          });
        }
      } catch {
        /* ignore */
      }
    } else if ((Number(invoice?.upiAmount) || 0) > 0) {
      bits.push(`${acc || 'UPI'} ₹${(Number(invoice.upiAmount) || 0).toFixed(2)}`);
    }
    return bits.length ? `MIXED (${bits.join(', ')})` : 'MIXED';
  }
  return method;
}

export function encodeUpiAccountField(paymentMethod, selectedLabel, mixedUpiParts) {
  if (paymentMethod === 'UPI') {
    return selectedLabel || 'UPI';
  }
  if (paymentMethod === 'MIXED') {
    const parts = (mixedUpiParts || []).filter((p) => (Number(p.amount) || 0) > 0);
    if (parts.length === 0) return '';
    return JSON.stringify(parts.map((p) => ({
      label: p.label,
      amount: Number(p.amount) || 0,
    })));
  }
  return '';
}
