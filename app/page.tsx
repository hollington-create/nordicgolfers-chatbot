'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const DESTINATIONS = [
  { name: 'Spanien', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/3/7/csm_islacanela-2_792fe36d03.jpg' },
  { name: 'Portugal', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/2/3/csm_pirin_9_side_club_pm_766df58527.jpg' },
  { name: 'Tyrkiet', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/3/5/csm_MeliaPuntaCanaBeach-pool2_49a33af340.jpg' },
  { name: 'Danmark', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/a/b/csm_HeritageAwali-profil1_bd602dda67.jpg' },
]

const QUICK_STARTS_DA = [
  { label: 'Plan en golfrejse', icon: '⛳', prompt: 'Jeg vil gerne planlægge en golfrejse' },
  { label: 'Grupperejse', icon: '👥', prompt: 'Vi er en gruppe der gerne vil på golfrejse' },
  { label: 'Long Stay', icon: '🌞', prompt: 'Jeg er interesseret i long stay golf i vinterhalvåret' },
  { label: 'Kontakt os', icon: '📞', prompt: 'Hvordan kontakter jeg NordicGolfers?' },
]

const QUICK_STARTS_EN = [
  { label: 'Plan a golf trip', icon: '⛳', prompt: 'I want to plan a golf trip' },
  { label: 'Group travel', icon: '👥', prompt: 'We are a group looking for a golf trip' },
  { label: 'Long Stay', icon: '🌞', prompt: "I'm interested in long stay winter golf" },
  { label: 'Contact us', icon: '📞', prompt: 'How do I contact NordicGolfers?' },
]

const STATS = [
  { value: '800+', label: 'Golfbaner & Resorts' },
  { value: '30+', label: 'Lande' },
  { value: '50.000+', label: 'Tilfredse golfere' },
  { value: '100%', label: 'Prisgaranti' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'da' | 'en'>('da')
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatSectionRef = useRef<HTMLDivElement>(null)

  const quickStarts = language === 'da' ? QUICK_STARTS_DA : QUICK_STARTS_EN

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function openChat(prompt?: string) {
    setChatOpen(true)
    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (prompt) sendMessage(prompt)
      else inputRef.current?.focus()
    }, 100)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    if (!chatOpen) {
      setChatOpen(true)
      setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }

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
          content: language === 'da'
            ? 'Beklager, der opstod en fejl. Prøv venligst igen, eller kontakt os på +45 2441 2240.'
            : 'Sorry, an error occurred. Please try again or contact us at +45 2441 2240.',
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
      session_id: sessionId,
      language,
      source_page: window.location.href,
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: `[LEAD_INFO] Navn: ${lead.name}, Email: ${lead.email}, Telefon: ${lead.phone}` },
          ],
          sessionId,
          language,
        }),
      })

      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }).catch(() => {})

      setShowLeadForm(false)
      setLeadSubmitted(true)

      if (response.ok) {
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
      setShowLeadForm(false)
    }
  }

  function renderMessage(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVIGATION ===== */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-ng-dark uppercase tracking-wide">
            <a href="https://www.nordicgolfers.com/destinationer" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Destinationer</a>
            <a href="https://www.nordicgolfers.com/soeg-golfpakker" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Søg Golfpakker</a>
            <a href="https://www.nordicgolfers.com/resorts" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Resorts</a>
            <a href="https://www.nordicgolfers.com/long-stay" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Long Stay</a>
            <button
              onClick={() => openChat()}
              className="bg-ng-pink text-white px-5 py-2 rounded hover:bg-ng-pink-dark transition-colors normal-case tracking-normal"
            >
              FÅ TILBUD
            </button>
          </div>
          <div className="flex items-center gap-2 md:ml-4">
            <button
              onClick={() => setLanguage('da')}
              className={`px-2 py-1 text-xs font-bold rounded ${language === 'da' ? 'bg-ng-pink text-white' : 'bg-gray-100 text-gray-500'}`}
            >DA</button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-ng-pink text-white' : 'bg-gray-100 text-gray-500'}`}
            >EN</button>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <img
          src="https://www.nordicgolfers.com/fileadmin/_processed_/7/c/csm_Banner_PC_visning-01-01_aa913e9fe3.jpg"
          alt="Golf course panorama"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-white text-3xl md:text-5xl font-light mb-4 drop-shadow-lg max-w-3xl leading-tight">
            {language === 'da'
              ? 'Golfrejser med prisgaranti til 30 lande over hele verden'
              : 'Golf trips with price guarantee to 30+ countries worldwide'}
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-8 drop-shadow max-w-2xl">
            {language === 'da'
              ? 'Spørg vores AI-assistent og find din perfekte golfrejse på sekunder'
              : 'Ask our AI assistant and find your perfect golf trip in seconds'}
          </p>

          {/* Search bar in hero */}
          <div className="w-full max-w-2xl">
            <form
              onSubmit={(e) => { e.preventDefault(); openChat(input); }}
              className="flex bg-white rounded-lg shadow-2xl overflow-hidden"
            >
              <input
                type="text"
                value={chatOpen ? '' : input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'da'
                  ? 'Søg på destination, resort eller hotel...'
                  : 'Search for destination, resort, or hotel...'}
                className="flex-1 px-5 py-4 text-gray-700 text-base focus:outline-none"
              />
              <button
                type="submit"
                className="bg-ng-pink text-white px-8 py-4 font-bold text-sm uppercase tracking-wide hover:bg-ng-pink-dark transition-colors"
              >
                {language === 'da' ? 'SØG' : 'SEARCH'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="bg-ng-dark text-white py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-bold text-ng-pink">{stat.value}</div>
              <div className="text-xs md:text-sm text-gray-300 mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== AI ASSISTANT SECTION ===== */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest mb-2">
              {language === 'da' ? 'Din Personlige Golfrejse-Assistent' : 'Your Personal Golf Trip Assistant'}
            </h2>
            <p className="text-ng-gray-mid max-w-xl mx-auto">
              {language === 'da'
                ? 'Fortæl os om dine ønsker, og få skræddersyede anbefalinger på sekunder.'
                : 'Tell us your preferences and get tailored recommendations in seconds.'}
            </p>
          </div>

          {/* Quick start buttons */}
          {!chatOpen && (
            <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in">
              {quickStarts.map((q) => (
                <button
                  key={q.label}
                  onClick={() => openChat(q.prompt)}
                  className="px-5 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm text-ng-dark hover:border-ng-pink hover:text-ng-pink transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <span className="text-lg">{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat area */}
          <div ref={chatSectionRef} className={`max-w-3xl mx-auto transition-all duration-500 ${chatOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
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
                <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
              </div>

              {/* Messages */}
              <div className="h-[400px] overflow-y-auto px-5 py-4 chat-scroll bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center py-8 animate-fade-in">
                    <div className="w-12 h-12 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">⛳</span>
                    </div>
                    <p className="text-ng-gray-mid text-sm">
                      {language === 'da'
                        ? 'Hej! Jeg er klar til at hjælpe dig med at finde den perfekte golfrejse. Hvad drømmer du om?'
                        : "Hi! I'm ready to help you find the perfect golf trip. What are you dreaming of?"}
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

                {/* Lead form */}
                {showLeadForm && !leadSubmitted && (
                  <div className="bg-white border-2 border-ng-pink rounded-xl p-5 mb-4 animate-fade-in max-w-sm mx-auto shadow-lg">
                    <h3 className="font-bold text-base mb-1 text-ng-dark">
                      {language === 'da' ? '📋 Få et tilbud' : '📋 Get a quote'}
                    </h3>
                    <p className="text-xs text-ng-gray-mid mb-3">
                      {language === 'da'
                        ? 'Udfyld dine oplysninger, så kontakter vi dig med et skræddersyet tilbud.'
                        : "Fill in your details and we'll contact you with a tailored offer."}
                    </p>
                    <form onSubmit={handleLeadSubmit} className="space-y-2">
                      <input name="name" type="text" required placeholder={language === 'da' ? 'Dit navn' : 'Your name'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                      <input name="email" type="email" required placeholder={language === 'da' ? 'Din email' : 'Your email'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                      <input name="phone" type="tel" placeholder={language === 'da' ? 'Telefonnummer' : 'Phone number'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-ng-pink" />
                      <button type="submit" className="w-full py-2.5 bg-ng-pink text-white rounded-lg font-bold text-sm hover:bg-ng-pink-dark transition-colors uppercase tracking-wide">
                        {language === 'da' ? 'Send — Få tilbud' : 'Submit — Get a quote'}
                      </button>
                    </form>
                    <button onClick={() => setShowLeadForm(false)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
                      {language === 'da' ? 'Senere' : 'Maybe later'}
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white px-4 py-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={language === 'da'
                      ? 'Skriv en besked... f.eks. "Vi er 6 der vil til Spanien"'
                      : 'Type a message... e.g. "4 of us want golf in Portugal"'}
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
        </div>
      </section>

      {/* ===== DESTINATIONS GRID ===== */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest text-center mb-8">
            {language === 'da' ? 'Populære Destinationer' : 'Popular Destinations'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DESTINATIONS.map((dest) => (
              <button
                key={dest.name}
                onClick={() => openChat(language === 'da' ? `Jeg vil gerne på golfrejse til ${dest.name}` : `I want a golf trip to ${dest.name}`)}
                className="group relative h-48 md:h-64 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
              >
                <img src={dest.img} alt={dest.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg">{dest.name}</h3>
                  <span className="text-ng-pink text-xs font-bold uppercase tracking-wide">
                    {language === 'da' ? 'Se tilbud →' : 'View offers →'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUST / ABOUT SECTION ===== */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest mb-6">
            {language === 'da' ? 'Hvorfor NordicGolfers?' : 'Why NordicGolfers?'}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">{language === 'da' ? 'Prisgaranti' : 'Price Guarantee'}</h3>
              <p className="text-sm text-ng-gray-mid">
                {language === 'da'
                  ? 'Direkte priser fra partnere — ingen mellemled eller ekstra gebyrer.'
                  : 'Direct prices from partners — no middlemen or extra fees.'}
              </p>
            </div>
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">{language === 'da' ? 'Rejsegarantifonden' : 'Travel Guarantee'}</h3>
              <p className="text-sm text-ng-gray-mid">
                {language === 'da'
                  ? 'Medlem af Rejsegarantifonden (nr. 3356). Din rejse er sikret.'
                  : 'Member of Danish Travel Guarantee Fund (#3356). Your trip is protected.'}
              </p>
            </div>
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏌️</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">{language === 'da' ? '30+ Års Erfaring' : '30+ Years Experience'}</h3>
              <p className="text-sm text-ng-gray-mid">
                {language === 'da'
                  ? 'Grundlagt af passionerede golfere med over 30 års personlig erfaring.'
                  : 'Founded by passionate golfers with over 30 years of personal experience.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-ng-dark text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">
              {language === 'da' ? 'Kontakt os' : 'Contact us'}
            </h4>
            <p className="text-sm leading-relaxed">
              Telefon: <a href="tel:+4524412240" className="text-ng-pink hover:underline">+45 2441 2240</a><br />
              {language === 'da' ? 'Mandag - fredag: 10:00 - 15:00' : 'Monday - Friday: 10:00 - 15:00'}<br />
              E-mail: <a href="mailto:service@nordicgolfers.com" className="text-ng-pink hover:underline">service@nordicgolfers.com</a>
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">NordicGolfers.com Travel ApS</h4>
            <p className="text-sm leading-relaxed">
              CVR: 42289019<br />
              Kirsten Kimers Vej 20<br />
              2300 København S<br />
              Danmark
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">Quick Links</h4>
            <div className="flex flex-col gap-1 text-sm">
              <a href="https://www.nordicgolfers.com/destinationer" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Golfdestinationer</a>
              <a href="https://www.nordicgolfers.com/soeg-golfpakker" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Søg Golfpakker</a>
              <a href="https://www.nordicgolfers.com/long-stay" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Long Stay</a>
              <a href="https://www.nordicgolfers.com/grupperejser" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Grupperejser</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} NordicGolfers.com Travel ApS — {language === 'da' ? 'Medlem af Rejsegarantifonden nr. 3356' : 'Member of Travel Guarantee Fund #3356'}
        </div>
      </footer>

      {/* ===== FLOATING CHAT BUTTON (when chat is closed and scrolled past hero) ===== */}
      {!chatOpen && (
        <button
          onClick={() => openChat()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-ng-pink text-white rounded-full shadow-lg hover:bg-ng-pink-dark transition-all hover:scale-110 flex items-center justify-center z-50"
          title={language === 'da' ? 'Chat med os' : 'Chat with us'}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  )
}
