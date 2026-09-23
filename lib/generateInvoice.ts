import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface InvoiceOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  business: {
    name: string;
    address: string;
    gstin?: string | null;
    pan?: string | null;
    fssai_license?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
  };
  bank?: {
    accountName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    bankName?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: InvoiceOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  tax: number;
  total: number;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? rgb(0, 0, 0),
    });
  };

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  };

  // Header
  drawText(data.business.name, margin, y, { size: 18, font: bold });
  y -= 20;
  drawText(data.business.address, margin, y, { size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 14;

  const businessMeta = [
    data.business.gstin ? `GSTIN: ${data.business.gstin}` : null,
    data.business.pan ? `PAN: ${data.business.pan}` : null,
    data.business.fssai_license ? `FSSAI: ${data.business.fssai_license}` : null,
  ].filter(Boolean);
  if (businessMeta.length > 0) {
    drawText(businessMeta.join('   |   '), margin, y, { size: 9, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
  }

  // Invoice title + number, right aligned
  drawText('INVOICE', width - margin - 90, height - margin, { size: 18, font: bold });
  drawText(`#${data.invoiceNumber}`, width - margin - 90, height - margin - 20, { size: 10 });
  drawText(
    `Date: ${new Date(data.invoiceDate).toLocaleDateString('en-IN')}`,
    width - margin - 90,
    height - margin - 34,
    { size: 9, color: rgb(0.3, 0.3, 0.3) }
  );

  y -= 20;
  drawLine(y);
  y -= 24;

  // Bill To
  drawText('Bill To', margin, y, { size: 9, font: bold, color: rgb(0.5, 0.5, 0.5) });
  y -= 14;
  drawText(data.customer.name, margin, y, { size: 11, font: bold });
  y -= 14;
  drawText(data.customer.phone, margin, y, { size: 9 });
  y -= 14;
  // wrap address into lines of ~60 chars
  const addressLines = wrapText(data.customer.address, 60);
  for (const line of addressLines) {
    drawText(line, margin, y, { size: 9, color: rgb(0.3, 0.3, 0.3) });
    y -= 12;
  }

  y -= 12;
  drawLine(y);
  y -= 20;

  // Table header
  const col = { desc: margin, qty: 330, price: 400, total: 480 };
  drawText('Item', col.desc, y, { size: 9, font: bold });
  drawText('Qty', col.qty, y, { size: 9, font: bold });
  drawText('Price', col.price, y, { size: 9, font: bold });
  drawText('Total', col.total, y, { size: 9, font: bold });
  y -= 8;
  drawLine(y);
  y -= 18;

  for (const item of data.items) {
    drawText(item.name, col.desc, y, { size: 9 });
    drawText(String(item.quantity), col.qty, y, { size: 9 });
    drawText(`Rs.${item.unit_price.toFixed(2)}`, col.price, y, { size: 9 });
    drawText(`Rs.${item.total_price.toFixed(2)}`, col.total, y, { size: 9 });
    y -= 18;
  }

  y -= 6;
  drawLine(y);
  y -= 20;

  // Totals block, right aligned
  const totalsX = 400;
  const rows: [string, number][] = [
    ['Subtotal', data.subtotal],
    ['Delivery', data.deliveryCharge],
    ...(data.discount > 0 ? ([['Discount', -data.discount]] as [string, number][]) : []),
    ['Tax', data.tax],
  ];
  for (const [label, value] of rows) {
    drawText(label, totalsX, y, { size: 9, color: rgb(0.3, 0.3, 0.3) });
    drawText(`Rs.${value.toFixed(2)}`, totalsX + 100, y, { size: 9 });
    y -= 16;
  }
  y -= 4;
  drawLine(y);
  y -= 18;
  drawText('Total', totalsX, y, { size: 11, font: bold });
  drawText(`Rs.${data.total.toFixed(2)}`, totalsX + 100, y, { size: 11, font: bold });
  y -= 40;

  // Bank details (optional)
  if (data.bank?.accountNumber) {
    drawText('Bank Details', margin, y, { size: 9, font: bold, color: rgb(0.5, 0.5, 0.5) });
    y -= 14;
    drawText(`${data.bank.accountName ?? ''}  |  ${data.bank.bankName ?? ''}`, margin, y, { size: 9 });
    y -= 12;
    drawText(`A/C: ${data.bank.accountNumber}  |  IFSC: ${data.bank.ifsc ?? ''}`, margin, y, { size: 9 });
    y -= 20;
  }

  // Footer
  const footerParts = [
    data.business.support_email,
    data.business.support_phone,
  ].filter(Boolean);
  if (footerParts.length > 0) {
    drawText(footerParts.join('   |   '), margin, 30, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  }

  return pdfDoc.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}