'use client';

import { useRouter } from 'next/navigation';
import { Star, Shield, Zap, Users } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] flex flex-col relative overflow-hidden">
      {/* Fond animé avec touches de bleu/violet */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Taches bleues pour le mode clair */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
        
        {/* Taches violettes pour le mode sombre */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-[#8c68d8]/15 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#7a5bc4]/8 rounded-full blur-2xl animate-pulse dark:block hidden" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-[#9d7ce8]/12 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-[#6b46c1]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
      </div>
      {/* HEADER */}
      <header className="flex justify-between items-center px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-blue-600 dark:text-[#7f49e8] drop-shadow-xl tracking-wide">ARP</span>
          <span className="ml-2 px-2 py-1 bg-blue-600 dark:bg-[#8c68d8] text-white rounded-lg text-xs tracking-widest shadow-lg">V2</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2 font-bold rounded-xl text-white bg-gray-800 hover:bg-gray-700 shadow transition cursor-pointer active:scale-95 transition-transform"
          >
            Connexion
          </button>
          <button
            onClick={() => router.push('/register')}
            className="px-5 py-2 font-bold rounded-xl border border-blue-600 dark:border-[#8c68d8] text-white bg-blue-600 dark:bg-[#8c68d8] hover:bg-blue-700 dark:hover:bg-[#7a5bc4] shadow transition cursor-pointer active:scale-95 transition-transform"
          >
            Inscription
          </button>
        </div>
      </header>
      
      {/* BODY */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-full mb-8">
          <Star className="w-4 h-4 text-blue-600 dark:text-[#8c68d8]" />
          <span className="text-sm text-gray-600 dark:text-gray-400 opacity-80">Plateforme de gestion de données et de planification.</span>
        </div>

        {/* Titre principal */}
        <h1 className="text-[4rem] font-extrabold text-gray-800 dark:text-white text-center drop-shadow-2xl tracking-tight mb-4">
          Bienvenue chez <span className="text-blue-600 dark:text-[#7f49e8]">ARP</span>
        </h1>
        
        {/* Description */}
        <div className="text-center max-w-2xl mb-12">
          <p className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-2 opacity-90">
            Automatisation, analyse et projection des données.
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 opacity-80">
            Interface moderne, workflows optimisés, résultats exceptionnels.
          </p>
        </div>

        {/* Bouton CTA */}
        <button
          className="px-8 py-4 text-xl font-bold rounded-xl bg-blue-600 dark:bg-[#8c68d8] hover:bg-blue-700 dark:hover:bg-[#7a5bc4] text-white shadow-lg transition cursor-pointer active:scale-95 transition-transform mb-16"
          onClick={() => router.push('/login')}
        >
          Commencer →
        </button>

        {/* Section des fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Carte 1 */}
          <div className="bg-blue-100/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-[#8c68d8]" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Interface intuitive</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">Design moderne et épuré</p>
          </div>

          {/* Carte 2 */}
          <div className="bg-blue-100/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Zap className="w-6 h-6 text-blue-600 dark:text-[#8c68d8]" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Performance optimale</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">Rapidité et fluidité</p>
          </div>

          {/* Carte 3 */}
          <div className="bg-blue-100/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-blue-600 dark:text-[#8c68d8]" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Sécurité avancée</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">Protection des données</p>
          </div>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm opacity-80">
        © {new Date().getFullYear()} ARP — Tous droits réservés.
      </footer>
    </div>
  );
} 