import { recordDailyVisit } from '@/db/analytics';

type RequestWithCloudflare = Request & {
  cf?: {
    country?: string;
  };
};

function normalizeCountry(country: string | null | undefined) {
  const normalized = country?.trim().toUpperCase();
  return normalized && /^[A-Z0-9]{2}$/.test(normalized) ? normalized : 'ZZ';
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return new Response(null, { status: 403 });
  }

  const cloudflareCountry = (request as RequestWithCloudflare).cf?.country;
  const countryCode = normalizeCountry(
    cloudflareCountry ?? request.headers.get('cf-ipcountry'),
  );
  const day = new Date().toISOString().slice(0, 10);

  try {
    await recordDailyVisit(day, countryCode);
    return new Response(null, {
      status: 204,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('Could not record anonymous visit analytics.', error);
    return new Response(null, {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
