import { NextResponse } from 'next/server';
import {
  getAuthenticatedCustomer,
  loadCustomerAddresses,
  mapAddressDbToDto,
} from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    if (isPrimary) {
      // Unset other defaults for this customer
      await supabase
        .from('ecommerce_addresses')
        .update({ isDefault: false, updatedAt: now })
        .eq('customerId', customer.id);
    }

    // Build update payload
    const updateData: Record<string, any> = {
      updatedAt: now,
    };
    if (label !== undefined) updateData.label = label;
    if (name !== undefined) updateData.recipientName = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (addressLine1 !== undefined) updateData.line1 = addressLine1.trim();
    if (addressLine2 !== undefined) updateData.line2 = addressLine2 ? addressLine2.trim() : null;
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (isPrimary !== undefined) updateData.isDefault = Boolean(isPrimary);
    if (landmark !== undefined) updateData.metadata = { landmark: landmark ? landmark.trim() : null };

    const { data: updated, error: updateErr } = await supabase
      .from('ecommerce_addresses')
      .update(updateData)
      .eq('id', id)
      .eq('customerId', customer.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Failed to update address:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, address: mapAddressDbToDto(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update address';
    console.error('Customer address PUT error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if target address was default
    const { data: target } = await supabase
      .from('ecommerce_addresses')
      .select('*')
      .eq('id', id)
      .eq('customerId', customer.id)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: 'Address not found.' }, { status: 404 });
    }

    const wasDefault = Boolean(target.isDefault);

    const { error: deleteErr } = await supabase
      .from('ecommerce_addresses')
      .delete()
      .eq('id', id)
      .eq('customerId', customer.id);

    if (deleteErr) {
      console.error('Failed to delete address:', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // If was default, promote another address to primary default
    if (wasDefault) {
      const remaining = await loadCustomerAddresses(customer.id);
      if (remaining.length > 0) {
        await supabase
          .from('ecommerce_addresses')
          .update({ isDefault: true, updatedAt: new Date().toISOString() })
          .eq('id', remaining[0].id)
          .eq('customerId', customer.id);
      }
    }

    const remainingAddresses = await loadCustomerAddresses(customer.id);
    return NextResponse.json({ success: true, addresses: remainingAddresses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete address';
    console.error('Customer address DELETE error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
