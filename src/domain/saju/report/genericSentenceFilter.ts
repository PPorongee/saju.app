// 금칙 문장 필터 (spec §15)
// GPT 응답 텍스트에서 (a) 일반론, (b) 컨텍스트 충돌, (c) 근거 없는 미래 단정,
// (d) 공포 마케팅, (e) 과장된 희소성, (f) 의학/법률/재정 단정을 감지한다.

import type {
  ValidationIssue,
  SpecialPoint,
} from './sajuReportSchema';
import type { UserContext } from '../calendar/normalizeBirthInput';

interface FilterInput {
  reportText: string;
  userContext: UserContext;
  specialPoints: SpecialPoint[];
}

// 단순 패턴(완성 문장의 부분 매칭) 위주. 향후 더 정교한 NLP로 교체 가능.
const GENERIC_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /노력하면 좋아질( 것)?입니다/, reason: '일반론: 노력하면 좋아진다' },
  { re: /긍정적으로 생각하세요/,        reason: '일반론: 긍정적으로 생각하라' },
  { re: /좋은 인연이 들어옵니다/,       reason: '일반론: 좋은 인연' },
  { re: /돈을 조심하세요/,              reason: '일반론: 돈 조심' },
  { re: /건강을 챙기세요/,              reason: '일반론: 건강 챙기기' },
  { re: /청소년기에는 친구관계가 중요했/, reason: '나이대만 알면 가능한 말' },
  { re: /당신은 착하고 배려심이 있/,    reason: '바넘 효과식 일반론' },
];

const FEAR_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /이 시기를 놓치면 인생이 무너/, reason: '공포 마케팅' },
  { re: /이 운을 잘못 쓰면 큰일/,        reason: '공포 마케팅' },
  { re: /평생 (귀인이 )?도와줍니다/,    reason: '단정적 운명론' },
  { re: /앞으로 대박이 (납니|터집)/,    reason: '근거 없는 단정' },
  { re: /상위 1% 사주/,                  reason: '과장된 희소성' },
];

const MEDICAL_LEGAL_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /(반드시|틀림없이|확실히) (병|질병|사망|수명)/, reason: '의학/수명 단정' },
  { re: /(반드시|틀림없이) (소송|법률|재판)/,           reason: '법률 단정' },
  { re: /(반드시|틀림없이) 수익/,                       reason: '투자 수익 단정' },
];

// 컨텍스트 충돌 — 사용자 상태와 본문 매칭
function buildContextPatterns(ctx: UserContext): Array<{ re: RegExp; reason: string }> {
  const out: Array<{ re: RegExp; reason: string }> = [];
  if (ctx.relationshipStatus === 'married') {
    out.push({ re: /새로운 인연이? (들어|찾아)/, reason: '기혼자에게 새로운 인연 단정' });
  }
  if (ctx.ageYears >= 50) {
    out.push({ re: /(출산|임신) (시기|적기|운)/, reason: '50세 이상에게 출산 시기/운' });
    out.push({ re: /(수능|첫 취업)/,             reason: '50세 이상에게 수능/첫 취업' });
  }
  if (ctx.hasChildren === false) {
    out.push({ re: /자녀 때문에/, reason: '자녀 없음 사용자에게 자녀 단정' });
  }
  return out;
}

// 과장된 희소성: "만 명 중 N명" 표현이 있는데, estimatedPer10000이 없는 specialPoint뿐일 때
function detectFakeRarity(text: string, points: SpecialPoint[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hits = text.match(/만 ?명 중 (약 ?)?\d+명/g) ?? [];
  if (hits.length === 0) return issues;
  const hasAnyValidStat = points.some(p => typeof p.rarity.estimatedPer10000 === 'number');
  if (!hasAnyValidStat) {
    for (const h of hits) {
      issues.push({
        type: 'fake-rarity',
        sentence: h,
        reason: 'estimatedPer10000 없이 "만 명 중 N명" 표현 사용',
        severity: 'high',
      });
    }
  }
  return issues;
}

// 본문에 specialPoints 외 신살이 등장하는지 (이름 단순 매칭)
const KNOWN_SHINSAL = ['천을귀인','문창귀인','학당귀인','월덕귀인','천덕귀인','태극귀인','괴강','양인','백호','도화','홍염','화개','역마'];

function detectInventedSpecialPoint(text: string, points: SpecialPoint[]): ValidationIssue[] {
  const allowedNames = new Set(points.map(p => p.name));
  const issues: ValidationIssue[] = [];
  for (const name of KNOWN_SHINSAL) {
    if (text.includes(name) && !allowedNames.has(name)) {
      issues.push({
        type: 'unsupported-claim',
        sentence: name,
        reason: `specialPoints 배열에 없는 신살(${name})이 본문에 등장`,
        severity: 'medium',
      });
    }
  }
  return issues;
}

export function filterGenericSentences(input: FilterInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const text = input.reportText;

  const sentences = text.split(/(?<=[.!?。])\s+/);

  const all: Array<{ patterns: Array<{ re: RegExp; reason: string }>; type: ValidationIssue['type']; severity: ValidationIssue['severity'] }> = [
    { patterns: GENERIC_PATTERNS,        type: 'generic',                       severity: 'high'   },
    { patterns: FEAR_PATTERNS,           type: 'fear-marketing',                severity: 'high'   },
    { patterns: MEDICAL_LEGAL_PATTERNS,  type: 'medical-legal-financial-risk',  severity: 'high'   },
    { patterns: buildContextPatterns(input.userContext), type: 'context-conflict', severity: 'high' },
  ];

  for (const sent of sentences) {
    for (const group of all) {
      for (const p of group.patterns) {
        if (p.re.test(sent)) {
          issues.push({ type: group.type, sentence: sent.trim(), reason: p.reason, severity: group.severity });
        }
      }
    }
  }

  issues.push(...detectFakeRarity(text, input.specialPoints));
  issues.push(...detectInventedSpecialPoint(text, input.specialPoints));

  return issues;
}
