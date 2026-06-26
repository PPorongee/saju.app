// narrative output sanitizer (2026-05 stabilize 연장).
// GPT 응답에 남은 영문 오행 키와 미래 단어를 deterministic하게 제거/치환.
// 코드 블록 ``` 내부는 보호.

const ELEMENT_KO: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
};

// 주의: 한국어 문자는 \b(word boundary)에 잡히지 않으므로 \b 제거.
// 영문/숫자 경계가 필요한 패턴(예: 연도)만 \b 유지.
const FUTURE_LEAK_PATTERNS: RegExp[] = [
  /앞으로\s*3년/g,
  /향후\s*3년/g,
  /다음\s*3년/g,
  /미래\s*흐름/g,
  /세운(?!이라는|을\s*뜻)/g, // 세운 자체 단어. "세운이라는/뜻"같은 풀이형은 통과
  /\b\d{4}년(?:\s*상반기|\s*하반기)?/g, // 2026년 / 2027년 등 (숫자 시작이라 \b OK)
];

// ============================================================
// 영문 오행 키 → 한글 치환
// 코드 블록(```...```) 내부는 건드리지 않음.
// ============================================================
export function sanitizeNarrativeText(text: string): string {
  return mapOutsideCodeBlocks(text, body => {
    let out = body;
    for (const [eng, ko] of Object.entries(ELEMENT_KO)) {
      // 단어 경계 + 대소문자 무관
      const re = new RegExp(`\\b${eng}\\b`, 'gi');
      out = out.replace(re, ko);
    }
    return out;
  });
}

// ============================================================
// 미래 단어 leak 제거 — 문장 단위 삭제하되 paragraph 줄바꿈(\n\n) 보존
// 2026-05 hotfix: 이전 버전은 split 후 join(' ')로 모든 \n을 공백으로 합쳐
// reportText 구조(헤더·문단 구분)를 망가뜨림. 문단 단위로 처리 + 문장 split 시
// 구분자도 함께 capture해서 join 시 원형 보존.
// ============================================================
export function stripFutureLeaks(text: string): string {
  return mapOutsideCodeBlocks(text, body => {
    // 문단 분할 (\n\n 보존)
    const paragraphs = body.split(/\n{2,}/);
    return paragraphs.map(para => {
      // 문장 단위 split + 구분자(공백·줄바꿈) capture
      const tokens = para.split(/(?<=[.!?])(\s+)/);
      const kept: string[] = [];
      for (let i = 0; i < tokens.length; i += 2) {
        const s = tokens[i] ?? '';
        const sep = tokens[i + 1] ?? '';
        let hasLeak = false;
        for (const re of FUTURE_LEAK_PATTERNS) {
          re.lastIndex = 0;
          if (re.test(s)) { hasLeak = true; break; }
        }
        if (!hasLeak) kept.push(s + sep);
      }
      return kept.join('');
    }).join('\n\n');
  });
}

// ============================================================
// 최종 deterministic fallback — sanitize + future strip 동시 적용
// repair 이후에도 high가 남으면 이 fallback으로 사용자 노출 직전 한 번 더 정리.
// ============================================================
export function applyFinalSanitizers(
  text: string,
  opts: { stripFuture: boolean; userContext?: UnsupportedContextInput; sanitizeFinancial?: boolean },
): string {
  let out = sanitizeNarrativeText(text);
  if (opts.stripFuture) out = stripFutureLeaks(out);
  if (opts.userContext) out = sanitizeUnsupportedUserContext(out, opts.userContext);
  if (opts.sanitizeFinancial) out = sanitizeFinancialAdviceRisk(out);
  return out;
}

// ============================================================
// financial-advice-risk sanitizer (2026-05 audit)
// moneyMonetizationNarrative 본문에서 투자/거래/시세 권유성 표현을
// 안전한 수익화·운영·계약 표현으로 치환.
// 새 기능 추가 X — 사용자 노출 직전 high issue 차단용 deterministic 안전망.
// 코드 블록(```...```) 내부는 보호.
//
// 치환 우선순위: 더 긴/구체 패턴부터 → 짧은 단어 패턴 순.
// 한국어 단어는 lookahead로 조사/공백 경계 매칭.
// ============================================================
const FINANCIAL_SANITIZE_RULES: Array<{ re: RegExp; replacement: string }> = [
  // ── 1) 가장 구체적인 복합 표현 (먼저 매칭) ────────────────
  {
    re: /(?:시장의?\s*변화와?\s*)?가격\s*흐름을?\s*보고\s*타이밍(?:에\s*맞춰)?\s*(?:거래|매매|투자)(?:하는)?/g,
    replacement: '시장과 고객의 요구를 보되 작업 범위와 가격 기준을 명확히 정해 수익 구조를 만드는',
  },
  {
    re: /가격\s*흐름을?\s*보고\s*타이밍(?:을\s*맞춰)?/g,
    replacement: '수요와 조건을 확인하고',
  },
  {
    re: /가격\s*흐름을?\s*읽(?:고|어)\s*들어가는/g,
    replacement: '수요와 조건을 확인하고 작은 단위로 검증하는',
  },
  {
    re: /가격\s*흐름을?\s*읽(?=고|어|기|는|을|면|[를을이가의에서])/g,
    replacement: '수요와 조건을 확인하',
  },
  // ── 2) 시장 타이밍 / 투자 타이밍 / 거래 타이밍 ─────────
  {
    re: /시장\s*타이밍(?:에\s*맞춰)?/g,
    replacement: '수익 구조에 맞춰',
  },
  {
    re: /투자\s*타이밍/g,
    replacement: '수익 구조 정비',
  },
  {
    re: /거래\s*타이밍(?:을\s*맞춰|을\s*보고)?/g,
    replacement: '운영 타이밍',
  },
  // ── 3) 시장 변화 / 가격 흐름 단독 ────────────────────
  {
    re: /시장\s*변동(?=[을를이가의에에서로]|\s|$)/g,
    replacement: '시장과 고객의 요구',
  },
  {
    re: /시장\s*변화/g,
    replacement: '시장과 고객의 요구',
  },
  {
    re: /가격\s*흐름/g,
    replacement: '수요와 조건',
  },
  // ── 4) 큰돈을 굴리다 ────────────────────────────────
  {
    re: /큰돈을?\s*굴리기\s*전에/g,
    replacement: '큰 결정을 하기 전에',
  },
  {
    re: /큰돈을?\s*굴리(?=기|는|면|어|고|지)/g,
    replacement: '큰 결정을 하',
  },
  // ── 5) 단기 투자 / 차익 / 트레이딩 ─────────────────
  {
    re: /단기\s*투자/g,
    replacement: '단기 수익 구조',
  },
  {
    re: /차익(?=[을를이가의에]|\s|$)/g,
    replacement: '수익',
  },
  {
    re: /트레이딩/g,
    replacement: '수익 구조 운영',
  },
  // ── 6) 매수 / 매도 / 시세 / 수익률 / 레버리지 / 베팅 ──
  // 한국어는 \b가 안 통하므로 조사·공백·문장끝 lookahead로 단어 경계 흉내
  {
    re: /매수(?=[를을이가의에에서도]|\s|$|\.|,)/g,
    replacement: '확보',
  },
  {
    re: /매도(?=[를을이가의에에서도]|\s|$|\.|,)/g,
    replacement: '정리',
  },
  {
    re: /시세(?=[를을이가의에에서도]|\s|$|\.|,)/g,
    replacement: '가격',
  },
  {
    re: /수익률(?=[을를이가의에에서도]|\s|$|\.|,)/g,
    replacement: '수익 구조',
  },
  {
    re: /레버리지(?=[를을이가의에에서도]|\s|$|\.|,)/g,
    replacement: '확장',
  },
  {
    re: /베팅(?=[를을이가의에에서도]|\s|$|\.|,)/g,
    replacement: '결정',
  },
  // ── 7) 자산 종류 단어 (주식·코인·급등·급락) ──────────
  {
    re: /주식(?=[을를이가의에에서도와과]|\s|$|\.|,)/g,
    replacement: '유가증권',
  },
  {
    re: /코인(?=[을를이가의에에서도와과]|\s|$|\.|,)/g,
    replacement: '디지털 자산',
  },
  {
    re: /급등(?=[을를이가의에에서도하한]|\s|$|\.|,)/g,
    replacement: '갑작스러운 변화',
  },
  {
    re: /급락(?=[을를이가의에에서도하한]|\s|$|\.|,)/g,
    replacement: '갑작스러운 변화',
  },
];

export function sanitizeFinancialAdviceRisk(text: string): string {
  return mapOutsideCodeBlocks(text, body => {
    let out = body;
    for (const rule of FINANCIAL_SANITIZE_RULES) {
      out = out.replace(rule.re, rule.replacement);
    }
    return out;
  });
}

// ============================================================
// unsupported-user-context sanitizer (2026-05 audit)
// relationshipStatus가 married가 아니거나 hasChildren이 true가 아닌 경우
// 본문에서 "아내/남편/배우자/자녀/아이/기혼/부부" 단정 표현을 중립 표현으로 치환.
// 명리 용어 "배우자궁"은 제외.
// ============================================================
export interface UnsupportedContextInput {
  relationshipStatus: string;
  hasChildren: boolean | 'unknown';
}
export function sanitizeUnsupportedUserContext(text: string, ctx: UnsupportedContextInput): string {
  const isMarried = ctx.relationshipStatus === 'married';
  const hasKids = ctx.hasChildren === true;
  return mapOutsideCodeBlocks(text, body => {
    let out = body;
    if (!isMarried) {
      // 단정 표현 → 중립 표현
      out = out.replace(/아내(?=[를는이가와과에도의]|$|\s)/g, '가까운 관계의 상대');
      out = out.replace(/남편(?=[를는이가와과에도의]|$|\s)/g, '가까운 관계의 상대');
      // "배우자궁" 명리 용어는 제외
      out = out.replace(/배우자(?!궁)/g, '장기적인 관계의 상대');
      out = out.replace(/기혼자/g, '관계를 길게 보는 사람');
      out = out.replace(/부부/g, '가까운 두 사람');
      out = out.replace(/결혼한\s*상태/g, '장기 관계를 생각한다면');
      out = out.replace(/결혼\s*생활/g, '장기 관계');
      out = out.replace(/신혼/g, '관계 초반');
    }
    if (!hasKids) {
      out = out.replace(/자녀(?=[를는이가와과에도의]|$|\s)/g, '후배·제자·돌봄이 필요한 대상');
      out = out.replace(/아이(?=[를는이가와과에도의]|$|\s)/g, '돌봄이 필요한 대상');
      // 아들/딸/자식 — validator는 unsupported로 잡는데 기존 치환엔 빠져 있어 누수+HIGH 유발했음(sanitizer/validator 미스매치 보완).
      out = out.replace(/아들(?=[를는이가와과에도의]|$|\s)/g, '돌봄이 필요한 대상');
      out = out.replace(/딸(?=[을는이가와과에도의]|$|\s)/g, '돌봄이 필요한 대상');
      out = out.replace(/자식(?=[을는이가와과에도의]|$|\s)/g, '돌봄이 필요한 대상');
      out = out.replace(/자녀\s*양육/g, '책임지는 대상의 성장 지원');
      out = out.replace(/자녀\s*교육/g, '후배·제자의 성장 지원');
    }
    return out;
  });
}

// ============================================================
// 코드 블록 외부에서만 변환 적용 (코드 블록 내부는 원형 유지)
// ============================================================
function mapOutsideCodeBlocks(text: string, fn: (body: string) => string): string {
  const re = /```[\s\S]*?```/g;
  let last = 0;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += fn(text.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += fn(text.slice(last));
  return out;
}
