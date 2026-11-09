export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'vi' ? 'en' : 'vi';
}

/** Route param for the `[...lang]` folder: undefined for the default locale (served at the root). */
export function langParam(locale: Locale): string | undefined {
  return locale === DEFAULT_LOCALE ? undefined : locale;
}

export function localeFromParam(param: string | undefined): Locale {
  return isLocale(param) ? param : DEFAULT_LOCALE;
}

const UI = {
  vi: {
    'nav.all': 'Tất cả',
    'nav.posts': 'Bài viết',
    'nav.series': 'Chuỗi',
    'nav.notes': 'Ghi chú',
    'nav.links': 'Liên kết',
    'nav.tags': 'Chủ đề',
    'nav.about': 'Giới thiệu',
    'nav.search': 'Tìm kiếm',
    'nav.rss': 'RSS',
    'type.article': 'Bài viết',
    'type.note': 'TIL',
    'type.link': 'Liên kết',
    'type.series': 'Chuỗi',
    'post.minutes': '{n} phút đọc',
    'post.part': 'Phần {n}/{total}',
    'post.prev': 'Bài trước',
    'post.next': 'Bài sau',
    'post.toc': 'Mục lục',
    'post.summary': 'Tóm tắt',
    'post.tags': 'Chủ đề',
    'post.comments': 'Bình luận',
    'post.commentsPending': 'Bình luận (Giscus) sẽ bật sau khi cài ứng dụng giscus cho repo.',
    'post.readIn': 'Đọc bằng tiếng Anh',
    'post.fallback': 'Bài này chưa có bản tiếng Anh, bạn đang đọc bản gốc tiếng Việt.',
    'post.aiDraft': 'Bản dịch do AI tạo, tác giả chưa duyệt lại.',
    'post.visitLink': 'Mở liên kết',
    'post.updated': 'Cập nhật {date}',
    'series.parts': '{n} phần',
    'series.empty': 'Chưa có chuỗi nào.',
    'list.empty': 'Chưa có bài nào.',
    'list.older': 'Bài cũ hơn',
    'prefs.theme': 'Chuyển nền sáng hoặc tối',
    'prefs.reading': 'Chế độ đọc',
    'prefs.readingHint': 'Tắt hiệu ứng để đọc tập trung',
    'prefs.sound': 'Âm thanh',
    'prefs.on': 'Bật',
    'prefs.off': 'Tắt',
    'lang.switch': 'English',
    'lang.label': 'Ngôn ngữ',
    'footer.license': 'Nội dung {content} · Mã nguồn {code}',
    'search.title': 'Tìm kiếm',
    'search.hint': 'Gõ từ khoá để tìm trong toàn bộ bài viết.',
    'tags.title': 'Chủ đề',
    'notfound.title': 'Không tìm thấy trang',
    'notfound.back': 'Về trang chủ',
    'consent.text': 'Blog dùng Microsoft Clarity (có cookie) để xem bài được đọc thế nào. Cho phép không?',
    'consent.yes': 'Cho phép',
    'consent.no': 'Không',
  },
  en: {
    'nav.all': 'All',
    'nav.posts': 'Posts',
    'nav.series': 'Series',
    'nav.notes': 'Notes',
    'nav.links': 'Links',
    'nav.tags': 'Topics',
    'nav.about': 'About',
    'nav.search': 'Search',
    'nav.rss': 'RSS',
    'type.article': 'Post',
    'type.note': 'TIL',
    'type.link': 'Link',
    'type.series': 'Series',
    'post.minutes': '{n} min read',
    'post.part': 'Part {n}/{total}',
    'post.prev': 'Previous',
    'post.next': 'Next',
    'post.toc': 'Contents',
    'post.summary': 'Summary',
    'post.tags': 'Topics',
    'post.comments': 'Comments',
    'post.commentsPending': 'Comments (Giscus) switch on once the giscus app is installed on the repo.',
    'post.readIn': 'Đọc bằng tiếng Việt',
    'post.fallback': 'This post has no English version yet; you are reading the Vietnamese original.',
    'post.aiDraft': 'Translated by AI and not yet reviewed by the author.',
    'post.visitLink': 'Open link',
    'post.updated': 'Updated {date}',
    'series.parts': '{n} parts',
    'series.empty': 'No series yet.',
    'list.empty': 'Nothing here yet.',
    'list.older': 'Older posts',
    'prefs.theme': 'Toggle light or dark',
    'prefs.reading': 'Reading mode',
    'prefs.readingHint': 'Turn effects off to focus on reading',
    'prefs.sound': 'Sound',
    'prefs.on': 'On',
    'prefs.off': 'Off',
    'lang.switch': 'Tiếng Việt',
    'lang.label': 'Language',
    'footer.license': 'Content {content} · Code {code}',
    'search.title': 'Search',
    'search.hint': 'Type to search every post.',
    'tags.title': 'Topics',
    'notfound.title': 'Page not found',
    'notfound.back': 'Back home',
    'consent.text': 'This blog uses Microsoft Clarity (with cookies) to see how posts are read. Allow it?',
    'consent.yes': 'Allow',
    'consent.no': 'No',
  },
} as const;

export type UiKey = keyof (typeof UI)['vi'];

export function t(locale: Locale, key: UiKey, vars: Record<string, string | number> = {}): string {
  let text: string = UI[locale][key] ?? UI[DEFAULT_LOCALE][key];
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

export function formatDate(date: Date, locale: Locale, style: 'long' | 'short' | 'numeric' = 'long'): string {
  const tag = locale === 'vi' ? 'vi-VN' : 'en-GB';
  if (style === 'numeric') {
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${d}.${m}.${date.getUTCFullYear()}`;
  }
  return new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function monthLabel(date: Date, locale: Locale): string {
  const tag = locale === 'vi' ? 'vi-VN' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** ASCII slug: drops Vietnamese diacritics so tag URLs stay clean (thiết-kế -> thiet-ke). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
