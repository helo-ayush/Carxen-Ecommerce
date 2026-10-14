import { NextResponse } from 'next/server';
import {
  getAuthenticatedCustomer,
  loadCustomerAddresses,
  mapAddressDbToDto,
  STORE_ID,
  FACTORY_ID,
} from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const addresses = await loadCustomerAddresses(customer.id);
    return NextResponse.json({ success: true, addresses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch addresses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      label,
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      postalCode,
      country,
      isPrimary,
    } = body || {};

    if (!name || !addressLine1 || !postalCode) {
      return NextResponse.json(
        { error: 'Recipient name, address line 1, and pin code are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Check existing addresses
    const existing = await loadCustomerAddresses(customer.id);
    const shouldBeDefault = Boolean(isPrimary || existing.length === 0);

    if (shouldBeDefault) {
      // Unset previous defaults
      await supabase
        .from('ecommerce_addresses')
        .update({ isDefault: false, updatedAt: now })
        .eq('customerId', customer.id);
    }

    const newId = `addr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const { data: inserted, error: insertErr } = await supabase
      .from('ecommerce_addresses')
      .insert({
        id: newId,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        customerId: customer.id,
        label: (label || 'Home').trim(),
        addressType: 'SHIPPING',
        recipientName: name.trim(),
        phone: (phone || customer.phone || '').trim(),
        line1: addressLine1.trim(),
        line2: addressLine2?.trim() || null,
        city: (city || 'Pune').trim(),
        state: (state || 'Maharashtra').trim(),
        postalCode: postalCode.trim(),
        country: (country || 'India').trim(),
        isDefault: shouldBeDefault,
        metadata: landmark ? { landmark: landmark.trim() } : {},
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Failed to insert address:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const dto = mapAddressDbToDto(inserted);
    return NextResponse.json({ success: true, address: dto }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add address';
    console.error('Customer address POST error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
