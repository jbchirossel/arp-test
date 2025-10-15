"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Edit3, Save, Filter, BarChart3, Users, Calendar, DollarSign, TrendingUp, FileText, Trash2, Download, Eye, EyeOff, Building2, Clock, User, Briefcase, Sun, LayoutDashboard, LogOut, Moon, CheckSquare, Package, Cpu, FileSpreadsheet } from 'lucide-react';
import HamburgerMenu from "../../components/HamburgerMenu";
import ProfileAvatar from "../../components/ProfileAvatar";

// Types
export type CoutsSalariauxRecord = {
  Matricule: string;
  Salarié: string;
  Service: string;
  "P / HP": string;
  Mois: string; // ISO date string or raw string
  "Heures théoriques": number | null;
  "Heures normales": number | null;
  "Heures majorées": number | null;
  "Total heures": number | null;
  Effectif: number | null;
  "CP Pris": number | null;
  "RTT/Réci Pris": number | null;
  "Heures réelles": number | null;
  Brut: number | null;
  "Charges salariales": number | null;
  "Charges patronales": number | null;
  "% charge patronales": number | null;
  "Suppléments coût global": number | null;
  "Coût global": number | null;
  "Coût hora moyen": number | null;
  PAS: number | null;
  "Net à payer": number | null;
  "Forfait jour": string;
  Entrée: string | null;
  Sortie: string | null;
  Emploi: string;
  Etablissement: string;
};

type SavedFile = {
  id: number;
  filename: string;
  uploaded_at: string;
  total_records: number;
};

// Colonnes affichées et leur ordre
const COLUMNS: Array<keyof CoutsSalariauxRecord> = [
  "Matricule",
  "Salarié",
  "Service",
  "P / HP",
  "Mois",
  "Heures théoriques",
  "Heures normales",
  "Heures majorées",
  "Total heures",
  "Effectif",
  "CP Pris",
  "RTT/Réci Pris",
  "Heures réelles",
  "Brut",
  "Charges salariales",
  "Charges patronales",
  "% charge patronales",
  "Suppléments coût global",
  "Coût global",
  "Coût hora moyen",
  "PAS",
  "Net à payer",
  "Forfait jour",
  "Entrée",
  "Sortie",
  "Emploi",
  "Etablissement",
];

// Config API
const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000") : "";
const API_PREFIX = "/analyse/couts-salariaux";

async function apiFetch(input: string, init?: RequestInit) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: HeadersInit = {
      ...(init?.headers || {}),
    };
    if (token) (headers as any)["Authorization"] = `Bearer ${token}`;
    const resp = await fetch(`${API_BASE}${API_PREFIX}${input}`, { ...init, headers });
    return resp;
  } catch (e) {
    return null;
  }
}

async function apiListFiles(): Promise<SavedFile[] | null> {
  const resp = await apiFetch("/files");
  if (!resp || !resp.ok) return null;
  const json = await resp.json().catch(() => null);
  if (!json?.success) return [];
  return json.files as SavedFile[];
}

async function apiGetFile(fileId: number): Promise<CoutsSalariauxRecord[] | null> {
  const resp = await apiFetch(`/files/${fileId}`);
  if (!resp || !resp.ok) return null;
  const json = await resp.json().catch(() => null);
  if (!json?.success) return [];
  return json.data as CoutsSalariauxRecord[];
}

async function apiPutFile(fileId: number, rows: CoutsSalariauxRecord[]): Promise<boolean> {
  console.log(`🔄 Sauvegarde du fichier ${fileId} avec ${rows.length} lignes`);
  
  try {
    const resp = await apiFetch(`/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processed_data: JSON.stringify(rows), total_records: rows.length }),
    });
    
    if (!resp) {
      console.error("❌ Pas de réponse de l'API");
      return false;
    }
    
    if (!resp.ok) {
      console.error(`❌ Erreur HTTP ${resp.status}: ${resp.statusText}`);
      const errorText = await resp.text().catch(() => "Erreur inconnue");
      console.error("Détails de l'erreur:", errorText);
      return false;
    }
    
    console.log("✅ Sauvegarde réussie");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la sauvegarde:", error);
    return false;
  }
}

async function apiDeleteFile(fileId: number): Promise<boolean> {
  const resp = await apiFetch(`/files/${fileId}`, { method: "DELETE" });
  return !!resp && resp.ok;
}

async function apiUpload(file: File, appendToId?: number): Promise<{ success: boolean; appended?: boolean } | null> {
  const form = new FormData();
  form.append("file", file);
  if (appendToId) form.append("append_to_file_id", String(appendToId));
  
  console.log("Sending upload request to:", `${API_BASE}${API_PREFIX}/upload-couts-salariaux`);
  console.log("FormData contents:", {
    file: file.name,
    size: file.size,
    appendToId: appendToId
  });
  
  const resp = await apiFetch(`/upload-couts-salariaux`, { method: "POST", body: form });
  if (!resp || !resp.ok) {
    console.error("Upload failed:", resp?.status, resp?.statusText);
    if (resp) {
      const errorText = await resp.text().catch(() => "Unknown error");
      console.error("Error details:", errorText);
    }
    return null;
  }
  const json = await resp.json().catch(() => null);
  console.log("Upload response:", json);
  return json as any;
}

// Utils
const numberLikeColumns = new Set<string>([
  "Heures théoriques",
  "Heures normales",
  "Heures majorées",
  "Total heures",
  "Effectif",
  "CP Pris",
  "RTT/Réci Pris",
  "Heures réelles",
  "Brut",
  "Charges salariales",
  "Charges patronales",
  "% charge patronales",
  "Suppléments coût global",
  "Coût global",
  "Coût hora moyen",
  "PAS",
  "Net à payer",
]);

function parseMaybeNumber(value: string): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).replace(/\s/g, "").replace(/,/g, ".");
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("fr-FR");
}

function isValidDate(d: Date) {
  return d instanceof Date && !isNaN(d.getTime());
}

function formatMonthDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return isValidDate(d)
    ? d.toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })
    : value;
}

function formatDateDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return isValidDate(d)
    ? d.toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })
    : value;
}

// Composants UI modernes
function ModernCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "blue" }: { 
  title: string; 
  value: string; 
  icon: any; 
  color?: "blue" | "green" | "purple" | "orange" | "red" 
}) {
  const colorClasses = {
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    orange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20"
  };

  return (
    <div className="p-4 rounded-xl border bg-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

// Filtres modernes
type MultiFilterProps = {
  label: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  formatValue?: (v: string) => string;
  icon?: any;
  dropdownId: string;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
};

function ModernMultiSelect({ label, values, selected, onChange, formatValue, icon: Icon, dropdownId, openDropdown, setOpenDropdown }: MultiFilterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isOpen = openDropdown === dropdownId;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      const target = e.target as Element;
      if (!target.closest(".dropdown-container")) setOpenDropdown(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [setOpenDropdown]);

  const allSelected = selected.length === 0;

  return (
    <div className={`dropdown-container relative ${isOpen ? 'z-[9999999]' : 'z-[999999]'}`} ref={containerRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label} 
        {selected.length > 0 && (
          <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded-full">
            {selected.length}
          </span>
        )}
      </label>
      <button
        onClick={() => setOpenDropdown(isOpen ? null : dropdownId)}
        className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer transition-all duration-200 hover:bg-white/10 flex items-center justify-between"
      >
        <span className="truncate">
          {allSelected ? `Tous (${values.length})` : selected.length === 1 ? (formatValue ? formatValue(selected[0]) : selected[0]) : `${selected.length} sélectionnés`}
        </span>
        <span className="ml-2 text-gray-400">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-[9999999] w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-h-56 overflow-y-auto backdrop-blur-sm">
          <div className="p-2">
            <label className="flex items-center cursor-pointer p-3 hover:bg-white/5 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onChange([])}
                className="mr-3 text-blue-500 focus:ring-blue-400 rounded"
              />
              <span className="text-sm text-gray-300">Tout</span>
            </label>
            {values.map((v) => (
              <label key={v} className="flex items-center cursor-pointer p-3 hover:bg-white/5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(v)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, v]);
                    else onChange(selected.filter((x) => x !== v));
                  }}
                  className="mr-3 text-blue-500 focus:ring-blue-400 rounded"
                />
                <span className="text-sm text-white">{formatValue ? formatValue(v) : v}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Table moderne
type EditingCell = { rowIndex: number; column: keyof CoutsSalariauxRecord } | null;

function ModernDataTable({
  data,
  editMode,
  onEdit,
  originalIndices,
}: {
  data: CoutsSalariauxRecord[];
  editMode: boolean;
  onEdit: (rowIndex: number, column: keyof CoutsSalariauxRecord, value: string) => void;
  originalIndices: number[];
}) {
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<string>("");
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const [contentWidth, setContentWidth] = useState<number>(0);
  const [showBottomBar, setShowBottomBar] = useState<boolean>(false);
  const [bottomBarLeft, setBottomBarLeft] = useState<number>(0);
  const [bottomBarWidth, setBottomBarWidth] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      const el = tableScrollRef.current;
      if (!el) return;
      setContentWidth(el.scrollWidth);
      setShowBottomBar(el.scrollWidth > el.clientWidth);
      const rect = el.getBoundingClientRect();
      setBottomBarLeft(rect.left);
      setBottomBarWidth(rect.width);
    };
    measure();
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true } as any);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tableScrollRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(tableScrollRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll as any);
      if (ro && tableScrollRef.current) ro.disconnect();
    };
  }, [data]);

  useEffect(() => {
    const top = tableScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;
    const onTopScroll = () => {
      if (bottom.scrollLeft !== top.scrollLeft) bottom.scrollLeft = top.scrollLeft;
    };
    const onBottomScroll = () => {
      if (top.scrollLeft !== bottom.scrollLeft) top.scrollLeft = bottom.scrollLeft;
    };
    top.addEventListener("scroll", onTopScroll, { passive: true } as any);
    bottom.addEventListener("scroll", onBottomScroll, { passive: true } as any);
    return () => {
      top.removeEventListener("scroll", onTopScroll);
      bottom.removeEventListener("scroll", onBottomScroll);
    };
  }, [contentWidth, data]);

  function startEdit(rowIndex: number, column: keyof CoutsSalariauxRecord, current: unknown) {
    setEditing({ rowIndex, column });
    setEditValue(current === null || current === undefined ? "" : String(current));
  }

  function saveEdit() {
    if (!editing) return;
    const originalIndex = originalIndices[editing.rowIndex] ?? editing.rowIndex;
    onEdit(originalIndex, editing.column, editValue);
    setEditing(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
  }

  return (
    <>
    <ModernCard className="overflow-hidden relative z-[1]">
      <div className="overflow-x-auto hide-horizontal-scrollbar" ref={tableScrollRef}>
        <table className="w-full min-w-max">
          <thead className="bg-white/5">
            <tr>
              {COLUMNS.map((col) => (
                <th key={String(col)} className="px-6 py-4 text-left text-sm font-semibold text-gray-300 border-b border-white/10 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {COLUMNS.map((col) => {
                  const value = row[col];
                  const isEditing = editing?.rowIndex === rowIndex && editing?.column === col;
                  const display =
                    value === null || value === undefined || value === "" || value === 0
                      ? "-"
                      : typeof value === "number"
                        ? formatNumber(value)
                        : col === "Entrée" || col === "Sortie"
                          ? formatDateDisplay(String(value))
                          : col === "Mois"
                            ? formatMonthDisplay(String(value))
                            : String(value);

                  return (
                    <td
                      key={String(col)}
                      className={`px-6 py-4 text-sm ${editMode ? "cursor-pointer hover:bg-blue-500/10" : ""}`}
                      onClick={() => editMode && startEdit(rowIndex, col, value)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                              if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 cursor-pointer transition-colors"
                            title="Sauvegarder"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        display
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModernCard>
    {showBottomBar && (
      <div className="fixed bottom-0 z-[9999] bg-transparent" style={{ left: bottomBarLeft, width: bottomBarWidth }}>
        <div ref={bottomScrollRef} className="overflow-x-auto h-4 cursor-ew-resize">
          <div style={{ width: `${contentWidth}px`, height: '1px' }} />
        </div>
      </div>
    )}
    <style jsx>{`
      .hide-horizontal-scrollbar::-webkit-scrollbar { display: none; }
      .hide-horizontal-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
    </>
  );
}

// Modale d'upload moderne
function ModernUploadModal({ open, onClose, onFileChosen }: { open: boolean; onClose: () => void; onFileChosen: (f: File) => void; }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-full w-full sm:w-[480px] relative border border-white/10" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl transition-colors" onClick={onClose} aria-label="Fermer">×</button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Importer un fichier</h2>
            <p className="text-gray-400 text-sm">Sélectionnez un fichier Excel ou CSV</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChosen(f); }}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer focus:file:ring-2 focus:file:ring-blue-400 cursor-pointer transition mb-4"
        />
        <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-lg">
          Formats acceptés : Excel (.xlsx, .xls) et CSV
        </div>
      </div>
    </div>
  );
}

// Page principale
export default function RikikiCoutsSalariauxPage() {
  const router = useRouter();

  // Etat principal
  const [data, setData] = useState<CoutsSalariauxRecord[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  // Backend state
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Filtres
  const [filterService, setFilterService] = useState<string[]>([]);
  const [filterPHP, setFilterPHP] = useState<string[]>([]);
  const [filterMois, setFilterMois] = useState<string[]>([]);
  const [filterSalarie, setFilterSalarie] = useState<string[]>([]);
  const [filterForfaitJour, setFilterForfaitJour] = useState<string[]>([]);
  
  // Gestion de l'état des dropdowns (un seul ouvert à la fois)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // États pour le profil et le thème
  const [fullName, setFullName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Dérivés pour filtres (interdépendants)
  function rowsMatchingOtherFilters(exclude: "service" | "php" | "mois" | "salarie" | "forfait") {
    return data.filter((row) => {
      const s = exclude === "service" || filterService.length === 0 || filterService.includes(row.Service || "");
      const p = exclude === "php" || filterPHP.length === 0 || filterPHP.includes(row["P / HP"] || "");
      const m = exclude === "mois" || filterMois.length === 0 || filterMois.includes(row.Mois || "");
      const sa = exclude === "salarie" || filterSalarie.length === 0 || filterSalarie.includes(row.Salarié || "");
      const f = exclude === "forfait" || filterForfaitJour.length === 0 || filterForfaitJour.includes(row["Forfait jour"] || "");
      return s && p && m && sa && f;
    });
  }

  const services = useMemo(() => {
    const rows = rowsMatchingOtherFilters("service");
    return Array.from(new Set(rows.map((r) => r.Service).filter(Boolean))).sort();
  }, [data, filterPHP, filterMois, filterSalarie, filterForfaitJour]);

  const phps = useMemo(() => {
    const rows = rowsMatchingOtherFilters("php");
    return Array.from(new Set(rows.map((r) => r["P / HP"]).filter(Boolean))).sort();
  }, [data, filterService, filterMois, filterSalarie, filterForfaitJour]);

  const mois = useMemo(() => {
    const rows = rowsMatchingOtherFilters("mois");
    return Array.from(new Set(rows.map((r) => r.Mois).filter(Boolean)));
  }, [data, filterService, filterPHP, filterSalarie, filterForfaitJour]);

  const salaries = useMemo(() => {
    const rows = rowsMatchingOtherFilters("salarie");
    return Array.from(new Set(rows.map((r) => r.Salarié).filter(Boolean))).sort();
  }, [data, filterService, filterPHP, filterMois, filterForfaitJour]);

  const forfaitsJour = useMemo(() => {
    const rows = rowsMatchingOtherFilters("forfait");
    return Array.from(new Set(rows.map((r) => r["Forfait jour"]).filter(Boolean))).sort();
  }, [data, filterService, filterPHP, filterMois, filterSalarie]);

  // Remplir Service et P/HP si manquants
  function fillServiceAndPHP(rows: CoutsSalariauxRecord[]): CoutsSalariauxRecord[] {
    const info = new Map<string, { service: string; php: string }>();
    rows.forEach((row) => {
      if (!row.Salarié) return;
      const existing = info.get(row.Salarié) || { service: "", php: "" };
      info.set(row.Salarié, {
        service: row.Service || existing.service,
        php: row["P / HP"] || existing.php,
      });
    });
    return rows.map((row) => {
      const meta = info.get(row.Salarié);
      if (!meta) return row;
      return {
        ...row,
        Service: row.Service || meta.service || "Non spécifié",
        "P / HP": row["P / HP"] || meta.php || "Non spécifié",
      };
    });
  }

  // Filtrage
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const s = filterService.length === 0 || filterService.includes(row.Service || "");
      const p = filterPHP.length === 0 || filterPHP.includes(row["P / HP"] || "");
      const m = filterMois.length === 0 || filterMois.includes(row.Mois || "");
      const sa = filterSalarie.length === 0 || filterSalarie.includes(row.Salarié || "");
      const f = filterForfaitJour.length === 0 || filterForfaitJour.includes(row["Forfait jour"] || "");
      return s && p && m && sa && f;
    });
  }, [data, filterService, filterPHP, filterMois, filterSalarie, filterForfaitJour]);

  // Fonction pour vérifier si les dates sont consécutives
  function areMonthsConsecutive(months: string[]): boolean {
    if (months.length <= 1) return true;
    
    // Convertir les mois en objets Date pour pouvoir les comparer
    const dates = months.map(month => new Date(month)).sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      const previous = new Date(dates[i - 1]);
      
      // Calculer le mois suivant attendu
      const expectedNext = new Date(previous);
      expectedNext.setMonth(expectedNext.getMonth() + 1);
      
      // Si le mois actuel n'est pas le mois suivant attendu, les mois ne sont pas consécutifs
      if (current.getFullYear() !== expectedNext.getFullYear() || 
          current.getMonth() !== expectedNext.getMonth()) {
        return false;
      }
    }
    
    return true;
  }

  // Calcul de la période concernée
  const periodeConcernee = useMemo(() => {
    if (filterMois.length === 0) {
      return "Toutes les périodes";
    }
    
    if (filterMois.length === 1) {
      return formatMonthDisplay(filterMois[0]);
    }
    
    // Trier les mois pour avoir une période cohérente
    const moisTries = [...filterMois].sort();
    
    // Si 2 mois seulement
    if (moisTries.length === 2) {
      const premierMois = formatMonthDisplay(moisTries[0]);
      const dernierMois = formatMonthDisplay(moisTries[1]);
      
      // Vérifier si les 2 mois sont consécutifs
      if (areMonthsConsecutive(moisTries)) {
        return `${premierMois} à ${dernierMois}`;
      } else {
        return `${premierMois} - ${dernierMois}`;
      }
    }
    
    // Si 3 mois ou plus
    if (areMonthsConsecutive(moisTries)) {
      // Si tous les mois sont consécutifs, utiliser "à"
      const premierMois = formatMonthDisplay(moisTries[0]);
      const dernierMois = formatMonthDisplay(moisTries[moisTries.length - 1]);
      return `${premierMois} à ${dernierMois}`;
    } else {
      // Si les mois ne sont pas consécutifs, lister avec des tirets
      const moisAffiches = moisTries.map(mois => formatMonthDisplay(mois));
      return moisAffiches.join(' - ');
    }
  }, [filterMois]);

  // Totaux
  const totals = useMemo(() => {
    const sum = (key: keyof CoutsSalariauxRecord) =>
      filteredData.reduce((acc, row) => acc + (typeof row[key] === "number" ? (row[key] as number) : 0), 0);
    return {
      heuresReelles: sum("Heures réelles" as keyof CoutsSalariauxRecord),
      totalHeures: sum("Total heures" as keyof CoutsSalariauxRecord),
      totalBrut: sum("Brut"),
      chargesPatronales: sum("Charges patronales"),
      coutGlobal: sum("Coût global"),
    };
  }, [filteredData]);

  // Edition
  async function handleEdit(rowIndex: number, column: keyof CoutsSalariauxRecord, value: string) {
    // Créer les nouvelles données avec la modification
    const updatedData = [...data];
    const updatedRow = { ...updatedData[rowIndex] };
    
    if (numberLikeColumns.has(String(column))) {
      (updatedRow as any)[column] = parseMaybeNumber(value);
    } else {
      (updatedRow as any)[column] = value;
    }
    updatedData[rowIndex] = updatedRow;
    
    // Mettre à jour l'état local immédiatement pour l'interface
    setData(updatedData);
    
    // Sauvegarde auto si un fichier backend est chargé
    if (currentFileId) {
      setSaving(true);
      try {
        const ok = await apiPutFile(currentFileId, updatedData);
        if (!ok) {
          setMessage("Sauvegarde en ligne indisponible");
          console.error("Échec de la sauvegarde pour la modification:", { rowIndex, column, value });
          // Optionnel : recharger les données depuis le serveur pour s'assurer de la cohérence
          if (currentFileId) {
            const serverData = await apiGetFile(currentFileId);
            if (serverData) {
              setData(fillServiceAndPHP(serverData));
              setMessage("Données rechargées depuis le serveur");
            }
          }
        } else {
          console.log("✅ Modification sauvegardée avec succès:", { rowIndex, column, value });
          setMessage("Modification sauvegardée");
          // Effacer le message après 2 secondes
          setTimeout(() => setMessage(""), 1500);
        }
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        setMessage("Erreur lors de la sauvegarde");
      } finally {
        setSaving(false);
      }
    }
  }

  // Chargement initial: tenter de lister et charger les données depuis l'API
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Vérifier l'authentification d'abord
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("❌ Pas de token d'authentification");
          setMessage("Vous devez être connecté pour utiliser cette fonctionnalité");
          return;
        }

        // Tester l'authentification avec l'API
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!authResponse.ok) {
          console.error("❌ Authentification échouée:", authResponse.status);
          setMessage("Votre session a expiré. Veuillez vous reconnecter.");
          return;
        }

        const user = await authResponse.json();
        console.log("✅ Authentification réussie pour:", user.username);
        
        // Récupérer les données utilisateur
        setFullName(`${user.first_name} ${user.last_name}`.trim());
        setUsername(user.username);
        
        // Vérifier si l'utilisateur est admin
        if (!user.is_superuser) {
          console.error("❌ Utilisateur non admin:", user.username);
          setMessage("Vous devez être administrateur pour accéder à cette page");
          return;
        }

        console.log("✅ Utilisateur admin confirmé");
        
        const files = await apiListFiles();
        if (files && files.length > 0) {
          setSavedFiles(files);
          // Charger toutes les données (fusion) pour une vision globale, sinon prenez le premier fichier
          let combined: CoutsSalariauxRecord[] = [];
          for (const f of files) {
            const rows = await apiGetFile(f.id);
            if (rows && rows.length > 0) combined = combined.concat(rows);
          }
          if (combined.length > 0) {
            setData(fillServiceAndPHP(combined));
            setCurrentFileId(files[0].id);
          }
        }
      } catch (error) {
        console.error("💥 Erreur lors du chargement initial:", error);
        setMessage("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Gérer le thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  };

  // Upload front-first: tenter backend, sinon stub local
  async function handleFileChosen(file: File) {
    console.log("🔄 Début de l'upload du fichier:", file.name);
    setLoading(true);
    
    try {
      // Essayer l'API
      const res = await apiUpload(file, currentFileId || undefined);
      console.log("📤 Réponse de l'upload:", res);
      
      if (res && res.success) {
        console.log("✅ Upload réussi, mise à jour de la liste des fichiers...");
        
        // Recharger la liste des fichiers
        const files = await apiListFiles();
        console.log("📁 Fichiers récupérés:", files);
        
        if (files && files.length > 0) {
          setSavedFiles(files);
          console.log("📋 Liste des fichiers mise à jour:", files.length, "fichier(s)");
          
          // Si c'est un nouveau fichier (pas un append), utiliser le dernier fichier créé
          let targetFileId = currentFileId;
          if (!res.appended && files.length > 0) {
            // Trouver le fichier le plus récent (celui qui vient d'être créé)
            const sortedFiles = [...files].sort((a, b) => 
              new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
            );
            targetFileId = sortedFiles[0].id;
            console.log("🆕 Nouveau fichier créé, ID:", targetFileId);
          }
          
          // Recharger les données du fichier actuel ou nouveau
          if (targetFileId) {
            const rows = await apiGetFile(targetFileId);
            if (rows && rows.length > 0) {
              setData(fillServiceAndPHP(rows));
              setCurrentFileId(targetFileId);
              console.log("📊 Données chargées:", rows.length, "lignes");
            }
          } else {
            // Charger toutes les données combinées
            let combined: CoutsSalariauxRecord[] = [];
            for (const f of files) {
              const rows = await apiGetFile(f.id);
              if (rows && rows.length > 0) combined = combined.concat(rows);
            }
            if (combined.length > 0) {
              setData(fillServiceAndPHP(combined));
              setCurrentFileId(files[0].id);
              console.log("📊 Données combinées chargées:", combined.length, "lignes");
            }
          }
        } else {
          console.warn("⚠️ Aucun fichier retourné par l'API");
        }
        
        setShowUpload(false);
        setMessage(res.appended ? "Données ajoutées au fichier existant" : "Nouveau fichier importé avec succès");
        return;
      }

      console.error("❌ Upload failed, no fallback data");
      setMessage("Erreur lors de l'upload - vérifiez que le backend est accessible et que vous êtes connecté");
      setShowUpload(false);
    } catch (error) {
      console.error("💥 Erreur lors de l'upload:", error);
      setMessage("Erreur lors de l'upload du fichier");
      setShowUpload(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(fileId: number) {
    const ok = await apiDeleteFile(fileId);
    if (!ok) {
      setMessage("Suppression indisponible");
      return;
    }
    const files = await apiListFiles();
    setSavedFiles(files || []);
    // Recharger données restantes
    let combined: CoutsSalariauxRecord[] = [];
    if (files && files.length > 0) {
      for (const f of files) {
        const rows = await apiGetFile(f.id);
        if (rows && rows.length > 0) combined = combined.concat(rows);
      }
      setData(fillServiceAndPHP(combined));
      setCurrentFileId(files[0].id);
    } else {
      setData([]);
      setCurrentFileId(null);
    }
    setMessage("Fichier supprimé");
  }

  async function handleLoad(fileId: number) {
    const rows = await apiGetFile(fileId);
    if (!rows) {
      setMessage("Chargement indisponible");
      return;
    }
    setData(fillServiceAndPHP(rows));
    setCurrentFileId(fileId);
  }

  // Persistences légères (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rikiki-couts-state");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) setData(parsed.data);
      if (parsed?.filters) {
        setFilterService(parsed.filters.service || []);
        setFilterPHP(parsed.filters.php || []);
        setFilterMois(parsed.filters.mois || []);
        setFilterSalarie(parsed.filters.salarie || []);
        setFilterForfaitJour(parsed.filters.forfait || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const snapshot = {
        data,
        filters: {
          service: filterService,
          php: filterPHP,
          mois: filterMois,
          salarie: filterSalarie,
          forfait: filterForfaitJour,
        },
      };
      localStorage.setItem("rikiki-couts-state", JSON.stringify(snapshot));
    } catch {}
  }, [data, filterService, filterPHP, filterMois, filterSalarie, filterForfaitJour]);

  // Reset filtres
  function resetFilters() {
    setFilterService([]);
    setFilterPHP([]);
    setFilterMois([]);
    setFilterSalarie([]);
    setFilterForfaitJour([]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
      </div>

      {/* Menu utilisateur en haut à droite */}
      <div className="absolute top-5 right-7 flex items-center gap-3 z-20">
        <ProfileAvatar
          fullName={fullName}
          size="lg"
          onClick={() => setShowUserMenu(v => !v)}
          showUploadButton={false}
        />

        {showUserMenu && (
          <div
            ref={menuRef}
            className="absolute top-20 right-0 bg-white/40 dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-72 border border-gray-200/50 dark:border-white/10 z-[9999] animate-in slide-in-from-top-2 duration-300"
          >
            {/* Header avec avatar */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
              <ProfileAvatar
                fullName={fullName}
                size="md"
                showUploadButton={true}
              />
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-white">{fullName || "Utilisateur"}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{username}</div>
              </div>
            </div>

            {/* Informations utilisateur */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 dark:bg-[#8c68d8]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-[#8c68d8]" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Rôle</div>
                  <div className="text-gray-800 dark:text-white font-medium">Administrateur</div>
                </div>
              </div>

              {/* Section thème */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 dark:bg-blue-500/20 flex items-center justify-center">
                  {isDarkMode ? (
                    <Moon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Thème</div>
                  <div className="text-gray-800 dark:text-white font-medium">
                    {isDarkMode ? "Mode sombre" : "Mode clair"}
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isDarkMode 
                      ? 'bg-blue-500 focus:ring-blue-300' 
                      : 'bg-yellow-400 focus:ring-yellow-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${
                      isDarkMode 
                        ? 'translate-x-6 bg-gray-800' 
                        : 'translate-x-0.5 bg-white'
                    }`}
                  >
                    {isDarkMode ? (
                      <Moon className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Sun className="w-3 h-3 text-yellow-600" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Bouton déconnexion */}
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl px-4 py-3 font-semibold transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-lg hover:shadow-red-500/25 hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <HamburgerMenu
          items={[
            { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
            { label: "Gantt", href: "/gantt", icon: <Calendar className="w-4 h-4" /> },
            { label: "To-Do", href: "/todo", icon: <CheckSquare className="w-4 h-4" /> },
            { label: "Analyse Financière", href: "/analyse-financiere", icon: <BarChart3 className="w-4 h-4" /> },
            { label: "Suivi Sous-Traitance", href: "/sous-traitance", icon: <Package className="w-4 h-4" /> },
            { label: "Analyse Machines", href: "/machines", icon: <Cpu className="w-4 h-4" /> },
            { label: "Intégration Solune", href: "/integration-solune", icon: <FileSpreadsheet className="w-4 h-4" /> },
          ]}
        />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-extrabold mb-2">Coûts <span className="text-blue-600 dark:text-[#8c68d8]">Salariaux</span></h1>
              <p className="text-gray-600 dark:text-gray-400">Analyse, filtres et édition de vos données salariales</p>
            </div>
            <div className="flex items-center gap-3">
              {data.length > 0 && (
                <button
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    editMode 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30" 
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                  onClick={() => setEditMode((v) => !v)}
                  title={editMode ? "Quitter le mode édition" : "Activer le mode édition"}
                  disabled={saving}
                >
                  {editMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {editMode ? (saving ? "Sauvegarde..." : "En édition") : "Éditer"}
                </button>
              )}
              {currentFileId && (
                <button
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const serverData = await apiGetFile(currentFileId);
                      if (serverData) {
                        setData(fillServiceAndPHP(serverData));
                        setMessage("Données rechargées depuis le serveur");
                        setTimeout(() => setMessage(""), 1500);
                      }
                    } catch (error) {
                      setMessage("Erreur lors du rechargement");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  title="Recharger les données depuis le serveur"
                  disabled={loading}
                >
                  <div className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                    {loading ? '⟳' : '⟳'}
                  </div>
                  Recharger
                </button>
              )}
              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                onClick={() => setShowUpload(true)}
                title="Uploader un fichier"
              >
                <Upload className="w-4 h-4" />
                Importer
              </button>
            </div>
          </div>
        </div>

        {/* Bandeau messages */}
        {message && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-200 text-sm backdrop-blur-sm">
            {message}
          </div>
        )}
        
        {/* Indicateur de sauvegarde */}
        {saving && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-200 text-sm backdrop-blur-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            Sauvegarde en cours...
          </div>
        )}

        {/* Gestion fichiers moderne */}
        {savedFiles.length > 0 && (
          <ModernCard className="mb-6 p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Fichiers disponibles</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedFiles.map((f) => (
                <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  currentFileId === f.id 
                    ? "border-blue-500 bg-blue-500/20 text-blue-400" 
                    : "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}>
                  <button 
                    className="text-sm hover:underline" 
                    onClick={() => handleLoad(f.id)} 
                    title={`Charger ${f.filename}`}
                  >
                    {f.filename} <span className="text-xs opacity-70">({f.total_records})</span>
                  </button>
                  <button 
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors" 
                    onClick={() => handleDelete(f.id)} 
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </ModernCard>
        )}

        {/* Statistiques */}
        {data.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Statistiques</h2>
              <span className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-lg">
                Période : {periodeConcernee}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                title="Heures réelles" 
                value={`${formatNumber(totals.heuresReelles)} h`} 
                icon={BarChart3} 
                color="blue" 
              />
              <StatCard 
                title="Total heures" 
                value={`${formatNumber(totals.totalHeures)} h`} 
                icon={TrendingUp} 
                color="green" 
              />
              <StatCard 
                title="Total brut" 
                value={`${formatNumber(totals.totalBrut)} €`} 
                icon={DollarSign} 
                color="purple" 
              />
              <StatCard 
                title="Charges patronales" 
                value={`${formatNumber(totals.chargesPatronales)} €`} 
                icon={Users} 
                color="orange" 
              />
              <StatCard 
                title="Coût global" 
                value={`${formatNumber(totals.coutGlobal)} €`} 
                icon={TrendingUp} 
                color="red" 
              />
            </div>
          </div>
        )}

        {/* Filtres */}
        {data.length > 0 && (
          <ModernCard className="mb-8 p-6 relative z-[999999]">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Filtres</h2>
              {(filterService.length > 0 || filterPHP.length > 0 || filterMois.length > 0 || filterSalarie.length > 0 || filterForfaitJour.length > 0) && (
                <button 
                  onClick={resetFilters} 
                  className="ml-auto px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ModernMultiSelect 
                label="Service" 
                values={services} 
                selected={filterService} 
                onChange={setFilterService} 
                icon={Building2}
                dropdownId="service"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
              <ModernMultiSelect 
                label="P / HP" 
                values={phps} 
                selected={filterPHP} 
                onChange={setFilterPHP} 
                icon={BarChart3}
                dropdownId="php"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
              <ModernMultiSelect 
                label="Mois" 
                values={mois} 
                selected={filterMois} 
                onChange={setFilterMois} 
                formatValue={formatMonthDisplay} 
                icon={Calendar}
                dropdownId="mois"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
              <ModernMultiSelect 
                label="Salarié" 
                values={salaries} 
                selected={filterSalarie} 
                onChange={setFilterSalarie} 
                icon={User}
                dropdownId="salarie"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
              <ModernMultiSelect 
                label="Forfait jour" 
                values={forfaitsJour} 
                selected={filterForfaitJour} 
                onChange={setFilterForfaitJour} 
                icon={Sun}
                dropdownId="forfait"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
              />
            </div>
          </ModernCard>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center p-12 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            Chargement...
          </div>
        ) : data.length > 0 ? (
          <ModernDataTable 
            data={filteredData} 
            editMode={editMode} 
            onEdit={handleEdit}
            originalIndices={filteredData.map(row => data.indexOf(row))}
          />
        ) : (
          <ModernCard className="text-center p-12">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Bienvenue sur la vue Coûts salariaux</h3>
            <p className="text-gray-400 mb-6">Importez un fichier pour commencer l'analyse de vos données salariales.</p>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 mx-auto" 
              onClick={() => setShowUpload(true)}
            >
              <Upload className="w-4 h-4" />
              Importer un fichier
            </button>
          </ModernCard>
        )}

        {/* Modale d'upload */}
        <ModernUploadModal open={showUpload} onClose={() => setShowUpload(false)} onFileChosen={handleFileChosen} />
      </div>
    </main>
  );
}
