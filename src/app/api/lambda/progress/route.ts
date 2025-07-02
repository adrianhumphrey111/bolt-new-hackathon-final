import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is deprecated. Use /api/render/progress/[renderId] instead.
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Please use /api/render/progress/[renderId] instead.',
  }, { status: 410 }); // 410 Gone
}