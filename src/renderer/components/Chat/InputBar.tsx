import { useState, useRef, KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  onAbort: () => void
  streaming: boolean
  disabled?: boolean
}

export function InputBar({ onSend, onAbort, streaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || streaming) return
    onSend(trimmed)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-40"
          rows={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message..."
          disabled={disabled}
        />
        {streaming
          ? <button onClick={onAbort} className="px-4 py-3 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600">Stop</button>
          : <button onClick={submit} disabled={!value.trim() || disabled} className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Send</button>
        }
      </div>
    </div>
  )
}
