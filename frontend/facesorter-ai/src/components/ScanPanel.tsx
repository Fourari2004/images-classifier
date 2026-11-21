/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  UploadCloud, 
  Sliders, 
  Layers, 
  Copy, 
  Play, 
  TrendingUp, 
  Users, 
  Smile, 
  Pause, 
  Square, 
  Clock,
  Terminal,
  FolderTree,
  RefreshCw
} from 'lucide-react';
import { Settings } from '../types';

interface ScanPanelProps {
  id: string;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  onStartScan: (folderPath: string, outputFolderPath?: string, forceReprocess?: boolean) => void;
  onPauseScan?: () => void;
  onResumeScan?: () => void;
  onCancelScan?: () => void;
  onBrowseFolder: () => void;
  onBrowseOutputFolder: () => void;
  selectedFolderPath: string;
  selectedOutputFolderPath: string;
  photosCountInFolder: number;
  isScanning: boolean;
  isPaused?: boolean;
  scanProgress: number;
  scanStatus: {
    analyzedCount: number;
    totalCount: number;
    currentPhotoUrl?: string;
    currentPhotoName?: string;
    detectedFacesCount: number;
    recognizedPeopleCount: number;
    elapsedTime: string;
    recentLogs?: string[];
  };
}

export default function ScanPanel({
  id,
  settings,
  onUpdateSettings,
  onStartScan,
  onPauseScan,
  onResumeScan,
  onCancelScan,
  onBrowseFolder,
  onBrowseOutputFolder,
  selectedFolderPath,
  selectedOutputFolderPath,
  photosCountInFolder,
  isScanning,
  isPaused = false,
  scanProgress,
  scanStatus
}: ScanPanelProps) {
  const [forceReprocess, setForceReprocess] = useState(false);

  const triggerAnalysis = () => {
    if (!selectedFolderPath) return;
    onStartScan(selectedFolderPath, selectedOutputFolderPath, forceReprocess);
  };

  return (
    <div id={id} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Parameters & Folder Selectors Column */}
      <div className={`space-y-6 ${isScanning ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
        
        {/* Source and Output Selection Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Dossiers Source & Destination</h3>
              <p className="text-xs text-slate-400 font-medium">Choisissez où lire les photos et où créer les dossiers par personne</p>
            </div>
          </div>

          {/* 1. Source Folder */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
              <span>Dossier Source (photos à analyser)</span>
              {photosCountInFolder > 0 && (
                <span className="text-emerald-600 font-bold lowercase">
                  ({photosCountInFolder} photos trouvées)
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={selectedFolderPath || "Aucun dossier sélectionné"}
                placeholder="Cliquez sur Parcourir..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs bg-slate-50 font-medium truncate"
              />
              <button
                type="button"
                onClick={onBrowseFolder}
                disabled={isScanning}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Folder className="w-4 h-4" /> Parcourir Source...
              </button>
            </div>
          </div>

          {/* 2. Output Folder */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Dossier de Destination (classement par personne)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={selectedOutputFolderPath || "classified (par défaut)"}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs bg-slate-50 font-medium truncate"
              />
              <button
                type="button"
                onClick={onBrowseOutputFolder}
                disabled={isScanning}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FolderTree className="w-4 h-4 text-emerald-600" /> Choisir Sortie...
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Un sous-dossier sera créé pour chaque personne identifiée avec ses photos respectives.
            </p>
          </div>
        </div>

        {/* Scan Parameters Settings Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Comparaison avec les visages existants</h3>
              <p className="text-xs text-slate-400 font-medium">Reconnaissance continue : compare automatiquement avec tous les visages déjà indexés</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Similarity threshold slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Seuil de similarité (Distance ArcFace)</span>
                <span className="font-mono text-blue-600 text-sm font-extrabold">
                  {Math.round(settings.confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                id="threshold-range"
                type="range"
                min="30"
                max="85"
                value={settings.confidenceThreshold * 100}
                disabled={isScanning}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) / 100 })
                }
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0.30 (Tolérant)</span>
                <span>0.45 (Optimal recommandé)</span>
                <span>0.85 (Strict)</span>
              </div>
            </div>

            {/* Checkboxes Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  settings.copyFiles
                    ? 'border-blue-100 bg-blue-50/20 text-blue-900'
                    : 'border-slate-100 bg-white text-slate-700'
                } ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={settings.copyFiles}
                  disabled={isScanning}
                  onChange={(e) => onUpdateSettings({ ...settings, copyFiles: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 shrink-0" /> Copie automatique
                  </span>
                  <span className="block text-[10px] text-slate-400">Classe dans le dossier de sortie choisi</span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  settings.autoMerge
                    ? 'border-blue-100 bg-blue-50/20 text-blue-900'
                    : 'border-slate-100 bg-white text-slate-700'
                } ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={settings.autoMerge}
                  disabled={isScanning}
                  onChange={(e) => onUpdateSettings({ ...settings, autoMerge: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 shrink-0" /> Index FAISS temps réel
                  </span>
                  <span className="block text-[10px] text-slate-400">Reconnaissance instantanée des anciens profils</span>
                </div>
              </label>

              {/* Force Reprocess toggle — spans full width */}
              <label
                className={`col-span-full flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  forceReprocess
                    ? 'border-orange-200 bg-orange-50 text-orange-900'
                    : 'border-slate-100 bg-white text-slate-700'
                } ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={forceReprocess}
                  disabled={isScanning}
                  onChange={(e) => setForceReprocess(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 text-orange-500" /> Forcer le retraitement complet
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Retraite toutes les photos même déjà analysées — utile si vous avez changé le dossier de sortie ou modifié les paramètres. Peut être long.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Start / Pause / Resume / Cancel Controls */}
        {!isScanning ? (
          <button
            id="btn-start-analysis"
            onClick={triggerAnalysis}
            disabled={!selectedFolderPath}
            className={`w-full py-4 rounded-2xl disabled:opacity-50 text-white font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              forceReprocess
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-400/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {forceReprocess
              ? <><RefreshCw className="w-4 h-4" /> Retraiter toutes les photos ({photosCountInFolder > 0 ? photosCountInFolder : '?'})</>
              : <><Play className="w-4 h-4 fill-white" /> Lancer l'analyse et le tri {photosCountInFolder > 0 ? `(${photosCountInFolder} photos)` : ''}</>
            }
          </button>
        ) : (
          <div className="flex gap-3">
            {isPaused ? (
              <button
                onClick={onResumeScan}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Reprendre
              </button>
            ) : (
              <button
                onClick={onPauseScan}
                className="flex-1 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pause className="w-4 h-4" /> Mettre en pause
              </button>
            )}
            <button
              onClick={onCancelScan}
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" /> Stopper
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Live Progress Panel or Info */}
      <div className={`${isScanning ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
        <AnimatePresence mode="wait">
          {!isScanning ? (
            <motion.div
              key="pending-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs h-full flex flex-col justify-between min-h-[300px]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Mécanisme de Reconnaissance
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                    Base persistante active
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-800 block">Comparaison intelligente :</span>
                    <span className="text-slate-500">Chaque nouvelle photo est comparée aux visages déjà enregistrés dans la base. Si une correspondance est trouvée, le même nom lui est automatiquement attribué.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-800 block">Dossier des visages isolés :</span>
                    <span className="text-slate-500">Stocké dans le projet (<code className="bg-slate-200 px-1 rounded">data_faces/</code>), permettant d'inspecter ou de fusionner les visages un par un.</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium leading-relaxed">
                Le tri s'effectue en mémoire ultra-rapide grâce à FAISS IndexFlatIP.
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-progress"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white p-6 rounded-3xl border border-blue-200 shadow-xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-blue-600 ${isPaused ? '' : 'animate-ping'}`} />
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {isPaused ? "Analyse en pause" : "Analyse en cours..."}
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {scanProgress}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${isPaused ? 'bg-amber-500' : 'bg-blue-600'}`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Photo {scanStatus.analyzedCount} sur {scanStatus.totalCount}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {scanStatus.elapsedTime}
                  </span>
                </div>
              </div>

              {scanStatus.currentPhotoUrl && (
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-500 uppercase">Image active :</span>
                  <div className="relative aspect-video max-h-52 rounded-xl overflow-hidden bg-slate-950 border border-slate-100">
                    <img
                      src={scanStatus.currentPhotoUrl}
                      alt="Active"
                      className="w-full h-full object-contain"
                    />
                    {!isPaused && (
                      <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-0.5 bg-blue-400/80 shadow-[0_0_10px_#60a5fa] z-10"
                      />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-600 text-center truncate">
                    {scanStatus.currentPhotoName}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <Smile className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Analysées</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {scanStatus.analyzedCount} / {scanStatus.totalCount}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Visages</span>
                  <span className="text-xs font-extrabold text-slate-800">{scanStatus.detectedFacesCount}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <Users className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Profils</span>
                  <span className="text-xs font-extrabold text-slate-800">{scanStatus.recognizedPeopleCount}</span>
                </div>
              </div>

              {scanStatus.recentLogs && scanStatus.recentLogs.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                    <Terminal className="w-3.5 h-3.5" /> Journal en direct
                  </div>
                  <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-xl max-h-28 overflow-y-auto space-y-0.5">
                    {scanStatus.recentLogs.map((log, i) => (
                      <div key={i} className="truncate">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
