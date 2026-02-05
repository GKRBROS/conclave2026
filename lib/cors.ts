import { NextResponse } from 'next/server';

export function corsHeaders(origin?: string) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://conclave2026.vercel.app',
    'https://www.conclave2026.com',
  ];

  const requestOrigin = origin || '';
  const allowOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsOptions(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('origin') || undefined),
  });
}
