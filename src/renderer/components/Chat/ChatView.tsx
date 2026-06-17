import { useMessages } from '../../hooks/useMessages'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'

interface Props {
  conversationId: string | null
  backend: string
  personaId?: string
  onNewConversation: (id: string) => void
}

export function ChatView({ conversationId, backend, personaId, onNewConversation }: Props) {
  const { messages, streaming, send, abort } = useMessages(conversationId)

  const handleSend = async (message: string) => {
    const newId = await send(message, backend, personaId)
    if (!conversationId && newId) onNewConversation(newId)
  }

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 && !streaming && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Start a conversation
        </div>
      )}
      {(messages.length > 0 || streaming) && (
        <MessageList messages={messages} streaming={streaming} />
      )}
      <InputBar onSend={handleSend} onAbort={abort} streaming={streaming} />
    </div>
  )
}
