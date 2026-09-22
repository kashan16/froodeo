/* eslint-disable @typescript-eslint/no-explicit-any */
import { InvoiceClassicDocument } from '@/components/pdf/blocks/invoice-classic/invoice-classic';
import { InvoiceClassicData } from '@/components/pdf/blocks/invoice-classic/invoice-classic.types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { render } from 'takumi-pdf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name))')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: settings } = await supabaseAdmin.from('invoice_settings').select('*').eq('id', 1).single();

  // Assign the invoice number on first generation, atomically
  const { data: assignedNumber } = await supabaseAdmin.rpc('assign_invoice_number', {
    p_order_id: order.id,
  });
  const invoiceNumber = assignedNumber ?? order.invoice_number ?? order.id;

  const items: InvoiceClassicData['items'] = order.order_items.map((item: any) => ({
    description: item.products?.name ?? 'Item',
    quantity: item.quantity,
    unitPrice: item.unit_price,
  }));

  // delivery charge / discount aren't part of the line-item totals in the
  // schema's items — surface them as their own rows so the printed table
  // still reconciles visually with order.total
  if (order.delivery_charge > 0) {
    items.push({ description: 'Delivery Charge', quantity: 1, unitPrice: order.delivery_charge });
  }
  const totalDiscount = (order.discount ?? 0) + (order.coupon_discount ?? 0) + (order.points_discount ?? 0);
  if (totalDiscount > 0) {
    items.push({ description: 'Discount', quantity: 1, unitPrice: -totalDiscount });
  }

  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const data: InvoiceClassicData = {
    invoiceNumber: String(invoiceNumber),
    invoiceDate,
    dueDate: invoiceDate, // orders are paid up front (COD/online); no real due date
    companyName: settings?.business_name ?? 'Froodeo',
    subtitle: settings?.fssai_license ? `FSSAI: ${settings.fssai_license}` : '',
    companyAddress: settings?.business_address ?? '',
    companyEmail: settings?.support_email ?? '',
    logo: settings?.logo_url ?? undefined,
    billTo: {
      name: order.customer_name ?? '',
      address: order.delivery_address ?? '',
      email: '', // orders table has no customer email column
      phone: order.customer_phone ?? '',
    },
    items,
    summary: {
      subtotal: order.subtotal,
      tax: order.tax_amount,
      total: order.total,
    },
    paymentTerms: {
      dueDate: invoiceDate,
      method: order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment',
      gst: settings?.gstin ? `GSTIN: ${settings.gstin}` : '',
    },
    notes: 'Thank you for your business!',
  };

  const pdf = await render(<InvoiceClassicDocument data={data} />, {
    size: 'a4',
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
    },
  });
}