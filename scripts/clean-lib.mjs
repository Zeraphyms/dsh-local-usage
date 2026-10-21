#!/usr/bin/env node
/**
 * Remove the previous build before a full build.
 *
 * tsdown writes the two halves into one `lib/` and leaves declarations from
 * modules that no longer exist unless the directory is emptied first. Cleaning
 * here, once, keeps the two tsdown configs from racing each other over the same
 * output directory while still making a deleted source file disappear from the
 * package.
 *
 * @module dsh-local-usage/scripts/clean-lib
 */

import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
rmSync(join(root, '..', 'lib'), { recursive: true, force: true })
