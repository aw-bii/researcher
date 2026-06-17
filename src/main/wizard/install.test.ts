import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

vi.mock('child_process', () => {
  return { spawn: vi.fn() }
})

import { installBackend } from './install'
import * as childProcess from 'child_process'

function mockSpawnWithEmitter() {
  const stdout = new EventEmitter()
  const stderr = new EventEmitter()
  const proc = {
    stdout,
    stderr,
    on: vi.fn((event: string, cb: Function) => {
      if (event === 'close') setTimeout(() => cb(0), 0)
      if (event === 'error') {}
    }),
  }
  vi.mocked(childProcess.spawn).mockReturnValue(proc as any)
  return { stdout, stderr }
}

describe('installBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves true when gemini install succeeds', async () => {
    mockSpawnWithEmitter()
    const result = await installBackend('gemini', vi.fn())
    expect(result).toBe(true)
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'npm',
      ['install', '-g', '@google/gemini-cli'],
      expect.not.objectContaining({ shell: true }),
    )
  })

  it('resolves false for unknown backend', async () => {
    mockSpawnWithEmitter()
    const result = await installBackend('unknown', vi.fn())
    expect(result).toBe(false)
    expect(childProcess.spawn).not.toHaveBeenCalled()
  })

  it('calls onData callback with stdout lines', async () => {
    const { stdout } = mockSpawnWithEmitter()
    const onData = vi.fn()
    const promise = installBackend('opencode', onData)
    stdout.emit('data', Buffer.from('line1\nline2\n'))
    const result = await promise
    expect(result).toBe(true)
    expect(onData).toHaveBeenCalledTimes(2)
    expect(onData).toHaveBeenNthCalledWith(1, 'line1', expect.any(Number), expect.any(Array))
    expect(onData).toHaveBeenNthCalledWith(2, 'line2', expect.any(Number), expect.any(Array))
  })
})
