/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Scan, 
  FolderTree, 
  Cpu, 
  Eye, 
  Save, 
  HelpCircle,
  Folder,
  Layers,
  Activity
} from 'lucide-react';
import { Settings } from '../types';
import { api } from '../api';

interface SettingsPanelProps {
  id: string;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export default function SettingsPanel({ id, settings, onSave }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [outputDir, setOutputDir] = useState("classified");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggle = (key: keyof Settings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectChange = (key: keyof Settings, value: string | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleBrowseOutput = async () => {
    try {
      const res = await api.browseFolder();
      if (res.folder) {
        setOutputDir(res.folder);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings({
        recognition_threshold: localSettings.confidenceThreshold,
        cpu_threads: localSettings.threads,
        output_dir: outputDir
      });
      onSave(localSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id={id} className="max-w-4xl mx-auto space-y-8">
      {/* SECTION 1: Facial Recognition Algorithm parameters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Reconnaissance Faciale (ArcFace / InsightFace)</h3>
            <p className="text-xs text-slate-400 font-medium">Ajustez le modèle de deep-learning et le seuil de décision</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model info */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Modèle d'extraction facial
            </label>
            <div className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm bg-slate-50 font-semibold">
              InsightFace buffalo_l (ONNX Runtime)
            </div>
            <p className="text-[10px] text-slate-400">Modèle état-de-l'art combinant RetinaFace et ArcFace 512D.</p>
          </div>

          {/* Threads */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Threads CPU alloués
            </label>
            <select
              value={localSettings.threads || 4}
              onChange={(e) => handleSelectChange('threads', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-sm bg-white font-semibold"
            >
              <option value={2}>2 Threads CPU</option>
              <option value={4}>4 Threads CPU (Recommandé)</option>
              <option value={6}>6 Threads CPU</option>
              <option value={8}>8 Threads CPU (Haute performance)</option>
            </select>
            <p className="text-[10px] text-slate-400">Nombre de cœurs de calcul utilisés en parallèle.</p>
          </div>
        </div>

        {/* Confidence Threshold slider */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Seuil de similarité (Distance Cosine ArcFace)</span>
            <span className="font-mono text-blue-600 font-extrabold text-sm">
              {(localSettings.confidenceThreshold).toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.20"
            max="0.80"
            step="0.05"
            value={localSettings.confidenceThreshold}
            onChange={(e) => handleSelectChange('confidenceThreshold', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0.20 (Regroupement très agressif)</span>
            <span>0.45 (Optimal recommandé)</span>
            <span>0.80 (Très strict, sépare les profils)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Output folder & Sorting preferences */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Organisation & Dossier de Sortie</h3>
            <p className="text-xs text-slate-400 font-medium">Définissez l'emplacement où classer automatiquement les photos</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Répertoire de sortie (photos triées par personne)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={outputDir}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm bg-slate-50 font-medium truncate"
              />
              <button
                type="button"
                onClick={handleBrowseOutput}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Folder className="w-4 h-4" /> Parcourir...
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.copyFiles}
                onChange={() => handleToggle('copyFiles')}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Copie physique des photos</span>
                <span className="text-[10px] text-slate-400">Copie les originaux dans output/nom_personne/</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoMerge}
                onChange={() => handleToggle('autoMerge')}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Index FAISS actif</span>
                <span className="text-[10px] text-slate-400">Reconnaissance instantanée à grande échelle</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-600">
            ✓ Paramètres enregistrés avec succès
          </span>
        )}
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}
