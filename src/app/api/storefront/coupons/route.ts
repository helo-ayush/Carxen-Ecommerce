import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import type { StorefrontCoupon } from '@/lib/storefront/coupons';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

    const { data: store, error: storeError } = await supabase
      .from('ecommerce_stores')
      .select('id')
      .eq('slug', storeSlug)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ coupons: [] });
    }

    const { data: campaigns, error: campaignError } = await supabase
      .from('ecommerce_campaigns')
      .select('*')
      .eq('storeId', store.id)
      .eq('status', 'ACTIVE');

    if (campaignError || !campaigns) {
      return NextResponse.json({ coupons: [] });
    }

    const now = new Date();
    const validCampaigns = campaigns.filter((c: any) => {
      if (c.startsAt && new Date(c.startsAt) > now) return false;
      if (c.endsAt && new Date(c.endsAt) < now) return false;
      if (c.usageLimit && c.usageCount && Number(c.usageCount) >= Number(c.usageLimit)) return false;
      return true;
    });

    const coupons: StorefrontCoupon[] = validCampaigns.map((c: any) => {
      const rules = c.audienceRules && typeof c.audienceRules === 'object' ? c.audienceRules : {};
      return {
        code: c.code,
        name: c.name,
        type: c.discountType === 'PERCENTAGE' || c.discountType === 'Percentage' ? 'Percentage' : 'Fixed amount',
        value: Number(c.discountValue) || 0,
        status: 'Active',
        minimumOrder: Number(c.minimumOrderAmount) || 0,
        audience: c.audience || 'All customers',
        targetWholesaleBuyerId: rules.targetWholesaleBuyerId || null,
        targetWholesaleBuyerName: rules.targetWholesaleBuyerName || null,
        targetWholesaleBuyerEmail: rules.targetWholesaleBuyerEmail || null,
        description: rules.description || c.name,
      };
    });

    return NextResponse.json(
      { coupons },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching storefront coupons:', error);
    return NextResponse.json({ coupons: [] }, { status: 500 });
  }
}
