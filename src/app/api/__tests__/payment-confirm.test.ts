import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports of the mocked modules
// ---------------------------------------------------------------------------

// Mock the DB module. Tests that need db=null will override via vi.mocked.
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock reading-code generator to return a deterministic value
vi.mock('@/lib/reading-code', () => ({
  generateReadingCode: vi.fn(() => 'SAJU-2026-TEST01'),
}));

// Mock env to avoid throwing on missing TOSS_SECRET_KEY
vi.mock('@/lib/env', () => ({
  getTossSecretKey: vi.fn(() => 'test-secret-key'),
}));

// Mock rate-limit to always pass (return null = allowed)
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => null),
  RATE_LIMITS: { paymentConfirm: { limit: 10, windowSecs: 60 } },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------
import { POST } from '../payment/confirm/route';
import * as dbModule from '@/db';
import { checkRateLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/payment/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a fluent drizzle-style mock that resolves to `rows`. */
function makeDbSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

/** Build a drizzle insert mock that resolves successfully. */
function makeDbInsertMock() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

const TOSS_SUCCESS_RESPONSE = {
  orderId: 'ORDER-20260408-abc123',
  paymentKey: 'pk-toss-abc123',
  totalAmount: 9900,
  method: '카드',
  approvedAt: '2026-04-08T12:00:00+09:00',
};

function mockFetchSuccess(body = TOSS_SUCCESS_RESPONSE) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(body),
    })
  );
}

function mockFetchFailure(status = 400, body = { code: 'PAY_PROCESS_ABORTED', message: '결제 실패' }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockResolvedValue(body),
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/payment/confirm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Default: rate limit passes
    vi.mocked(checkRateLimit).mockResolvedValue(null);

    // Default: db is present, select returns empty (no existing order)
    const db = vi.mocked(dbModule.db as NonNullable<typeof dbModule.db>);
    db.select = vi.fn().mockReturnValue(makeDbSelectMock([]));
    db.insert = vi.fn().mockReturnValue(makeDbInsertMock());

    // Default: Toss API succeeds
    mockFetchSuccess();
  });

  // -------------------------------------------------------------------------
  it('confirms valid payment and returns reading code', async () => {
    const req = makeRequest({
      orderId: 'ORDER-20260408-abc123',
      paymentKey: 'pk-toss-abc123',
      amount: 990,
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.readingCode).toBe('SAJU-2026-TEST01');
    expect(data.orderId).toBe('ORDER-20260408-abc123');
    expect(data.amount).toBe(9900);
    expect(data.method).toBe('카드');

    // Toss API must have been called once
    expect(global.fetch).toHaveBeenCalledOnce();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.tosspayments.com/v1/payments/confirm',
      expect.objectContaining({ method: 'POST' })
    );

    // DB insert should have been called (orders + paymentEvents = 2 calls)
    const db = vi.mocked(dbModule.db as NonNullable<typeof dbModule.db>);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  it('returns existing data for duplicate orderId (idempotent)', async () => {
    const existingRow = {
      id: 1,
      orderId: 'ORDER-20260408-dup',
      readingCode: 'SAJU-2026-EXIST1',
      amount: 990,
      method: '카드',
      paidAt: new Date('2026-04-08T03:00:00Z'),
      status: 'paid',
      productId: 'saju-reading-1',
      paymentKey: 'pk-toss-existing',
      createdAt: new Date(),
    };

    const db = vi.mocked(dbModule.db as NonNullable<typeof dbModule.db>);
    db.select = vi.fn().mockReturnValue(makeDbSelectMock([existingRow]));

    const req = makeRequest({
      orderId: 'ORDER-20260408-dup',
      paymentKey: 'pk-toss-abc123',
      amount: 990,
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.idempotent).toBe(true);
    expect(data.readingCode).toBe('SAJU-2026-EXIST1');

    // Toss API must NOT have been called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('rejects invalid amount (not a known product price)', async () => {
    for (const amount of [1000, 2000, 5000, 0, 99999]) {
      const req = makeRequest({
        orderId: 'ORDER-20260408-bad',
        paymentKey: 'pk-toss-abc123',
        amount,
      });

      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
      // Toss should never be called for invalid amounts
      expect(global.fetch).not.toHaveBeenCalled();
    }
  });

  // -------------------------------------------------------------------------
  it('handles Toss API failure gracefully', async () => {
    mockFetchFailure(400, { code: 'PAY_PROCESS_ABORTED', message: '사용자 결제 취소' });

    const db = vi.mocked(dbModule.db as NonNullable<typeof dbModule.db>);

    const req = makeRequest({
      orderId: 'ORDER-20260408-fail',
      paymentKey: 'pk-toss-abc123',
      amount: 990,
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('사용자 결제 취소');

    // A confirm_fail event should have been written to DB
    expect(db.insert).toHaveBeenCalledOnce();
    const insertArg = (db.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // The table passed to insert is the paymentEvents table object
    expect(insertArg).toBeDefined();

    const valuesArg = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values.mock.calls[0][0];
    expect(valuesArg.eventType).toBe('confirm_fail');
    expect(valuesArg.orderId).toBe('ORDER-20260408-fail');
  });

  // -------------------------------------------------------------------------
  it('handles missing required fields', async () => {
    const cases = [
      { paymentKey: 'pk', amount: 990 },           // missing orderId
      { orderId: 'ORDER-abc', amount: 990 },         // missing paymentKey
      { orderId: 'ORDER-abc', paymentKey: 'pk' },     // missing amount
      {},                                              // all missing
    ];

    for (const body of cases) {
      const req = makeRequest(body);
      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    }

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('works without database (graceful degradation)', async () => {
    // Temporarily override the db export to null
    const original = dbModule.db;
    Object.defineProperty(dbModule, 'db', { value: null, configurable: true });

    try {
      const req = makeRequest({
        orderId: 'ORDER-20260408-nodb',
        paymentKey: 'pk-toss-abc123',
        amount: 990,
      });

      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.readingCode).toBe('SAJU-2026-TEST01');
      // Should include a warning about missing DB
      expect(data.warning).toBeTruthy();
      expect(typeof data.warning).toBe('string');

      // Toss API was still called
      expect(global.fetch).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(dbModule, 'db', { value: original, configurable: true });
    }
  });
});
