// Abstract payment provider interface
// Currently: Toss Payments
// Future: KakaoPay

export interface PaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
}

export interface PaymentResult {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  requestPayment(request: PaymentRequest): Promise<void>;
}

// Toss Payments Provider
export class TossPaymentProvider implements PaymentProvider {
  name = 'toss';
  private clientKey: string;

  constructor(clientKey: string) {
    this.clientKey = clientKey;
  }

  async requestPayment(request: PaymentRequest): Promise<void> {
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const tossPayments = await loadTossPayments(this.clientKey);
    const payment = tossPayments.payment({ customerKey: 'ANONYMOUS' });

    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: request.amount },
      orderId: request.orderId,
      orderName: request.orderName,
      successUrl: request.successUrl,
      failUrl: request.failUrl,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
    });
  }
}

// KakaoPay Provider (stub for future implementation)
export class KakaoPayProvider implements PaymentProvider {
  name = 'kakaopay';

  async requestPayment(_request: PaymentRequest): Promise<void> {
    throw new Error('KakaoPay is not yet implemented. Coming soon.');
  }
}

// Factory
export function createPaymentProvider(
  type: 'toss' | 'kakaopay',
  clientKey: string
): PaymentProvider {
  switch (type) {
    case 'toss':
      return new TossPaymentProvider(clientKey);
    case 'kakaopay':
      return new KakaoPayProvider();
    default:
      throw new Error(`Unknown payment provider: ${type}`);
  }
}
