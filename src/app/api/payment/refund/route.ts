import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTossSecretKey } from '@/lib/env';
import { db } from '@/db';
import { orders, paymentEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Disable endpoint entirely if REFUND_SECRET is not configured
  const refundSecret = process.env.REFUND_SECRET;
  if (!refundSecret) {
    return NextResponse.json(
      { error: '환불 서비스를 현재 이용할 수 없습니다. 고객센터에 문의해 주세요.' },
      { status: 503 }
    );
  }

  // Require shared secret header — timing-safe comparison
  const providedSecret = req.headers.get('x-refund-secret') || '';
  const secretBuf = Buffer.from(refundSecret);
  const providedBuf = Buffer.from(providedSecret);
  const isValid = secretBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(secretBuf, providedBuf);
  if (!isValid) {
    return NextResponse.json(
      { error: '인증에 실패했습니다.' },
      { status: 401 }
    );
  }

  // Rate limit: 3 requests per IP per hour
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.refund);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { orderId, reason } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: '주문번호가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결이 없습니다. 고객센터에 문의해 주세요.' },
        { status: 503 }
      );
    }

    // Look up order
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.orderId, orderId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const order = existing[0];

    if (order.status === 'refunded') {
      return NextResponse.json(
        { error: '이미 환불된 주문입니다.' },
        { status: 400 }
      );
    }

    if (!order.paymentKey) {
      return NextResponse.json(
        { error: '결제 키가 없어 환불을 처리할 수 없습니다. 고객센터에 문의해 주세요.' },
        { status: 400 }
      );
    }

    // Log refund request
    await db.insert(paymentEvents).values({
      orderId,
      eventType: 'refund_request',
      payload: { reason: reason || '고객 요청' },
    }).catch((e: unknown) => console.error('[db] paymentEvents insert error:', e));

    // Call Toss cancel API
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${order.paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(getTossSecretKey() + ':').toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: reason || '고객 요청' }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Log refund failure
      await db.insert(paymentEvents).values({
        orderId,
        eventType: 'refund_fail',
        payload: { tossCode: data.code, tossMessage: data.message },
      }).catch((e: unknown) => console.error('[db] paymentEvents insert error:', e));

      return NextResponse.json(
        { error: data.message || '환불 처리에 실패했습니다.' },
        { status: response.status }
      );
    }

    // Update order status to refunded
    await db
      .update(orders)
      .set({ status: 'refunded' })
      .where(eq(orders.orderId, orderId));

    // Log refund success
    await db.insert(paymentEvents).values({
      orderId,
      eventType: 'refund_success',
      payload: {
        cancelAmount: data.cancels?.[0]?.cancelAmount,
        canceledAt: data.cancels?.[0]?.canceledAt,
      },
    }).catch((e: unknown) => console.error('[db] paymentEvents insert error:', e));

    return NextResponse.json({
      success: true,
      orderId,
      cancelAmount: data.cancels?.[0]?.cancelAmount,
      canceledAt: data.cancels?.[0]?.canceledAt,
    });
  } catch (err) {
    console.error('Payment refund error:', err);
    return NextResponse.json(
      { error: '환불 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
