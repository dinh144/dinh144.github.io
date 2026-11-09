/**
 * Localise the footnotes block GFM generates (heading "Footnotes", back-links "Back to reference N").
 * The locale comes from the source path: content/{posts,pages}/<locale>/...
 * Only Vietnamese needs rewriting; English keeps the defaults.
 */
type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const VI = {
  heading: 'Chú thích',
  backref: (n: string) => `Quay lại chỗ chú thích ${n}`,
};

function walk(node: Node, fn: (n: Node) => void) {
  fn(node);
  node.children?.forEach((child) => walk(child, fn));
}

function localeOf(file: { path?: string; history?: string[] }): string | undefined {
  const path = file.path ?? file.history?.[0] ?? '';
  return path.match(/\/(?:posts|pages)\/(vi|en)\//)?.[1];
}

export function rehypeFootnotesI18n() {
  return (tree: Node, file: { path?: string; history?: string[] }) => {
    if (localeOf(file) !== 'vi') return;
    walk(tree, (node) => {
      if (node.type !== 'element') return;
      const props = node.properties ?? {};
      if (node.tagName === 'h2' && props.id === 'footnote-label') {
        node.children = [{ type: 'text', value: VI.heading }];
      }
      if (node.tagName === 'a' && ('dataFootnoteBackref' in props || props['data-footnote-backref'] !== undefined)) {
        const label = String(props.ariaLabel ?? props['aria-label'] ?? '');
        const n = label.match(/(\d+(?:-\d+)?)\s*$/)?.[1] ?? '';
        props.ariaLabel = VI.backref(n);
        delete props['aria-label'];
      }
    });
  };
}
