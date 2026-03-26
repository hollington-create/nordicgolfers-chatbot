'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Step = 'language' | 'menu' | 'chat' | 'quote' | 'contact'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'da' | 'en' | null>(null)
  const [step, setStep] = useState<Step>('language')
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
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

  function goToChat(prompt?: string) {
    setStep('chat')
    if (prompt) {
      setTimeout(() => sendMessage(prompt), 200)
    } else {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
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

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
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
              if (parsed.action === 'lead_capture') {
                setShowLeadForm(true)
              }
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
    } catch (error) {
      setMessages(prev => [
        ...prev.filter(m => m.content !== ''),
        {
          role: 'assistant',
          content: t(
            'Beklager, der opstod en fejl. Prøv venligst igen, eller kontakt os på +45 2441 2240.',
            'Sorry, an error occurred. Please try again or contact us at +45 2441 2240.'
          ),
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
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
      source_page: window.location.href,
    }

    try {
      // Send to chat for confirmation
      const chatMsg = language === 'en'
        ? `[LEAD_INFO] Name: ${lead.name}, Email: ${lead.email}, Phone: ${lead.phone}, Destination: ${lead.destination}, People: ${lead.people}, Dates: ${lead.dates}`
        : `[LEAD_INFO] Navn: ${lead.name}, Email: ${lead.email}, Telefon: ${lead.phone}, Destination: ${lead.destination}, Antal: ${lead.people}, Dato: ${lead.dates}`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: chatMsg }],
          sessionId,
          language,
        }),
      })

      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }).catch(() => {})

      setLeadSubmitted(true)

      // Show confirmation in chat
      if (response.ok) {
        setStep('chat')
        const reader = response.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()
          let assistantContent = ''
          setMessages(prev => [...prev, { role: 'assistant', content: '' }])

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6))
                  if (parsed.text) {
                    assistantContent += parsed.text
                    setMessages(prev => {
                      const updated = [...prev]
                      updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                      return updated
                    })
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
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ===== NAV ===== */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://www.nordicgolfers.com" target="_blank" rel="noopener noreferrer" className="block">
            <div
              className="w-[206px] h-[50px] bg-no-repeat"
              style={{
                backgroundImage: 'url(https://www.nordicgolfers.com/typo3conf/ext/user_site/Resources/Public/Images/sprite2.png)',
                backgroundPosition: '0px -379px',
              }}
              aria-label="NordicGolfers.com"
              role="img"
            />
          </a>
          {step !== 'language' && (
            <button
              onClick={() => { setStep('menu'); setMessages([]); setShowLeadForm(false); setLeadSubmitted(false) }}
              className="text-sm text-ng-gray-mid hover:text-ng-pink transition-colors"
            >
              {t('← Tilbage til menu', '← Back to menu')}
            </button>
          )}
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">

          {/* ===== STEP 1: LANGUAGE ===== */}
          {step === 'language' && (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⛳</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest mb-2">
                NordicGolfers
              </h1>
              <p className="text-ng-gray-mid mb-10">
                Choose your language / Vaelg sprog
              </p>
              <div className="flex justify-center gap-6">
                <button
                  onClick={() => chooseLanguage('da')}
                  className="flex flex-col items-center gap-3 px-12 py-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-ng-pink hover:shadow-lg transition-all group"
                >
                  <img src="https://flagcdn.com/w80/dk.png" alt="Danish flag" className="w-20 h-auto rounded shadow-sm group-hover:scale-105 transition-transform" />
                  <span className="text-base font-semibold text-ng-dark">Dansk</span>
                </button>
                <button
                  onClick={() => chooseLanguage('en')}
                  className="flex flex-col items-center gap-3 px-12 py-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-ng-pink hover:shadow-lg transition-all group"
                >
                  <img src="https://flagcdn.com/w80/gb.png" alt="British flag" className="w-20 h-auto rounded shadow-sm group-hover:scale-105 transition-transform" />
                  <span className="text-base font-semibold text-ng-dark">English</span>
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 2: MENU ===== */}
          {step === 'menu' && (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⛳</span>
              </div>
              <h2 className="text-xl md:text-2xl font-light text-ng-dark uppercase tracking-widest mb-2">
                {t('Hvordan kan vi hjaelpe?', 'How can we help?')}
              </h2>
              <p className="text-ng-gray-mid text-sm mb-8">
                {t('Vaelg en mulighed nedenfor', 'Choose an option below')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => goToChat(t('Jeg vil gerne finde en golfrejse', 'I want to find a golf trip'))}
                  className="flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-ng-pink/20 transition-colors">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <div>
                    <div className="font-semibold text-ng-dark text-sm">{t('Find en golfrejse', 'Find a golf trip')}</div>
                    <div className="text-xs text-ng-gray-mid mt-0.5">{t('Soeg destinationer og resorts', 'Search destinations & resorts')}</div>
                  </div>
                </button>

                <button
                  onClick={() => setStep('quote')}
                  className="flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-ng-pink/20 transition-colors">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div>
                    <div className="font-semibold text-ng-dark text-sm">{t('Faa et tilbud', 'Get a quote')}</div>
                    <div className="text-xs text-ng-gray-mid mt-0.5">{t('Vi sender et skraeddersyet tilbud', "We'll send a tailored offer")}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    window.open('https://www.nordicgolfers.com/destinationer', '_blank')
                  }}
                  className="flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-ng-pink/20 transition-colors">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <div>
                    <div className="font-semibold text-ng-dark text-sm">{t('Udforsk destinationer', 'Browse destinations')}</div>
                    <div className="text-xs text-ng-gray-mid mt-0.5">{t('30+ lande med 800+ baner', '30+ countries with 800+ courses')}</div>
                  </div>
                </button>

                <button
                  onClick={() => setStep('contact')}
                  className="flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-ng-pink hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-ng-pink/20 transition-colors">
                    <span className="text-2xl">📞</span>
                  </div>
                  <div>
                    <div className="font-semibold text-ng-dark text-sm">{t('Kontakt os', 'Contact us')}</div>
                    <div className="text-xs text-ng-gray-mid mt-0.5">{t('Ring eller skriv til os', 'Call or email us')}</div>
                  </div>
                </button>
              </div>

              <p className="text-xs text-ng-gray-mid mt-8">
                {t('Prisgaranti — Medlem af Rejsegarantifonden nr. 3356', 'Price guarantee — Member of Travel Guarantee Fund #3356')}
              </p>
            </div>
          )}

          {/* ===== STEP 3a: CHAT ===== */}
          {step === 'chat' && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Chat header */}
                <div className="bg-ng-dark px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ng-pink rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">⛳</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">NordicGolfers Assistant</div>
                      <div className="text-green-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                        Online
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setStep('menu'); setMessages([]) }} className="text-gray-400 hover:text-white text-lg">✕</button>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="h-[450px] overflow-y-auto px-5 py-4 chat-scroll bg-gray-50">
                  {messages.length === 0 && (
                    <div className="text-center py-8 animate-fade-in">
                      <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">⛳</span>
                      </div>
                      <p className="text-ng-gray-mid text-sm">
                        {t(
                          'Hej! Jeg er klar til at hjaelpe dig med at finde den perfekte golfrejse. Hvad droemmer du om?',
                          "Hi! I'm ready to help you find the perfect golf trip. What are you dreaming of?"
                        )}
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex mb-4 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 bg-ng-pink rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                          <span className="text-white text-xs">⛳</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-ng-pink text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
                      />
                    </div>
                  ))}

                  {isLoading && messages[messages.length - 1]?.content === '' && (
                    <div className="flex mb-4">
                      <div className="w-7 h-7 bg-ng-pink rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-white text-xs">⛳</span>
                      </div>
                      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  )}

                  {/* In-chat lead form */}
                  {showLeadForm && !leadSubmitted && (
                    <div className="bg-white border-2 border-ng-pink rounded-xl p-5 mb-4 animate-fade-in max-w-sm mx-auto shadow-lg">
                      <h3 className="font-bold text-base mb-1 text-ng-dark">
                        {t('📋 Faa et tilbud', '📋 Get a quote')}
                      </h3>
                      <p className="text-xs text-ng-gray-mid mb-3">
                        {t('Udfyld dine oplysninger, saa kontakter vi dig.', "Fill in your details and we'll contact you.")}
                      </p>
                      <form onSubmit={handleLeadSubmit} className="space-y-2">
                        <input name="name" type="text" required placeholder={t('Dit navn', 'Your name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                        <input name="email" type="email" required placeholder={t('Din email', 'Your email')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                        <input name="phone" type="tel" placeholder={t('Telefonnummer', 'Phone number')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                        <input name="destination" type="text" value="" hidden />
                        <input name="people" type="text" value="" hidden />
                        <input name="dates" type="text" value="" hidden />
                        <button type="submit" className="w-full py-2.5 bg-ng-pink text-white rounded-lg font-bold text-sm hover:bg-ng-pink-dark transition-colors">
                          {t('Send', 'Submit')}
                        </button>
                      </form>
                      <button onClick={() => setShowLeadForm(false)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
                        {t('Senere', 'Maybe later')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 bg-white px-4 py-3">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t(
                        'Skriv en besked... f.eks. "Vi er 6 der vil til Spanien"',
                        'Type a message... e.g. "4 of us want golf in Portugal"'
                      )}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-ng-pink"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="px-6 py-2.5 bg-ng-pink text-white rounded-full font-bold text-sm hover:bg-ng-pink-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3b: QUOTE FORM ===== */}
          {step === 'quote' && !leadSubmitted && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h2 className="text-xl font-bold text-ng-dark">{t('Faa et uforpligtende tilbud', 'Get a free quote')}</h2>
                  <p className="text-sm text-ng-gray-mid mt-1">
                    {t('Vi vender tilbage inden for 1 hverdag', "We'll get back to you within 1 business day")}
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Navn *', 'Name *')}</label>
                    <input name="name" type="text" required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Email *', 'Email *')}</label>
                    <input name="email" type="email" required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Telefon', 'Phone')}</label>
                    <input name="phone" type="tel" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Destination (valgfrit)', 'Destination (optional)')}</label>
                    <input name="destination" type="text" placeholder={t('f.eks. Spanien, Portugal, Tyrkiet...', 'e.g. Spain, Portugal, Turkey...')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Antal personer', 'Number of people')}</label>
                      <input name="people" type="text" placeholder={t('f.eks. 4', 'e.g. 4')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ng-dark mb-1">{t('Datoer', 'Dates')}</label>
                      <input name="dates" type="text" placeholder={t('f.eks. juni 2026', 'e.g. June 2026')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-ng-pink text-white rounded-lg font-bold text-sm hover:bg-ng-pink-dark transition-colors uppercase tracking-wide">
                    {t('Send foresporgsel', 'Submit request')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Quote submitted confirmation */}
          {step === 'quote' && leadSubmitted && (
            <div className="animate-fade-in text-center">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-ng-dark mb-2">{t('Tak for din foresporgsel!', 'Thank you for your request!')}</h2>
                <p className="text-sm text-ng-gray-mid mb-6">
                  {t(
                    'Vi vender tilbage inden for 1 hverdag med et skraeddersyet tilbud. Du kan ogsaa ringe til os paa +45 2441 2240.',
                    "We'll get back to you within 1 business day with a tailored offer. You can also call us at +45 2441 2240."
                  )}
                </p>
                <button
                  onClick={() => { setStep('menu'); setLeadSubmitted(false) }}
                  className="px-6 py-2.5 bg-ng-pink text-white rounded-lg font-bold text-sm hover:bg-ng-pink-dark transition-colors"
                >
                  {t('Tilbage til menu', 'Back to menu')}
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3d: CONTACT ===== */}
          {step === 'contact' && (
            <div className="animate-fade-in text-center">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📞</span>
                </div>
                <h2 className="text-xl font-bold text-ng-dark mb-4">{t('Kontakt NordicGolfers', 'Contact NordicGolfers')}</h2>

                <div className="space-y-4 text-left">
                  <a href="tel:+4524412240" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-ng-pink/5 transition-colors">
                    <span className="text-2xl">📱</span>
                    <div>
                      <div className="font-semibold text-ng-dark text-sm">+45 2441 2240</div>
                      <div className="text-xs text-ng-gray-mid">{t('Man-fre 10:00-15:00', 'Mon-Fri 10:00-15:00')}</div>
                    </div>
                  </a>
                  <a href="mailto:service@nordicgolfers.com" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-ng-pink/5 transition-colors">
                    <span className="text-2xl">✉️</span>
                    <div>
                      <div className="font-semibold text-ng-dark text-sm">service@nordicgolfers.com</div>
                      <div className="text-xs text-ng-gray-mid">{t('Vi svarer inden for 1 hverdag', 'We reply within 1 business day')}</div>
                    </div>
                  </a>
                  <a href="https://www.nordicgolfers.com" target="_blank" rel="noopener" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-ng-pink/5 transition-colors">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <div className="font-semibold text-ng-dark text-sm">www.nordicgolfers.com</div>
                      <div className="text-xs text-ng-gray-mid">{t('Besog vores hjemmeside', 'Visit our website')}</div>
                    </div>
                  </a>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-ng-gray-mid">
                    NordicGolfers.com Travel ApS — CVR: 42289019<br />
                    Kirsten Kimers Vej 20, 2300 Koebenhavn S
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-ng-dark text-gray-400 py-4">
        <div className="text-center text-xs">
          © {new Date().getFullYear()} NordicGolfers.com Travel ApS — {t('Medlem af Rejsegarantifonden nr. 3356', 'Member of Travel Guarantee Fund #3356')} — {t('Prisgaranti', 'Price Guarantee')}
        </div>
      </footer>
    </div>
  )
}
