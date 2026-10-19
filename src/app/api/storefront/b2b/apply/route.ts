import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer, STORE_ID, FACTORY_ID } from '@/lib/server/customer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      businessName,
      tradeName,
      gstin,
      pan,
      businessType,
      businessAddress,
      city,
      state,
      pincode,
      expectedMonthlyVolume,
      notes,
    } = body;

    if (!name?.trim() || !businessName?.trim()) {
      return NextResponse.json(
        { error: 'Applicant name and Legal Business Name are required.' },
        { status: 400 }
      );
    }

    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: 'Either email or mobile number is required for verification.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let authUser: any = null;
    let customer: any = null;

    try {
      const auth = await getAuthenticatedCustomer(request);
      authUser = auth.user;
      customer = auth.customer;
    } catch {
      // Unauthenticated access
    }

    if (!authUser && !customer) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to apply for a wholesale account.' },
        { status: 401 }
      );
    }

    const normalizedEmail = (email || customer?.email || authUser?.email || '').trim().toLowerCase();
    const normalizedPhone = (phone || customer?.phone || '').trim();
    const normalizedGstin = (gstin || '').trim().toUpperCase() || null;
    const normalizedPan = (pan || '').trim().toUpperCase() || null;
    const now = new Date().toISOString();

    const b2bData = {
      name: name.trim(),
      email: normalizedEmail || null,
      phone: normalizedPhone || null,
      b2bStatus: 'PENDING',
      businessName: businessName.trim(),
      tradeName: tradeName?.trim() || null,
      gstin: normalizedGstin,
      pan: normalizedPan,
      businessType: businessType?.trim() || 'Automotive Dealer / Workshop',
      businessAddress: businessAddress?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      expectedMonthlyVolume: expectedMonthlyVolume?.trim() || '₹50k–₹2L',
      wholesaleTier: 'tier1',
      b2bAppliedAt: now,
      b2bRejectionReason: null,
      b2bDocuments: notes ? { notes } : null,
      updatedAt: now,
    };

    if (customer?.id) {
      // Update existing customer record
      const { error: updateError } = await supabase
        .from('ecommerce_customers')
        .update(b2bData)
        .eq('id', customer.id);

      if (updateError) {
        console.error('Failed to update customer for B2B:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        b2bStatus: 'PENDING',
        message: 'Your B2B application has been received and is under review in Carxen Veda.',
      });
    }

    // Try finding customer by email or phone
    if (normalizedEmail) {
      const { data: existingCust } = await supabase
        .from('ecommerce_customers')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingCust) {
        const { error: updateError } = await supabase
          .from('ecommerce_customers')
          .update(b2bData)
          .eq('id', existingCust.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          b2bStatus: 'PENDING',
          message: 'Your B2B application has been received and is under review in Carxen Veda.',
        });
      }
    }

    // Create new customer with PENDING B2B status
    const newId = `cust_${crypto.randomUUID().replace(/-/g, '')}`;
    const { error: insertError } = await supabase
      .from('ecommerce_customers')
      .insert({
        id: newId,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        authUserId: authUser?.id || null,
        status: 'ACTIVE',
        metadata: {
          tier: 'Wholesale Applicant',
          rewardPoints: 500,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
        createdAt: now,
        ...b2bData,
      });

    if (insertError) {
      console.error('Failed to insert new B2B customer:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      b2bStatus: 'PENDING',
      message: 'Your B2B application has been received and is under review in Carxen Veda.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to submit B2B application';
    console.error('B2B application error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
