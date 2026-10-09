// Validate every ```mermaid block in one or more Markdown files with mermaid.parse, the way a
// Markdown viewer's renderer will. A parse error in a design doc is a defect in the deliverable,
// not cosmetics.
//
// Setup (once per session, ~30 s), then run from that folder so the packages resolve:
//   cd <scratch folder> && npm i --silent mermaid@11 jsdom
//   node <skill>/scripts/check-mermaid.mjs <spec.md> [more.md ...]
// Exit code 1 when any block fails; each failure prints the file, the block number and Mermaid's message.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(process.cwd() + '/')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>')
for (const k of ['window', 'document', 'DOMParser', 'HTMLElement', 'SVGElement', 'Element', 'Node']) {
  globalThis[k] = dom.window[k]
}
globalThis.getComputedStyle = dom.window.getComputedStyle

// require.resolve gives a file-system path (a drive-letter path on Windows); the ESM loader wants a file:// URL.
const mermaid = (await import(pathToFileURL(require.resolve('mermaid')).href)).default
const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: node check-mermaid.mjs <file.md> [...]')
  process.exit(2)
}

let failures = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const blocks = [...text.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1])
  for (const [i, code] of blocks.entries()) {
    try {
      await mermaid.parse(code)
      console.log(`${file}: block ${i + 1} OK`)
    } catch (err) {
      failures++
      console.log(`${file}: block ${i + 1} FAILED — ${String(err.message ?? err).split('\n')[0]}`)
    }
  }
  if (blocks.length === 0) console.log(`${file}: no mermaid blocks`)
}
process.exit(failures ? 1 : 0)
