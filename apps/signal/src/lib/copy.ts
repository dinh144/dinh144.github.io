/**
 * Theme-only interface copy that core i18n does not carry (screen names, terminal words).
 * Everything here is presentation; content strings stay in @blog/core/i18n.
 */
import type { Locale } from '@blog/core/i18n';

const COPY = {
  vi: {
    skip: 'Bỏ qua tới nội dung',
    mainNav: 'Chính',
    home: 'trang chủ',
    'screen.label': 'Màn hình',
    'screen.dark': 'tối',
    'screen.phosphor': 'phosphor',
    'screen.light': 'sáng',
    'screen.next': 'Màn hình: {now}. Bấm để chuyển sang {next}.',
    'status.posts': 'mục',
    'status.latest': 'mới nhất',
    'status.lang': 'ngôn ngữ',
    'status.signal': 'tín hiệu',
    'status.locked': 'ổn định',
    'status.static': 'tĩnh',
    'feed.type': 'loại',
    'feed.count': '{n} mục',
    'feed.jump': 'Xuống danh sách bài',
    'code.copy': 'sao chép',
    'code.copied': 'đã chép',
    'toc.open': 'Mục lục',
    'notice.warn': 'chú ý',
    'notice.ai': 'bản dịch máy',
    progress: 'Đã đọc',
    nosignal: 'mất tín hiệu',
    'nosignal.hint': 'Đường dẫn này không trỏ tới trang nào. Thử về trang chủ hoặc tìm bài viết.',
    'series.reading': 'đang đọc',
    'tags.posts': 'bài',
    'about.cmd': 'cat about.md',
    'search.cmd': 'grep -ri',
    'keys.move': 'chuyển bài',
    'keys.search': 'tìm kiếm',
  },
  en: {
    skip: 'Skip to content',
    mainNav: 'Main',
    home: 'home',
    'screen.label': 'Screen',
    'screen.dark': 'dark',
    'screen.phosphor': 'phosphor',
    'screen.light': 'light',
    'screen.next': 'Screen: {now}. Press to switch to {next}.',
    'status.posts': 'entries',
    'status.latest': 'latest',
    'status.lang': 'language',
    'status.signal': 'signal',
    'status.locked': 'locked',
    'status.static': 'static',
    'feed.type': 'type',
    'feed.count': '{n} entries',
    'feed.jump': 'Jump to the posts',
    'code.copy': 'copy',
    'code.copied': 'copied',
    'toc.open': 'Contents',
    'notice.warn': 'note',
    'notice.ai': 'machine translation',
    progress: 'Read',
    nosignal: 'no signal',
    'nosignal.hint': 'This path does not point to a page. Head home or search the posts.',
    'series.reading': 'reading',
    'tags.posts': 'posts',
    'about.cmd': 'cat about.md',
    'search.cmd': 'grep -ri',
    'keys.move': 'move between entries',
    'keys.search': 'search',
  },
} as const;

export type CopyKey = keyof (typeof COPY)['vi'];

export function c(locale: Locale, key: CopyKey, vars: Record<string, string | number> = {}): string {
  let text: string = COPY[locale][key] ?? COPY.vi[key];
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

/** Stable 32-bit hash of a string, used to seed per-page ASCII shapes. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
