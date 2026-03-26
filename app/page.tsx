'use client'

import ChatWidget from '@/components/ChatWidget'

const DESTINATIONS = [
  { name: 'Spanien', nameEn: 'Spain', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/3/7/csm_islacanela-2_792fe36d03.jpg' },
  { name: 'Portugal', nameEn: 'Portugal', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/2/3/csm_pirin_9_side_club_pm_766df58527.jpg' },
  { name: 'Tyrkiet', nameEn: 'Turkey', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/3/5/csm_MeliaPuntaCanaBeach-pool2_49a33af340.jpg' },
  { name: 'Danmark', nameEn: 'Denmark', img: 'https://www.nordicgolfers.com/fileadmin/_processed_/a/b/csm_HeritageAwali-profil1_bd602dda67.jpg' },
]

const STATS = [
  { value: '800+', label: 'Golfbaner & Resorts' },
  { value: '30+', label: 'Lande' },
  { value: '50.000+', label: 'Tilfredse golfere' },
  { value: '100%', label: 'Prisgaranti' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVIGATION ===== */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
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
            <a href="https://www.nordicgolfers.com/soeg-golfpakker" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Golfpakker</a>
            <a href="https://www.nordicgolfers.com/resorts" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Resorts</a>
            <a href="https://www.nordicgolfers.com/long-stay" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Long Stay</a>
            <a href="https://www.nordicgolfers.com/faa-tilbud" target="_blank" rel="noopener" className="bg-ng-pink text-white px-5 py-2 rounded hover:bg-ng-pink-dark transition-colors normal-case tracking-normal">
              Faa Tilbud
            </a>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <img
          src="https://www.nordicgolfers.com/fileadmin/_processed_/7/c/csm_Banner_PC_visning-01-01_aa913e9fe3.jpg"
          alt="Golf course panorama"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-white text-3xl md:text-5xl font-light mb-4 drop-shadow-lg max-w-3xl leading-tight uppercase tracking-widest">
            Your Personal Golf Trip Assistant
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-8 drop-shadow max-w-2xl">
            Tell us your preferences and get tailored recommendations in seconds.
          </p>
        </div>
      </section>

      {/* ===== STATS ===== */}
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

      {/* ===== POPULAR DESTINATIONS ===== */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest text-center mb-8">
            Populaere Destinationer
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DESTINATIONS.map((dest) => (
              <a
                key={dest.name}
                href={`https://www.nordicgolfers.com/destinationer/${dest.name.toLowerCase()}`}
                target="_blank"
                rel="noopener"
                className="group relative h-48 md:h-64 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
              >
                <img src={dest.img} alt={dest.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg">{dest.name}</h3>
                  <span className="text-ng-pink text-xs font-bold uppercase tracking-wide">Se tilbud &rarr;</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY NORDICGOLFERS ===== */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-ng-dark uppercase tracking-widest mb-6">
            Hvorfor NordicGolfers?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">Prisgaranti</h3>
              <p className="text-sm text-ng-gray-mid">Direkte priser fra partnere &mdash; ingen mellemled eller ekstra gebyrer.</p>
            </div>
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">Rejsegarantifonden</h3>
              <p className="text-sm text-ng-gray-mid">Medlem af Rejsegarantifonden (nr. 3356). Din rejse er sikret.</p>
            </div>
            <div>
              <div className="w-14 h-14 bg-ng-pink/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏌️</span>
              </div>
              <h3 className="font-bold text-ng-dark mb-1">30+ Aars Erfaring</h3>
              <p className="text-sm text-ng-gray-mid">Grundlagt af passionerede golfere med over 30 aars personlig erfaring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-ng-dark text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">Kontakt os</h4>
            <p className="text-sm leading-relaxed">
              Telefon: <a href="tel:+4524412240" className="text-ng-pink hover:underline">+45 2441 2240</a><br />
              Mandag - fredag: 10:00 - 15:00<br />
              E-mail: <a href="mailto:service@nordicgolfers.com" className="text-ng-pink hover:underline">service@nordicgolfers.com</a>
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">NordicGolfers.com Travel ApS</h4>
            <p className="text-sm leading-relaxed">
              CVR: 42289019<br />
              Kirsten Kimers Vej 20<br />
              2300 Koebenhavn S<br />
              Danmark
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3">Quick Links</h4>
            <div className="flex flex-col gap-1 text-sm">
              <a href="https://www.nordicgolfers.com/destinationer" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Golfdestinationer</a>
              <a href="https://www.nordicgolfers.com/soeg-golfpakker" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Golfpakker</a>
              <a href="https://www.nordicgolfers.com/long-stay" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Long Stay</a>
              <a href="https://www.nordicgolfers.com/grupperejser" target="_blank" rel="noopener" className="hover:text-ng-pink transition-colors">Grupperejser</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} NordicGolfers.com Travel ApS &mdash; Medlem af Rejsegarantifonden nr. 3356
        </div>
      </footer>

      {/* ===== CHAT WIDGET ===== */}
      <ChatWidget />
    </div>
  )
}
