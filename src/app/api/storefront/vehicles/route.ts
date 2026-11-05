import { NextResponse } from 'next/server';
import { getActiveVehiclesFromDatabase } from '@/lib/server/vehicles';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterBrand = searchParams.get('brand');
    const inventoryOnly = searchParams.get('inventoryOnly') === 'true';

    const data = await getActiveVehiclesFromDatabase();

    if (filterBrand) {
      const matchBrand = data.brands.find(
        (b) => b.toLowerCase() === filterBrand.trim().toLowerCase(),
      );
      if (!matchBrand) {
        return NextResponse.json({
          success: true,
          brand: filterBrand,
          models: [],
          inventoryModels: [],
        });
      }

      return NextResponse.json({
        success: true,
        brand: matchBrand,
        models: data.modelsByBrand[matchBrand] || [],
        inventoryModels: data.inventoryVehicles.find((v) => v.brand === matchBrand)?.models || [],
      });
    }

    if (inventoryOnly) {
      return NextResponse.json({
        success: true,
        source: data.source,
        brands: data.inventoryVehicles.map((v) => v.brand),
        modelsByBrand: Object.fromEntries(
          data.inventoryVehicles.map((v) => [v.brand, v.models]),
        ),
        inventoryVehicles: data.inventoryVehicles,
        inventoryModels: data.inventoryModels,
        totalFitmentsCount: data.totalFitmentsCount,
      });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Storefront vehicles API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve active vehicle catalogue.' },
      { status: 500 },
    );
  }
}
