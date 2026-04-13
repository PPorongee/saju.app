import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/payment-config';
import { getTossSecretKey } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateReadingCode } from '@/lib/reading-code';
import { db } from '@/db';
import { orders, paymentEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.paymentConfirm);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: '필수 결제 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Validate amount matches the direct payment product (990 won)
    const validProduct = PRODUCTS.find(p => p.price === amount);
    if (!validProduct) {
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // Idempotency: if orderId already exists in DB, return existing data
    if (db) {
      const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.orderId, orderId))
        .limit(1);

      if (existing.length > 0) {
        const row = existing[0];
        return NextResponse.json({
          success: true,
          orderId: row.orderId,
          readingCode: row.readingCode,
          amount: row.amount,
          method: row.method ?? undefined,
          approvedAt: row.paidAt?.toISOString() ?? undefined,
          idempotent: true,
        });
      }
    }

    // Dev bypass — skip Toss API in development only
    if (paymentKey === 'dev-bypass' && process.env.NODE_ENV !== 'production') {
      const readingCode = generateReadingCode();
      return NextResponse.json({
        success: true,
        orderId,
        readingCode,
        amount,
        method: 'dev-bypass',
        approvedAt: new Date().toISOString(),
      });
    }

    // Confirm with Toss API
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(getTossSecretKey() + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log failed payment event if DB available
      if (db) {
        await db.insert(paymentEvents).values({
          orderId,
          eventType: 'confirm_fail',
          payload: { tossCode: data.code, tossMessage: data.message },
        }).catch((e: unknown) => console.error('[db] paymentEvents insert error:', e));
      }

      return NextResponse.json(
        { error: data.message || '결제 승인에 실패했습니다.' },
        { status: response.status }
      );
    }

    // Generate reading code
    const readingCode = generateReadingCode();

    // Write Order + PaymentEvent to DB
    let dbWarning: string | undefined;
    if (db) {
      try {
        await db.insert(orders).values({
          orderId: data.orderId,
          readingCode,
          productId: validProduct.id,
          amount: data.totalAmount,
          status: 'paid',
          paymentKey: data.paymentKey,
          method: data.method ?? null,
          paidAt: data.approvedAt ? new Date(data.approvedAt) : new Date(),
        });

        await db.insert(paymentEvents).values({
          orderId: data.orderId,
          eventType: 'confirm_success',
          payload: {
            paymentKey: data.paymentKey,
            method: data.method,
            approvedAt: data.approvedAt,
            totalAmount: data.totalAmount,
          },
        });
      } catch (dbErr) {
        console.error('[db] Failed to write order/event:', dbErr);
        dbWarning = '결제는 완료되었으나 주문 기록 저장에 실패했습니다. 고객센터에 문의해 주세요.';
      }
    } else {
      dbWarning = '데이터베이스 연결 없이 결제가 완료되었습니다.';
    }

    return NextResponse.json({
      success: true,
      orderId: data.orderId,
      readingCode,
      amount: data.totalAmount,
      method: data.method,
      approvedAt: data.approvedAt,
      ...(dbWarning ? { warning: dbWarning } : {}),
    });
  } catch (err) {
    console.error('Payment confirm error:', err);
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
