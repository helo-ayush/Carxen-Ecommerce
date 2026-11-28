import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import type { StorefrontCoupon } from '@/lib/storefront/coupons';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

    let authCustomer: any = null;
    let authUser: any = null;
    try {
      const auth = await getAuthenticatedCustomer(request);
      authCustomer = auth.customer;
      authUser = auth.user;
    } catch {
      // Unauthenticated visitor
    }

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
      .eq('storeId', store.id);

    if (campaignError || !campaigns) {
      return NextResponse.json({ coupons: [] });
    }

    const now = new Date();
    const validCampaigns = campaigns.filter((c: any) => {
      const status = String(c.status || '').toUpperCase();
      if (status !== 'ACTIVE') return false;
      if (c.startsAt && new Date(c.startsAt) > now) return false;
      if (c.endsAt && new Date(c.endsAt) < now) return false;
      if (c.usageLimit && c.usageCount && Number(c.usageCount) >= Number(c.usageLimit)) return false;
      return true;
    });

    const buyerEmail = (authCustomer?.email || authUser?.email || '').toLowerCase().trim();
    const buyerBiz = (authCustomer?.businessName || '').toLowerCase().trim();
    const buyerTrade = (authCustomer?.tradeName || '').toLowerCase().trim();
    const buyerId = authCustomer?.id || authUser?.id || '';
    const isApprovedDealer = authCustomer?.b2bStatus === 'APPROVED';

    const coupons: StorefrontCoupon[] = validCampaigns
      .filter((c: any) => {
        const rules = c.audienceRules && typeof c.audienceRules === 'object' ? c.audienceRules : {};
        const targetEmail = rules.targetWholesaleBuyerEmail
          ? String(rules.targetWholesaleBuyerEmail).toLowerCase().trim()
          : null;
        const targetName = rules.targetWholesaleBuyerName
          ? String(rules.targetWholesaleBuyerName).toLowerCase().trim()
          : null;
        const targetBuyerId = rules.targetWholesaleBuyerId
          ? String(rules.targetWholesaleBuyerId).trim()
          : null;

        const isTargeted = Boolean(targetEmail || targetName || targetBuyerId);
        if (!isTargeted) return true;
        if (!isApprovedDealer) return false;

        if (targetBuyerId && buyerId && targetBuyerId === buyerId) return true;
        if (targetEmail && buyerEmail && targetEmail === buyerEmail) return true;
        if (!targetBuyerId && !targetEmail && targetName) {
          if ((buyerBiz && buyerBiz === targetName) || (buyerTrade && buyerTrade === targetName)) {
            return true;
          }
        }
        return false;
      })
      .map((c: any) => {
        const rules = c.audienceRules && typeof c.audienceRules === 'object' ? c.audienceRules : {};
        return {
          code: c.code,
          name: c.name,
          type: c.discountType === 'PERCENTAGE' || c.discountType === 'Percentage' ? 'Percentage' : 'Fixed amount',
          value: Number(c.discountValue) || 0,
          status: 'Active',
          minimumOrder: Number(c.minimumOrderAmount) || 0,
          audience: c.audience || 'All customers',
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
