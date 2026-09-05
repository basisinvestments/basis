import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingText, makeSlugger } from '@/lib/docs';

/**
 * The written reference, rendered in the interface it documents.
 *
 * Every element maps onto a class the design system already defines — `.spec` for
 * panels, `.tb` for tables, `.drawer` for code, `.lab` for eyebrows. Nothing new is
 * invented here, so a document about the design system is itself an example of it.
 *
 * Server component: no interactivity, so none of this reaches the client bundle.
 */

function text(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return text((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

/**
 * Built per render, not shared.
 *
 * The slugger is stateful — it suffixes repeats — so the sidebar and the document
 * must each walk their own headings from the start, in the same order, over the same
 * source. A module-level instance would carry counts between documents and every
 * anchor on the second page would be off by one.
 */
function build(): Components {
  const slug = makeSlugger();

  return {
    h2: ({ children }) => (
      <h2
        id={slug(headingText(text(children)))}
        className="font-graphik mt-14 scroll-mt-[92px] border-t border-white/10 pt-8 text-[24px] leading-[1.15] tracking-[-.02em] first:mt-0 first:border-t-0 first:pt-0 md:text-[27px]"
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        id={slug(headingText(text(children)))}
        className="font-graphik mt-9 scroll-mt-[92px] text-[17px] leading-[1.25] text-white"
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => <h4 className="lab mt-7 block">{children}</h4>,

    p: ({ children }) => (
      <p className="font-manrope mt-4 max-w-[74ch] text-[15px] leading-[26px] text-white/60">
        {children}
      </p>
    ),

    a: ({ href, children }) => {
      // Cross-references between documents are written as relative markdown paths.
      // Rewrite them to routes so they work on the site as well as in the repository.
      const to =
        href?.endsWith('.md') && !href.startsWith('http')
          ? `/docs/${href.replace(/^\.?\/?(docs\/)?/, '').replace(/\.md$/, '')}`
          : href;
      const external = to?.startsWith('http');
      return (
        <a
          href={to}
          className="text-[#AFDDFF] underline decoration-white/20 underline-offset-[3px] transition-colors hover:decoration-[#AFDDFF]"
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {children}
        </a>
      );
    },

    strong: ({ children }) => <b className="font-medium text-white/90">{children}</b>,
    em: ({ children }) => <i className="text-white/75">{children}</i>,

    ul: ({ children }) => (
      <ul className="mt-4 flex max-w-[74ch] list-none flex-col gap-[10px]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 flex max-w-[74ch] list-decimal flex-col gap-[10px] pl-5 marker:font-data marker:text-[#AFDDFF]/70">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="font-manrope relative pl-5 text-[14.5px] leading-[24px] text-white/60 before:absolute before:left-0 before:text-[#AFDDFF]/50 before:content-['·'] [ol>&]:pl-0 [ol>&]:before:content-none">
        {children}
      </li>
    ),

    blockquote: ({ children }) => (
      <blockquote
        className="mt-5 max-w-[74ch] border-l pl-5 [&>p]:text-white/75"
        style={{ borderColor: 'var(--ref)' }}
      >
        {children}
      </blockquote>
    ),

    hr: () => <hr className="mt-10 border-0 border-t border-white/10" />,

    // Fenced blocks get the drawer treatment; inline code stays inline mono.
    code: ({ className, children }) => {
      const fenced = /language-/.test(className ?? '');
      if (!fenced && !text(children).includes('\n')) {
        return (
          <code className="font-data rounded-[2px] bg-white/[0.06] px-[5px] py-[2px] text-[13px] text-[#AFDDFF]">
            {children}
          </code>
        );
      }
      return <code>{children}</code>;
    },
    pre: ({ children }) => <pre className="drawer mt-5 text-[12px] leading-[20px]">{children}</pre>,

    table: ({ children }) => (
      <div className="spec mt-6 overflow-x-auto">
        <table className="tb w-full min-w-[520px]">{children}</table>
      </div>
    ),
    th: ({ children }) => <th style={{ cursor: 'default' }}>{children}</th>,
    td: ({ children }) => <td>{children}</td>,
  };
}

export function Markdown({ body }: { body: string }) {
  return (
    <div className="docs-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={build()}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
