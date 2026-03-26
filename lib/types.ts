export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  sessionId: string
  language?: 'da' | 'en'
}

export interface ChatLead {
  name: string
  email: string
  phone?: string
  destination?: string
  dates?: string
  group_size?: number
  preferences?: string
  language: string
  source_page?: string
  session_id: string
}
