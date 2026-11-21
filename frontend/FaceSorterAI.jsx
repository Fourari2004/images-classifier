import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LayoutDashboard, ScanLine, Users, GalleryHorizontalEnd, Activity, History,
  Settings, Search, Plus, Folder, FolderOpen, X, Check, Trash2, Edit3,
  GitMerge, Download, ArrowRightLeft, ChevronRight, ChevronLeft, UploadCloud,
  Link2, Copy, Cpu, Zap, Image as ImageIcon, Bell, AlertCircle, CheckCircle2,
  Info, UserPlus, RefreshCw, Images, ScanFace, Clock, FolderTree,
  Sparkles, ChevronDown, MoreHorizontal, Eye, ArrowLeft, CircleDot,
  Server, Globe2, Monitor, SlidersHorizontal, FileImage
} from "lucide-react";

/* ----------------------------------------------------------------------- */
/* Mock data                                                                */
/* ----------------------------------------------------------------------- */

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
];

const FIRST_NAMES = ["Sophie", "Lucas", "Emma", "Nathan", "Chloé", "Hugo", "Léa", "Adam", "Inès", "Tom", "Camille", "Noah"];
const LAST_NAMES = ["Martin", "Bernard", "Dubois", "Lefèvre", "Moreau", "Girard", "Roux", "Fournier", "Petit", "Mercier"];

function seededName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function makePeople(n) {
  return Array.from({ length: n }).map((_, i) => ({
    id: `p${i + 1}`,
    name: seededName(i),
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    photos: 18 + ((i * 17) % 160),
    appearances: 22 + ((i * 23) % 200),
    lastSeen: `2026-${String(1 + (i % 6)).padStart(2, "0")}-${String(3 + (i * 5) % 25).padStart(2, "0")}`,
  }));
}

const PEOPLE_SEED = makePeople(9);

const PHOTO_COLORS = [
  "from-blue-200 to-blue-400", "from-emerald-200 to-emerald-400",
  "from-amber-200 to-amber-400", "from-rose-200 to-rose-400",
  "from-violet-200 to-violet-400", "from-teal-200 to-teal-400",
  "from-indigo-200 to-indigo-400", "from-slate-200 to-slate-400",
];

function makePhotos(n, people) {
  return Array.from({ length: n }).map((_, i) => {
    const faceCount = [1, 1, 1, 2, 2, 3, 0][i % 7];
    const assigned = [];
    for (let f = 0; f < faceCount; f++) {
      assigned.push(people[(i + f * 2) % people.length].id);
    }
    return {
      id: `img_${i + 1}`,
      name: `IMG_${String(2024 + i).padStart(4, "0")}.jpg`,
      date: `2026-${String(1 + (i % 6)).padStart(2, "0")}-${String(1 + (i * 3) % 28).padStart(2, "0")}`,
      faces: faceCount,
      gradient: PHOTO_COLORS[i % PHOTO_COLORS.length],
      assigned,
    };
  });
}

const PHOTOS_SEED = makePhotos(24, PEOPLE_SEED);

const HISTORY_SEED = [
  { id: "h1", date: "29/06/2026 18:42", folder: "/Users/marie/Photos/Vacances2026", photos: 482, time: "4 min 12 s", status: "Terminé" },
  { id: "h2", date: "27/06/2026 09:15", folder: "/Users/marie/Photos/Famille", photos: 1204, time: "11 min 03 s", status: "Terminé" },
  { id: "h3", date: "22/06/2026 21:08", folder: "/Users/marie/Photos/Mariage_Julie", photos: 856, time: "—", status: "Échoué" },
  { id: "h4", date: "18/06/2026 14:30", folder: "/Users/marie/Photos/Anniversaire", photos: 96, time: "1 min 28 s", status: "Terminé" },
  { id: "h5", date: "12/06/2026 08:02", folder: "/Users/marie/Photos/Ecole", photos: 340, time: "3 min 51 s", status: "Terminé" },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "scanner", label: "Scanner", icon: ScanLine },
  { id: "personnes", label: "Personnes", icon: Users },
  { id: "galerie", label: "Galerie", icon: GalleryHorizontalEnd },
  { id: "traitements", label: "Traitements", icon: Activity },
  { id: "historique", label: "Historique", icon: History },
  { id: "parametres", label: "Paramètres", icon: Settings },
];

const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Vue d'ensemble de votre photothèque" },
  scanner: { title: "Scanner", subtitle: "Analysez un dossier et reconnaissez les visages" },
  personnes: { title: "Personnes", subtitle: "Toutes les personnes détectées dans vos photos" },
  galerie: { title: "Galerie", subtitle: "Toutes vos photos analysées" },
  traitements: { title: "Traitements", subtitle: "Tâches en cours et file d'attente" },
  historique: { title: "Historique", subtitle: "Journal de tous vos scans précédents" },
  parametres: { title: "Paramètres", subtitle: "Configuration de la reconnaissance et de l'organisation" },
};

/* ----------------------------------------------------------------------- */
/* Small shared UI primitives                                              */
/* ----------------------------------------------------------------------- */

function Avatar({ name, color, size = "h-12 w-12", textSize = "text-sm" }) {
  return (
    <div className={`${size} ${color} rounded-2xl flex items-center justify-center text-white font-semibold ${textSize} shrink-0 shadow-sm`}>
      {initials(name)}
    </div>
  );
}

function Thumb({ gradient, faces, className = "h-full w-full" }) {
  return (
    <div className={`${className} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
      <ImageIcon className="text-white/70" size={28} strokeWidth={1.5} />
    </div>
  );
}

function Badge({ children, color = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function Button({ children, variant = "primary", size = "md", className = "", icon: Icon, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500";
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-base px-5 py-3" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-[0.98]",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-[0.98]",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={26} className="text-slate-400" />
      </div>
      <p className="text-slate-700 font-medium mb-1">{title}</p>
      <p className="text-slate-500 text-sm max-w-sm mb-5">{subtitle}</p>
      {action}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-slate-100 mb-4" />
      <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
      <div className="h-6 w-14 bg-slate-100 rounded" />
    </div>
  );
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-slate-100 mb-2" />
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Toasts                                                                   */
/* ----------------------------------------------------------------------- */

function ToastStack({ toasts, onDismiss }) {
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = {
    success: "border-l-green-600 text-green-600",
    error: "border-l-red-600 text-red-600",
    info: "border-l-blue-600 text-blue-600",
  };
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`bg-white shadow-lg rounded-2xl border border-slate-200 border-l-4 ${colors[t.type]} px-4 py-3 flex items-start gap-3 animate-[fadeIn_0.2s_ease]`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm text-slate-700 flex-1">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} className="text-slate-300 hover:text-slate-500 shrink-0">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Confirm / generic modal                                                  */
/* ----------------------------------------------------------------------- */

function Modal({ open, onClose, title, children, width = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} animate-[scaleIn_0.15s_ease] max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 h-8 w-8 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmer", variant = "primary" }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------------- */
/* Sidebar                                                                  */
/* ----------------------------------------------------------------------- */

function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  return (
    <aside className={`${collapsed ? "w-20" : "w-64"} shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col transition-all duration-200`}>
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200">
        <div className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
          <ScanFace size={18} className="text-white" />
        </div>
        {!collapsed && <span className="font-semibold text-slate-800 tracking-tight">FaceSorter AI</span>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                active ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 text-xs"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Réduire</>}
        </button>
      </div>

      <div className="px-5 py-4 border-t border-slate-200 space-y-2">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Version</span>
              <span className="text-slate-500 font-medium">2.4.1</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5"><Server size={12} /> Serveur</span>
              <span className="text-green-600 font-medium flex items-center gap-1.5">
                <CircleDot size={10} className="fill-green-600" /> En ligne
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <CircleDot size={10} className="fill-green-600 text-green-600" />
          </div>
        )}
      </div>
    </aside>
  );
}

/* ----------------------------------------------------------------------- */
/* Header                                                                   */
/* ----------------------------------------------------------------------- */

function Header({ title, subtitle, onNewScan, search, setSearch }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6 gap-4">
      <div className="min-w-0">
        <h1 className="font-semibold text-slate-800 leading-tight truncate">{title}</h1>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 w-56 lg:w-72 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une personne, une photo…"
            className="bg-transparent outline-none text-sm ml-2 w-full placeholder:text-slate-400"
          />
        </div>
        <Button onClick={onNewScan} icon={Plus} className="hidden sm:inline-flex">Nouveau Scan</Button>
        <button className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <Avatar name="Marie Dupont" color="bg-slate-700" size="h-9 w-9" textSize="text-xs" />
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------- */
/* Dashboard                                                                */
/* ----------------------------------------------------------------------- */

function StatsCard({ icon: Icon, label, value, accent, delay = 0 }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
      style={{ animation: `fadeUp 0.3s ease both`, animationDelay: `${delay}ms` }}
    >
      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-4 ${accent}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  );
}

function Dashboard({ loading, people, photos, history, setPage }) {
  const stats = useMemo(() => ({
    totalPhotos: photos.length * 23,
    people: people.length,
    folders: 14,
    faces: photos.reduce((s, p) => s + p.faces, 0) * 9,
    avgTime: "2 min 47 s",
  }), [people, photos]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Images} label="Photos totales" value={stats.totalPhotos.toLocaleString("fr-FR")} accent="bg-blue-600" delay={0} />
        <StatsCard icon={Users} label="Personnes détectées" value={stats.people} accent="bg-violet-500" delay={40} />
        <StatsCard icon={FolderTree} label="Dossiers créés" value={stats.folders} accent="bg-emerald-500" delay={80} />
        <StatsCard icon={ScanFace} label="Visages détectés" value={stats.faces.toLocaleString("fr-FR")} accent="bg-amber-500" delay={120} />
        <StatsCard icon={Clock} label="Temps moyen / scan" value={stats.avgTime} accent="bg-slate-600" delay={160} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 text-sm">Dernières photos analysées</h2>
            <button onClick={() => setPage("galerie")} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {photos.slice(0, 12).map((p) => (
              <div key={p.id} className="aspect-square">
                <Thumb gradient={p.gradient} faces={p.faces} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 text-sm">Personnes récurrentes</h2>
            <button onClick={() => setPage("personnes")} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {people.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar name={p.name} color={p.color} size="h-9 w-9" textSize="text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 font-medium truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.photos} photos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">Scans récents</h2>
        <div className="space-y-2">
          {history.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 truncate">{h.folder}</p>
                <p className="text-xs text-slate-400">{h.date} · {h.photos} photos</p>
              </div>
              <Badge color={h.status === "Terminé" ? "green" : "red"}>{h.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Scanner                                                                  */
/* ----------------------------------------------------------------------- */

function ScanPanel({ onLaunch, scanning, progress }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [threshold, setThreshold] = useState(72);
  const [copies, setCopies] = useState(true);
  const [symlinks, setSymlinks] = useState(false);
  const [autoMerge, setAutoMerge] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef(null);

  const pickFolder = () => {
    const mock = Array.from({ length: 8 + Math.floor(Math.random() * 10) }).map((_, i) =>
      `IMG_${2000 + i}.jpg`
    );
    setFiles(mock);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []).map((f) => f.name);
    setFiles(dropped.length ? dropped : files.length ? files : ["photo_vacances_01.jpg", "photo_vacances_02.jpg"]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-slate-800 mb-1">Sélection du dossier</h2>
        <p className="text-xs text-slate-400 mb-4">Choisissez un dossier ou glissez-déposez vos images</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center py-12 px-6 transition-colors duration-200 ${
            dragOver ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
            <UploadCloud size={22} className="text-blue-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Glissez-déposez vos photos ici</p>
          <p className="text-xs text-slate-400 mb-4">ou</p>
          <input ref={inputRef} type="file" multiple webkitdirectory="" directory="" className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files).map((f) => f.name) || [])} />
          <Button variant="secondary" icon={Folder} onClick={pickFolder}>Choisir un dossier</Button>
        </div>

        {files.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-2xl max-h-44 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 border-b border-slate-100 last:border-0">
                <FileImage size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">{files.length} image{files.length > 1 ? "s" : ""} sélectionnée{files.length > 1 ? "s" : ""}</p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm">Paramètres</h2>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">Seuil de similarité</label>
            <span className="text-sm font-medium text-blue-600 tabular-nums">{threshold}%</span>
          </div>
          <input
            type="range" min="40" max="99" value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="space-y-3">
          {[
            { label: "Créer des copies", checked: copies, set: setCopies, desc: "Duplique les fichiers dans les dossiers de personnes" },
            { label: "Créer des liens symboliques", checked: symlinks, set: setSymlinks, desc: "Évite de dupliquer l'espace disque" },
            { label: "Fusion automatique", checked: autoMerge, set: setAutoMerge, desc: "Regroupe automatiquement les visages très similaires" },
          ].map((opt) => (
            <label key={opt.label} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-blue-600"
              />
              <span>
                <span className="text-sm text-slate-700 font-medium block">{opt.label}</span>
                <span className="text-xs text-slate-400">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button
        size="lg" icon={ScanLine} className="w-full"
        disabled={scanning}
        onClick={() => setConfirmOpen(true)}
      >
        {scanning ? "Analyse en cours…" : "Lancer l'analyse"}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onLaunch({ count: files.length || 12, threshold, copies, symlinks, autoMerge })}
        title="Confirmer le scan"
        confirmLabel="Lancer l'analyse"
        message={`Vous êtes sur le point d'analyser ${files.length || 12} image(s) avec un seuil de similarité de ${threshold}%. ${copies ? "Des copies seront créées. " : ""}${symlinks ? "Des liens symboliques seront créés. " : ""}${autoMerge ? "La fusion automatique est activée." : ""}`}
      />
    </div>
  );
}

function ProgressCard({ progress }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw size={16} className="text-blue-600 animate-spin" />
        <h2 className="font-semibold text-slate-800 text-sm">Analyse en cours</h2>
      </div>
      <p className="text-xs text-slate-400 mb-5">Veuillez patienter pendant le traitement des images</p>

      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Images analysées", value: progress.analyzed, icon: Images },
          { label: "Visages détectés", value: progress.faces, icon: ScanFace },
          { label: "Personnes reconnues", value: progress.people, icon: Users },
          { label: "Temps écoulé", value: progress.elapsed, icon: Clock },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-2xl p-4">
            <s.icon size={16} className="text-slate-400 mb-2" />
            <p className="text-lg font-semibold text-slate-800 tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScannerPage({ scanning, progress, onLaunch }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {scanning && <ProgressCard progress={progress} />}
      <ScanPanel onLaunch={onLaunch} scanning={scanning} progress={progress} />
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Galerie + Visionneuse                                                    */
/* ----------------------------------------------------------------------- */

function GalleryCard({ photo, peopleById, onOpen }) {
  return (
    <button onClick={onOpen} className="text-left group">
      <div className="aspect-square relative">
        <Thumb gradient={photo.gradient} faces={photo.faces} className="h-full w-full group-hover:scale-[1.02] transition-transform duration-200" />
        {photo.faces > 1 && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-1.5 shadow-sm">
            <Users size={12} className="text-slate-600" />
          </span>
        )}
        {photo.faces > 0 && (
          <span className="absolute bottom-2 left-2 bg-black/40 backdrop-blur text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <ScanFace size={11} /> {photo.faces}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 mt-2 truncate font-medium">{photo.name}</p>
      <p className="text-[11px] text-slate-400">{photo.date}</p>
    </button>
  );
}

function FaceCard({ face, peopleById, onChangePerson, onNewPerson, onRemove }) {
  const person = peopleById[face.personId];
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
      {person ? (
        <Avatar name={person.name} color={person.color} size="h-10 w-10" textSize="text-xs" />
      ) : (
        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <UserPlus size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700 truncate">{person ? person.name : "Inconnu"}</p>
        <p className="text-xs text-slate-400">Confiance {face.confidence}%</p>
      </div>
      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)} className="h-8 w-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400">
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-lg py-1 z-10">
            <button onClick={() => { onChangePerson(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
              <ArrowRightLeft size={14} /> Changer de personne
            </button>
            <button onClick={() => { onNewPerson(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
              <UserPlus size={14} /> Créer une nouvelle personne
            </button>
            <button onClick={() => { onRemove(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
              <X size={14} /> Supprimer l'association
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoViewer({ photo, people, peopleById, onClose, toast }) {
  const [faces, setFaces] = useState(() =>
    photo.assigned.map((pid, i) => ({ id: `${photo.id}_f${i}`, personId: pid, confidence: 80 + ((i * 7) % 19) }))
  );
  const [pickerFor, setPickerFor] = useState(null);

  if (!photo) return null;

  return (
    <Modal open={!!photo} onClose={onClose} title={photo.name} width="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden">
            <Thumb gradient={photo.gradient} faces={photo.faces} />
          </div>
          <p className="text-xs text-slate-400 mt-3">{photo.date} · {faces.length} visage{faces.length !== 1 ? "s" : ""} détecté{faces.length !== 1 ? "s" : ""}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Visages détectés</h4>
          {faces.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun visage détecté sur cette photo.</p>
          ) : (
            <div className="space-y-2">
              {faces.map((f) => (
                <div key={f.id}>
                  <FaceCard
                    face={f}
                    peopleById={peopleById}
                    onChangePerson={() => setPickerFor(f.id)}
                    onNewPerson={() => { toast("success", "Nouvelle personne créée."); }}
                    onRemove={() => { setFaces((prev) => prev.map((x) => x.id === f.id ? { ...x, personId: null } : x)); toast("info", "Association supprimée."); }}
                  />
                  {pickerFor === f.id && (
                    <div className="mt-2 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto">
                      {people.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setFaces((prev) => prev.map((x) => x.id === f.id ? { ...x, personId: p.id } : x)); setPickerFor(null); toast("success", `Visage associé à ${p.name}.`); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Avatar name={p.name} color={p.color} size="h-6 w-6" textSize="text-[9px]" />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function GaleriePage({ photos, people, peopleById, search, toast }) {
  const [viewerPhoto, setViewerPhoto] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return photos;
    return photos.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [photos, search]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={GalleryHorizontalEnd}
        title="Aucune photo trouvée"
        subtitle="Lancez un scan ou modifiez votre recherche pour voir des résultats ici."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filtered.map((photo) => (
          <GalleryCard key={photo.id} photo={photo} peopleById={peopleById} onOpen={() => setViewerPhoto(photo)} />
        ))}
      </div>
      {viewerPhoto && (
        <PhotoViewer photo={viewerPhoto} people={people} peopleById={peopleById} onClose={() => setViewerPhoto(null)} toast={toast} />
      )}
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Personnes + Détail                                                       */
/* ----------------------------------------------------------------------- */

function PersonCard({ person, onOpen, onRename, onMerge, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <button onClick={onOpen} className="flex flex-col items-center text-center w-full mb-4">
        <Avatar name={person.name} color={person.color} size="h-16 w-16" textSize="text-lg" />
        <p className="font-medium text-slate-800 mt-3 truncate w-full">{person.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{person.photos} photos · {person.appearances} apparitions</p>
        <p className="text-[11px] text-slate-300 mt-0.5">Vu le {person.lastSeen}</p>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" icon={Eye} onClick={onOpen}>Ouvrir</Button>
        <Button variant="secondary" size="sm" icon={Edit3} onClick={onRename}>Renommer</Button>
        <Button variant="secondary" size="sm" icon={GitMerge} onClick={onMerge}>Fusionner</Button>
        <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500 hover:bg-red-50" onClick={onDelete}>Supprimer</Button>
      </div>
    </div>
  );
}

function RenameModal({ person, onClose, onSave }) {
  const [name, setName] = useState(person?.name || "");
  useEffect(() => setName(person?.name || ""), [person]);
  return (
    <Modal open={!!person} onClose={onClose} title="Renommer la personne">
      <label className="text-xs text-slate-500 font-medium block mb-2">Nom</label>
      <input
        value={name} onChange={(e) => setName(e.target.value)} autoFocus
        className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-6"
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={() => { onSave(name); onClose(); }} disabled={!name.trim()}>Enregistrer</Button>
      </div>
    </Modal>
  );
}

function MergeModal({ person, people, onClose, onMerge }) {
  const [target, setTarget] = useState(null);
  const candidates = people.filter((p) => p.id !== person?.id);
  return (
    <Modal open={!!person} onClose={onClose} title={`Fusionner « ${person?.name || ""} »`}>
      <p className="text-sm text-slate-500 mb-4">Sélectionnez la personne avec laquelle fusionner. Toutes les photos seront regroupées.</p>
      <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto mb-6">
        {candidates.map((p) => (
          <button
            key={p.id} onClick={() => setTarget(p.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 ${target === p.id ? "bg-blue-50" : ""}`}
          >
            <Avatar name={p.name} color={p.color} size="h-8 w-8" textSize="text-[10px]" />
            <span className="text-slate-700">{p.name}</span>
            {target === p.id && <Check size={15} className="text-blue-600 ml-auto" />}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button disabled={!target} onClick={() => { onMerge(target); onClose(); }}>Fusionner</Button>
      </div>
    </Modal>
  );
}

function PersonDetail({ person, photos, onBack, onRename, toast }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [selected, setSelected] = useState([]);
  const personPhotos = photos.filter((p) => p.assigned.includes(person.id));

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft size={15} /> Retour aux personnes
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={person.name} color={person.color} size="h-20 w-20" textSize="text-xl" />
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={name} onChange={(e) => setName(e.target.value)} autoFocus
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button onClick={() => { onRename(person.id, name); setEditing(false); toast("success", "Nom mis à jour."); }} className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Check size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">{person.name}</h2>
              <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-slate-500">
                <Edit3 size={15} />
              </button>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-1">{person.photos} photos · {personPhotos.reduce((s, p) => s + p.faces, 0)} visages détectés</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => toast("info", "Export en cours de préparation.")}>Exporter</Button>
          <Button variant="secondary" size="sm" icon={ArrowRightLeft} onClick={() => toast("info", "Sélectionnez un dossier de destination.")}>Déplacer</Button>
          <Button variant="secondary" size="sm" icon={GitMerge} onClick={() => toast("info", "Choisissez une personne à fusionner.")}>Fusionner</Button>
          <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500 hover:bg-red-50" onClick={() => toast("success", "Personne supprimée.")}>Supprimer</Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Photos ({personPhotos.length})</h3>
        {selected.length > 0 && <p className="text-xs text-blue-600 font-medium">{selected.length} sélectionnée(s)</p>}
      </div>

      {personPhotos.length === 0 ? (
        <EmptyState icon={GalleryHorizontalEnd} title="Aucune photo" subtitle="Cette personne n'apparaît dans aucune photo pour le moment." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {personPhotos.map((photo) => (
            <button key={photo.id} onClick={() => toggle(photo.id)} className="relative text-left">
              <div className="aspect-square">
                <Thumb gradient={photo.gradient} faces={photo.faces} />
              </div>
              <div className={`absolute top-2 left-2 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${selected.includes(photo.id) ? "bg-blue-600 border-blue-600" : "bg-white/80 border-white"}`}>
                {selected.includes(photo.id) && <Check size={12} className="text-white" />}
              </div>
              <p className="text-xs text-slate-600 mt-2 truncate">{photo.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonnesPage({ people, setPeople, photos, search, toast, openPerson, setOpenPerson }) {
  const [renameTarget, setRenameTarget] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return people;
    return people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [people, search]);

  if (openPerson) {
    const person = people.find((p) => p.id === openPerson);
    if (person) {
      return (
        <PersonDetail
          person={person}
          photos={photos}
          onBack={() => setOpenPerson(null)}
          onRename={(id, newName) => setPeople((prev) => prev.map((p) => p.id === id ? { ...p, name: newName } : p))}
          toast={toast}
        />
      );
    }
  }

  if (filtered.length === 0) {
    return <EmptyState icon={Users} title="Aucune personne trouvée" subtitle="Lancez un scan pour détecter automatiquement des personnes, ou modifiez votre recherche." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            onOpen={() => setOpenPerson(person.id)}
            onRename={() => setRenameTarget(person)}
            onMerge={() => setMergeTarget(person)}
            onDelete={() => setDeleteTarget(person)}
          />
        ))}
      </div>

      <RenameModal
        person={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={(newName) => {
          setPeople((prev) => prev.map((p) => p.id === renameTarget.id ? { ...p, name: newName } : p));
          toast("success", "Personne renommée avec succès.");
        }}
      />

      <MergeModal
        person={mergeTarget}
        people={people}
        onClose={() => setMergeTarget(null)}
        onMerge={(targetId) => {
          setPeople((prev) => prev.filter((p) => p.id !== mergeTarget.id));
          toast("success", "Personnes fusionnées avec succès.");
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          setPeople((prev) => prev.filter((p) => p.id !== deleteTarget.id));
          toast("success", `« ${deleteTarget.name} » a été supprimée.`);
        }}
        title="Supprimer cette personne ?"
        message={`Cette action supprimera « ${deleteTarget?.name} » ainsi que toutes ses associations de visages. Les photos elles-mêmes ne seront pas supprimées.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Traitements (file d'attente)                                            */
/* ----------------------------------------------------------------------- */

function TraitementsPage({ scanning, progress, history }) {
  const active = scanning ? [{ ...progress, id: "active" }] : [];
  const recentDone = history.slice(0, 2);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <Activity size={16} className="text-blue-600" /> Tâche en cours
        </h2>
        {active.length === 0 ? (
          <EmptyState icon={Activity} title="Aucun traitement actif" subtitle="Lancez un nouveau scan depuis la page Scanner pour le voir apparaître ici." />
        ) : (
          <ProgressCard progress={progress} />
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">Terminés récemment</h2>
        <div className="space-y-2">
          {recentDone.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 truncate">{h.folder}</p>
                <p className="text-xs text-slate-400">{h.date} · {h.photos} photos · {h.time}</p>
              </div>
              <Badge color={h.status === "Terminé" ? "green" : "red"}>{h.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Historique                                                               */
/* ----------------------------------------------------------------------- */

function HistoryTable({ history, onDetails }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Dossier analysé</th>
            <th className="px-5 py-3 font-medium">Photos</th>
            <th className="px-5 py-3 font-medium">Temps</th>
            <th className="px-5 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{h.date}</td>
              <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate">{h.folder}</td>
              <td className="px-5 py-3.5 text-slate-500 tabular-nums">{h.photos}</td>
              <td className="px-5 py-3.5 text-slate-500 tabular-nums">{h.time}</td>
              <td className="px-5 py-3.5"><Badge color={h.status === "Terminé" ? "green" : "red"}>{h.status}</Badge></td>
              <td className="px-5 py-3.5 text-right">
                <button onClick={() => onDetails(h)} className="text-blue-600 text-xs font-medium hover:underline">Voir les détails</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoriquePage({ history }) {
  const [details, setDetails] = useState(null);
  if (history.length === 0) {
    return <EmptyState icon={History} title="Aucun historique" subtitle="Vos scans précédents apparaîtront ici une fois lancés." />;
  }
  return (
    <>
      <HistoryTable history={history} onDetails={setDetails} />
      <Modal open={!!details} onClose={() => setDetails(null)} title="Détails du scan">
        {details && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Dossier</span><span className="text-slate-700 font-medium">{details.folder}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-slate-700">{details.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Photos analysées</span><span className="text-slate-700 tabular-nums">{details.photos}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Durée</span><span className="text-slate-700">{details.time}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-400">Statut</span><Badge color={details.status === "Terminé" ? "green" : "red"}>{details.status}</Badge></div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Paramètres                                                               */
/* ----------------------------------------------------------------------- */

function SettingsSection({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="font-semibold text-slate-800 text-sm mb-5 flex items-center gap-2">
        <Icon size={16} className="text-blue-600" /> {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-sm text-slate-600 font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 rounded-full transition-colors duration-200 relative shrink-0 ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function SettingsPanel({ toast }) {
  const [model, setModel] = useState("ArcFace (haute précision)");
  const [confidence, setConfidence] = useState(75);
  const [minFace, setMinFace] = useState(40);
  const [orgMode, setOrgMode] = useState("copy");
  const [threads, setThreads] = useState(4);
  const [gpu, setGpu] = useState(true);
  const [lang, setLang] = useState("Français");
  const [thumbSize, setThumbSize] = useState("Moyenne");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SettingsSection icon={ScanFace} title="Reconnaissance faciale">
        <Field label="Modèle utilisé">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
            <option>ArcFace (haute précision)</option>
            <option>FaceNet (rapide)</option>
            <option>Dlib (léger)</option>
          </select>
        </Field>
        <Field label={`Seuil de confiance — ${confidence}%`}>
          <input type="range" min="50" max="99" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full accent-blue-600" />
        </Field>
        <Field label={`Taille minimale des visages — ${minFace}px`} hint="Les visages plus petits que cette taille seront ignorés">
          <input type="range" min="16" max="128" value={minFace} onChange={(e) => setMinFace(Number(e.target.value))} className="w-full accent-blue-600" />
        </Field>
      </SettingsSection>

      <SettingsSection icon={FolderTree} title="Organisation">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "copy", label: "Copier", icon: Copy, desc: "Duplique les fichiers" },
            { id: "move", label: "Déplacer", icon: ArrowRightLeft, desc: "Déplace les fichiers" },
            { id: "symlink", label: "Liens symboliques", icon: Link2, desc: "Économise l'espace disque" },
          ].map((opt) => (
            <button
              key={opt.id} onClick={() => setOrgMode(opt.id)}
              className={`rounded-2xl border p-4 text-left transition-all duration-200 ${orgMode === opt.id ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"}`}
            >
              <opt.icon size={18} className={orgMode === opt.id ? "text-blue-600" : "text-slate-400"} />
              <p className="text-sm font-medium text-slate-700 mt-2">{opt.label}</p>
              <p className="text-xs text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={Cpu} title="Performances">
        <Field label={`Nombre de threads — ${threads}`}>
          <input type="range" min="1" max="16" value={threads} onChange={(e) => setThreads(Number(e.target.value))} className="w-full accent-blue-600" />
        </Field>
        <div className="flex items-center justify-between">
          <span>
            <span className="text-sm text-slate-700 font-medium block flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> GPU activé</span>
            <span className="text-xs text-slate-400">Accélère significativement le traitement</span>
          </span>
          <Toggle checked={gpu} onChange={setGpu} />
        </div>
      </SettingsSection>

      <SettingsSection icon={Monitor} title="Apparence">
        <Field label="Langue">
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
            <option>Français</option>
            <option>English</option>
            <option>Español</option>
          </select>
        </Field>
        <Field label="Taille des miniatures">
          <div className="flex gap-2">
            {["Petite", "Moyenne", "Grande"].map((s) => (
              <button
                key={s} onClick={() => setThumbSize(s)}
                className={`px-4 py-2 rounded-2xl text-sm border transition-colors ${thumbSize === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
      </SettingsSection>

      <div className="flex justify-end">
        <Button icon={Check} onClick={() => toast("success", "Paramètres enregistrés avec succès.")}>Enregistrer les modifications</Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* App root                                                                 */
/* ----------------------------------------------------------------------- */

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [openPerson, setOpenPerson] = useState(null);

  const [people, setPeople] = useState(PEOPLE_SEED);
  const [photos] = useState(PHOTOS_SEED);
  const [history, setHistory] = useState(HISTORY_SEED);

  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, analyzed: 0, faces: 0, people: 0, elapsed: "0 s" });

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setOpenPerson(null);
  }, [page]);

  const toast = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const launchScan = useCallback((settings) => {
    setScanning(true);
    setPage("scanner");
    const total = settings.count || 12;
    const start = Date.now();
    setProgress({ percent: 0, analyzed: 0, faces: 0, people: 0, elapsed: "0 s" });

    const interval = setInterval(() => {
      setProgress((prev) => {
        const analyzed = Math.min(total, prev.analyzed + Math.max(1, Math.round(total / 14)));
        const percent = Math.round((analyzed / total) * 100);
        const elapsedSec = Math.round((Date.now() - start) / 1000);
        const next = {
          percent,
          analyzed,
          faces: Math.round(analyzed * 1.4),
          people: Math.min(people.length, Math.round(analyzed / 4)),
          elapsed: elapsedSec < 60 ? `${elapsedSec} s` : `${Math.floor(elapsedSec / 60)} min ${elapsedSec % 60} s`,
        };
        if (analyzed >= total) {
          clearInterval(interval);
          setTimeout(() => {
            setScanning(false);
            setHistory((prevH) => [
              {
                id: `h${Date.now()}`,
                date: new Date().toLocaleString("fr-FR"),
                folder: "/Users/marie/Photos/Nouveau_Scan",
                photos: total,
                time: next.elapsed,
                status: "Terminé",
              },
              ...prevH,
            ]);
            toast("success", `Analyse terminée : ${total} photos, ${next.faces} visages détectés.`);
          }, 400);
        }
        return next;
      });
    }, 350);
  }, [people.length, toast]);

  const meta = PAGE_META[page];

  let content;
  if (page === "dashboard") {
    content = <Dashboard loading={loading} people={people} photos={photos} history={history} setPage={setPage} />;
  } else if (page === "scanner") {
    content = <ScannerPage scanning={scanning} progress={progress} onLaunch={launchScan} />;
  } else if (page === "personnes") {
    content = (
      <PersonnesPage
        people={people} setPeople={setPeople} photos={photos} search={search} toast={toast}
        openPerson={openPerson} setOpenPerson={setOpenPerson}
      />
    );
  } else if (page === "galerie") {
    content = loading
      ? <SkeletonGrid count={12} />
      : <GaleriePage photos={photos} people={people} peopleById={peopleById} search={search} toast={toast} />;
  } else if (page === "traitements") {
    content = <TraitementsPage scanning={scanning} progress={progress} history={history} />;
  } else if (page === "historique") {
    content = <HistoriquePage history={history} />;
  } else if (page === "parametres") {
    content = <SettingsPanel toast={toast} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { transition-property: color, background-color, border-color; }
      `}</style>

      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title={meta.title} subtitle={meta.subtitle}
          onNewScan={() => setPage("scanner")}
          search={search} setSearch={setSearch}
        />
        <main className="flex-1 p-6">
          {content}
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
