# Security

## What this is, and is not

basis reads two public, keyless APIs, computes a measurement, and publishes it. It holds no
funds, takes no custody, never asks for a wallet connection, never signs or constructs a
transaction, and never collects a credential. The API under `/api/v1` is read-only JSON with
no key.

The only secret in the whole system is an optional `INTERPRETER_API_KEY` that turns on the
interpreter at `/desk`. It lives in the host's environment and in a gitignored `.env.local`.
It is never committed, and a scan for key-shaped strings is part of preparing every commit.

## Reporting

If you find something — a way to make a page render a figure it should not, a header that is
missing, a route that leaks more than it states — use **GitHub's private vulnerability
reporting** on this repository (*Security → Report a vulnerability*). Please do not open a
public issue for it first.

A measurement product's entire value is that its numbers can be trusted without trusting the
people who publish them. A report that shows a number could be made wrong is the most useful
kind, and will be treated as such.

## Scope worth knowing

- The reference price API is third-party and keyless, with no service commitment to this
  project. If it changes or goes away, rows fall back to a stored capture and are flagged
  `DARK` — they are never silently presented as current.
- The interpreter's questions are a fixed set of chips. There is no free-text path to the
  model, so prompt injection through user input is not a surface that exists here.
- Every response carries `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict
  referrer policy and a locked-down permissions policy, set at the edge in `src/middleware.ts`.
