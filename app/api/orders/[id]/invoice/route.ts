import { generateInvoicePdf } from '@/lib/generateInvoice';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

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

  let invoiceNumber = order.invoice_number as string | null;
  if (!invoiceNumber) {
    const { data: numberResult, error: rpcError } = await supabaseAdmin.rpc('assign_invoice_number', {
      p_order_id: order.id,
    });
    if (rpcError || !numberResult) {
      return NextResponse.json({ error: 'Failed to assign invoice number' }, { status: 500 });
    }
    invoiceNumber = numberResult;
  }

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber: String(invoiceNumber),
    invoiceDate: order.created_at,
    business: {
      name: settings?.business_name ?? 'Froodeo',
      address: settings?.business_address ?? '',
      gstin: settings?.gstin,
      pan: settings?.pan,
      fssai_license: settings?.fssai_license,
      support_email: settings?.support_email,
      support_phone: settings?.support_phone,
    },
    bank: {
      accountName: settings?.bank_account_name,
      accountNumber: settings?.bank_account_number,
      ifsc: settings?.bank_ifsc,
      bankName: settings?.bank_name,
    },
    customer: {
      name: order.customer_name ?? '',
      phone: order.customer_phone ?? '',
      address: order.delivery_address ?? '',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.order_items.map((item: any) => ({
      name: item.products?.name ?? 'Item',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    })),
    subtotal: order.subtotal,
    deliveryCharge: order.delivery_charge ?? 0,
    discount: (order.discount ?? 0) + (order.coupon_discount ?? 0) + (order.points_discount ?? 0),
    tax: order.tax_amount ?? 0,
    total: order.total,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
    },
  });
}