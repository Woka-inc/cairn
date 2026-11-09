// The repository itself passes the pre-publication scan (no deny-list; see scripts/precheck.mjs).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scan } from '../scripts/precheck.mjs'

test('no private paths, hosts, keys, e-mail addresses, or misplaced Hangul in the repository', () => {
  const res = scan(undefined, [])
  assert.ok(res.files > 50, `scanned ${res.files} files`)
  assert.deepEqual(res.hits, [])
})
