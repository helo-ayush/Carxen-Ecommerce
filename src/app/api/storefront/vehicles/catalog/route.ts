import { NextResponse } from 'next/server';
import { INDIAN_VEHICLES_MASTER, type VehicleMasterModel } from '@/data/indian-vehicles-master';

const nhtsaModelCache = new Map<string, VehicleMasterModel[]>();

const POPULAR_GLOBAL_MAKES = [
  'Porsche',
  'Land Rover',
  'Jaguar',
  'Lexus',
  'Mini',
  'Ferrari',
  'Lamborghini',
  'Aston Martin',
  'Maserati',
  'Bentley',
  'Rolls-Royce',
  'Subaru',
  'Mazda',
  'Chevrolet',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'models';
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const make = (searchParams.get('make') || '').trim();

  if (type === 'makes') {
    const allMakes = Array.from(
      new Set([...Object.keys(INDIAN_VEHICLES_MASTER), ...POPULAR_GLOBAL_MAKES])
    );
    const filtered = q
      ? allMakes.filter((m) => m.toLowerCase().includes(q))
      : allMakes;
    return NextResponse.json(
      { makes: filtered },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  // type === 'models'
  const matchedKey = Object.keys(INDIAN_VEHICLES_MASTER).find(
    (k) => k.toLowerCase() === make.toLowerCase()
  );

  if (matchedKey) {
    const models = INDIAN_VEHICLES_MASTER[matchedKey];
    const filtered = q
      ? models.filter((m) => m.model.toLowerCase().includes(q))
      : models;
    return NextResponse.json(
      { make: matchedKey, models: filtered, source: 'indian_master' },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  // Fallback to free NHTSA vPIC API for global / luxury brands
  if (make) {
    const cacheKey = make.toLowerCase();
    let globalModels = nhtsaModelCache.get(cacheKey);

    if (!globalModels) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`,
          { signal: controller.signal, cache: 'force-cache' }
        );
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.Results)) {
            const seen = new Set<string>();
            globalModels = [];
            for (const row of json.Results) {
              const name = String(row?.Model_Name || '').trim();
              if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                globalModels.push({
                  model: name,
                  yearFrom: 2010,
                  fuels: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
                });
              }
              if (globalModels.length >= 60) break;
            }
            nhtsaModelCache.set(cacheKey, globalModels);
          }
        }
      } catch {
        // ignore network errors gracefully
      }
    }

    if (globalModels && globalModels.length > 0) {
      const filtered = q
        ? globalModels.filter((m) => m.model.toLowerCase().includes(q))
        : globalModels;
      return NextResponse.json(
        { make, models: filtered.slice(0, 30), source: 'nhtsa_vpic' },
        { headers: { 'Cache-Control': 'public, max-age=86400' } }
      );
    }
  }

  return NextResponse.json({ make, models: [], source: 'none' });
}
