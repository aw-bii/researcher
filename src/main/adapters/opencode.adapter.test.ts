import { describe, it, expect, vi } from 'vitest'
import { OpencodeAdapter } from './opencode.adapter'
import * as child_process from 'child_process'
import { EventEmitter } from 'events'
import type { Attachment } from '../../shared/types'

vi.mock('child_process')
vi.mock('../attachments/service', () => ({
  AttachmentService: { getContent: vi.fn((a: any) => a.extractedText ?? '') },
}))
vi.mock('../store', () => ({ ConvStore: {} }))

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
}

describe('OpencodeAdapter.send', () => {
  it('falls back to plain-text lines', async () => {
    mockSpawn(['opencode reply'])
    const adapter = new OpencodeAdapter()
    const chunks: string[] = []
    for await (const chunk of adapter.send('hello')) {
      if (chunk.type === 'text') chunks.push(chunk.content)
    }
    expect(chunks).toContain('opencode reply')
  })
})

describe('OpencodeAdapter attachment injection', () => {
  const attachment: Attachment = {
    id: 'att-3', messageId: 'msg-3', originalName: 'data.csv',
    storedPath: '/tmp/data.csv', mimeType: 'text/csv',
    sizeBytes: 200, extractedText: 'col1,col2\n1,2', extractionError: false, createdAt: 0,
  }

  it('appends injection block to the message arg', async () => {
    mockSpawn([])
    const adapter = new OpencodeAdapter()
    for await (const _ of adapter.send('analyze', undefined, [attachment])) { /* drain */ }
    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)![1] as string[]
    const msgArg = spawnArgs[spawnArgs.length - 1]
    expect(msgArg).toContain('[Attachment: data.csv]')
    expect(msgArg).toContain('col1,col2')
    expect(msgArg).toContain('[/Attachment]')
    expect(msgArg).toContain('analyze')
  })
})
