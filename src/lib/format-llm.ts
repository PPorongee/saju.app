import type { Lang } from '@/lib/i18n';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Formats raw LLM text (with ##N.Title## section markers and markdown-like
 * markup) into an HTML string suitable for dangerouslySetInnerHTML.
 *
 * Pure utility — no React, no state, fully testable.
 */
export function formatLLMText(text: string, lang: Lang = 'ko'): string {
  if (!text || !text.trim()) return '<div class="llm-section llm-hero">Loading...</div>';

  const icons = ['🎯', '🧠', '💰', '💼', '💕', '👥', '🏥', '👨‍👩‍👧', '👶', '🛤', '🔭', '🗺', '💍', '🏠', '🍀', '✨', '💌'];
  const clss = ['s-purple', 's-blue', 's-yellow', 's-teal', 's-pink', 's-green', 's-red', 's-orange', 's-orange', 's-blue', 's-purple', 's-teal', 's-pink', 's-yellow', 's-green', 's-purple', 's-pink'];
  const defaultTitles = lang === 'en'
    ? ['', 'This is who you are', 'Personality & Mental Strength', 'Money & Wealth', 'Career Calling & Roadmap', 'Love & Destiny Map', 'Good People & People to Avoid', 'Health Report', 'Family & Relationships', 'Children & Parenting', 'Current Life Chapter', '2027 Preview', '10-Year Future Scenario', 'Best Marriage Timing', 'Home & Real Estate', 'Lucky Routines & Tips', 'Brightest Age of Your Life', 'A Letter to Myself']
    : ['', '너는 이런 사람이야', '타고난 성격 & 멘탈 체력', '돈과 나의 관계', '천직 & 커리어 로드맵', '연애 & 인연의 지도', '나에게 좋은 사람 & 주의할 사람', '건강 리포트', '가정 & 가족관계', '자녀운 & 부모 스타일', '지금 나의 인생 챕터', '2027년 미리보기', '향후 10년 미래 시나리오', '결혼 최적 타이밍', '내 집 마련 & 부동산', '행운 루틴 & 개운법', '인생에서 가장 빛나는 나이', '나에게 보내는 편지'];

  const colorMap: Record<string, string> = {
    's-purple': '#9F7AEA,#6B46C1', 's-green': '#48BB78,#2F855A', 's-orange': '#ED8936,#DD6B20',
    's-blue': '#4299E1,#2B6CB0', 's-yellow': '#ECC94B,#D69E2E', 's-teal': '#38B2AC,#2C7A7B',
    's-red': '#FC8181,#E53E3E', 's-pink': '#F687B3,#D53F8C'
  };

  // Sanitize: escape HTML tags from LLM output before formatting
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    for (let si = 30; si >= 1; si--) {
      const regex = new RegExp('##' + si + '\\.([^#]+)##', 'g');
      const match = html.match(regex);
      let titleText = defaultTitles[si] || '';
      if (match) {
        titleText = match[0].replace('##' + si + '.', '').replace('##', '').trim() || defaultTitles[si];
        html = html.replace(match[0], '|||SECTION_' + si + '|||');
      }
      const shortPat = '##' + si + '.';
      if (!match && html.indexOf(shortPat) >= 0) {
        const idx = html.indexOf(shortPat);
        let endIdx = html.indexOf('\n', idx);
        if (endIdx < 0) endIdx = idx + 50;
        titleText = html.substring(idx + shortPat.length, endIdx).replace(/##/g, '').trim() || defaultTitles[si];
        html = html.substring(0, idx) + '|||SECTION_' + si + '|||' + html.substring(endIdx);
      }
      const icon = icons[si - 1] || '🔥';
      const cls = clss[si - 1] || 's-purple';
      const colors = colorMap[cls] || '#9F7AEA,#6B46C1';
      const numBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;font-size:11px;font-weight:800;color:#fff;margin-right:6px" class="' + cls + '">' + si + '</span>';
      const cardStart = '</div><div class="llm-section" style="border-left:3px solid;border-image:linear-gradient(135deg,' + colors + ') 1"><h3>' + numBadge + '<span class="s-icon ' + cls + '">' + icon + '</span><span class="s-title">' + titleText + '</span></h3>';
      html = html.split('|||SECTION_' + si + '|||').join(cardStart);
    }

    html = html.replace(/\[([^\]]{1,20})\]/g, '<span class="s-keyword kw-tag">$1</span>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Convert remaining ##title## patterns to inline sub-headers (not new section cards)
    html = html.replace(/##([^#]{1,60})##/g, '<div style="font-size:17px;font-weight:800;color:var(--primary-light);margin:14px 0 8px;padding:6px 0;border-bottom:1px solid rgba(240,199,94,0.1)">$1</div>');
    // Remove stray # symbols (markdown headers like ### Title, ## Title, # Title)
    html = html.replace(/^#{1,4}\s*/gm, '');
    html = html.replace(/\n#{1,4}\s*/g, '\n');
    // Clean any remaining lone # characters
    html = html.replace(/#{1,4}/g, '');
    html = html.replace(/\n/g, '<br>');
    html = '<div class="llm-section llm-hero">' + html + '</div>';
    html = html.replace(/<div class="llm-section[^"]*"><\/div>/g, '');
  } catch {
    html = '<div class="llm-section llm-hero">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>';
  }

  // Defense-in-depth: sanitize final HTML to prevent XSS
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: ['class', 'style'],
  });
}
