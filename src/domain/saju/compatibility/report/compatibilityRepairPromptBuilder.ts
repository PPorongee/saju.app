// 궁합 리포트 부분 재작성 프롬프트.
// 전체 리포트를 매번 다시 생성하지 말고, 문제가 있는 섹션만 재작성하도록 GPT에 지시.

import type {
  CompatibilityGptInput, CompatibilityValidationIssue,
} from '../compatibilityTypes';
import type { BuiltCompatibilityPrompt } from './compatibilityPromptBuilder';

interface Args {
  previousReport: string;
  issues: CompatibilityValidationIssue[];
  gptInput: CompatibilityGptInput;
  originalPrompt: BuiltCompatibilityPrompt;
}

export function buildCompatibilityRepairPrompt(args: Args): BuiltCompatibilityPrompt {
  const { previousReport, issues, originalPrompt } = args;
  // 문제가 있는 섹션만 모아서 알려준다
  const bySection = new Map<string, CompatibilityValidationIssue[]>();
  for (const iss of issues) {
    const arr = bySection.get(iss.sectionId) ?? [];
    arr.push(iss);
    bySection.set(iss.sectionId, arr);
  }

  const issueLines: string[] = [];
  for (const [section, items] of bySection) {
    issueLines.push(`[섹션: ${section}]`);
    for (const it of items) {
      issueLines.push(`- (${it.type}, ${it.severity}) "${it.sentence}" — ${it.reason} → 제안: ${it.suggestion}`);
    }
  }

  const user = `이전에 작성한 궁합 리포트가 다음 검증 규칙을 위반했다.
같은 구조·헤더·관계 유형을 유지하되 위반된 섹션만 다시 작성하라. 위반되지 않은 섹션은 이전 그대로 둬도 된다.

[이전 리포트]
\`\`\`
${previousReport}
\`\`\`

[검증 위반]
${issueLines.join('\n')}

명심:
- 점수·등급·퍼센트 절대 금지.
- 상대 마음 단정 금지.
- 미래 사건 단정 금지.
- relationshipArchetype의 의미 바꾸지 마.
- 관계 유형 외 표현을 끌어오지 마.
- 같은 결론·표현·조언을 여러 섹션에서 반복하지 마.`;

  return {
    system: originalPrompt.system,
    user,
  };
}
