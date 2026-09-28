import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createRateStore, pricingFilePath, readRate, resolveDshHome } from '../src/rates.ts'

const RATE = { input: 3, cacheRead: 0.3, cacheWrite: 3, output: 9 }

/** A fresh directory per test, so no two cases share a file. */
async function storePath(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dlu-rates-'))
  return pricingFilePath(root)
}

/** Write a document the store will be asked to read, creating its directory. */
async function writeDocument(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body, 'utf8')
}

describe('readRate', () => {
  it('accepts four non-negative finite prices', () => {
    expect(readRate(RATE)).toEqual(RATE)
    expect(readRate({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }))
      .toEqual({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 })
  })

  it('rejects a missing bucket, a negative price, a non-number, and NaN', () => {
    expect(readRate({ input: 1, cacheRead: 1, output: 1 })).toBeUndefined()
    expect(readRate({ ...RATE, output: -1 })).toBeUndefined()
    expect(readRate({ ...RATE, input: '1' })).toBeUndefined()
    expect(readRate({ ...RATE, cacheRead: Number.NaN })).toBeUndefined()
    expect(readRate(null)).toBeUndefined()
  })

  it('rejects an absurd price rather than persisting it', () => {
    expect(readRate({ ...RATE, output: 1_000_001 })).toBeUndefined()
  })
})

describe('resolveDshHome', () => {
  it('prefers DSH_HOME and falls back to ~/.dsh', () => {
    expect(resolveDshHome({ DSH_HOME: '/srv/dsh' }, '/Users/x')).toBe('/srv/dsh')
    expect(resolveDshHome({ DSH_HOME: '  ' }, '/Users/x')).toBe('/Users/x/.dsh')
    expect(resolveDshHome({}, '/Users/x')).toBe('/Users/x/.dsh')
  })
})

describe('rate store', () => {
  it('starts empty when the file is absent', async () => {
    const store = createRateStore(await storePath())
    expect(store.read().size).toBe(0)
  })

  it('writes, reads back, and clears one route', async () => {
    const path = await storePath()
    const store = createRateStore(path)
    expect(await store.write({ set: { 'p/a': RATE } })).toEqual({ 'p/a': RATE })
    expect(createRateStore(path).read().get('p/a')).toEqual(RATE)

    expect(await store.write({ set: { 'p/a': null } })).toEqual({})
    expect(createRateStore(path).read().size).toBe(0)
  })

  it('persists the document with its version', async () => {
    const path = await storePath()
    await createRateStore(path).write({ set: { 'p/a': RATE } })
    const document = JSON.parse(await readFile(path, 'utf8')) as { version: number; routes: unknown }
    expect(document.version).toBe(1)
    expect(document.routes).toEqual({ 'p/a': RATE })
  })

  it('ignores a corrupt document instead of failing to mount', async () => {
    const path = await storePath()
    await writeDocument(path, 'not json at all')
    expect(createRateStore(path).read().size).toBe(0)
  })

  it('ignores a document from a version it does not understand', async () => {
    const path = await storePath()
    await writeDocument(path, JSON.stringify({ version: 99, routes: { 'p/a': RATE } }))
    expect(createRateStore(path).read().size).toBe(0)
  })

  it('drops entries it cannot vouch for and keeps the rest', async () => {
    const path = await storePath()
    await writeDocument(path, JSON.stringify({
      version: 1,
      routes: { 'p/a': RATE, 'p/b': { input: 1 }, '': RATE },
    }))
    expect([...createRateStore(path).read().keys()]).toEqual(['p/a'])
  })
})
