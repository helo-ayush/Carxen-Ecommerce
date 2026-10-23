import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer, STORE_ID, FACTORY_ID } from '@/lib/server/customer';
import { formatUserFriendlyB2BError } from '@/lib/format-b2b-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
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
      b2bDocuments,
      documents,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Please enter the representative / applicant full name.' },
        { status: 400 }
      );
    }

    if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
      return NextResponse.json(
        { error: 'Please enter your registered Legal Business Name.' },
        { status: 400 }
      );
    }

    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: 'Please provide either a business email or mobile number for account verification.' },
        { status: 400 }
      );
    }

    // Optional field format validations
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: 'Please enter a valid business email address (e.g. name@company.com).' },
          { status: 400 }
        );
      }
    }

    if (phone && typeof phone === 'string' && phone.trim()) {
      const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanedPhone.length < 8 || cleanedPhone.length > 15) {
        return NextResponse.json(
          { error: 'Please enter a valid contact phone or WhatsApp number (8–15 digits).' },
          { status: 400 }
        );
      }
    }

    if (gstin && typeof gstin === 'string' && gstin.trim()) {
      const cleanedGst = gstin.trim().toUpperCase();
      if (cleanedGst.length !== 15) {
        return NextResponse.json(
          { error: 'GSTIN must be 15 alphanumeric characters (e.g. 22AAAAA0000A1Z5), or leave blank if unregistered.' },
          { status: 400 }
        );
      }
    }

    if (pan && typeof pan === 'string' && pan.trim()) {
      const cleanedPan = pan.trim().toUpperCase();
      if (cleanedPan.length !== 10) {
        return NextResponse.json(
          { error: 'PAN must be 10 alphanumeric characters (e.g. ABCDE1234F), or leave blank.' },
          { status: 400 }
        );
      }
    }

    if (pincode && typeof pincode === 'string' && pincode.trim()) {
      const cleanedPin = pincode.trim();
      if (!/^\d{6}$/.test(cleanedPin)) {
        return NextResponse.json(
          { error: 'Postal PIN code must be a 6-digit number.' },
          { status: 400 }
        );
      }
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

    // b2bDocuments in Postgres is JSONB NOT NULL DEFAULT '[]'
    // It must NEVER be passed as null or undefined.
    const safeDocuments =
      Array.isArray(b2bDocuments) && b2bDocuments.length > 0
        ? b2bDocuments
        : Array.isArray(documents) && documents.length > 0
        ? documents
        : b2bDocuments && typeof b2bDocuments === 'object'
        ? b2bDocuments
        : typeof notes === 'string' && notes.trim().length > 0
        ? [{ type: 'applicant_note', text: notes.trim(), date: now }]
        : [];

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
      b2bDocuments: safeDocuments ?? [],
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
        return NextResponse.json({ error: formatUserFriendlyB2BError(updateError) }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        b2bStatus: 'PENDING',
        message: 'Your B2B application has been received and is under review in Carxen Veda.',
      });
    }

    // Try finding customer by email or phone
    if (normalizedEmail) {
      const { data: existingCust, error: findError } = await supabase
        .from('ecommerce_customers')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (findError) {
        console.error('Customer lookup by email error:', findError);
      }

      if (existingCust) {
        const { error: updateError } = await supabase
          .from('ecommerce_customers')
          .update(b2bData)
          .eq('id', existingCust.id);

        if (updateError) {
          console.error('Failed to update existing customer for B2B:', updateError);
          return NextResponse.json({ error: formatUserFriendlyB2BError(updateError) }, { status: 500 });
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
      return NextResponse.json({ error: formatUserFriendlyB2BError(insertError) }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      b2bStatus: 'PENDING',
      message: 'Your B2B application has been received and is under review in Carxen Veda.',
    });
  } catch (err) {
    console.error('B2B application error:', err);
    return NextResponse.json({ error: formatUserFriendlyB2BError(err) }, { status: 500 });
  }
}
