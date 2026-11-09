import type { Locale } from '@blog/core/i18n';

/**
 * Theme-only interface copy (things core i18n has no key for).
 * If this theme wins, these move into @blog/core/i18n.
 */
const COPY = {
  vi: {
    skip: 'Bỏ qua tới nội dung',
    mainNav: 'Chính',
    tagline: 'Ghi chép về lập trình, máy học và những gì mình học được mỗi tuần.',
    tempoPause: 'Tạm dừng nhịp chữ',
    tempoHint: 'Chữ chuyển động theo nhịp 96. Cuộn nhanh để tăng nhịp.',
    tempoUnit: 'nhịp/phút',
    score: 'Bản nhạc',
    entries: '{n} bài',
    playing: 'Đang đọc',
    of: 'trên',
    backTop: 'Lên đầu trang',
    fine: 'Hết',
    notFoundLead: 'Một quãng lặng. Trang này không có trong bản nhạc.',
    reading: 'Chế độ đọc',
    langName: 'English',
  },
  en: {
    skip: 'Skip to content',
    mainNav: 'Main',
    tagline: 'Notes on programming, machine learning and what I learn each week.',
    tempoPause: 'Pause the type rhythm',
    tempoHint: 'The type moves at 96 beats a minute. Scroll fast to raise the tempo.',
    tempoUnit: 'bpm',
    score: 'Score',
    entries: '{n} entries',
    playing: 'Now reading',
    of: 'of',
    backTop: 'Back to top',
    fine: 'Fine',
    notFoundLead: 'A rest. This page is not in the score.',
    reading: 'Reading mode',
    langName: 'Tiếng Việt',
  },
} as const;

export type CopyKey = keyof (typeof COPY)['vi'];

export function c(locale: Locale, key: CopyKey, vars: Record<string, string | number> = {}): string {
  let text: string = COPY[locale][key];
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

/** Two-digit bar number, like a score's measure numbers. */
export const bar = (n: number) => String(n).padStart(2, '0');
