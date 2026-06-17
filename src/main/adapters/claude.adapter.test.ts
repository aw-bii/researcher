import { describe, it, expect, vi } from 'vitest'
import { ClaudeAdapter } from './claude.adapter'
import * as child_process from 'child_process'
import { EventEmitter } from 'events'

vi.mock('child_process')

function mockSpawn(stdoutLines: string[], exitCode = 0) {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = vi.fn()
  vi.mocked(child_process.spawn).mockReturnValue(proc as any)
  setTimeout(() => {
    for (const line of stdoutLines) proc.stdout.emit('data', Buffer.from(line + '\n'))
    proc.emit('close', exitCode)
  }, 0)
  return proc
}

describe('ClaudeAdapter.isAvailable', () => {
  it('returns true when spawn exits 0', async () => {
    mockSpawn([], 0)
    const adapter = new ClaudeAdapter()
    expect(await adapter.isAvailable()).toBe(true)
  })

  it('returns false when spawn exits non-zero', async () => {
    mockSpawn([], 1)
    const adapter = new ClaudeAdapter()
    expect(await adapter.isAvailable()).toBe(false)
  })
})

describe('ClaudeAdapter.send', () => {
  it('yields text chunks from stream-json output', async () => {
    const line = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } })
    mockSpawn([line])
    const adapter = new ClaudeAdapter()
    const chunks: string[] = []
    for await (const chunk of adapter.send('say hi')) {
      if (chunk.type === 'text') chunks.push(chunk.content)
    }
    expect(chunks).toContain('Hello')
  })
})
