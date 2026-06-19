import { describe, it, expect, vi } from 'vitest'
import { GeminiAdapter } from './gemini.adapter'
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

describe('GeminiAdapter.send', () => {
  it('yields text chunks from JSON output', async () => {
    const line = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hi there' }] } }] })
    mockSpawn([line])
    const adapter = new GeminiAdapter()
    const chunks: string[] = []
    for await (const chunk of adapter.send('hello')) {
      if (chunk.type === 'text') chunks.push(chunk.content)
    }
    expect(chunks).toContain('Hi there')
  })

  it('falls back to plain-text lines when JSON parse fails', async () => {
    mockSpawn(['plain text response'])
    const adapter = new GeminiAdapter()
    const chunks: string[] = []
    for await (const chunk of adapter.send('hello')) {
      if (chunk.type === 'text') chunks.push(chunk.content)
    }
    expect(chunks).toContain('plain text response')
  })
})

describe('GeminiAdapter attachment injection', () => {
  const attachment: Attachment = {
    id: 'att-2', messageId: 'msg-2', originalName: 'notes.txt',
    storedPath: '/tmp/notes.txt', mimeType: 'text/plain',
    sizeBytes: 50, extractedText: 'some notes', extractionError: false, createdAt: 0,
  }

  it('appends injection block to the message arg', async () => {
    mockSpawn([])
    const adapter = new GeminiAdapter()
    for await (const _ of adapter.send('summarize', undefined, [attachment])) { /* drain */ }
    const spawnArgs = vi.mocked(child_process.spawn).mock.calls.at(-1)![1] as string[]
    const msgArg = spawnArgs[spawnArgs.length - 1]
    expect(msgArg).toContain('[Attachment: notes.txt]')
    expect(msgArg).toContain('some notes')
    expect(msgArg).toContain('[/Attachment]')
    expect(msgArg).toContain('summarize')
  })
})
