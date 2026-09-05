#!/usr/bin/env node
/**
 * The copy gates from docs/brand-compliance.md, enforced.
 *
 * Two kinds of rule. The naming rules are flat prohibitions and a grep is the right
 * tool. The honesty rule is not: this repo's whole claim is that it does not describe
 * things it has not built, and a bare grep for "hash of the one before" fails the
 * moment the page correctly says that feature does NOT exist. Tense is not greppable.
 *
 * So the honesty rule is proximity-based instead: naming an unbuilt feature is fine,
 * naming it outside a block that also carries the NOT BUILT marker is not.
 *
 * Run with `npm run gate`. CI runs the same file, so a rule cannot pass locally and
 * fail in the pipeline.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = 'src';
const failures = [];

/** Text files outside src/ that also carry copy: the docs, the root markdown, config. */
const EXTRA_ROOTS = ['docs', '.github'];
const EXTRA_FILES = ['README.md', 'SECURITY.md', 'LICENSE', 'LICENSING.md', '.env.example', 'netlify.toml'];
const TEXT_EXT = ['.ts', '.tsx', '.css', '.mjs', '.md', '.yml', '.yaml', '.toml', '.example', ''];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.ts', '.tsx', '.css', '.mjs'].includes(extname(name))) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

function walkText(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkText(p));
    else if (TEXT_EXT.includes(extname(name)) && !name.endsWith('.png')) out.push(p);
  }
  return out;
}
const everything = [
  ...files,
  ...EXTRA_ROOTS.flatMap((d) => { try { return walkText(d); } catch { return []; } })
    .map((path) => ({ path, text: readFileSync(path, 'utf8') })),
  ...EXTRA_FILES.filter((f) => { try { return statSync(f).isFile(); } catch { return false; } })
    .map((path) => ({ path, text: readFileSync(path, 'utf8') })),
];

function forbid(pattern, message, exempt) {
  for (const { path, text } of files) {
    text.split('\n').forEach((line, i) => {
      if (!pattern.test(line)) return;
      if (exempt && exempt.test(line)) return;
      failures.push(`${path}:${i + 1} — ${message}\n    ${line.trim().slice(0, 110)}`);
    });
  }
}

// --- Naming. Flat prohibitions, from docs/brand-compliance.md -----------------

// A stock ticker with regulatory restrictions attached. Appears nowhere, ever.
forbid(/\$HOOD|\bHOOD\b/, 'Never reference $HOOD or HOOD in any context.');

// The assets are "Stock Tokens". Never "tokenised stocks" or "tokenised equities".
forbid(
  /tokeni[sz]ed\s+(stock|equit)/i,
  'Say "Stock Tokens", never "tokenised stocks" or "tokenised equities".',
);

// The network is "Robinhood Chain", written in full.
forbid(
  /\bhood chain\b/i,
  'Write "Robinhood Chain" in full — never "Hood Chain" or "Chain" alone.',
  /robinhood chain/i,
);

// --- Non-affiliation. Required in the footer of every page -------------------

const footer = files.find((f) => f.path.endsWith(join('site', 'Footer.tsx')));
if (!footer) failures.push('src/components/site/Footer.tsx is missing.');
else if (!footer.text.includes('not affiliated with')) {
  failures.push(`${footer.path} — the non-affiliation notice has been removed.`);
}

// --- Honesty. An unbuilt feature may be named, but not without its marker -----

/** Features that do not exist in this build. Each needs NOT BUILT in the same block. */
const UNBUILT = [
  { name: 'hash-chained archive', probe: /hash of the one before|hash-chained/i },
  { name: 'weekend board', probe: /weekend board|settled each Monday|Weekend report/i },
];

/** A "block" is the JSX element the phrase sits in — approximated generously. */
const WINDOW = 1400;

for (const { path, text } of files) {
  for (const { name, probe } of UNBUILT) {
    const m = probe.exec(text);
    if (!m) continue;
    const from = Math.max(0, m.index - WINDOW);
    const near = text.slice(from, m.index + WINDOW);
    if (!/NOT BUILT|f-DARK|needs? a (host with a )?database|does not exist/i.test(near)) {
      const line = text.slice(0, m.index).split('\n').length;
      failures.push(
        `${path}:${line} — the ${name} is named without a NOT BUILT marker nearby.\n` +
          '    It does not exist in this build; saying so is the point of the section it sits in.',
      );
    }
  }
}

// --- Provenance. The repository is the product, its data and its docs — nothing else. ---
//
// The patterns are assembled from fragments so that this file does not itself trip
// the rule. Whole-word and case-sensitive for the two-letter one, because a hostname
// inside a URL is not a mention.
const PROVENANCE = new RegExp(['cl', 'aude', '|anthr', 'opic', '|cop', 'ilot'].join(''), 'i');

/**
 * Inference is deployment configuration, never part of the published source. A vendor
 * or model name appearing here means an implementation detail has leaked into what is
 * meant to be the product, its data and its documentation.
 */
const VENDOR = new RegExp(['open', 'router', '|open', 'ai', '|gp', 't-[0-9]'].join(''), 'i');
const TWO_LETTER = new RegExp(String.raw`\b(A${''}I|L${''}LM)s?\b`);
const SELF = 'copy-gate.mjs';

for (const { path, text } of everything) {
  if (path.endsWith(SELF)) continue;
  text.split('\n').forEach((line, i) => {
    if (PROVENANCE.test(line) || TWO_LETTER.test(line) || VENDOR.test(line)) {
      failures.push(
        `${path}:${i + 1} — names a tool or vendor that is not part of the product.\n    ${line.trim().slice(0, 110)}`,
      );
    }
  });
}

// --- Report -------------------------------------------------------------------

if (failures.length) {
  console.error(`\ncopy gate: ${failures.length} failure${failures.length === 1 ? '' : 's'}\n`);
  for (const f of failures) console.error('  ' + f + '\n');
  console.error('See docs/brand-compliance.md.\n');
  process.exit(1);
}

console.log(`copy gate: clean (${everything.length} files)`);
