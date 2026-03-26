import OpenAI from 'openai'
import { systemPrompt } from '@/lib/system-prompt'
import { supabase } from '@/lib/supabase'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
}

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30 // requests per window
const RATE_WINDOW = 60_000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { messages, sessionId, language } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Save user message to Supabase
    const lastUserMessage = messages[messages.length - 1]
    if (sessionId && lastUserMessage?.role === 'user') {
      supabase.from('ng_chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: lastUserMessage.content,
      }).then(() => {})
    }

    // Auto-detect language from the user's message
    const lastMsg = messages[messages.length - 1]?.content || ''
    const hasDanishChars = /[æøåÆØÅ]/.test(lastMsg)
    const hasSwedishChars = /[äöÄÖ]/.test(lastMsg)
    // Common Danish-only words (excluding words shared with English like "golf", "for", "en")
    const hasDanishWords = /\b(jeg|gerne|og|ikke|hvad|hvor|hvordan|ønsker|rejse|personer|dage|uger|også|meget|nogle|denne|disse|efter|mere|alle|mange|bare|lidt)\b/i.test(lastMsg)
    // Common Swedish words
    const hasSwedishWords = /\b(jag|vill|till|och|är|det|en|har|med|kan|från|den|som|på|av|för|inte|min|dig|mig|vi|ska|vad|var|hur)\b/i.test(lastMsg)

    let detectedLang = language || 'da' // UI toggle as fallback
    if (hasDanishChars || hasDanishWords) {
      detectedLang = 'da'
    } else if (hasSwedishChars || hasSwedishWords) {
      detectedLang = 'se'
    } else if (!hasDanishChars && !hasSwedishChars) {
      // No Nordic characters = likely English
      detectedLang = 'en'
    }

    const langInstructions: Record<string, string> = {
      en: 'CRITICAL INSTRUCTION: You MUST respond ENTIRELY in English. Every single word of your response must be in English. Do NOT use Danish. Do NOT use any Scandinavian language. The user is writing in English so you MUST reply in English only.',
      da: 'Svar på dansk.',
      se: 'Svara på svenska.',
      no: 'Svar på norsk.',
    }
    const langInstruction = langInstructions[detectedLang] || langInstructions['da']

    // Prepend language instruction to system prompt
    const fullSystemPrompt = `${langInstruction}\n\n${systemPrompt}`

    const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: fullSystemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Stream response from OpenAI
    const stream = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      stream: true,
      messages: apiMessages,
    })

    // Collect full response for saving
    let fullResponse = ''

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) {
              fullResponse += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Save assistant response
          if (sessionId) {
            supabase.from('ng_chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
            }).then(() => {})
          }

          // Check if response contains lead capture trigger
          if (fullResponse.includes('[[LEAD_CAPTURE]]')) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ action: 'lead_capture' })}\n\n`))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
