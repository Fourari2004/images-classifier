/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Plus, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onNewScan: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  showSearch?: boolean;
}

export default function Header({
  title,
  subtitle,
  onNewScan,
  searchQuery,
  onSearchChange,
  placeholder = 'Rechercher...',
  showSearch = true
}: HeaderProps) {
  return (
    <header id="header-root" className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-[#F8FAFC]/80 backdrop-blur-md border-b border-slate-200/50">
      {/* Title Column */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-tight">
          {subtitle}
        </p>
      </div>

      {/* Right Tools Row */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        {showSearch && (
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="header-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 bg-white placeholder-slate-400 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        )}

        {/* New Scan Trigger */}
        <button
          id="header-btn-new-scan"
          onClick={onNewScan}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouveau Scan
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-slate-200" />

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <span className="block text-xs font-bold text-slate-800 leading-tight">
              fourari2004
            </span>
            <span className="text-[10px] font-semibold text-slate-400 block flex items-center gap-0.5 justify-end">
              <ShieldCheck className="w-3 h-3 text-blue-500" /> Admin
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-blue-700 uppercase">
            FA
          </div>
        </div>
      </div>
    </header>
  );
}
