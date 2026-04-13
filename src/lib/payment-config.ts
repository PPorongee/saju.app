// Business info - use env.ts centralized defaults (no PII hardcoded here)
import {
  NEXT_PUBLIC_COMPANY_NAME, NEXT_PUBLIC_CEO_NAME, NEXT_PUBLIC_BUSINESS_NUMBER,
  NEXT_PUBLIC_SALES_NUMBER, NEXT_PUBLIC_ADDRESS, NEXT_PUBLIC_CS_PHONE, NEXT_PUBLIC_CS_EMAIL
} from '@/lib/env';

export const BUSINESS_INFO = {
  companyName: NEXT_PUBLIC_COMPANY_NAME,
  ceoName: NEXT_PUBLIC_CEO_NAME,
  businessNumber: NEXT_PUBLIC_BUSINESS_NUMBER,
  salesNumber: NEXT_PUBLIC_SALES_NUMBER,
  address: NEXT_PUBLIC_ADDRESS,
  phone: NEXT_PUBLIC_CS_PHONE,
  email: NEXT_PUBLIC_CS_EMAIL,
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  refundUrl: '/refund',
};

// Products
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  deliveryMethod: string;
  deliveryTime: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'saju-reading-1',
    name: 'AI 사주 해석 1회 이용권',
    description:
      '본 서비스는 이용자가 입력한 정보를 바탕으로 사주 해석 결과를 제공하는 온라인 디지털 서비스입니다. 제공되는 해석 결과는 참고용 정보이며, 특정 결과나 효과를 보장하지 않습니다.',
    price: 990,
    deliveryMethod: '결제 완료 후 웹페이지에서 즉시 결과 확인',
    deliveryTime: '즉시 제공 (일부 상품은 24시간 이내)',
  },
];

// Toss Payments config
export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

// Payment provider type for future extension
export type PaymentProvider = 'toss' | 'kakaopay';

// Order ID generator
export function generateOrderId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 10);
  return `ORDER-${date}-${random}`;
}

// Order data structure
export interface OrderData {
  orderId: string;
  productId: string;
  productName: string;
  amount: number;
  paymentProvider: PaymentProvider;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  createdAt: string;
  paidAt?: string;
  paymentKey?: string;
  customerName?: string;
  customerEmail?: string;
}

// Refund policy text
export const REFUND_POLICY = [
  '본 서비스는 결제 후 즉시 또는 개별 요청에 따라 제공이 시작되는 디지털콘텐츠/온라인 용역 성격의 서비스입니다.',
  '서비스 제공이 개시되지 않은 경우에는 관계 법령 및 환불정책에 따라 환불이 가능합니다.',
  '다만, 결과 확인 페이지 열람, 결과문 전송, 개별 해석 착수 등 서비스 제공이 개시된 이후에는 환불이 제한될 수 있습니다.',
  '시스템 오류, 중복 결제 등 회사의 귀책사유가 확인되는 경우에는 환불이 가능합니다.',
];
