import { NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export interface GarageVehicleRecord {
  id: string;
  b: string; // Brand / Make
  m: string; // Model
  y: string; // Year
  f: string; // Fuel / Trim
  nickname?: string;
  isDefault?: boolean;
}

const DEFAULT_VEHICLES: GarageVehicleRecord[] = [
  { id: 'veh-1', b: 'Porsche', m: '911 GT3 (992)', y: '2023', f: 'Petrol', isDefault: true },
  { id: 'veh-2', b: 'BMW', m: 'M3 Competition', y: '2024', f: 'Petrol' },
  { id: 'veh-3', b: 'Toyota', m: 'GR Supra 3.0', y: '2022', f: 'Petrol' },
];

export async function GET(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json({ success: true, vehicles: DEFAULT_VEHICLES, isGuest: true });
    }

    const meta = (customer.metadata || {}) as Record<string, any>;
    const vehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) && meta.garageVehicles.length > 0
      ? meta.garageVehicles
      : DEFAULT_VEHICLES;

    return NextResponse.json({
      success: true,
      vehicles,
      activeVehicle: meta.activeVehicle || vehicles[0] || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vehicles';
    console.error('Customer vehicles GET error:', err);
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
    const { b, m, y, f, nickname, isDefault } = body || {};

    if (!b || !m || !y) {
      return NextResponse.json(
        { error: 'Make, Model, and Year are required to save a vehicle.' },
        { status: 400 }
      );
    }

    const newVehicle: GarageVehicleRecord = {
      id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      b: String(b).trim(),
      m: String(m).trim(),
      y: String(y).trim(),
      f: f ? String(f).trim() : 'Petrol',
      nickname: nickname ? String(nickname).trim() : undefined,
      isDefault: Boolean(isDefault),
    };

    const meta = (customer.metadata || {}) as Record<string, any>;
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) && meta.garageVehicles.length > 0
      ? meta.garageVehicles
      : [...DEFAULT_VEHICLES];

    // If marked default, unset other defaults
    const updatedVehicles: GarageVehicleRecord[] = isDefault
      ? [...existingVehicles.map((v) => ({ ...v, isDefault: false })), newVehicle]
      : [...existingVehicles, newVehicle];

    const supabase = getSupabaseAdmin();
    const updatedMeta = {
      ...meta,
      garageVehicles: updatedVehicles,
      ...(isDefault ? { activeVehicle: newVehicle } : {}),
    };

    const { error: updateErr } = await supabase
      .from('ecommerce_customers')
      .update({
        metadata: updatedMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (updateErr) {
      console.error('Failed to save vehicle to customer metadata:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicle: newVehicle,
      vehicles: updatedVehicles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add vehicle';
    console.error('Customer vehicles POST error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, b, m, y, f, nickname, isDefault } = body || {};

    if (!id || !b || !m || !y) {
      return NextResponse.json(
        { error: 'Vehicle ID, Make, Model, and Year are required.' },
        { status: 400 }
      );
    }

    const meta = (customer.metadata || {}) as Record<string, any>;
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) && meta.garageVehicles.length > 0
      ? meta.garageVehicles
      : [...DEFAULT_VEHICLES];

    const exists = existingVehicles.some((v) => v.id === id);
    if (!exists) {
      return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    }

    const updatedVehicle: GarageVehicleRecord = {
      id,
      b: String(b).trim(),
      m: String(m).trim(),
      y: String(y).trim(),
      f: f ? String(f).trim() : 'Petrol',
      nickname: nickname ? String(nickname).trim() : undefined,
      isDefault: Boolean(isDefault),
    };

    const updatedVehicles = existingVehicles.map((v) => {
      if (v.id === id) return updatedVehicle;
      return isDefault ? { ...v, isDefault: false } : v;
    });

    const supabase = getSupabaseAdmin();
    const updatedMeta = {
      ...meta,
      garageVehicles: updatedVehicles,
      ...(isDefault ? { activeVehicle: updatedVehicle } : {}),
    };

    const { error: updateErr } = await supabase
      .from('ecommerce_customers')
      .update({
        metadata: updatedMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (updateErr) {
      console.error('Failed to update vehicle in customer metadata:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
      vehicles: updatedVehicles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update vehicle';
    console.error('Customer vehicles PUT error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer session not found or expired.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Vehicle ID is required.' }, { status: 400 });
    }

    const meta = (customer.metadata || {}) as Record<string, any>;
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) && meta.garageVehicles.length > 0
      ? meta.garageVehicles
      : [...DEFAULT_VEHICLES];

    const updatedVehicles = existingVehicles.filter((v) => v.id !== id);

    const supabase = getSupabaseAdmin();
    const updatedMeta = {
      ...meta,
      garageVehicles: updatedVehicles,
      ...(meta.activeVehicle?.id === id ? { activeVehicle: updatedVehicles[0] || null } : {}),
    };

    const { error: updateErr } = await supabase
      .from('ecommerce_customers')
      .update({
        metadata: updatedMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (updateErr) {
      console.error('Failed to delete vehicle from customer metadata:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicles: updatedVehicles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete vehicle';
    console.error('Customer vehicles DELETE error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
