'use client';

import { useEffect, useState, useRef } from 'react';

// Types
type Donnee = {
  date: string; // format "dd/mm/yyyy"
  duree_totale: string;
};

type StatsGlobales = {
  date_minimale: string;
  date_maximale: string;
  valeur_minimale?: string;
  date_valeur_minimale?: string;
  valeur_maximale?: string;
  date_valeur_maximale?: string;
  valeur_moyenne_productive?: string;
  valeur_moyenne_totale?: string;
  jours_sans_production?: number;
  somme_totale_periodes?: string;
};

type Periode = {
  donnees: Donnee[];
  stats: StatsGlobales;
  nom: string;
  fichier: string;
  index?: number;
  somme_totale?: string;
};

export default function Statistiques({ machineName }: { machineName: string }) {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [periodesActives, setPeriodesActives] = useState<number[]>([]);
  const [statsGlobalesVisible, setStatsGlobalesVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [etat, setEtat] = useState('');
  const [menuSelectionOuvert, setMenuSelectionOuvert] = useState(false);
  const [menuSuppressionOuvert, setMenuSuppressionOuvert] = useState(false);
  const [periodesASupprimer, setPeriodesASupprimer] = useState<number[]>([]);

  const suppressionMenuRef = useRef<HTMLDivElement>(null);
  const selectionMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sauvegardes = localStorage.getItem(`periodes_${machineName}`);
    if (sauvegardes) setPeriodes(JSON.parse(sauvegardes));
  }, [machineName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suppressionMenuRef.current && !suppressionMenuRef.current.contains(event.target as Node)) {
        setMenuSuppressionOuvert(false);
      }
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(event.target as Node)) {
        setMenuSelectionOuvert(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setUploadVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enregistrerPeriodes = (nouvellesPeriodes: Periode[]) => {
    localStorage.setItem(`periodes_${machineName}`, JSON.stringify(nouvellesPeriodes));
    setPeriodes(nouvellesPeriodes);
  };

  const envoyerVersBackend = async () => {
    if (fichiers.length === 0) {
      setEtat('❗ Veuillez sélectionner un ou plusieurs fichiers.');
      return;
    }
    setEtat('⏳ Envoi en cours...');
    const nouvellesPeriodes = [...periodes];

    for (const file of fichiers) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/machines/upload/${machineName}`, {
          method: 'POST',
          body: formData,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          nouvellesPeriodes.push({
            donnees: data.donnees,
            stats: data.stats_globales,
            nom: `Période ${nouvellesPeriodes.length + 1}`,
            fichier: file.name,
            somme_totale: data.somme_totale
          });
        }
      } catch {}
    }

    enregistrerPeriodes(nouvellesPeriodes);
    setPeriodesActives(nouvellesPeriodes.map((_, idx) => idx + 1));
    setFichiers([]);
    setEtat('');
    setUploadVisible(false);
  };

  const togglePeriodeActive = (numero: number) => {
    setPeriodesActives((prev) =>
      prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero]
    );
  };

  const toggleToutSelectionner = () => {
    setPeriodesActives(periodesActives.length === periodes.length
      ? []
      : periodes.map((_, index) => index + 1));
  };

  const togglePeriodeASupprimer = (numero: number) => {
    setPeriodesASupprimer((prev) =>
      prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero]
    );
  };

  const supprimerPeriodesSelectionnees = async () => {
    const periodesARemettre: Periode[] = [];
    for (let i = 0; i < periodes.length; i++) {
      const numero = i + 1;
      const periode = periodes[i];
      if (periodesASupprimer.includes(numero)) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/machines/delete_file/${machineName}/${encodeURIComponent(periode.fichier)}`, { method: 'DELETE' });
        } catch {}
      } else {
        periodesARemettre.push(periode);
      }
    }

    const periodesRenommees = periodesARemettre.map((p, index) => ({
      ...p,
      nom: `Période ${index + 1}`
    }));

    enregistrerPeriodes(periodesRenommees);
    setPeriodesActives([]);
    setPeriodesASupprimer([]);
    setMenuSuppressionOuvert(false);
  };

  const afficherPeriodes = periodes
    .map((periode, index) => ({ ...periode, index: index + 1 }))
    .filter((periode) => periodesActives.includes(periode.index!));

  // ----------- OUTILS POUR GLOBAL MOYENNE TOTALE -----------
  function parseFrDate(str: string) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  function toFrDate(dt: Date) {
    return dt.toLocaleDateString('fr-FR');
  }

  // Moyenne/jour ouvré sur toute la période globale
  function getMoyenneTotaleSurPeriode(periodes: Periode[]) {
    if (!periodes.length) return null;

    // Récupère toutes les dates de prod et cherche date min/max
    const datesDeProd = new Map<string, number>(); // clé=yyyy-mm-dd, valeur=secondes
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const periode of periodes) {
      for (const d of periode.donnees) {
        const str = d.date.split('/').reverse().join('-');
        const [h, m, s] = d.duree_totale.split(':').map(Number);
        datesDeProd.set(str, h * 3600 + m * 60 + s);

        const dt = parseFrDate(d.date);
        if (!minDate || dt < minDate) minDate = dt;
        if (!maxDate || dt > maxDate) maxDate = dt;
      }
    }
    if (!minDate || !maxDate) return null;

    // Parcourt tous les jours ouvrés de la période
    let nbJoursOuvres = 0;
    let totalSecondes = 0;
    let jour = new Date(minDate);
    while (jour <= maxDate) {
      const weekday = jour.getDay();
      if (weekday !== 0 && weekday !== 6) { // lundi à vendredi
        nbJoursOuvres++;
        const str = jour.toISOString().slice(0,10); // yyyy-mm-dd
        totalSecondes += datesDeProd.get(str) ?? 0;
      }
      jour.setDate(jour.getDate() + 1);
    }

    function format(secs: number) {
      const h = Math.floor(secs / 3600).toString().padStart(2, '0');
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    }

    return nbJoursOuvres ? format(Math.floor(totalSecondes / nbJoursOuvres)) : '00:00:00';
  }

  // Statistiques globales personnalisées (toutes périodes)
  function getGlobalPeriodAndOffDays(periodes: Periode[]) {
    if (!periodes.length) return null;

    // Liste toutes les dates de prod, toutes périodes confondues (format: yyyy-mm-dd)
    const datesDeProd = new Set<string>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const periode of periodes) {
      for (const d of periode.donnees) {
        datesDeProd.add(d.date.split('/').reverse().join('-')); // yyyy-mm-dd
        const dt = parseFrDate(d.date);
        if (!minDate || dt < minDate) minDate = dt;
        if (!maxDate || dt > maxDate) maxDate = dt;
      }
    }

    if (!minDate || !maxDate) return null;

    // Parcourt tous les jours ouvrés de la période totale
    let joursSansProd = 0;
    let jour = new Date(minDate);
    while (jour <= maxDate) {
      const weekday = jour.getDay();
      if (weekday !== 0 && weekday !== 6) { // lundi à vendredi
        const str = jour.toISOString().slice(0,10); // yyyy-mm-dd
        if (!datesDeProd.has(str)) {
          joursSansProd++;
        }
      }
      jour.setDate(jour.getDate() + 1);
    }

    return {
      periodeGlobale: toFrDate(minDate) + ' ➔ ' + toFrDate(maxDate),
      joursSansProd: joursSansProd
    };
  }

  // Stats legacy min/max/moyenne jours travaillés (pour "moyenne/jour travaillé")
  const statsGlobales = () => {
    const toutesDonnees = periodes.flatMap((p) => p.donnees);
    const toutesSecondes = toutesDonnees.map((item) => {
      const [h, m, s] = item.duree_totale.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    });
    if (toutesSecondes.length === 0) return null;
    const min = Math.min(...toutesSecondes);
    const max = Math.max(...toutesSecondes);
    const moyenne = Math.floor(toutesSecondes.reduce((a, b) => a + b, 0) / toutesSecondes.length);
    const format = (secs: number) => {
      const h = Math.floor(secs / 3600).toString().padStart(2, '0');
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    };
    return { min: format(min), max: format(max), moyenne: format(moyenne) };
  };

  // ----------- RENDU -----------
  return (
    <div className="flex flex-col items-center w-full relative">

      {periodes.length > 0 && (
        <div className="mb-8 flex gap-4 justify-center items-center flex-wrap">

          <div className="relative inline-block" ref={selectionMenuRef}>
            <button
              onClick={() => setMenuSelectionOuvert(!menuSelectionOuvert)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            >
              ☑️ Sélectionner les périodes
            </button>

            {menuSelectionOuvert && (
              <div className="absolute left-0 top-full mt-2 bg-white/40 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl w-72 max-h-96 overflow-y-auto z-50 border border-gray-200/50 dark:border-white/10">
                <button
                  onClick={toggleToutSelectionner}
                  className="w-full mb-4 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold cursor-pointer shadow-md transition-all"
                >
                  {periodesActives.length === periodes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>

                {periodes.map((_, index) => {
                  const numero = index + 1;
                  const checked = periodesActives.includes(numero);
                  return (
                    <label key={index} className="flex items-center mb-2 cursor-pointer hover:bg-blue-100/30 dark:hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePeriodeActive(numero)}
                        className="mr-3 cursor-pointer w-4 h-4"
                      />
                      <span className="text-gray-800 dark:text-white font-medium">Période {numero}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setStatsGlobalesVisible(!statsGlobalesVisible)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
          >
            📊 Statistiques globales
          </button>
        </div>
      )}

      {statsGlobalesVisible && statsGlobales() && (
        <div className="mb-12 bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm border-2 border-gray-800 dark:border-white rounded-2xl p-6 w-full max-w-2xl text-center shadow-xl">
          <h2 className="font-bold text-2xl mb-6 text-gray-800 dark:text-white">📊 Statistiques globales (toutes périodes)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-600 dark:text-gray-400">Durée minimale</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{statsGlobales()?.min}</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-600 dark:text-gray-400">Durée maximale</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{statsGlobales()?.max}</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-600 dark:text-gray-400">Moyenne/jour travaillé</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{statsGlobales()?.moyenne}</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-600 dark:text-gray-400">Moyenne/période totale</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">{getMoyenneTotaleSurPeriode(periodes)}</p>
            </div>
          </div>
          <div className="mt-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 dark:from-blue-600/10 dark:to-purple-600/10 p-4 rounded-xl border border-blue-300 dark:border-blue-500/30">
            <p className="text-sm text-gray-600 dark:text-gray-400">Somme totale toutes périodes</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{(() => {
              let totalSecs = 0;
              
              periodes.forEach(periode => {
                const isSingle = periode.stats.date_minimale === periode.stats.date_maximale;
                
                if (isSingle) {
                  const [h, m, s] = periode.donnees[0].duree_totale.split(':').map(Number);
                  totalSecs += h * 3600 + m * 60 + s;
                } else {
                  if (periode.stats.somme_totale_periodes) {
                    const [h, m, s] = periode.stats.somme_totale_periodes.split(':').map(Number);
                    totalSecs += h * 3600 + m * 60 + s;
                  }
                }
              });
              
              const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
              const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
              const s = (totalSecs % 60).toString().padStart(2, '0');
              return `${h}:${m}:${s}`;
            })()}</p>
          </div>
          {(() => {
            const synth = getGlobalPeriodAndOffDays(periodes);
            return synth && (
              <div className="mt-6 bg-white/30 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Période totale</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{synth.periodeGlobale}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Jours ouvrés sans production</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{synth.joursSansProd}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {afficherPeriodes.map((periode) => {
        const isSingle = periode.stats.date_minimale === periode.stats.date_maximale;
        return (
          <div key={periode.index} className="w-full max-w-6xl flex flex-col lg:flex-row justify-center items-start gap-6 mb-8">

            <div className="flex-1 bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm border-2 border-gray-800 dark:border-white rounded-2xl p-6 shadow-xl">
              <h2 className="font-bold text-xl mb-4 text-gray-800 dark:text-white">{periode.nom} - Durées cumulées par date</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {periode.donnees.map((item, idx) => (
                  <div key={idx} className="bg-white/40 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Durée totale</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.duree_totale}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-80 w-full bg-gradient-to-br from-blue-100/70 to-purple-100/70 dark:from-white/10 dark:to-white/5 backdrop-blur-sm border-2 border-gray-800 dark:border-white rounded-2xl p-6 shadow-xl">
              <h2 className="font-bold text-xl mb-6 text-center text-gray-800 dark:text-white">📊 Statistiques {periode.nom}</h2>
              {isSingle ? (
                <div className="space-y-4">
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{periode.stats.date_minimale}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Durée</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{periode.donnees[0]?.duree_totale}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Période</p>
                    <p className="text-base font-bold text-gray-800 dark:text-white mt-1">{periode.stats.date_minimale} ➔ {periode.stats.date_maximale}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Jours sans prod (hors WE)</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">{periode.stats.jours_sans_production ?? 0}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Durée min</p>
                    <p className="text-base font-bold text-gray-800 dark:text-white">{periode.stats.valeur_minimale}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">({periode.stats.date_valeur_minimale})</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Durée max</p>
                    <p className="text-base font-bold text-gray-800 dark:text-white">{periode.stats.valeur_maximale}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">({periode.stats.date_valeur_maximale})</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Moyenne/jour travaillé</p>
                    <p className="text-base font-bold text-gray-800 dark:text-white">{periode.stats.valeur_moyenne_productive ?? '-'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Moyenne/période totale</p>
                    <p className="text-base font-bold text-gray-800 dark:text-white">{periode.stats.valeur_moyenne_totale ?? '-'}</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 dark:from-blue-600/10 dark:to-purple-600/10 p-3 rounded-xl border border-blue-300 dark:border-blue-500/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Somme totale période</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">{periode.stats.somme_totale_periodes ?? '-'}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        );
      })}

      {/* Poubelle flottante */}
      {periodes.length > 0 && (
        <div className="fixed bottom-24 right-6 flex flex-col items-end z-40" ref={suppressionMenuRef}>
          <button
            onClick={() => setMenuSuppressionOuvert(!menuSuppressionOuvert)}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full text-2xl p-4 shadow-2xl hover:shadow-red-500/50 transition-all duration-300 cursor-pointer hover:scale-110"
            title="Supprimer des périodes"
          >
            🗑️
          </button>

          {menuSuppressionOuvert && (
            <div className="mb-4 bg-white/40 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl w-80 max-h-96 overflow-y-auto border border-gray-200/50 dark:border-white/10">
              <p className="mb-4 font-bold text-lg text-gray-800 dark:text-white">Périodes à supprimer</p>
              <div className="space-y-2">
                {periodes.map((_, index) => {
                  const numero = index + 1;
                  const checked = periodesASupprimer.includes(numero);
                  return (
                    <label key={index} className="flex items-center cursor-pointer hover:bg-red-100/30 dark:hover:bg-red-900/20 rounded-lg px-3 py-2 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePeriodeASupprimer(numero)}
                        className="mr-3 cursor-pointer w-4 h-4"
                      />
                      <span className="text-gray-800 dark:text-white font-medium">Période {numero}</span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={supprimerPeriodesSelectionnees}
                className="w-full mt-5 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold cursor-pointer shadow-lg transition-all hover:scale-105"
              >
                Supprimer la sélection
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setUploadVisible(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full text-2xl p-4 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 cursor-pointer hover:scale-110 z-40"
        title="Ajouter une nouvelle période"
      >
        ➕
      </button>

      {uploadVisible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div ref={uploadMenuRef} className="bg-white/40 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-96 border border-gray-200/50 dark:border-white/10 shadow-2xl">
            <h2 className="font-bold text-2xl mb-6 text-gray-800 dark:text-white text-center">Ajouter des périodes</h2>
            <label className="w-full bg-blue-100 dark:bg-blue-900/30 text-gray-800 dark:text-white border-2 border-dashed border-blue-400 dark:border-blue-600 p-6 rounded-xl text-center font-semibold cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all block">
              <div className="text-4xl mb-2">📁</div>
              <div>{fichiers.length > 0 ? `${fichiers.length} fichier${fichiers.length > 1 ? 's' : ''} sélectionné${fichiers.length > 1 ? 's' : ''}` : 'Sélectionner des fichiers'}</div>
              <input
                type="file"
                multiple
                onChange={(e) => setFichiers(e.target.files ? Array.from(e.target.files) : [])}
                className="hidden"
              />
            </label>
            <button
              onClick={envoyerVersBackend}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-xl shadow-lg mt-6 cursor-pointer transition-all hover:scale-105"
            >
              🚀 Envoyer les fichiers
            </button>
            {etat && (
              <div className={`text-center mt-4 p-3 rounded-lg ${
                etat.includes('❗') ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 
                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {etat}
              </div>
            )}
            <button
              onClick={() => setUploadVisible(false)}
              className="mt-4 w-full text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
