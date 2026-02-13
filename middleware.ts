import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from './lib/cors';

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin') || undefined;
    const headers = corsHeaders(origin);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { 
            status: 204, // 204 No Content is better for OPTIONS
            headers 
        });
    }

    const response = NextResponse.next();
    
    // Set headers on the response if not already present
    Object.entries(headers).forEach(([key, value]) => {
        if (!response.headers.has(key)) {
            response.headers.set(key, value);
        }
    });

    return response;
}

export const config = {
    matcher: ['/scaleup2026/:path*', '/api/:path*'],
};
