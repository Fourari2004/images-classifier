/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  ScanLine, 
  Users, 
  Image, 
  Sparkles, 
  Settings, 
  Moon, 
  Sun,
  Download
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  serverStatus: 'online' | 'offline';
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onExportAllZip?: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  serverStatus,
  isDarkMode = false,
  onToggleTheme,
  onExportAllZip
}: SidebarProps) {
  const currentMenuTab = activeTab === 'person-detail' ? 'people' : activeTab;

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner' as ActiveTab, label: 'Scanner', icon: ScanLine },
    { id: 'people' as ActiveTab, label: 'Personnes', icon: Users },
    { id: 'faces' as ActiveTab, label: 'Visages & Fusions', icon: Sparkles },
    { id: 'gallery' as ActiveTab, label: 'Galerie Photos', icon: Image },
    { id: 'settings' as ActiveTab, label: 'Paramètres', icon: Settings },
  ];

  return (
    <aside id="sidebar-root" className={`w-64 flex flex-col h-screen shrink-0 sticky top-0 transition-colors ${
      isDarkMode ? 'bg-slate-900 border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-slate-800'
    }`}>
      {/* Brand Logo */}
      <div className={`p-6 flex items-center justify-between border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <span className="font-sans font-extrabold tracking-tight text-base block leading-tight">
              FaceSorter AI
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              GPU & CPU DirectML
            </span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav id="sidebar-nav" className="flex-1 p-4 space-y-1 overflow-y-auto">
        <span className="block px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
          Menu Principal
        </span>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMenuTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold tracking-tight transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Export All Shortcut */}
        {onExportAllZip && (
          <div className="pt-4">
            <button
              onClick={onExportAllZip}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Télécharger en ZIP</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
          isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <span className="block text-[11px] font-bold truncate">GPU DirectML Activé</span>
            <span className="block text-[9px] text-slate-400 truncate">InsightFace + FAISS + EXIF</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
