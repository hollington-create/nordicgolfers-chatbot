'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Step = 'language' | 'menu' | 'destinations' | 'chat' | 'quote' | 'contact'

const DESTINATION_OPTIONS = [
  { region: 'Scandinavia', items: ['Danmark', 'Sverige', 'Norge', 'Finland'] },
  { region: 'Southern Europe', items: ['Spanien', 'Portugal', 'Italien', 'Frankrig', 'Grækenland', 'Cypern'] },
  { region: 'Turkey & North Africa', items: ['Tyrkiet', 'Marokko', 'Egypten'] },
  { region: 'Central Europe', items: ['Tyskland', 'Tjekkiet', 'Østrig', 'Bulgarien'] },
  { region: 'British Isles', items: ['England', 'Skotland', 'Irland'] },
  { region: 'Exotic', items: ['Thailand', 'Bali', 'Mauritius', 'Sydafrika', 'De Kanariske Øer'] },
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'da' | 'en' | null>(null)
  const [step, setStep] = useState<Step>('language')
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([])
  const [customDestination, setCustomDestination] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const t = (da: string, en: string) => language === 'en' ? en : da

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  function chooseLanguage(lang: 'da' | 'en') {
    setLanguage(lang)
    setStep('menu')
  }

  function goToDestinations() {
    setSelectedDestinations([])
    setCustomDestination('')
    setStep('destinations')
  }

  function toggleDestination(dest: string) {
    setSelectedDestinations(prev =>
      prev.includes(dest) ? prev.filter(d => d !== dest) : [...prev, dest]
    )
  }

  function submitDestinations() {
    const all = [...selectedDestinations]
    if (customDestination.trim()) all.push(customDestination.trim())

    let prompt: string
    if (all.length === 0) {
      prompt = language === 'en'
        ? "I'm open to suggestions for a golf trip destination"
        : 'Jeg er aaben for forslag til golfrejse-destination'
    } else {
      prompt = language === 'en'
        ? `I'm interested in a golf trip to: ${all.join(', ')}`
        : `Jeg er interesseret i en golfrejse til: ${all.join(', ')}`
    }

    setStep('chat')
    setTimeout(() => sendMessage(prompt), 200)
  }

  function goToChat(prompt?: string) {
    setStep('chat')
    if (prompt) {
      setTimeout(() => sendMessage(prompt), 200)
    } else {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }

  function resetWidget() {
    setStep('menu')
    setMessages([])
    setShowLeadForm(false)
    setLeadSubmitted(false)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return
    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId, language }),
      })
      if (!response.ok) throw new Error('Failed')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantContent += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }
              if (parsed.action === 'lead_capture') setShowLeadForm(true)
            } catch {}
          }
        }
      }

      if (assistantContent.includes('[[LEAD_CAPTURE]]')) {
        const cleaned = assistantContent.replace(/\[\[LEAD_CAPTURE\]\]/g, '').trim()
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: cleaned }
          return updated
        })
        setShowLeadForm(true)
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => m.content !== ''),
        { role: 'assistant', content: t('Beklager, der opstod en fejl. Kontakt os paa +45 2441 2240.', 'Sorry, an error occurred. Contact us at +45 2441 2240.') },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleLeadSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const lead = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      destination: formData.get('destination') as string,
      people: formData.get('people') as string,
      dates: formData.get('dates') as string,
      session_id: sessionId,
      language,
      source_page: typeof window !== 'undefined' ? window.location.href : '',
    }

    try {
      const chatMsg = language === 'en'
        ? `[LEAD_INFO] Name: ${lead.name}, Email: ${lead.email}, Phone: ${lead.phone}, Destination: ${lead.destination}, People: ${lead.people}, Dates: ${lead.dates}`
        : `[LEAD_INFO] Navn: ${lead.name}, Email: ${lead.email}, Telefon: ${lead.phone}, Destination: ${lead.destination}, Antal: ${lead.people}, Dato: ${lead.dates}`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: chatMsg }], sessionId, language }),
      })

      await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) }).catch(() => {})

      setLeadSubmitted(true)
      if (response.ok) {
        setStep('chat')
        const reader = response.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()
          let content = ''
          setMessages(prev => [...prev, { role: 'assistant', content: '' }])
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            for (const line of decoder.decode(value, { stream: true }).split('\n')) {
              if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                try {
                  const p = JSON.parse(line.slice(6))
                  if (p.text) {
                    content += p.text
                    setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content }; return u })
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch {
      setLeadSubmitted(true)
      setStep('chat')
    }
  }

  function renderMessage(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-ng-pink underline hover:text-ng-pink-dark">$1</a>')
      .replace(/\n/g, '<br/>')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ng-pink text-white rounded-full shadow-lg hover:bg-ng-pink-dark transition-all hover:scale-110 flex items-center justify-center z-50"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] max-h-[600px] z-50 flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-ng-dark px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ng-pink rounded-full flex items-center justify-center">
            <span className="text-white text-sm">⛳</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">NordicGolfers Assistant</div>
            <div className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> Online
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* LANGUAGE */}
        {step === 'language' && (
          <div className="text-center py-10 px-4">
            <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⛳</span>
            </div>
            <p className="text-ng-dark font-semibold text-sm mb-6">Choose your language / Vaelg sprog</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => chooseLanguage('da')} className="flex flex-col items-center gap-2 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-md transition-all">
                <img src="https://flagcdn.com/w80/dk.png" alt="Danish" className="w-14 h-auto rounded shadow-sm" />
                <span className="text-xs font-semibold text-ng-dark">Dansk</span>
              </button>
              <button onClick={() => chooseLanguage('en')} className="flex flex-col items-center gap-2 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-md transition-all">
                <img src="https://flagcdn.com/w80/gb.png" alt="English" className="w-14 h-auto rounded shadow-sm" />
                <span className="text-xs font-semibold text-ng-dark">English</span>
              </button>
            </div>
          </div>
        )}

        {/* MENU */}
        {step === 'menu' && (
          <div className="py-6 px-4">
            <p className="text-center text-sm font-semibold text-ng-dark mb-4">{t('Hvordan kan vi hjaelpe?', 'How can we help?')}</p>
            <div className="space-y-2">
              <button onClick={goToDestinations} className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 hover:border-ng-pink border border-gray-200 transition-all text-left">
                <span className="text-xl">🔍</span>
                <div><div className="font-semibold text-ng-dark text-sm">{t('Find en golfrejse', 'Find a golf trip')}</div><div className="text-xs text-ng-gray-mid">{t('Vaelg destinationer', 'Choose destinations')}</div></div>
              </button>
              <button onClick={() => setStep('quote')} className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 hover:border-ng-pink border border-gray-200 transition-all text-left">
                <span className="text-xl">📋</span>
                <div><div className="font-semibold text-ng-dark text-sm">{t('Faa et tilbud', 'Get a quote')}</div><div className="text-xs text-ng-gray-mid">{t('Vi sender et skraeddersyet tilbud', "We'll send a tailored offer")}</div></div>
              </button>
              <a href="https://www.nordicgolfers.com/destinationer" target="_blank" rel="noopener" className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 hover:border-ng-pink border border-gray-200 transition-all text-left">
                <span className="text-xl">🌍</span>
                <div><div className="font-semibold text-ng-dark text-sm">{t('Udforsk destinationer', 'Browse destinations')}</div><div className="text-xs text-ng-gray-mid">{t('30+ lande med 800+ baner', '30+ countries with 800+ courses')}</div></div>
              </a>
              <button onClick={() => setStep('contact')} className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 hover:border-ng-pink border border-gray-200 transition-all text-left">
                <span className="text-xl">📞</span>
                <div><div className="font-semibold text-ng-dark text-sm">{t('Kontakt os', 'Contact us')}</div><div className="text-xs text-ng-gray-mid">{t('Ring eller skriv til os', 'Call or email us')}</div></div>
              </button>
            </div>
          </div>
        )}

        {/* DESTINATIONS */}
        {step === 'destinations' && (
          <div className="py-4 px-4 overflow-y-auto max-h-[450px]">
            <p className="text-center font-semibold text-ng-dark text-sm mb-1">{t('Hvor vil du hen?', 'Where do you want to go?')}</p>
            <p className="text-center text-xs text-ng-gray-mid mb-4">{t('Vaelg en eller flere destinationer', 'Select one or more destinations')}</p>

            {DESTINATION_OPTIONS.map((group) => (
              <div key={group.region} className="mb-3">
                <p className="text-[10px] font-bold text-ng-gray-mid uppercase tracking-wider mb-1.5">{group.region}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((dest) => (
                    <button
                      key={dest}
                      onClick={() => toggleDestination(dest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedDestinations.includes(dest)
                          ? 'bg-ng-pink text-white'
                          : 'bg-gray-100 text-ng-dark hover:bg-gray-200'
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-3">
              <input
                type="text"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                placeholder={t('Eller skriv en destination...', 'Or type a destination...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink"
              />
            </div>

            {selectedDestinations.length > 0 && (
              <p className="text-xs text-ng-gray-mid mt-2">
                {t('Valgt:', 'Selected:')} <span className="font-semibold text-ng-dark">{selectedDestinations.join(', ')}</span>
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={resetWidget} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-ng-gray-mid hover:bg-gray-50">{t('Tilbage', 'Back')}</button>
              <button onClick={submitDestinations} className="flex-1 py-2.5 bg-ng-pink text-white rounded-lg font-bold text-sm hover:bg-ng-pink-dark transition-colors">
                {selectedDestinations.length === 0 && !customDestination.trim()
                  ? t('Aaben for forslag', 'Open to suggestions')
                  : t('Fortsaet', 'Continue')
                }
              </button>
            </div>
          </div>
        )}

        {/* CHAT */}
        {step === 'chat' && (
          <>
            <div ref={messagesContainerRef} className="h-[380px] overflow-y-auto px-4 py-3 chat-scroll bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-ng-gray-mid text-sm">{t('Hej! Hvad droemmer du om?', "Hi! What are you dreaming of?")}</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-ng-pink rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <span className="text-white text-[10px]">⛳</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-ng-pink text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`} dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }} />
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <div className="flex mb-3">
                  <div className="w-6 h-6 bg-ng-pink rounded-full flex items-center justify-center mr-2 flex-shrink-0"><span className="text-white text-[10px]">⛳</span></div>
                  <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span></div>
                </div>
              )}
              {showLeadForm && !leadSubmitted && (
                <div className="bg-white border-2 border-ng-pink rounded-xl p-4 mb-3 shadow-lg">
                  <p className="font-bold text-sm text-ng-dark mb-2">{t('Faa et tilbud', 'Get a quote')}</p>
                  <form onSubmit={handleLeadSubmit} className="space-y-2">
                    <input name="name" type="text" required placeholder={t('Dit navn', 'Your name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                    <input name="email" type="email" required placeholder={t('Din email', 'Your email')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                    <input name="phone" type="tel" placeholder={t('Telefonnummer', 'Phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                    <input name="destination" type="text" value="" hidden /><input name="people" type="text" value="" hidden /><input name="dates" type="text" value="" hidden />
                    <button type="submit" className="w-full py-2 bg-ng-pink text-white rounded-lg font-bold text-sm">{t('Send', 'Submit')}</button>
                  </form>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 bg-white px-3 py-2">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-2">
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('Skriv en besked...', 'Type a message...')} className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-ng-pink" disabled={isLoading} />
                <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-2 bg-ng-pink text-white rounded-full font-bold text-sm disabled:opacity-50">Send</button>
              </form>
            </div>
          </>
        )}

        {/* QUOTE */}
        {step === 'quote' && !leadSubmitted && (
          <div className="p-5">
            <p className="text-center font-bold text-ng-dark text-sm mb-4">{t('Faa et uforpligtende tilbud', 'Get a free quote')}</p>
            <form onSubmit={handleLeadSubmit} className="space-y-3">
              <input name="name" type="text" required placeholder={t('Navn *', 'Name *')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
              <input name="email" type="email" required placeholder={t('Email *', 'Email *')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
              <input name="phone" type="tel" placeholder={t('Telefon', 'Phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
              <input name="destination" type="text" placeholder={t('Destination', 'Destination')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
              <div className="grid grid-cols-2 gap-2">
                <input name="people" type="text" placeholder={t('Antal', 'People')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                <input name="dates" type="text" placeholder={t('Dato', 'Dates')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-ng-pink text-white rounded-lg font-bold text-sm">{t('Send foresporgsel', 'Submit request')}</button>
            </form>
            <button onClick={resetWidget} className="text-xs text-gray-400 mt-2 hover:text-gray-600 block mx-auto">{t('Tilbage', 'Back')}</button>
          </div>
        )}
        {step === 'quote' && leadSubmitted && (
          <div className="p-6 text-center">
            <span className="text-3xl block mb-3">✅</span>
            <p className="font-bold text-ng-dark mb-2">{t('Tak!', 'Thank you!')}</p>
            <p className="text-sm text-ng-gray-mid mb-4">{t('Vi kontakter dig inden for 1 hverdag.', "We'll contact you within 1 business day.")}</p>
            <button onClick={() => { resetWidget(); setLeadSubmitted(false) }} className="px-4 py-2 bg-ng-pink text-white rounded-lg text-sm font-bold">{t('OK', 'OK')}</button>
          </div>
        )}

        {/* CONTACT */}
        {step === 'contact' && (
          <div className="p-5 space-y-3">
            <p className="text-center font-bold text-ng-dark text-sm mb-2">{t('Kontakt os', 'Contact us')}</p>
            <a href="tel:+4524412240" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 transition-colors">
              <span className="text-lg">📱</span>
              <div><div className="font-semibold text-ng-dark text-sm">+45 2441 2240</div><div className="text-xs text-ng-gray-mid">{t('Man-fre 10:00-15:00', 'Mon-Fri 10:00-15:00')}</div></div>
            </a>
            <a href="mailto:service@nordicgolfers.com" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-ng-pink/5 transition-colors">
              <span className="text-lg">✉️</span>
              <div><div className="font-semibold text-ng-dark text-sm">service@nordicgolfers.com</div></div>
            </a>
            <button onClick={resetWidget} className="text-xs text-gray-400 mt-2 hover:text-gray-600 block mx-auto">{t('Tilbage', 'Back')}</button>
          </div>
        )}
      </div>

      {/* Footer */}
      {step !== 'chat' && (
        <div className="border-t border-gray-200 px-4 py-2 text-center">
          <span className="text-[10px] text-gray-400">NordicGolfers.com — {t('Prisgaranti', 'Price Guarantee')} — +45 2441 2240</span>
        </div>
      )}
    </div>
  )
}
