import { NextResponse } from 'next/server';
import { getIndicatorPayload } from '@/lib/indicator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getIndicatorPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=300',
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
