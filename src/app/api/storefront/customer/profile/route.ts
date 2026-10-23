import { NextResponse } from 'next/server';
import { getAuthenticatedCustomer, loadCustomerAddresses, loadCustomerOrders } from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, customer } = await getAuthenticatedCustomer(request);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const addresses = await loadCustomerAddresses(customer.id);
    const orders = await loadCustomerOrders(customer.id, customer.email);

    const meta = (customer.metadata || {}) as Record<string, any>;

    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderPoints = Math.floor(totalSpent / 10);
    const basePoints = typeof meta.rewardPoints === 'number' ? meta.rewardPoints : 250;
    const computedPoints = basePoints + orderPoints;

    let computedTier = meta.tier && meta.tier !== 'Apex Gold Member' ? meta.tier : null;
    if (totalSpent >= 50000) {
      computedTier = 'Apex Titanium Member';
    } else if (totalSpent >= 15000) {
      computedTier = 'Apex Gold Member';
    } else if (totalSpent >= 5000) {
      computedTier = 'Apex Silver Member';
    }

    const profile = {
      id: customer.id,
      authUserId: customer.authUserId,
      name: customer.name,
      email: customer.email || user?.email || '',
      phone: customer.phone || '',
      avatarUrl: meta.avatarUrl || user?.user_metadata?.avatar_url || '',
      tier: computedTier,
      rewardPoints: computedPoints,
      joinedDate:
        meta.joinedDate ||
        (customer.createdAt
          ? new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : 'Oct 2024'),
      communicationPrefs: meta.communicationPrefs || null,
      gstBilling: meta.gstBilling || null,
      savedPayments: Array.isArray(meta.savedPayments) ? meta.savedPayments : null,
      garageVehicles: Array.isArray(meta.garageVehicles) && meta.garageVehicles.length > 0
        ? meta.garageVehicles
        : [
            { id: 'veh-1', b: 'Porsche', m: '911 GT3 (992)', y: '2023', f: 'Petrol', isDefault: true },
            { id: 'veh-2', b: 'BMW', m: 'M3 Competition', y: '2024', f: 'Petrol' },
            { id: 'veh-3', b: 'Toyota', m: 'GR Supra 3.0', y: '2022', f: 'Petrol' },
          ],
      activeVehicle: meta.activeVehicle || null,
      b2bStatus: (customer as any).b2bStatus || 'NONE',
      businessName: (customer as any).businessName || null,
      tradeName: (customer as any).tradeName || null,
      gstin: (customer as any).gstin || null,
      pan: (customer as any).pan || null,
      businessType: (customer as any).businessType || null,
      businessAddress: (customer as any).businessAddress || null,
      city: (customer as any).city || null,
      state: (customer as any).state || null,
      pincode: (customer as any).pincode || null,
      expectedMonthlyVolume: (customer as any).expectedMonthlyVolume || null,
      wholesaleTier: (customer as any).wholesaleTier || 'tier1',
      b2bAppliedAt: (customer as any).b2bAppliedAt || null,
      b2bReviewedAt: (customer as any).b2bReviewedAt || null,
      b2bRejectionReason: (customer as any).b2bRejectionReason || null,
    };

    return NextResponse.json({
      success: true,
      profile,
      addresses,
      orders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer profile';
    console.error('Customer profile GET error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, customer } = await getAuthenticatedCustomer(request);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      phone,
      avatarUrl,
      communicationPrefs,
      gstBilling,
      savedPayments,
      garageVehicles,
      activeVehicle,
    } = body || {};

    const existingMeta = (customer.metadata || {}) as Record<string, any>;
    const updatedMeta: Record<string, any> = {
      ...existingMeta,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(communicationPrefs !== undefined ? { communicationPrefs } : {}),
      ...(gstBilling !== undefined ? { gstBilling } : {}),
      ...(savedPayments !== undefined ? { savedPayments } : {}),
      ...(garageVehicles !== undefined ? { garageVehicles } : {}),
      ...(activeVehicle !== undefined ? { activeVehicle } : {}),
    };

    const trimmedName = typeof name === 'string' && name.trim() ? name.trim() : customer.name;
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : customer.phone;

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: updatedCustomer, error: updateErr } = await supabase
      .from('ecommerce_customers')
      .update({
        name: trimmedName,
        phone: trimmedPhone,
        metadata: updatedMeta,
        updatedAt: now,
      })
      .eq('id', customer.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Failed to update customer row:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Sync with Supabase Auth metadata if user is linked
    if (user?.id) {
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            full_name: trimmedName,
            phone: trimmedPhone,
            ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
          },
        });
      } catch (authSyncErr) {
        console.warn('Could not sync user_metadata in Supabase auth:', authSyncErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedCustomer.id,
        authUserId: updatedCustomer.authUserId,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        avatarUrl: updatedMeta.avatarUrl || '',
        tier: updatedMeta.tier || null,
        rewardPoints: updatedMeta.rewardPoints ?? 250,
        joinedDate: updatedMeta.joinedDate || 'Oct 2024',
        communicationPrefs: updatedMeta.communicationPrefs || null,
        gstBilling: updatedMeta.gstBilling || null,
        savedPayments: updatedMeta.savedPayments || null,
        garageVehicles: updatedMeta.garageVehicles || null,
        activeVehicle: updatedMeta.activeVehicle || null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update customer profile';
    console.error('Customer profile PUT error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
