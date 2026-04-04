import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/payment-config';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: '필수 결제 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Validate amount matches a known product price
    const validProduct = PRODUCTS.find(p => p.price === amount);
    if (!validProduct) {
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // Call Toss confirm API
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || '결제 승인에 실패했습니다.' },
        { status: response.status }
      );
    }

    // TODO: Save order to database

    return NextResponse.json({
      success: true,
      orderId: data.orderId,
      amount: data.totalAmount,
      method: data.method,
      approvedAt: data.approvedAt,
    });
  } catch (err) {
    console.error('Payment confirm error:', err);
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
