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



export async function GET(request: Request) {
  try {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json({ success: true, vehicles: [], isGuest: true });
    }

    const meta = (customer.metadata || {}) as Record<string, any>;
    const vehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles)
      ? [...meta.garageVehicles]
      : [];

    if (meta.activeVehicle && meta.activeVehicle.b && meta.activeVehicle.m) {
      const existsInList = vehicles.some(
        (v) =>
          v.b?.toLowerCase() === meta.activeVehicle.b?.toLowerCase() &&
          v.m?.toLowerCase() === meta.activeVehicle.m?.toLowerCase()
      );
      if (!existsInList) {
        const synthetic: GarageVehicleRecord = {
          id: `veh_active_${meta.activeVehicle.b}_${meta.activeVehicle.m}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          b: meta.activeVehicle.b,
          m: meta.activeVehicle.m,
          y: meta.activeVehicle.y || '2024',
          f: meta.activeVehicle.f || 'Petrol',
          isDefault: true,
        };
        vehicles.unshift(synthetic);
      }
    }

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
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) ? meta.garageVehicles : [];

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
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) ? meta.garageVehicles : [];

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
    const existingVehicles: GarageVehicleRecord[] = Array.isArray(meta.garageVehicles) ? meta.garageVehicles : [];

    const targetVeh = existingVehicles.find((v) => v.id === id);
    const updatedVehicles = existingVehicles.filter((v) => v.id !== id);

    const isTargetActive =
      id.startsWith('veh_active_') ||
      id === 'active' ||
      id === 'all' ||
      meta.activeVehicle?.id === id ||
      (targetVeh && meta.activeVehicle && targetVeh.m?.toLowerCase() === meta.activeVehicle.m?.toLowerCase()) ||
      updatedVehicles.length === 0;

    const newActiveVehicle = isTargetActive
      ? (updatedVehicles[0] ? { b: updatedVehicles[0].b, m: updatedVehicles[0].m, y: updatedVehicles[0].y, f: updatedVehicles[0].f } : null)
      : (meta.activeVehicle || null);

    const supabase = getSupabaseAdmin();
    const updatedMeta = {
      ...meta,
      garageVehicles: updatedVehicles,
      activeVehicle: newActiveVehicle,
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
      activeVehicle: newActiveVehicle,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete vehicle';
    console.error('Customer vehicles DELETE error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
