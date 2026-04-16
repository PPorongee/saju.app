import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shares } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

function genSlug(len = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    const title = typeof body?.title === 'string' ? body.title.slice(0, 200) : '';
    const lang = body?.lang === 'en' ? 'en' : 'ko';

    if (!text || text.length < 10) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }
    if (text.length > 200_000) {
      return NextResponse.json({ error: 'text too long' }, { status: 413 });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = genSlug();
      try {
        await db.insert(shares).values({ slug, title, text, lang });
        return NextResponse.json({ slug });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/unique|duplicate/i.test(msg)) throw err;
      }
    }
    return NextResponse.json({ error: 'slug collision' }, { status: 500 });
  } catch (err) {
    console.error('[share POST]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
    const code = req.nextUrl.searchParams.get('code') || '';
    if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
      return NextResponse.json({ error: 'invalid code' }, { status: 400 });
    }
    const rows = await db.select().from(shares).where(eq(shares.slug, code)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const r = rows[0];
    return NextResponse.json({ title: r.title, text: r.text, lang: r.lang, createdAt: r.createdAt });
  } catch (err) {
    console.error('[share GET]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
