import { NextResponse } from 'next/server';

export function corsHeaders(origin?: string) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://conclave2026.vercel.app',
    'https://scaleup-one.vercel.app',
    'https://scaleupconclave.com',
    'https://www.scaleupconclave.com',
    'https://scaleup.frameforge.one',
    'https://www.conclave2026.com',
  ];

  const requestOrigin = origin || '';
  
  // If the origin is in our allowed list, use it. 
  // Otherwise, default to the origin itself to be flexible, or '*' if no origin.
  let allowOrigin = '*';
  if (requestOrigin) {
    allowOrigin = requestOrigin;
  } else {
    // Fallback to the main production origin if no origin header is present
    allowOrigin = 'https://scaleupconclave.com';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function handleCorsOptions(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin') || undefined),
  });
}
