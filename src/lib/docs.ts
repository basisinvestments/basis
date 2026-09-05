import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The written reference, read from `docs/*.md` at build time.
 *
 * The markdown files stay canonical rather than being hand-ported into TSX. A port
 * would be a second copy of every fact, and the two would drift — which is exactly
 * the failure this project spends the rest of its effort avoiding. The site renders
 * the same file a reader would open in the repository.
 *
 * `PUBLISHED` is the whole set. Internal build plans are not kept in this repository
 * at all, so there is nothing here that is tracked but withheld.
 */

export interface DocMeta {
  slug: string;
  title: string;
  /** One line for the index. Written once, here. */
  blurb: string;
}

/**
 * Curated and ordered — what to read first, not what sorts first. The order follows
 * the same argument the landing page makes: what it measures, where the numbers come
 * from, what the token is for, then the machinery underneath.
 */
const PUBLISHED: ReadonlyArray<{ slug: string; blurb: string }> = [
  {
    slug: 'product',
    blurb:
      'What basis measures, the two formulas and why there are two, the flag thresholds, and what it refuses to claim.',
  },
  {
    slug: 'use-cases',
    blurb:
      'What it is for, with the figures that make each case: what the wrong pool costs, the weekend gap, corporate actions, and what a protocol would read.',
  },
  {
    slug: 'data-sources',
    blurb:
      'Both upstreams, measured. The ERC-8056 multiplier, the CORS wall, the dust floor, and the corporate-action trap.',
  },
  {
    slug: 'token',
    blurb:
      'The three engines, their published switch-on conditions, and the mandate each one runs under.',
  },
  {
    slug: 'desk',
    blurb:
      'The personal instrument panel, and the interpreter — what grounds it and what it will not do.',
  },
  {
    slug: 'api',
    blurb:
      'Every endpoint, its shape, and its build status stated honestly. Read-only JSON, no key.',
  },
  {
    slug: 'architecture',
    blurb: 'How a reading is assembled, why this is a server-rendered app, and how it degrades.',
  },
  {
    slug: 'design-system',
    blurb:
      'The colours that carry meaning, the three type roles, and the rules the interface holds to.',
  },
  {
    slug: 'brand-compliance',
    blurb:
      'The naming rules, the standing copy rules, and the unresolved question, quoted from the source.',
  },
  {
    slug: 'roadmap',
    blurb:
      'What is next, what it is gated on, and — the part most roadmaps omit — what might never ship.',
  },
];

const DOCS_DIR = join(process.cwd(), 'docs');

/** Carriage return, built rather than written, so no tooling can mangle the escape. */
const CR = String.fromCharCode(13);

function read(slug: string): string {
  // Normalised to LF at the boundary. On a Windows checkout these files are CRLF, and
  // a JS regex dot does not match a carriage return — so the heading patterns below
  // matched nothing and the contents rail came out empty, while the identical code
  // worked on a Linux build. One normalisation here beats making every consumer
  // CRLF-aware, and beats a bug that only shows up on one developer's machine.
  return readFileSync(join(DOCS_DIR, `${slug}.md`), 'utf8').split(CR).join('');
}

/** The first `# ` heading. Every document has one; the fallback keeps a typo from 500ing. */
function titleOf(markdown: string, slug: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m?.[1]?.trim() ?? slug;
}

export function allDocs(): DocMeta[] {
  return PUBLISHED.map(({ slug, blurb }) => ({
    slug,
    title: titleOf(read(slug), slug),
    blurb,
  }));
}

export function docSlugs(): string[] {
  return PUBLISHED.map((d) => d.slug);
}

export function getDoc(slug: string): { meta: DocMeta; body: string } | null {
  const entry = PUBLISHED.find((d) => d.slug === slug);
  if (!entry) return null;

  let markdown: string;
  try {
    markdown = read(slug);
  } catch {
    return null;
  }

  const title = titleOf(markdown, slug);
  // The H1 becomes the page heading, so drop it from the body rather than printing
  // the title twice.
  const body = markdown.replace(/^#\s+.+$/m, '').trimStart();

  return { meta: { slug, title, blurb: entry.blurb }, body };
}

/** Strip the markdown a heading carries so the label reads as plain text. */
export function headingText(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*?([^*]*)\*\*?/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

function baseId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  );
}

/**
 * Ids have to be unique within a page and identical between the sidebar and the
 * rendered document, or the nav links point at nothing. One slugger walks the
 * headings in document order on both sides, suffixing any repeat.
 */
export function makeSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = baseId(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * The `##` and `###` headings, for the sidebar.
 *
 * Fence-aware: a `# comment` inside a shell block is not a heading, and these
 * documents are full of shell blocks. Nothing currently trips it, which is exactly
 * when a parser like this should be written rather than after it silently eats one.
 */
export function outlineOf(body: string): Heading[] {
  const slug = makeSlugger();
  const out: Heading[] = [];
  let inFence = false;

  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!m?.[1] || !m[2]) continue;

    const text = headingText(m[2]);
    out.push({ id: slug(text), text, level: m[1].length === 2 ? 2 : 3 });
  }
  return out;
}

export interface NavDoc extends DocMeta {
  sections: Heading[];
}

/** Every document with its headings — the whole sidebar, built once at build time. */
export function docsNav(): NavDoc[] {
  return PUBLISHED.map(({ slug, blurb }) => {
    const markdown = read(slug);
    return {
      slug,
      title: titleOf(markdown, slug),
      blurb,
      sections: outlineOf(markdown.replace(/^#\s+.+$/m, '').trimStart()),
    };
  });
}
