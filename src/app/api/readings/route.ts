import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { readings, orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validateApiToken, shouldSkipTokenValidation } from '@/lib/api-token';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.readingsGet);
  if (rateLimitResponse) return rateLimitResponse;

  // Auth check: require valid API token for non-pending writes
  // Pending saves (pre-payment) are exempt — they contain no paid content
  // and are required for the payment redirect flow (Safari ITP fallback)
  const body_peek = await req.clone().json().catch(() => ({}));
  if (!body_peek.pending) {
    const apiToken = req.headers.get('x-api-token') || '';
    if (!shouldSkipTokenValidation() && !validateApiToken(apiToken)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!db) {
    return NextResponse.json({ success: false, error: 'Database not available' });
  }

  try {
    const body = await req.json();
    const { readingCode, orderId, type, inputData, chartData, resultText, lang, pending } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (pending) {
      // Pre-payment save: store reading keyed by orderId for Safari ITP fallback.
      // No readingCode yet; orderId is required to key the record.
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'Missing orderId for pending save' }, { status: 400 });
      }

      // Use orderId as a temporary readingCode placeholder (prefixed to avoid collision).
      const tempCode = `pending_${orderId}`;

      // Upsert: delete any old pending record for this orderId, then insert fresh.
      await db.delete(readings).where(eq(readings.readingCode, tempCode));
      await db.insert(readings).values({
        readingCode: tempCode,
        orderId,
        type,
        inputData: inputData ?? null,
        chartData: chartData ?? null,
        resultText: resultText ?? null,
        lang: lang ?? 'ko',
      });

      return NextResponse.json({ success: true, tempCode });
    }

    // Normal (post-payment) save: require readingCode and a paid order.
    if (!readingCode || !orderId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.orderId, orderId))
      .limit(1);

    if (orderRows.length === 0 || orderRows[0].status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Payment required' }, { status: 403 });
    }

    await db.insert(readings).values({
      readingCode,
      orderId: orderId ?? null,
      type,
      inputData: inputData ?? null,
      chartData: chartData ?? null,
      resultText: resultText ?? null,
      lang: lang ?? 'ko',
    });

    return NextResponse.json({ success: true, readingCode });
  } catch (err) {
    console.error('[readings POST]', err);
    return NextResponse.json({ success: false, error: 'Failed to save reading' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Rate limit: 10 requests per IP per minute
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.readingsGet);
  if (rateLimitResponse) return rateLimitResponse;

  // Auth check on GET — require valid token to access reading data
  const apiToken = req.headers.get('x-api-token') || '';
  if (!shouldSkipTokenValidation() && !validateApiToken(apiToken)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get('code');
  const orderId = req.nextUrl.searchParams.get('orderId');

  if (!code && !orderId) {
    return NextResponse.json({ success: false, error: 'Missing code or orderId parameter' }, { status: 400 });
  }

  try {
    let rows;
    if (code) {
      rows = await db.select().from(readings).where(eq(readings.readingCode, code)).limit(1);
    } else {
      // Look up by pending temp code keyed to orderId
      const tempCode = `pending_${orderId}`;
      rows = await db.select().from(readings).where(eq(readings.readingCode, tempCode)).limit(1);
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Reading not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, reading: rows[0] });
  } catch (err) {
    console.error('[readings GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reading' }, { status: 500 });
  }
}
