import { describe, it, expect } from 'vitest'
import { validatePersona, MAX_PROMPT_LENGTH } from './ipc'

describe('validatePersona', () => {
  it('passes for short prompts', () => {
    expect(() => validatePersona({ systemPrompt: 'short' })).not.toThrow()
  })

  it('passes when systemPrompt is undefined', () => {
    expect(() => validatePersona({ name: 'Test' })).not.toThrow()
  })

  it('throws for prompts over max length', () => {
    const long = 'x'.repeat(MAX_PROMPT_LENGTH + 1)
    expect(() => validatePersona({ systemPrompt: long })).toThrow('maximum length')
  })

  it('passes for prompts exactly at max length', () => {
    const exact = 'x'.repeat(MAX_PROMPT_LENGTH)
    expect(() => validatePersona({ systemPrompt: exact })).not.toThrow()
  })
})
