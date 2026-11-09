/**
 * Display names for tags on the English side. Tags are stored once (in Vietnamese where the
 * author wrote them so) and shared by both translations; URLs keep the ASCII slug.
 * Local workaround: this belongs in @blog/core/i18n (see the theme's report).
 */
import { slugify, type Locale } from '@blog/core/i18n';

const EN: Record<string, string> = {
  'thiet-ke': 'design',
  'kien-truc': 'architecture',
  'kieu-chu': 'typography',
  'may-hoc': 'machine learning',
  'lap-trinh': 'programming',
};

export function tagLabel(locale: Locale, name: string): string {
  if (locale !== 'en') return name;
  return EN[slugify(name)] ?? name;
}
