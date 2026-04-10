import { NextResponse } from 'next/server';
import { getIndicatorPayload } from '@/lib/indicator';

export async function GET() {
  try {
    const payload = await getIndicatorPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 },
    );
  }
}
