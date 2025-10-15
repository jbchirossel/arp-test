'use client';

import { useState, useEffect, useRef } from 'react';
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';

type SectionsState = {
  infosGenerales: boolean;
  infosSpecifiques: boolean;
  coutHoraires: boolean;
};

// Composant Tooltip
function Tooltip({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-2 align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold flex items-center justify-center hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer transition-colors"
        tabIndex={0}
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute left-7 z-20 w-64 p-3 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-lg shadow-xl border border-blue-400"
          style={{ top: "-0.5rem" }}
        >
          {note}
        </div>
      )}
    </span>
  );
}

export default function CoutDeRevient({ machineName }: { machineName: string }) {
  const [inputs, setInputs] = useState<Record<string, string>>({
    heuresAnnuelles: '',
    amortissement: '',
    interet: '',
    kwH: '',
    airLiquide: '',
    coefPuissance: '',
    fraisLocaux: '',
    assurances: '',
    heuresFacturees: '',
    prixAchat: '',
    maintenance: '',
    surface: '',
    puissance: '',
    consoAirLiquid: '',
    salaireOperateur: '',
    coefUtilisation: '',
  });

  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [visibleSections, setVisibleSections] = useState<SectionsState>({
    infosGenerales: true,
    infosSpecifiques: true,
    coutHoraires: true,
  });

  const [note, setNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`coutDeRevient_${machineName}`);
    if (saved) {
      const data = JSON.parse(saved);
      setInputs(data.inputs || inputs);
      setNote(data.note || '');
      
      const locked: Record<string, boolean> = {};
      Object.entries(data.inputs || {}).forEach(([key, val]) => {
        locked[key] = String(val).trim() !== '';
      });
      setLockedFields(locked);
    }
  }, [machineName]);

  // Sauvegarder dans localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`coutDeRevient_${machineName}`, JSON.stringify({
        inputs,
        note
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs, note, machineName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, name: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setLockedFields(prev => ({ ...prev, [name]: true }));

      const keys = Object.keys(inputs);
      const currentIndex = keys.indexOf(name);

      for (let i = currentIndex + 1; i < keys.length; i++) {
        if (!lockedFields[keys[i]]) {
          const nextInput = inputRefs.current[keys[i]];
          if (nextInput) {
            nextInput.focus();
            setLockedFields(prev => ({ ...prev, [keys[i]]: false }));
          }
          break;
        }
      }
    }
  };

  const toggleEdit = (name: string) => {
    setLockedFields(prev => ({ ...prev, [name]: false }));
    setTimeout(() => {
      inputRefs.current[name]?.focus();
    }, 0);
  };

  const toNumber = (val: string) => {
    if (!val || val === '') return 0;
    return Number(val.replace(',', '.'));
  };

  // Calculs automatiques
  const calculs = {
    Amortissementtechniquehoraire:
      toNumber(inputs.prixAchat) /
      (toNumber(inputs.amortissement) * toNumber(inputs.heuresAnnuelles) || 1),

    AssurancesHoraire:
      toNumber(inputs.prixAchat) * toNumber(inputs.assurances) / (toNumber(inputs.heuresAnnuelles) || 1),

    Fraisfinanciershoraires:
      ((toNumber(inputs.interet) * (toNumber(inputs.prixAchat) / 2)) * toNumber(inputs.amortissement) / ((toNumber(inputs.heuresAnnuelles) * toNumber(inputs.amortissement)) || 1)),

    Fraisdereparationetdentretienhoraires:
      (toNumber(inputs.maintenance) / (toNumber(inputs.heuresAnnuelles) || 1)) * toNumber(inputs.coefUtilisation),

    Fraisutilisationdelocaux:
      (toNumber(inputs.fraisLocaux) * toNumber(inputs.surface)) / (toNumber(inputs.heuresAnnuelles) || 1),

    Fraisdeconsommationenenergie:
      toNumber(inputs.kwH) * toNumber(inputs.coefPuissance) * toNumber(inputs.puissance) * toNumber(inputs.coefUtilisation),

    FraisconsommationAirliquide:
      toNumber(inputs.consoAirLiquid) * toNumber(inputs.airLiquide),

    CoutHoraireMachineBrut: 0,
    SalaireHorairesOperateurCharge: toNumber(inputs.salaireOperateur),
    CoutHoraireMachine: 0,
  };

  calculs.CoutHoraireMachineBrut =
    (calculs.Amortissementtechniquehoraire || 0) +
    (calculs.AssurancesHoraire || 0) +
    (calculs.Fraisfinanciershoraires || 0) +
    (calculs.Fraisdereparationetdentretienhoraires || 0) +
    (calculs.Fraisutilisationdelocaux || 0) +
    (calculs.Fraisdeconsommationenenergie || 0) +
    (calculs.FraisconsommationAirliquide || 0);

  calculs.CoutHoraireMachine =
    (calculs.CoutHoraireMachineBrut || 0) + (calculs.SalaireHorairesOperateurCharge || 0);

  // Temps journalier
  const baseJournee = 7;
  const coefUtilisation = toNumber(inputs.coefUtilisation);
  const tempsJournalierEnHeures = baseJournee * coefUtilisation;
  
  function formatHeureMinute(val: number) {
    if (!Number.isFinite(val)) return '';
    const heures = Math.floor(val);
    const minutes = Math.round((val - heures) * 60);
    return `${heures}h${minutes.toString().padStart(2, '0')}`;
  }
  
  function formatVal(val: number) {
    if (!Number.isFinite(val)) return '';
    if (val === 0) return '0';
    return val.toFixed(4).replace(/\.?0+$/, '');
  }

  // Définitions des groupes de champs
  const infosGenerales = [
    'heuresAnnuelles',
    'amortissement',
    'interet',
    'kwH',
    'airLiquide',
    'coefPuissance',
    'fraisLocaux',
    'assurances',
    'heuresFacturees',
  ];

  const infosSpecifiques = [
    'prixAchat',
    'maintenance',
    'surface',
    'puissance',
    'consoAirLiquid',
    'salaireOperateur',
    'coefUtilisation',
  ];

  const coutshoraires = [
    'Amortissementtechniquehoraire',
    'AssurancesHoraire',
    'Fraisfinanciershoraires',
    'Fraisdereparationetdentretienhoraires',
    'Fraisutilisationdelocaux',
    'FraisconsommationAirliquide',
    'Fraisdeconsommationenenergie',
    'CoutHoraireMachineBrut',
    'SalaireHorairesOperateurCharge',
    'CoutHoraireMachine',
  ];

  const labelMap: Record<string, string> = {
    heuresAnnuelles: 'Heures annuelles',
    amortissement: 'Amortissement (années)',
    interet: 'Intérêt (%)',
    kwH: 'kWh',
    airLiquide: 'Air Liquide',
    coefPuissance: 'Coef Puissance',
    fraisLocaux: 'Frais Locaux',
    assurances: 'Assurances (%)',
    heuresFacturees: 'Heures facturées',
    prixAchat: 'Prix achat',
    maintenance: 'Maintenance',
    surface: 'Surface',
    puissance: 'Puissance',
    consoAirLiquid: 'Conso AirLiquid/h',
    salaireOperateur: 'Salaire opérateur',
    coefUtilisation: 'Coef Utilisation',
    Amortissementtechniquehoraire: 'Amortissement coût horaire',
    AssurancesHoraire: 'Assurances',
    Fraisfinanciershoraires: 'Frais financiers horaires',
    Fraisdereparationetdentretienhoraires: 'Frais réparation et entretien horaires',
    Fraisutilisationdelocaux: 'Frais utilisation locaux',
    FraisconsommationAirliquide: 'Frais consommation Air Liquide',
    Fraisdeconsommationenenergie: 'Frais consommation énergie',
    CoutHoraireMachineBrut: 'Coût horaire machine brut',
    SalaireHorairesOperateurCharge: 'Salaire horaire opérateur chargé',
    CoutHoraireMachine: 'Coût horaire machine',
  };

  const notes: Record<string, string> = {
    heuresAnnuelles: "Heures (hypothèse 7 heures jours sur 45 semaines)",
    amortissement: "Durée moyenne d'amortissement (qui peut varier) entre 5 et 7 ans en fonction de la machine",
    interet: "Coût moyen du financement pour les biens d'équipement (durée entre 5 et 7 ans)",
    kwH: "Coût du kWh d'électricité",
    airLiquide: "Coût du m³",
    coefPuissance: "Coefficient de puissance de la machine, d'après données techniques",
    fraisLocaux: "Frais d'utilisation des locaux au m²",
    assurances: "Taux d'assurance annuel sur la valeur de la machine",
    heuresFacturees: "45 semaine de travail effectif à 90% de productivité",
    prixAchat: "Prix d'achat de la machine",
    maintenance: "Moyenne des frais d'entretien de l'ensemble du matériel",
    surface: "Surface occupée par la machine (en m²) au prorata du nb de machines",
    puissance: "Puissance nominale de la machine (kW)",
    consoAirLiquid: "Consommation horaire d'Air Liquide (m³/h)",
    salaireOperateur: "Salaire horaire chargé de l'opérateur",
    coefUtilisation: "Taux d'utilisation moyen de la machine sur une journée de 7h",
    Amortissementtechniquehoraire: "€/h",
    AssurancesHoraire: "€/h",
    Fraisfinanciershoraires: "€/h (approximatif)",
    Fraisdereparationetdentretienhoraires: "€/h",
    Fraisutilisationdelocaux: "€/h",
    FraisconsommationAirliquide: "€/h",
    Fraisdeconsommationenenergie: "€/h",
    CoutHoraireMachineBrut: "€/h",
    SalaireHorairesOperateurCharge: "€/h",
    CoutHoraireMachine: "€/h",
  };

  // Tableau de variation des coûts
  const tableRows = [];
  for (let h = 0; h <= 9; h += 1) {
    const CoutFixe =
      (toNumber(inputs.prixAchat) / (toNumber(inputs.amortissement) * toNumber(inputs.heuresAnnuelles) || 1)) +
      (toNumber(inputs.prixAchat) * toNumber(inputs.assurances) / (toNumber(inputs.heuresAnnuelles) || 1)) +
      (((toNumber(inputs.interet) * (toNumber(inputs.prixAchat) / 2)) * toNumber(inputs.amortissement)) / ((toNumber(inputs.heuresAnnuelles) * toNumber(inputs.amortissement)) || 1)) +
      ((toNumber(inputs.fraisLocaux) * toNumber(inputs.surface)) / (toNumber(inputs.heuresAnnuelles) || 1));

    const CoutVariable =
      (toNumber(inputs.maintenance) / (toNumber(inputs.heuresAnnuelles) || 1)) +
      (toNumber(inputs.kwH) * toNumber(inputs.coefPuissance) * toNumber(inputs.puissance)) +
      (toNumber(inputs.consoAirLiquid) * toNumber(inputs.airLiquide));

    let CoutHoraireMachineBrut = 0;
    if (h === 0) {
      CoutHoraireMachineBrut = CoutFixe;
    } else {
      CoutHoraireMachineBrut = h * (CoutFixe + CoutVariable);
    }

    const SalaireHorairesOperateurCharge = toNumber(inputs.salaireOperateur) * h;
    const CoutHoraireMachine = CoutHoraireMachineBrut + SalaireHorairesOperateurCharge;

    tableRows.push(
      <tr key={h} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors">
        <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-white">{h}h</td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{SalaireHorairesOperateurCharge.toFixed(2)}€</td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{CoutHoraireMachineBrut.toFixed(2)}€</td>
        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{CoutHoraireMachine.toFixed(2)}€</td>
      </tr>
    );
  }

  const renderInputs = (keys: string[]) =>
    keys.map(key => {
      if (coutshoraires.includes(key)) {
        const value = calculs[key as keyof typeof calculs];
        return (
          <div key={key} className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center">
              {labelMap[key]}
              {notes[key] && <Tooltip note={notes[key]} />}
            </label>
            <input
              type="text"
              readOnly
              value={formatVal(value)}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none cursor-not-allowed w-full border border-gray-300 dark:border-gray-600"
            />
          </div>
        );
      }

      const isVisibleSection =
        (infosGenerales.includes(key) && visibleSections.infosGenerales) ||
        (infosSpecifiques.includes(key) && visibleSections.infosSpecifiques);

      if (!isVisibleSection) return null;

      return (
        <div key={key} className="flex flex-col relative w-full">
          <label className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center">
            {labelMap[key]}
            {notes[key] && <Tooltip note={notes[key]} />}
          </label>
          <div className="relative w-full">
            <input
              type="number"
              step="any"
              name={key}
              value={inputs[key] || ''}
              onChange={handleChange}
              onKeyDown={e => handleKeyDown(e, key)}
              ref={el => {
                inputRefs.current[key] = el;
              }}
              className={`p-3 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all border ${
                lockedFields[key] 
                  ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
              readOnly={lockedFields[key]}
              style={{ paddingRight: '2.5rem' }}
            />
            {lockedFields[key] && (
              <button
                onClick={() => toggleEdit(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
                type="button"
                tabIndex={-1}
              >
                ✏️
              </button>
            )}
          </div>
        </div>
      );
    });

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Coût de revient</h2>
            <p className="text-gray-600 dark:text-gray-400">{machineName}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNoteModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105"
        >
          📝 Note importante
        </button>
      </div>

      {/* Graphique principal EN GRAND */}
      <div className="mb-8 bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm border-2 border-gray-800 dark:border-white rounded-2xl p-8 shadow-xl">
        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          📊 Graphique des coûts en fonction des heures par jour
        </h3>
        
        <div className="bg-white/30 dark:bg-white/5 p-6 rounded-xl">
          {(() => {
            // Préparer les données pour le graphique
            const graphData: { h: number; salaire: number; brut: number; total: number }[] = [];
            for (let h = 0; h <= 9; h += 1) {
              const CoutFixe =
                (toNumber(inputs.prixAchat) / (toNumber(inputs.amortissement) * toNumber(inputs.heuresAnnuelles) || 1)) +
                (toNumber(inputs.prixAchat) * toNumber(inputs.assurances) / (toNumber(inputs.heuresAnnuelles) || 1)) +
                (((toNumber(inputs.interet) * (toNumber(inputs.prixAchat) / 2)) * toNumber(inputs.amortissement)) / ((toNumber(inputs.heuresAnnuelles) * toNumber(inputs.amortissement)) || 1)) +
                ((toNumber(inputs.fraisLocaux) * toNumber(inputs.surface)) / (toNumber(inputs.heuresAnnuelles) || 1));

              const CoutVariable =
                (toNumber(inputs.maintenance) / (toNumber(inputs.heuresAnnuelles) || 1)) +
                (toNumber(inputs.kwH) * toNumber(inputs.coefPuissance) * toNumber(inputs.puissance)) +
                (toNumber(inputs.consoAirLiquid) * toNumber(inputs.airLiquide));

              let CoutHoraireMachineBrut = 0;
              if (h === 0) {
                CoutHoraireMachineBrut = CoutFixe;
              } else {
                CoutHoraireMachineBrut = h * (CoutFixe + CoutVariable);
              }

              const SalaireHorairesOperateurCharge = toNumber(inputs.salaireOperateur) * h;
              const CoutHoraireMachine = CoutHoraireMachineBrut + SalaireHorairesOperateurCharge;

              graphData.push({
                h,
                salaire: SalaireHorairesOperateurCharge,
                brut: CoutHoraireMachineBrut,
                total: CoutHoraireMachine,
              });
            }

            // Calcul des dimensions (plus grand)
            const width = 900;
            const height = 500;
            const padding = { top: 50, right: 50, bottom: 70, left: 110 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            // Trouver les valeurs min et max
            const allValues = graphData.flatMap(d => [d.salaire, d.brut, d.total]);
            const minValue = Math.min(...allValues);
            const maxValue = Math.max(...allValues);
            const minY = minValue * 0.9;
            const maxY = maxValue * 1.1;

            // Fonction pour convertir les valeurs en coordonnées SVG
            const getX = (h: number) => padding.left + (h / 9) * chartWidth;
            const getY = (value: number) => {
              const normalized = (value - minY) / (maxY - minY);
              return padding.top + chartHeight * (1 - normalized);
            };

            // Créer les points pour les lignes
            const createPath = (dataKey: 'salaire' | 'brut' | 'total') => {
              return graphData.map((d, i) => {
                const x = getX(d.h);
                const y = getY(d[dataKey]);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ');
            };

            return (
              <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Définition des gradients et effets */}
                <defs>
                  {/* Gradients pour les lignes */}
                  <linearGradient id="gradient-salaire" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="1"/>
                  </linearGradient>
                  <linearGradient id="gradient-brut" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="1"/>
                  </linearGradient>
                  <linearGradient id="gradient-total" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="1"/>
                  </linearGradient>
                  
                  {/* Filtres pour les effets de glow */}
                  <filter id="glow-salaire" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="glow-brut" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="glow-total" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grille horizontale */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padding.top + chartHeight * (1 - ratio);
                  const value = minY + (maxY - minY) * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={width - padding.right}
                        y2={y}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="8,4"
                        opacity="0.3"
                        className="text-gray-400 dark:text-gray-500"
                      />
                      <text
                        x={padding.left - 15}
                        y={y + 5}
                        textAnchor="end"
                        fontSize="13"
                        fontWeight="600"
                        fill="currentColor"
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {value.toFixed(0)}€
                      </text>
                    </g>
                  );
                })}

                {/* Axe X */}
                <line
                  x1={padding.left}
                  y1={height - padding.bottom}
                  x2={width - padding.right}
                  y2={height - padding.bottom}
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-gray-700 dark:text-gray-300"
                />

                {/* Axe Y */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={height - padding.bottom}
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-gray-700 dark:text-gray-300"
                />

                {/* Label axe X */}
                <text
                  x={width / 2}
                  y={height - 25}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-gray-800 dark:text-gray-200"
                >
                  Heures par jour
                </text>

                {/* Label axe Y */}
                <text
                  x={40}
                  y={height / 2}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-gray-800 dark:text-gray-200"
                  transform={`rotate(-90, 40, ${height / 2})`}
                >
                  Coût (€)
                </text>

                {/* Labels de l'axe X avec marques */}
                {graphData.map((d) => (
                  <g key={`x-label-${d.h}`}>
                    <text
                      x={getX(d.h)}
                      y={height - padding.bottom + 25}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="700"
                      fill="currentColor"
                      className="text-gray-700 dark:text-gray-300"
                    >
                      {d.h}h
                    </text>
                    {/* Petite marque sur l'axe */}
                    <line
                      x1={getX(d.h)}
                      y1={height - padding.bottom}
                      x2={getX(d.h)}
                      y2={height - padding.bottom + 8}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-700 dark:text-gray-300"
                    />
                  </g>
                ))}

                {/* Ligne Salaire (jaune) avec gradient et glow */}
                <path
                  d={createPath('salaire')}
                  fill="none"
                  stroke="url(#gradient-salaire)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-salaire)"
                  className="drop-shadow-lg"
                />

                {/* Ligne Coût brut (bleu) avec gradient et glow */}
                <path
                  d={createPath('brut')}
                  fill="none"
                  stroke="url(#gradient-brut)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-brut)"
                  className="drop-shadow-lg"
                />

                {/* Ligne Coût total (rose) avec gradient et glow */}
                <path
                  d={createPath('total')}
                  fill="none"
                  stroke="url(#gradient-total)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-total)"
                  className="drop-shadow-xl"
                />

                {/* Points sur toutes les lignes avec effets */}
                {graphData.map((d) => (
                  <g key={`points-${d.h}`}>
                    {/* Point Salaire - Jaune avec ombre */}
                    <circle
                      cx={getX(d.h)}
                      cy={getY(d.salaire)}
                      r="7"
                      fill="#fbbf24"
                      stroke="white"
                      strokeWidth="3"
                      className="drop-shadow-md"
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* Point Coût brut - Bleu avec ombre */}
                    <circle
                      cx={getX(d.h)}
                      cy={getY(d.brut)}
                      r="7"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="3"
                      className="drop-shadow-md"
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* Point Coût total - Rose avec ombre et plus gros */}
                    <circle
                      cx={getX(d.h)}
                      cy={getY(d.total)}
                      r="8"
                      fill="#ec4899"
                      stroke="white"
                      strokeWidth="3"
                      className="drop-shadow-lg"
                      style={{ transition: 'all 0.3s ease' }}
                    />
                  </g>
                ))}
              </svg>
            );
          })()}

          {/* Légende modernisée */}
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 px-5 py-3 rounded-xl border-2 border-yellow-300 dark:border-yellow-600 shadow-md">
              <div className="w-10 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full shadow-md"></div>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">Salaire opérateur</span>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 px-5 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-600 shadow-md">
              <div className="w-10 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-md"></div>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">Coût machine brut</span>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 px-5 py-3 rounded-xl border-2 border-pink-300 dark:border-pink-600 shadow-md">
              <div className="w-10 h-1 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full shadow-md"></div>
              <span className="text-base font-extrabold text-gray-800 dark:text-gray-200">Coût total machine</span>
            </div>
          </div>
        </div>

        {/* Boutons pour afficher tableau et formulaire */}
        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl transition-all cursor-pointer hover:scale-105 flex items-center gap-3"
          >
            {showTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {showTable ? 'Masquer le tableau' : 'Afficher le tableau'}
          </button>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-xl transition-all cursor-pointer hover:scale-105 flex items-center gap-3"
          >
            <Calculator className="w-5 h-5" />
            {showForm ? 'Masquer le formulaire' : 'Modifier les données'}
          </button>
        </div>

        {/* Tableau détaillé (rétractable) */}
        {showTable && (
          <div className="mt-6 bg-white/30 dark:bg-white/5 p-6 rounded-xl animate-in slide-in-from-top duration-300">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">
              Tableau détaillé des coûts
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 dark:from-blue-600/10 dark:to-purple-600/10">
                    <th className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white rounded-tl-xl">Heures/jour</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">Salaire opérateur (€)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">Coût machine brut (€)</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white rounded-tr-xl">Coût total (€)</th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 dark:bg-white/5">
                  {tableRows}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire en dessous (rétractable) */}
      {showForm && (
        <div className="bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm border-2 border-gray-800 dark:border-white rounded-2xl p-8 shadow-xl animate-in slide-in-from-top duration-300">
        
        {/* Section Infos Générales */}
        <section className="mb-8">
          <button
            onClick={() => setVisibleSections(prev => ({ ...prev, infosGenerales: !prev.infosGenerales }))}
            className="w-full flex justify-between items-center bg-gradient-to-r from-blue-300/40 to-blue-400/40 dark:from-blue-600/20 dark:to-blue-700/20 p-4 rounded-xl border-l-4 border-blue-500 dark:border-blue-400 mb-4 cursor-pointer hover:from-blue-300/60 hover:to-blue-400/60 dark:hover:from-blue-600/30 dark:hover:to-blue-700/30 transition-all"
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Informations machines générales</h3>
            {visibleSections.infosGenerales ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
          {visibleSections.infosGenerales && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white/40 dark:bg-white/5 p-6 rounded-xl">
              {renderInputs(infosGenerales)}
            </div>
          )}
        </section>

        {/* Section Infos Spécifiques */}
        <section className="mb-8">
          <button
            onClick={() => setVisibleSections(prev => ({ ...prev, infosSpecifiques: !prev.infosSpecifiques }))}
            className="w-full flex justify-between items-center bg-gradient-to-r from-purple-300/40 to-purple-400/40 dark:from-purple-600/20 dark:to-purple-700/20 p-4 rounded-xl border-l-4 border-purple-500 dark:border-purple-400 mb-4 cursor-pointer hover:from-purple-300/60 hover:to-purple-400/60 dark:hover:from-purple-600/30 dark:hover:to-purple-700/30 transition-all"
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Informations spécifiques</h3>
            {visibleSections.infosSpecifiques ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
          {visibleSections.infosSpecifiques && (
            <div className="bg-white/40 dark:bg-white/5 p-6 rounded-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderInputs(infosSpecifiques)}
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center">
                  Temps journalier utilisation machine (sur base 7h)
                  <Tooltip note="Temps d'utilisation machine moyen par jour (Coef Utilisation × 7h). Calculé automatiquement." />
                </label>
                <input
                  type="text"
                  value={formatHeureMinute(tempsJournalierEnHeures)}
                  className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none cursor-not-allowed w-full border border-gray-300 dark:border-gray-600"
                  readOnly
                />
              </div>
            </div>
          )}
        </section>

        {/* Section Coûts Horaires */}
        <section>
          <button
            onClick={() => setVisibleSections(prev => ({ ...prev, coutHoraires: !prev.coutHoraires }))}
            className="w-full flex justify-between items-center bg-gradient-to-r from-green-300/40 to-green-400/40 dark:from-green-600/20 dark:to-green-700/20 p-4 rounded-xl border-l-4 border-green-500 dark:border-green-400 mb-4 cursor-pointer hover:from-green-300/60 hover:to-green-400/60 dark:hover:from-green-600/30 dark:hover:to-green-700/30 transition-all"
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Coûts horaires calculés</h3>
            {visibleSections.coutHoraires ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
          {visibleSections.coutHoraires && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white/40 dark:bg-white/5 p-6 rounded-xl">
              {renderInputs(coutshoraires)}
            </div>
          )}
        </section>
      </div>
      )}

      {/* Modal Note */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white/40 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 border border-gray-200/50 dark:border-white/10 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              📝 Note importante pour {machineName}
            </h3>
            
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajoutez une note importante pour cette machine..."
              className="w-full h-40 p-4 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-2 border-gray-300 dark:border-gray-600 focus:border-yellow-500 dark:focus:border-yellow-400 focus:outline-none resize-none"
            />
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-6 py-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

