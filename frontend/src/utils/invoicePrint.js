/**
 * Shared invoice print helpers for Billing and Bills pages.
 */

/** Indian state code to name (GST first 2 digits). */
const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

export function getStateLabel(code) {
  if (!code) return '';
  const s = String(code).trim();
  const two = s.length >= 2 ? s.substring(0, 2) : s.padStart(2, '0');
  return STATE_CODES[two] ? `${two}-${STATE_CODES[two]}` : (s.length <= 2 ? s : two);
}

/** Convert number to words for Indian Rupees (integer part only, for display). */
export function numberToWordsRupees(n) {
  const num = Math.round(Number(n)) || 0;
  if (num === 0) return 'Zero Rupees only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function toWordsHundreds(x) {
    if (x === 0) return '';
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
    return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + toWordsHundreds(x % 100) : '');
  }
  let v = num;
  let out = '';
  if (v >= 10000000) {
    out += toWordsHundreds(Math.floor(v / 10000000)) + ' Crore ';
    v %= 10000000;
  }
  if (v >= 100000) {
    out += toWordsHundreds(Math.floor(v / 100000)) + ' Lakh ';
    v %= 100000;
  }
  if (v >= 1000) {
    out += toWordsHundreds(Math.floor(v / 1000)) + ' Thousand ';
    v %= 1000;
  }
  if (v > 0) out += toWordsHundreds(v);
  return (out.trim() || 'Zero') + ' Rupees only';
}

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

  // For B2B invoices, use A4-style official tax invoice layout (old frontend style).
  if ((invoice.invoiceType || '').toUpperCase() === 'B2B') {
    const items = invoice.items || [];
    const companyName = invoice.cashier?.companyName || 'Our Spices Shop';
    const companyAddress = (invoice.cashier?.address || '').trim();
    const companyGst = (invoice.cashier?.gstNumber || '').trim();
    const companyPhone = (invoice.cashier?.phoneNumber || '').trim();
    const companyState = getStateLabel(companyGst ? companyGst.substring(0, 2) : '');
    const customer = invoice.b2bCustomer || {};
    const placeOfSupply = invoice.placeOfSupply || getStateLabel(customer.stateCode || (customer.gstNumber ? customer.gstNumber.substring(0, 2) : ''));

    const created = (() => {
      if (!invoice.createdAt) return { date: '', time: '' };
      try {
        const d = new Date(invoice.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = h % 12 || 12;
        return {
          date: `${day}/${month}/${year}`,
          time: `${String(h12).padStart(2, '0')}:${m} ${ampm}`,
        };
      } catch {
        return { date: String(invoice.createdAt), time: '' };
      }
    })();

    // B2B: tax is NOT included in item price – taxable = unitPrice * qty, GST = taxable * gst%, amount = taxable + GST
    const discountAmt = Number(invoice.discountAmount) || 0;

    const itemsRows = items
      .map((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const unit = it.unit || it.product?.unit || '';
        const unitPrice = Number(it.unitPrice ?? it.sellingPricePerUnit ?? 0);
        const taxableValue = unitPrice * qty;
        const hsn = it.hsnCode || '';
        const name = (it.productName || '').replace(/</g, '&lt;');
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${name}</td>
            <td>${(hsn || '–').replace(/</g, '&lt;')}</td>
            <td>${qty}</td>
            <td>${(unit || '–').replace(/</g, '&lt;')}</td>
            <td style="text-align:right;">₹${unitPrice.toFixed(2)}</td>
            <td style="text-align:right;">₹${taxableValue.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    let calcSubtotal = 0;
    let calcGstTotal = 0;
    let calcItemsTotal = 0;
    items.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const unitPrice = Number(it.unitPrice ?? it.sellingPricePerUnit ?? 0);
      const gstPct = Number(it.gstPercentage) ?? 0;
      const taxable = unitPrice * qty;
      calcSubtotal += taxable;
      calcGstTotal += taxable * (gstPct / 100);
      calcItemsTotal += taxable * (1 + gstPct / 100);
    });
    const subtotal = Math.round(calcSubtotal * 100) / 100;
    const gstTotal = Math.round(calcGstTotal * 100) / 100;
    const totalAmount = Math.round((subtotal + gstTotal - discountAmt) * 100) / 100;

    const totalRow = `
      <tr class="total-row">
        <td colspan="3"><strong>Total</strong></td>
        <td>${Number(totalQty).toFixed(3)}</td>
        <td></td>
        <td></td>
        <td style="text-align:right;"><strong>₹${subtotal.toFixed(2)}</strong></td>
      </tr>
    `;

    const taxPercent = subtotal > 0 && gstTotal > 0 ? Math.round((gstTotal * 100) / subtotal) : 0;
    const gstPercentLabel = taxPercent > 0 ? `${taxPercent}%` : (items.length === 1 && items[0].gstPercentage != null
      ? `${Math.round(Number(items[0].gstPercentage))}%`
      : 'GST');

    const amountInWords = numberToWordsRupees(totalAmount);

    const bankName = (invoice.cashier?.bankName || '').trim();
    const accountNumber = (invoice.cashier?.accountNumber || '').trim();
    const ifscCode = (invoice.cashier?.ifscCode || '').trim();
    const branchName = (invoice.cashier?.branchName || '').trim();
    const accountHolder = companyName;
    const bankLines = [];
    if (bankName) bankLines.push(`Bank Name: ${bankName.replace(/</g, '&lt;')}`);
    if (accountNumber) bankLines.push(`Account No.: ${accountNumber.replace(/</g, '&lt;')}`);
    if (ifscCode) bankLines.push(`IFSC Code: ${ifscCode.replace(/</g, '&lt;')}`);
    if (branchName) bankLines.push(`Branch: ${branchName.replace(/</g, '&lt;')}`);
    if (accountHolder) bankLines.push(`Account Holder: ${accountHolder.replace(/</g, '&lt;')}`);
    const bankContent = bankLines.length ? bankLines.map(l => `<div>${l}</div>`).join('') : '';

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
              margin: 0 auto;
              padding: 16mm 18mm 18mm;
            }
            .b2b-company-block {
              text-align: center;
              margin-bottom: 4mm;
            }
            .b2b-company-name {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .b2b-company-address {
              font-size: 12px;
              color: #111827;
              margin-bottom: 2px;
            }
            .b2b-company-meta {
              font-size: 11px;
              color: #374151;
              margin: 1px 0;
            }
            .b2b-title {
              margin: 4mm 0 6mm;
              text-align: center;
              color: #dc2626;
              font-weight: 700;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .b2b-top-row {
              display: flex;
              justify-content: space-between;
              align-items: stretch;
              gap: 10mm;
              margin-bottom: 4mm;
              font-size: 11px;
            }
            .b2b-billto-box {
              flex: 1.4;
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              background: #fafafa;
              text-align: left;
            }
            .b2b-billto-addr-line {
              font-weight: 700;
              margin-top: 6px;
              margin-bottom: 2px;
            }
            .b2b-billto-shipping-label { font-weight: 900; font-size: 1.1em; }
            .b2b-billto-addr-line:first-of-type { margin-top: 2px; }
            .b2b-billto-addr-value {
              margin-bottom: 6px;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .b2b-inv-box {
              flex: 1;
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              background: #fafafa;
              text-align: right;
            }
            .b2b-billto-head { font-weight: 700; text-decoration: underline; margin-bottom: 4px; }
            .b2b-billto-name { font-weight: 700; margin: 2px 0; }
            .b2b-inv-line { margin: 2px 0; }
            .b2b-total-packages-line { font-size: 11px; margin: 4px 0 6px; color: #374151; }
            table.b2b-items {
              width: 100%;
              border-collapse: collapse;
              margin: 4mm 0 6mm;
              font-size: 11px;
            }
            table.b2b-items th,
            table.b2b-items td {
              border: 1px solid #e5e7eb;
              padding: 5px 6px;
            }
            table.b2b-items thead tr {
              background: #dc2626;
              color: #fff;
            }
            table.b2b-items th { font-weight: 600; }
            table.b2b-items td:nth-child(1) { text-align: center; }
            table.b2b-items td:nth-child(4),
            table.b2b-items td:nth-child(5) { text-align: center; }
            table.b2b-items th:nth-child(6),
            table.b2b-items td:nth-child(6),
            table.b2b-items th:nth-child(7),
            table.b2b-items td:nth-child(7) { text-align: right; }
            tr.total-row td { font-weight: 600; }
            .b2b-words-box {
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              margin-bottom: 4mm;
              font-size: 11px;
              background: #fafafa;
            }
            .b2b-words strong { margin-right: 6px; }
            .b2b-terms-box {
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              margin-bottom: 4mm;
              font-size: 11px;
              background: #fafafa;
            }
            .b2b-terms strong { margin-right: 6px; }
            .b2b-bottom-row {
              display: flex;
              justify-content: space-between;
              gap: 10mm;
              margin-top: 6mm;
              font-size: 11px;
            }
            .b2b-bank-box {
              flex: 1;
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              background: #fafafa;
            }
            .b2b-bank-box div { margin: 2px 0; }
            .b2b-summary-box {
              flex: 1;
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              text-align: right;
              background: #fafafa;
            }
            .b2b-summary-line { display: flex; justify-content: flex-end; gap: 12px; margin: 2px 0; }
            .b2b-summary-line.total { font-weight: 700; text-decoration: underline; margin-top: 4px; padding-top: 4px; }
            .b2b-sign { text-align: right; font-size: 11px; margin-top: 12mm; }
            @page { size: A4; margin: 12mm 15mm; }
            @media print {
              body { margin: 0; }
              .a4-root { box-shadow: none; min-height: 0; height: auto; page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="a4-root">
            <div class="b2b-company-block">
              <div class="b2b-company-name">${(companyName || '').replace(/</g, '&lt;')}</div>
              ${companyAddress ? `<div class="b2b-company-address">${companyAddress.replace(/</g, '&lt;')}</div>` : ''}
              ${companyPhone ? `<div class="b2b-company-meta">Phone No.: ${companyPhone.replace(/</g, '&lt;')}</div>` : ''}
              ${companyGst ? `<div class="b2b-company-meta">GSTIN: ${companyGst.replace(/</g, '&lt;')}</div>` : ''}
              ${companyState ? `<div class="b2b-company-meta">State: ${companyState.replace(/</g, '&lt;')}</div>` : ''}
            </div>
            <div class="b2b-title">TAX INVOICE</div>

            <div class="b2b-top-row">
              <div class="b2b-billto-box">
                <div class="b2b-billto-head">BILL TO:</div>
                <div class="b2b-billto-name">${(customer.customerName || '').replace(/</g, '&lt;')}</div>
                ${customer.billingAddress ? `<div class="b2b-billto-addr-line">Billing Address:</div><div class="b2b-billto-addr-value">${customer.billingAddress.replace(/</g, '&lt;')}</div>` : ''}
                ${customer.shippingAddress ? `<div class="b2b-billto-addr-line b2b-billto-shipping-label">Shipping Address:</div><div class="b2b-billto-addr-value">${customer.shippingAddress.replace(/</g, '&lt;')}</div>` : ''}
                ${customer.phone ? `<div style="margin: 2px 0;">Contact No.: ${customer.phone.replace(/</g, '&lt;')}</div>` : ''}
                ${customer.gstNumber ? `<div><strong>GSTIN: ${customer.gstNumber.replace(/</g, '&lt;')}</strong></div>` : ''}
                ${customer.stateCode || (customer.gstNumber && customer.gstNumber.length >= 2) ? `<div>State: ${getStateLabel(customer.stateCode || customer.gstNumber?.substring(0, 2)).replace(/</g, '&lt;')}</div>` : ''}
              </div>
              <div class="b2b-inv-box">
                <div class="b2b-inv-line">Invoice No.: ${(invoice.invoiceNumber || '').replace(/</g, '&lt;')}</div>
                <div class="b2b-inv-line">Date: ${created.date}</div>
                <div class="b2b-inv-line">Time: ${created.time}</div>
                ${placeOfSupply ? `<div class="b2b-inv-line">Place of supply: ${placeOfSupply.replace(/</g, '&lt;')}</div>` : ''}
                ${invoice.totalPackages != null ? `<div class="b2b-inv-line">Package No.: ${invoice.totalPackages}</div>` : ''}
                ${invoice.ewayBillNumber ? `<div class="b2b-inv-line">E-way Reference No.: ${invoice.ewayBillNumber.replace(/</g, '&lt;')}</div>` : ''}
              </div>
            </div>

            <table class="b2b-items">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM NAME</th>
                  <th>HSN/SAC</th>
                  <th>QUANTITY</th>
                  <th>UNIT</th>
                  <th>PRICE/UNIT</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
                ${totalRow}
              </tbody>
            </table>

            ${invoice.totalPackages != null ? `<div class="b2b-total-packages-line">Package No.: ${invoice.totalPackages}</div>` : ''}

            <div class="b2b-words-box b2b-words"><strong>Invoice Amount In Words:</strong> ${amountInWords.replace(/</g, '&lt;')}</div>

            <div class="b2b-bottom-row">
              <div class="b2b-bank-box">
                ${bankContent}
              </div>
              <div class="b2b-summary-box">
                <div class="b2b-summary-line"><span>Sub Total (taxable):</span><span>₹${subtotal.toFixed(2)}</span></div>
                ${gstTotal > 0 ? `<div class="b2b-summary-line"><span>GST (${gstPercentLabel}):</span><span>₹${gstTotal.toFixed(2)}</span></div>` : ''}
                ${discountAmt > 0 ? `<div class="b2b-summary-line"><span>Discount:</span><span>- ₹${discountAmt.toFixed(2)}</span></div>` : ''}
                <div class="b2b-summary-line total"><span>Total:</span><span>₹${totalAmount.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="b2b-sign">
              <div>For : ${companyName.replace(/</g, '&lt;')}</div>
              <div style="margin-top: 8mm;">Authorized Signatory</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // RETAIL (BTOC) – customer receipt format matching old invoice layout
  const invType = (invoice.invoiceType || 'RETAIL').toUpperCase();
  if (invType === 'RETAIL') {
    const companyName = invoice.cashier?.companyName || 'Our Spices Shop';
    const address = (invoice.cashier?.address || '').trim();
    const gstNumber = (invoice.cashier?.gstNumber || '').trim();
    const phoneNumber = (invoice.cashier?.phoneNumber || '').trim();
    const createdAt = (() => {
      if (!invoice.createdAt) return '';
      try {
        const d = new Date(invoice.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${day}/${month}/${year} ${h12}:${m} ${ampm}`;
      } catch {
        return String(invoice.createdAt);
      }
    })();
    // Retail: backend stores subtotal = taxable base (amount before GST). So Base Amount = subtotal; Subtotal = base + CGST + SGST.
    const baseAmount = Math.max(0, Number(invoice.subtotal) || 0);
    const cgstAmt = Number(invoice.cgstAmount) || 0;
    const sgstAmt = Number(invoice.sgstAmount) || 0;
    const subtotalVal = baseAmount + cgstAmt + sgstAmt;
    const discountAmt = Number(invoice.discountAmount) || 0;
    const totalAmount = (invoice.totalAmount ?? invoice.grandTotal ?? 0).toFixed(2);
    const payment = invoice.paymentMethod || 'CASH';
    const discountRow = discountAmt > 0
      ? `<div class="btoc-totals-row btoc-discount"><span>Discount</span><span>- ₹${discountAmt.toFixed(2)}</span></div>`
      : '';
    const cgstRow = cgstAmt > 0 ? `<div class="btoc-totals-row"><span>CGST</span><span>₹${cgstAmt.toFixed(2)}</span></div>` : '';
    const sgstRow = sgstAmt > 0 ? `<div class="btoc-totals-row"><span>SGST</span><span>₹${sgstAmt.toFixed(2)}</span></div>` : '';
    const itemsRows = (invoice.items || [])
      .map((item) => {
        const name = item.productName || '';
        const qty = item.quantity ?? 0;
        const unit = item.unit || item.product?.unit || '';
        const qtyDisplay = unit ? `${qty} ${unit}` : String(qty);
        const total = item.totalPrice ?? qty * (item.unitPrice ?? item.sellingPricePerUnit ?? 0);
        return `
          <tr>
            <td class="btoc-col-item">${name}</td>
            <td class="btoc-col-qty">${qtyDisplay}</td>
            <td class="btoc-col-total">₹${Number(total).toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');
    const oneCopy = `
      <div class="btoc-print-copy">
        <div class="btoc-company">
          <div class="btoc-company-name">${companyName}</div>
          ${address ? `<div class="btoc-company-line">${address.replace(/</g, '&lt;')}</div>` : ''}
          ${phoneNumber ? `<div class="btoc-company-line">Ph. no.: ${phoneNumber.replace(/</g, '&lt;')}</div>` : ''}
          ${gstNumber ? `<div class="btoc-company-line">GST: ${gstNumber.replace(/</g, '&lt;')}</div>` : ''}
        </div>
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-meta">
          <div class="btoc-meta-row"><span>Invoice #:</span><span>${invoice.invoiceNumber || ''}</span></div>
          <div class="btoc-meta-row"><span>Date:</span><span>${createdAt}</span></div>
        </div>
        <div class="btoc-divider-dashed"></div>
        <table class="btoc-items">
          <thead><tr><th class="btoc-col-item">Item</th><th class="btoc-col-qty">Qty</th><th class="btoc-col-total">Total</th></tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-totals">
          <div class="btoc-totals-row"><span>Base Amount</span><span>₹${baseAmount.toFixed(2)}</span></div>
          ${cgstRow}
          ${sgstRow}
          <div class="btoc-totals-row"><span>Subtotal</span><span>₹${subtotalVal.toFixed(2)}</span></div>
          ${discountRow}
          <div class="btoc-totals-row btoc-total-amount"><span>Total Amount</span><span>₹${totalAmount}</span></div>
        </div>
        <div class="btoc-divider-solid"></div>
        <div class="btoc-divider-dashed"></div>
        <div class="btoc-payment">
          <div class="btoc-totals-row"><span>Payment Method</span><span>${payment}</span></div>
          <div class="btoc-totals-row"><span>Amount Paid</span><span>₹${totalAmount}</span></div>
        </div>
        <div class="btoc-footer">
          <div>Thank you for your business!</div>
          <div>Visit us again</div>
        </div>
      </div>
    `;
    const copiesHtml = options.twoCopies ? oneCopy + '<div class="btoc-copy-sep"></div>' + oneCopy : oneCopy;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invoice.invoiceNumber || ''}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; padding: 16px; color: #111; }
            .btoc-print-copy { margin-bottom: 24px; }
            .btoc-copy-sep { break-after: page; margin-bottom: 24px; }
            .btoc-company { text-align: center; margin-bottom: 8px; }
            .btoc-company-name { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px; }
            .btoc-company-line { font-size: 11px; color: #374151; margin: 2px 0; }
            .btoc-divider-dashed { border: none; border-top: 1px dashed #9ca3af; margin: 8px 0; }
            .btoc-divider-solid { border: none; border-top: 1px solid #374151; margin: 4px 0; }
            .btoc-meta { font-size: 11px; margin: 4px 0; }
            .btoc-meta-row { display: flex; justify-content: space-between; padding: 2px 0; }
            table.btoc-items { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
            table.btoc-items th, table.btoc-items td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            table.btoc-items th { font-weight: 600; }
            .btoc-col-item { text-align: left; }
            .btoc-col-qty { text-align: center; width: 22%; }
            .btoc-col-total { text-align: right; width: 28%; }
            .btoc-totals { font-size: 12px; margin-top: 4px; }
            .btoc-totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .btoc-totals-row.btoc-total-amount { font-weight: 700; font-size: 14px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #111; }
            .btoc-discount { color: #059669; }
            .btoc-payment { margin-top: 8px; font-size: 11px; }
            .btoc-footer { margin-top: 14px; text-align: center; font-size: 12px; color: #4b5563; }
            .btoc-footer div { margin: 2px 0; }
          </style>
        </head>
        <body>${copiesHtml}</body>
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
