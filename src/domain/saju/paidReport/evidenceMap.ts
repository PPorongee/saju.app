// evidenceMap 수집 헬퍼 — 모든 모듈이 동일한 id 컨벤션으로 근거를 등록한다.
// 컨벤션: id = `<source>:<slug>`  (예: 'tenGod:상관', 'usefulGod:primary', 'specialStar:천을귀인',
//          'dayMasterStrength:very-weak', 'element:water-weak', 'futureTiming:2027').

import type { PaidEvidenceMap, PaidEvidenceRef, PaidEvidenceSource } from './paidReportTypes';

export class EvidenceCollector {
  private map: PaidEvidenceMap = {};

  /**
   * 근거를 등록하고 id를 반환. 같은 id면 덮어쓰지 않고 기존 id 재사용(중복 방지).
   * slug는 한글/영문 모두 허용(공백→'-'만 정규화).
   */
  add(source: PaidEvidenceSource, slug: string, label: string, detail: string): string {
    const id = `${source}:${String(slug).trim().replace(/\s+/g, '-')}`;
    if (!this.map[id]) {
      this.map[id] = { id, source, label, detail };
    }
    return id;
  }

  ref(id: string): PaidEvidenceRef | undefined {
    return this.map[id];
  }

  has(id: string): boolean {
    return !!this.map[id];
  }

  build(): PaidEvidenceMap {
    return this.map;
  }
}
