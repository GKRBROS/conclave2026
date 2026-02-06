import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from './lib/cors';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/scaleup2026/:path*'],
};
