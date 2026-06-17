import ReactMarkdown from 'react-markdown'
import type { Message } from '../../../../shared/types'

interface Props { message: Message }

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        {isUser
          ? <p className="whitespace-pre-wrap">{message.content}</p>
          : <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{message.content}</ReactMarkdown>
        }
        <div className="text-xs opacity-50 mt-1">
          {message.backend} · {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
