/**
 * Shared invoice print helpers for Billing and Bills pages.
 */

export function printHtmlViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    document.body.removeChild(iframe);
    alert('Failed to open print frame');
    return;
  }

  win.onafterprint = () => {
    try {
      document.body.removeChild(iframe);
    } catch (e) {}
  };

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      try {
        window.print();
      } catch (e2) {}
    }
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      } catch (e) {}
    }, 4000);
  }, 250);
}

export function buildInvoicePrintHtml(invoice, options = {}) {
  if (!invoice) return '';
  const { twoCopies = false } = options;

  // For B2B invoices, use an A4-style official tax invoice layout.
  if ((invoice.invoiceType || '').toUpperCase() === 'B2B') {
    const items = invoice.items || [];
    const companyName = invoice.cashier?.companyName || 'Our Spices Shop';
    const companyAddress = (invoice.cashier?.address || '').trim();
    const companyGst = (invoice.cashier?.gstNumber || '').trim();
    const customer = invoice.b2bCustomer || {};

    const created = (() => {
      if (!invoice.createdAt) return { date: '', time: '' };
      try {
        const d = new Date(invoice.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return {
          date: `${day}-${month}-${year}`,
          time: `${h12}:${m} ${ampm}`,
        };
      } catch {
        return { date: String(invoice.createdAt), time: '' };
      }
    })();

    const subtotal = Number(invoice.subtotal) || 0;
    const cgstAmt = Number(invoice.cgstAmount) || 0;
    const sgstAmt = Number(invoice.sgstAmount) || 0;
    const gstTotal = cgstAmt + sgstAmt;
    const discountAmt = Number(invoice.discountAmount) || 0;
    const totalAmount = Number(invoice.totalAmount ?? invoice.grandTotal ?? 0);

    const taxPercent = (() => {
      if (!subtotal) return '';
      const pct = (gstTotal * 100) / subtotal;
      if (!isFinite(pct) || pct <= 0) return '';
      return `${pct.toFixed(0)}%`;
    })();

    const itemsRows = items
      .map((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const unit = it.unit || it.product?.unit || '';
        const rate = Number(it.unitPrice ?? it.sellingPricePerUnit ?? 0);
        const total = Number(it.totalPrice ?? qty * rate);
        const hsn = it.hsnCode || '';
        const name = it.productName || '';
        const gstPct = it.gstPercentage != null ? Number(it.gstPercentage) : null;
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${name}${unit ? ` (${unit})` : ''}</td>
            <td>${hsn}</td>
            <td style="text-align:right;">${qty}</td>
            <td>${unit}</td>
            <td style="text-align:right;">₹ ${rate.toFixed(2)}</td>
            <td style="text-align:right;">₹ ${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const gstPercentLabel = taxPercent || (items.length === 1 && items[0].gstPercentage != null
      ? `${Number(items[0].gstPercentage).toFixed(0)}%`
      : 'GST');

    const amountInWords = ''; // Can be filled later if needed.

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invoice.invoiceNumber || ''}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 12px;
              color: #111827;
              line-height: 1.4;
            }
            .a4-root {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 16mm 18mm 18mm;
            }
            .company-name {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            .company-lines {
              text-align: center;
              margin-top: 2px;
              font-size: 11px;
              color: #4b5563;
            }
            .company-gst {
              text-align: center;
              margin-top: 2px;
              font-size: 11px;
              color: #4b5563;
            }
            .title-bar {
              margin: 6mm 0 4mm;
              text-align: center;
              background: #d9534f;
              color: #ffffff;
              padding: 4px 0;
              font-weight: 600;
              text-transform: uppercase;
            }
            .top-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 10mm;
              margin-bottom: 4mm;
            }
            .box-heading {
              font-weight: 600;
              margin-bottom: 2mm;
            }
            .box-heading span {
              background: #d9534f;
              color: #ffffff;
              padding: 2px 8px;
              font-size: 11px;
            }
            .billto, .inv-details {
              font-size: 11px;
            }
            .inv-details-row {
              display: flex;
              justify-content: space-between;
              gap: 4mm;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin: 4mm 0 6mm;
              font-size: 11px;
            }
            table.items th,
            table.items td {
              border: 1px solid #e5e7eb;
              padding: 4px 6px;
            }
            table.items thead tr {
              background: #d9534f;
              color: #ffffff;
            }
            table.items th:nth-child(1),
            table.items td:nth-child(1) {
              width: 26px;
              text-align: center;
            }
            table.items th:nth-child(4),
            table.items td:nth-child(4),
            table.items th:nth-child(6),
            table.items td:nth-child(6),
            table.items th:nth-child(7),
            table.items td:nth-child(7) {
              text-align: right;
            }
            .totals-row-outer {
              display: flex;
              justify-content: space-between;
              gap: 10mm;
              font-size: 11px;
            }
            .amount-words-box,
            .amounts-box {
              flex: 1;
              border: 1px solid #e5e7eb;
            }
            .amount-words-heading,
            .amounts-heading,
            .terms-heading,
            .bank-heading {
              background: #d9534f;
              color: #ffffff;
              padding: 3px 8px;
              font-size: 11px;
              font-weight: 600;
            }
            .amount-words-content {
              padding: 6px 8px 10px;
            }
            .amounts-content {
              padding: 4px 8px 6px;
            }
            .amounts-line {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .amounts-line.total {
              font-weight: 700;
              border-top: 1px solid #e5e7eb;
              margin-top: 4px;
              padding-top: 4px;
            }
            .bottom-row {
              display: flex;
              justify-content: space-between;
              gap: 10mm;
              margin-top: 6mm;
              font-size: 11px;
            }
            .terms-box,
            .bank-box {
              flex: 1;
              border: 1px solid #e5e7eb;
            }
            .terms-content,
            .bank-content {
              padding: 6px 8px 10px;
            }
            .signature-block {
              text-align: right;
              font-size: 11px;
              flex: 0 0 80mm;
            }
            .signature-line {
              margin-top: 16mm;
            }
            @page {
              size: A4;
              margin: 12mm 15mm;
            }
            @media print {
              body {
                margin: 0;
              }
              .a4-root {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-root">
            <div class="company-name">${companyName}</div>
            ${companyAddress ? `<div class="company-lines">${companyAddress.replace(/</g, '&lt;')}</div>` : ''}
            ${companyGst ? `<div class="company-gst">GSTIN: ${companyGst.replace(/</g, '&lt;')}</div>` : ''}
            <div class="title-bar">Tax Invoice</div>

            <div class="top-row">
              <div style="flex: 1.4;">
                <div class="box-heading"><span>Bill To</span></div>
                <div class="billto">
                  <div>${(customer.customerName || '').replace(/</g, '&lt;')}</div>
                  ${customer.billingAddress ? `<div>${customer.billingAddress.replace(/</g, '&lt;')}</div>` : ''}
                  ${customer.phone ? `<div>Contact No.: ${customer.phone}</div>` : ''}
                  ${customer.gstNumber ? `<div>GSTIN : ${customer.gstNumber}</div>` : ''}
                </div>
              </div>
              <div style="flex: 1;">
                <div class="box-heading"><span>Invoice Details</span></div>
                <div class="inv-details">
                  <div class="inv-details-row"><span>Invoice No. : ${invoice.invoiceNumber || ''}</span></div>
                  <div class="inv-details-row"><span>Date : ${created.date}</span><span>Time : ${created.time}</span></div>
                  ${invoice.placeOfSupply ? `<div class="inv-details-row"><span>Place of supply: ${invoice.placeOfSupply}</span></div>` : ''}
                  ${invoice.ewayBillNumber ? `<div class="inv-details-row"><span>E-way Bill number: ${invoice.ewayBillNumber}</span></div>` : ''}
                </div>
              </div>
            </div>

            <table class="items">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item name</th>
                  <th>HSN/ SAC</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Price/ Unit</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals-row-outer">
              <div class="amount-words-box">
                <div class="amount-words-heading">Invoice Amount In Words</div>
                <div class="amount-words-content">
                  ${amountInWords || '&nbsp;'}
                </div>
              </div>
              <div class="amounts-box">
                <div class="amounts-heading">Amounts</div>
                <div class="amounts-content">
                  <div class="amounts-line"><span>Sub Total</span><span>₹ ${subtotal.toFixed(2)}</span></div>
                  <div class="amounts-line"><span>Tax (${gstPercentLabel})</span><span>₹ ${gstTotal.toFixed(2)}</span></div>
                  ${discountAmt > 0 ? `<div class="amounts-line"><span>Discount</span><span>₹ ${discountAmt.toFixed(2)}</span></div>` : ''}
                  <div class="amounts-line total"><span>Total</span><span>₹ ${totalAmount.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            <div class="bottom-row">
              <div class="terms-box">
                <div class="terms-heading">Terms and Conditions</div>
                <div class="terms-content">
                  <div>Thanks for doing business with us!</div>
                </div>
              </div>
              <div class="bank-box">
                <div class="bank-heading">Bank Details</div>
                <div class="bank-content">
                  <!-- Bank details can be filled from company profile later -->
                </div>
              </div>
              <div class="signature-block">
                <div>For : ${companyName}</div>
                <div class="signature-line">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  const itemsHtml = (invoice.items || [])
    .map((item) => {
      const name = item.productName || '';
      const qty = item.quantity ?? 0;
      const unit = item.unit || item.product?.unit || '';
      const qtyDisplay = unit ? `${qty} ${unit}` : String(qty);
      const price = item.unitPrice ?? item.sellingPricePerUnit ?? 0;
      const total = item.totalPrice ?? qty * price;
      return `
          <tr>
            <td class="item-name">${name}</td>
            <td class="item-qty">${qtyDisplay}</td>
            <td class="item-price">${price.toFixed(2)}</td>
            <td class="item-total">${total.toFixed(2)}</td>
          </tr>
        `;
    })
    .join('');

  const createdAt = (() => {
    if (!invoice.createdAt) return '';
    try {
      const d = new Date(invoice.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${day}/${month}/${year} ${h12}:${m} ${ampm}`;
    } catch {
      return String(invoice.createdAt);
    }
  })();
  const discountAmt = Number(invoice.discountAmount) || 0;
  const totalAmount = (invoice.totalAmount ?? invoice.grandTotal ?? 0).toFixed(2);
  const payment = invoice.paymentMethod || 'CASH';
  const companyName = invoice.cashier?.companyName || 'Our Spices Shop';
  const companyAddress = (invoice.cashier?.address || '').trim();
  const companyGst = (invoice.cashier?.gstNumber || '').trim();
  const addressLine = companyAddress ? `<p class="invoice-header-address">${companyAddress.replace(/</g, '&lt;')}</p>` : '';
  const gstLine = companyGst ? `<p class="invoice-header-gst">GST: ${companyGst.replace(/</g, '&lt;')}</p>` : '';
  const discountRow = discountAmt > 0
    ? `<div class="totals-row totals-discount"><span>Discount</span><span>- ₹${discountAmt.toFixed(2)}</span></div>`
    : '';
  const cgstAmt = Number(invoice.cgstAmount) || 0;
  const sgstAmt = Number(invoice.sgstAmount) || 0;
  const itemsSum = (invoice.items || []).reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
  const rawSubtotal = Number(invoice.subtotal) ?? itemsSum;
  const subtotalAmt = Math.max(0, rawSubtotal - cgstAmt - sgstAmt);
  const subtotalRow = `<div class="totals-row"><span>Subtotal</span><span>₹${subtotalAmt.toFixed(2)}</span></div>`;
  const cgstRow = cgstAmt > 0
    ? `<div class="totals-row"><span>CGST</span><span>₹${cgstAmt.toFixed(2)}</span></div>`
    : '';
  const sgstRow = sgstAmt > 0
    ? `<div class="totals-row"><span>SGST</span><span>₹${sgstAmt.toFixed(2)}</span></div>`
    : '';

  const singleCopy = `
          <div class="invoice-wrapper">
            <div class="invoice-header">
              <p class="invoice-header-name">${companyName}</p>
              ${addressLine}
              ${gstLine}
            </div>
            <div class="meta-row">
              <div class="meta-col">
                <div><span class="meta-label">Date:</span> ${createdAt}</div>
                <div><span class="meta-label">Invoice #:</span> ${invoice.invoiceNumber || ''}</div>
              </div>
              <div class="meta-col" style="text-align:right;">
                <div><span class="meta-label">Type:</span> ${invoice.invoiceType || 'RETAIL'}</div>
                <div><span class="meta-label">Payment:</span> ${payment}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Rate</th>
                  <th class="item-total">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="totals">
              ${subtotalRow}
              ${cgstRow}
              ${sgstRow}
              ${discountRow}
              <div class="totals-row total">
                <span>Total</span>
                <span>₹${totalAmount}</span>
              </div>
            </div>
            <div class="footer">
              <div>Thank you for shopping!</div>
            </div>
          </div>`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invoice.invoiceNumber || ''}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-weight: 700; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              font-weight: 700;
              padding: 5mm 4mm 4mm 4mm;
              color: #111827;
              line-height: 1.35;
            }
            .invoice-wrapper {
              width: 74mm;
              max-width: 74mm;
              margin: 0 auto;
              padding: 0 3mm;
            }
            .invoice-wrapper, .invoice-wrapper * {
              font-weight: 700;
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 1px solid #d1d5db;
            }
            .invoice-header-name {
              font-size: 14px;
              font-weight: 700;
              margin: 0 0 4px 0;
              color: #111827;
            }
            .invoice-header p {
              font-size: 10px;
              font-weight: 700;
              color: #4b5563;
              line-height: 1.4;
            }
            .invoice-header-address, .invoice-header-gst {
              font-size: 10px;
              font-weight: 700;
              color: #4b5563;
              margin: 2px 0 0 0;
            }
            .gate-pass-heading {
              font-size: 16px;
              font-weight: 700;
              text-align: center;
              margin: 0 0 8px 0;
              padding-bottom: 6px;
              border-bottom: 2px solid #111827;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0 8px;
              font-size: 9px;
              font-weight: 700;
              color: #4b5563;
              padding: 4px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .meta-col {
              width: 48%;
              min-width: 0;
            }
            .meta-col > div {
              white-space: nowrap;
            }
            .meta-label {
              font-weight: 700;
              color: #374151;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
              font-size: 10px;
              font-weight: 700;
            }
            thead tr {
              border-bottom: 1px solid #9ca3af;
            }
            th, td {
              padding: 4px 2px;
              text-align: left;
              font-weight: 700;
            }
            th {
              font-size: 10px;
              font-weight: 700;
              color: #374151;
            }
            .item-name {
              width: 50%;
            }
            .item-qty {
              width: 14%;
              text-align: center;
            }
            .item-price,
            .item-total {
              width: 18%;
              text-align: right;
            }
            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }
            tbody tr:last-child {
              border-bottom: none;
            }
            .totals {
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #9ca3af;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 11px;
              font-weight: 700;
            }
            .totals-row.total {
              font-weight: 700;
              font-size: 12px;
              margin-top: 4px;
              padding-top: 4px;
              border-top: 1px solid #374151;
            }
            .footer {
              margin-top: 10px;
              padding-top: 6px;
              text-align: center;
              font-size: 10px;
              font-weight: 700;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
            .copy-sep {
              margin-top: 8mm;
              page-break-after: always;
            }
            @media print {
              body {
                padding: 5mm 4mm 4mm 4mm;
                font-size: 11px;
                font-weight: 700;
              }
              .invoice-wrapper {
                width: 74mm;
                max-width: 74mm;
              }
              @page {
                size: 80mm auto;
                margin: 4mm;
              }
            }
          </style>
        </head>
        <body>
          ${twoCopies
    ? `${singleCopy}
          <div class="copy-sep"></div>
          <div class="invoice-wrapper">
            <p class="gate-pass-heading">GATE PASS</p>
            <div class="invoice-header">
              <p class="invoice-header-name">${companyName}</p>
              ${addressLine}
              ${gstLine}
            </div>
            <div class="meta-row">
              <div class="meta-col">
                <div><span class="meta-label">Date:</span> ${createdAt}</div>
                <div><span class="meta-label">Invoice #:</span> ${invoice.invoiceNumber || ''}</div>
              </div>
              <div class="meta-col" style="text-align:right;">
                <div><span class="meta-label">Type:</span> ${invoice.invoiceType || 'RETAIL'}</div>
                <div><span class="meta-label">Payment:</span> ${payment}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Rate</th>
                  <th class="item-total">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="totals">
              ${subtotalRow}
              ${cgstRow}
              ${sgstRow}
              ${discountRow}
              <div class="totals-row total">
                <span>Total</span>
                <span>₹${totalAmount}</span>
              </div>
            </div>
            <div class="footer">
              <div>Thank you for shopping!</div>
            </div>
          </div>`
    : singleCopy}
        </body>
      </html>
    `;
}
