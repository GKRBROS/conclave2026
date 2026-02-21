import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from './lib/cors';
import { recordRequest } from './lib/analyticsEvents';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  try {
    const url = new URL(request.url);
    recordRequest(url.pathname, request.method);
  } catch {
  }

  const response = NextResponse.next();

  Object.entries(headers).forEach(([key, value]) => {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  });

  return response;
}

export const config = {
  matcher: ['/scaleup2026/:path*', '/api/:path*', '/analytics/:path*'],
};
