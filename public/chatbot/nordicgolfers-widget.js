/**
 * NordicGolfers.com Chatbot Widget v1
 * AI-powered golf trip assistant — embeddable on any website.
 *
 * Usage:
 *   <script>window.NG_CHAT_API = "https://your-app.vercel.app/api/chat";</script>
 *   <script src="https://your-app.vercel.app/chatbot/nordicgolfers-widget.js"></script>
 */
(function() {
  'use strict';

  const API = window.NG_CHAT_API || '/api/chat';
  const LEAD_API = window.NG_LEAD_API || '/api/lead';
  const SESSION_ID = 'ng_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

  const i18n = {
    da: {
      title: 'NordicGolfers.com',
      subtitle: 'Din golfrejse-assistent',
      placeholder: 'Skriv en besked...',
      send: 'Send',
      welcome: 'Hej! ⛳ Velkommen til NordicGolfers.com!\n\nJeg hjælper dig med at finde den perfekte golfrejse. Fortæl mig:\n\n• Hvornår vil I rejse?\n• Hvor mange er I?\n• Hvilken destination drømmer I om?\n\nEller vælg en af mulighederne nedenfor 👇',
      quickReplies: ['Plan en golfrejse', 'Grupperejse', 'Long Stay', 'Kontakt os'],
      fallback: 'Beklager, der opstod en fejl. Kontakt os på +45 2441 2240 eller service@nordicgolfers.com.',
      formTitle: '📋 Få et tilbud',
      formDesc: 'Udfyld dine oplysninger, så kontakter vi dig med et skræddersyet tilbud.',
      formName: 'Dit navn',
      formEmail: 'Din email',
      formPhone: 'Telefonnummer (valgfrit)',
      formSubmit: 'Send — Få tilbud',
      formLater: 'Senere',
      formThanks: 'Tak! Vi kontakter dig hurtigst muligt med et tilbud. 🎉',
      poweredBy: 'Golfrejser med prisgaranti',
    },
    en: {
      title: 'NordicGolfers.com',
      subtitle: 'Your golf trip assistant',
      placeholder: 'Type a message...',
      send: 'Send',
      welcome: 'Hello! ⛳ Welcome to NordicGolfers.com!\n\nI help you find the perfect golf trip. Tell me:\n\n• When are you traveling?\n• How many people?\n• Which destination do you dream of?\n\nOr pick one of the options below 👇',
      quickReplies: ['Plan a golf trip', 'Group travel', 'Long Stay', 'Contact us'],
      fallback: 'Sorry, an error occurred. Contact us at +45 2441 2240 or service@nordicgolfers.com.',
      formTitle: '📋 Get a quote',
      formDesc: 'Fill in your details and we\'ll contact you with a tailored offer.',
      formName: 'Your name',
      formEmail: 'Your email',
      formPhone: 'Phone (optional)',
      formSubmit: 'Submit — Get a quote',
      formLater: 'Maybe later',
      formThanks: 'Thanks! We\'ll contact you shortly with an offer. 🎉',
      poweredBy: 'Golf trips with price guarantee',
    }
  };

  let lang = 'da';
  let messages = [];
  let isOpen = false;
  let isLoading = false;
  let showForm = false;
  let leadSubmitted = false;

  function t(key) { return i18n[lang][key] || i18n.da[key]; }

  // ── Inject CSS ──
  const style = document.createElement('style');
  style.textContent = `
    #ng-chat-btn{position:fixed;bottom:24px;right:24px;width:64px;height:64px;border-radius:50%;background:#e91e63;border:none;cursor:pointer;z-index:99999;box-shadow:0 4px 16px rgba(233,30,99,.4);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}
    #ng-chat-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(233,30,99,.5)}
    #ng-chat-btn svg{width:32px;height:32px;fill:#fff}
    #ng-chat-win{position:fixed;bottom:100px;right:24px;width:400px;height:620px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15);z-index:99999;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #ng-chat-win.open{display:flex;animation:ngSlideUp .3s ease}
    @keyframes ngSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .ng-header{background:#e91e63;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
    .ng-header-icon{width:36px;height:36px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px}
    .ng-header-text h3{margin:0;font-size:15px;font-weight:700}
    .ng-header-text p{margin:0;font-size:11px;opacity:.85}
    .ng-header-actions{margin-left:auto;display:flex;gap:4px;align-items:center}
    .ng-lang-btn{background:rgba(255,255,255,.2);border:none;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600}
    .ng-lang-btn.active{background:#fff;color:#e91e63}
    .ng-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 4px;opacity:.8}
    .ng-close:hover{opacity:1}
    .ng-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
    .ng-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.5;animation:ngFadeIn .3s ease;word-wrap:break-word}
    @keyframes ngFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .ng-msg.user{background:#e91e63;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
    .ng-msg.bot{background:#f5f5f5;color:#333;align-self:flex-start;border-bottom-left-radius:4px}
    .ng-msg.bot strong{color:#e91e63}
    .ng-msg a{color:#e91e63;text-decoration:underline}
    .ng-msg.user a{color:#fff}
    .ng-typing{display:flex;gap:4px;padding:10px 14px;background:#f5f5f5;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;align-items:center}
    .ng-dot{width:7px;height:7px;background:#999;border-radius:50%;animation:ngPulse 1.4s infinite}
    .ng-dot:nth-child(2){animation-delay:.2s}
    .ng-dot:nth-child(3){animation-delay:.4s}
    @keyframes ngPulse{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
    .ng-quick{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px}
    .ng-quick button{background:#fff;border:1px solid #e0e0e0;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;color:#555;transition:border-color .2s,color .2s}
    .ng-quick button:hover{border-color:#e91e63;color:#e91e63}
    .ng-input-area{border-top:1px solid #eee;padding:10px 12px;display:flex;gap:8px;flex-shrink:0}
    .ng-input-area input{flex:1;border:1px solid #ddd;border-radius:24px;padding:10px 16px;font-size:13px;outline:none}
    .ng-input-area input:focus{border-color:#e91e63}
    .ng-input-area button{background:#e91e63;border:none;color:#fff;padding:10px 20px;border-radius:24px;font-size:13px;font-weight:600;cursor:pointer}
    .ng-input-area button:disabled{opacity:.5;cursor:not-allowed}
    .ng-footer{text-align:center;padding:6px;font-size:10px;color:#aaa;flex-shrink:0}
    .ng-form{background:#fff;border:2px solid #e91e63;border-radius:12px;margin:8px 16px;padding:16px;animation:ngFadeIn .3s ease}
    .ng-form h4{margin:0 0 4px;font-size:15px;color:#333}
    .ng-form p{margin:0 0 12px;font-size:12px;color:#777}
    .ng-form input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:8px;outline:none;box-sizing:border-box}
    .ng-form input:focus{border-color:#e91e63}
    .ng-form .ng-form-submit{width:100%;padding:10px;background:#e91e63;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
    .ng-form .ng-form-later{display:block;text-align:center;font-size:11px;color:#aaa;margin-top:6px;cursor:pointer;background:none;border:none;width:100%}
    @media(max-width:480px){
      #ng-chat-win{right:0;bottom:0;width:100%;height:100%;max-height:100%;border-radius:0}
      #ng-chat-btn{bottom:16px;right:16px;width:56px;height:56px}
    }
  `;
  document.head.appendChild(style);

  // ── Create button ──
  const btn = document.createElement('button');
  btn.id = 'ng-chat-btn';
  btn.title = 'Chat med os';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';
  btn.onclick = toggleChat;
  document.body.appendChild(btn);

  // ── Create window ──
  const win = document.createElement('div');
  win.id = 'ng-chat-win';
  document.body.appendChild(win);

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      if (messages.length === 0) {
        messages.push({ role: 'assistant', content: t('welcome') });
      }
      render();
      setTimeout(() => {
        const input = win.querySelector('.ng-input-area input');
        if (input) input.focus();
      }, 100);
    } else {
      win.classList.remove('open');
    }
  }

  function render() {
    const showQuick = messages.length <= 1 && !isLoading;

    win.innerHTML = `
      <div class="ng-header">
        <div class="ng-header-icon">⛳</div>
        <div class="ng-header-text">
          <h3>${t('title')}</h3>
          <p>${t('subtitle')}</p>
        </div>
        <div class="ng-header-actions">
          <button class="ng-lang-btn ${lang==='da'?'active':''}" data-lang="da">DA</button>
          <button class="ng-lang-btn ${lang==='en'?'active':''}" data-lang="en">EN</button>
          <button class="ng-close">&times;</button>
        </div>
      </div>
      <div class="ng-messages" id="ng-msgs">
        ${messages.map(m => `<div class="ng-msg ${m.role==='user'?'user':'bot'}">${formatMsg(m.content)}</div>`).join('')}
        ${isLoading ? '<div class="ng-typing"><span class="ng-dot"></span><span class="ng-dot"></span><span class="ng-dot"></span></div>' : ''}
        ${showForm && !leadSubmitted ? renderForm() : ''}
      </div>
      ${showQuick ? `<div class="ng-quick">${t('quickReplies').map(q => `<button data-quick="${q}">${q}</button>`).join('')}</div>` : ''}
      <div class="ng-input-area">
        <input type="text" placeholder="${t('placeholder')}" ${isLoading?'disabled':''} />
        <button ${isLoading?'disabled':''}>${t('send')}</button>
      </div>
      <div class="ng-footer">${t('poweredBy')} — +45 2441 2240</div>
    `;

    // Scroll to bottom
    const msgsEl = win.querySelector('#ng-msgs');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;

    // Bind events
    win.querySelector('.ng-close').onclick = toggleChat;
    win.querySelectorAll('.ng-lang-btn').forEach(b => {
      b.onclick = () => { lang = b.dataset.lang; render(); };
    });
    win.querySelectorAll('.ng-quick button').forEach(b => {
      b.onclick = () => sendMessage(b.dataset.quick);
    });

    const inputEl = win.querySelector('.ng-input-area input');
    const sendBtn = win.querySelector('.ng-input-area button');
    inputEl.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); } };
    sendBtn.onclick = () => sendMessage(inputEl.value);

    // Form events
    const formEl = win.querySelector('.ng-form form');
    if (formEl) {
      formEl.onsubmit = (e) => { e.preventDefault(); submitLead(formEl); };
    }
    const laterBtn = win.querySelector('.ng-form-later');
    if (laterBtn) laterBtn.onclick = () => { showForm = false; render(); };
  }

  function renderForm() {
    return `
      <div class="ng-form">
        <h4>${t('formTitle')}</h4>
        <p>${t('formDesc')}</p>
        <form>
          <input type="text" name="name" placeholder="${t('formName')}" required />
          <input type="email" name="email" placeholder="${t('formEmail')}" required />
          <input type="tel" name="phone" placeholder="${t('formPhone')}" />
          <button type="submit" class="ng-form-submit">${t('formSubmit')}</button>
        </form>
        <button class="ng-form-later">${t('formLater')}</button>
      </div>
    `;
  }

  function formatMsg(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(https?:\/\/[^\s<]+)/g, function(match) {
        // Don't double-wrap URLs already in anchor tags
        return match;
      })
      .replace(/\n/g, '<br/>');
  }

  async function sendMessage(text) {
    if (!text || !text.trim() || isLoading) return;
    text = text.trim();

    messages.push({ role: 'user', content: text });
    isLoading = true;
    render();

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          sessionId: SESSION_ID,
          language: lang,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botContent = '';
      messages.push({ role: 'assistant', content: '' });
      isLoading = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                botContent += parsed.text;
                messages[messages.length - 1].content = botContent;
                render();
              }
              if (parsed.action === 'lead_capture') {
                showForm = true;
              }
            } catch (e) {}
          }
        }
      }

      // Clean [[LEAD_CAPTURE]] marker
      if (botContent.includes('[[LEAD_CAPTURE]]')) {
        botContent = botContent.replace(/\[\[LEAD_CAPTURE\]\]/g, '').trim();
        messages[messages.length - 1].content = botContent;
        showForm = true;
      }

      render();
    } catch (err) {
      isLoading = false;
      messages.push({ role: 'assistant', content: t('fallback') });
      render();
    }
  }

  async function submitLead(form) {
    const data = new FormData(form);
    const lead = {
      name: data.get('name'),
      email: data.get('email'),
      phone: data.get('phone') || '',
      session_id: SESSION_ID,
      language: lang,
      source_page: window.location.href,
    };

    showForm = false;
    leadSubmitted = true;
    messages.push({ role: 'assistant', content: t('formThanks') });
    render();

    // Save lead
    try {
      await fetch(LEAD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch (e) {}

    // Send lead info to AI for follow-up
    sendMessage(`[LEAD_INFO] Navn: ${lead.name}, Email: ${lead.email}, Telefon: ${lead.phone}`);
  }

})();
