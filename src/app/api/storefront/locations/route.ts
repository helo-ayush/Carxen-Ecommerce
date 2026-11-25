import { NextResponse } from 'next/server';
import { State, City } from 'country-state-city';

const INDIA_STATES = State.getStatesOfCountry('IN').map((s) => ({
  name: s.name,
  isoCode: s.isoCode,
}));

const STATE_BY_ISO = new Map(INDIA_STATES.map((s) => [s.isoCode, s.name]));

const INDIA_CITIES = (City.getCitiesOfCountry('IN') || []).map((c) => ({
  city: c.name,
  state: STATE_BY_ISO.get(c.stateCode) || c.stateCode,
}));

type PincodeCacheEntry = {
  city: string;
  state: string;
  postOffices: Array<{ name: string; district: string; state: string; pincode: string }>;
};

const pincodeCache = new Map<string, PincodeCacheEntry>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'cities';
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const stateFilter = (searchParams.get('state') || '').trim().toLowerCase();
  const pin = (searchParams.get('pin') || '').replace(/\D/g, '').slice(0, 6);

  if (type === 'states') {
    const matches = q
      ? INDIA_STATES.filter((s) => s.name.toLowerCase().includes(q))
      : INDIA_STATES;
    return NextResponse.json(
      { states: matches.map((s) => s.name) },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  if (type === 'pincode') {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      return NextResponse.json({ pincode: pin, city: '', state: '', postOffices: [] });
    }

    const cached = pincodeCache.get(pin);
    if (cached) {
      return NextResponse.json(
        { pincode: pin, ...cached },
        { headers: { 'Cache-Control': 'public, max-age=86400' } }
      );
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
        cache: 'force-cache',
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const first = Array.isArray(json) ? json[0] : null;
        if (first?.Status === 'Success' && Array.isArray(first.PostOffice) && first.PostOffice.length > 0) {
          const postOffices = first.PostOffice.slice(0, 8).map((po: any) => ({
            name: String(po.Name || '').trim(),
            district: String(po.District || '').trim(),
            state: String(po.State || '').trim(),
            pincode: pin,
          }));
          const primary = postOffices[0];
          const entry: PincodeCacheEntry = {
            city: primary.district || primary.name,
            state: primary.state,
            postOffices,
          };
          pincodeCache.set(pin, entry);
          return NextResponse.json(
            { pincode: pin, ...entry },
            { headers: { 'Cache-Control': 'public, max-age=86400' } }
          );
        }
      }
    } catch {
      // Fall back gracefully if external API times out
    }

    return NextResponse.json({ pincode: pin, city: '', state: '', postOffices: [] });
  }

  // Default: type === 'cities'
  let pool = INDIA_CITIES;
  if (stateFilter) {
    const filteredByState = INDIA_CITIES.filter((c) => c.state.toLowerCase() === stateFilter);
    if (filteredByState.length > 0) {
      pool = filteredByState;
    }
  }

  if (!q) {
    return NextResponse.json(
      { cities: pool.slice(0, 20) },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  const startsWith: Array<{ city: string; state: string }> = [];
  const contains: Array<{ city: string; state: string }> = [];

  for (const item of pool) {
    const cLower = item.city.toLowerCase();
    const sLower = item.state.toLowerCase();
    if (cLower.startsWith(q)) {
      startsWith.push(item);
    } else if (cLower.includes(q) || sLower.includes(q)) {
      contains.push(item);
    }
    if (startsWith.length >= 25) break;
  }

  const combined = [...startsWith, ...contains].slice(0, 20);
  return NextResponse.json(
    { cities: combined },
    { headers: { 'Cache-Control': 'public, max-age=86400' } }
  );
}
