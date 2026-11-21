/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  GitMerge, 
  CheckSquare, 
  Square, 
  Search, 
  Sparkles,
  Info,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { FaceItem } from '../types';

interface FacesViewProps {
  faces: FaceItem[];
  totalFaces: number;
  isLoading: boolean;
  onMergeFaces: (sourcePersonIds: number[], targetPersonId: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mergeSuggestions?: Array<{
    person_a: { id: number; name: string };
    person_b: { id: number; name: string };
    similarity: number;
    confidence: string;
  }>;
}

export default function FacesView({
  faces,
  totalFaces,
  isLoading,
  onMergeFaces,
  searchQuery,
  onSearchChange,
  mergeSuggestions = []
}: FacesViewProps) {
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [targetPersonId, setTargetPersonId] = useState<number | null>(null);
  const [isMergingModalOpen, setIsMergingModalOpen] = useState(false);

  const toggleSelectPerson = (personId: number) => {
    setSelectedPersonIds(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleOpenMerge = () => {
    if (selectedPersonIds.length < 2) return;
    setTargetPersonId(selectedPersonIds[0]);
    setIsMergingModalOpen(true);
  };

  const handleConfirmMerge = () => {
    if (!targetPersonId || selectedPersonIds.length < 2) return;
    onMergeFaces(selectedPersonIds, targetPersonId);
    setIsMergingModalOpen(false);
    setSelectedPersonIds([]);
  };

  const selectedPersonsList = Array.from(new Set(selectedPersonIds)).map(pid => {
    const face = faces.find(f => f.person_id === pid);
    return {
      id: pid,
      name: face ? face.person_name : `Personne #${pid}`,
      thumb: face ? face.thumbnail_url : ''
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Multi-Selection Actions Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Visages extraits & Données isolées (data_faces)
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {totalFaces} personnes distinctes indexées (un visage représentatif par personne). Cochez 2 visages ou plus pour les fusionner sous une même personne.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedPersonIds.length > 0 && (
            <button
              onClick={() => setSelectedPersonIds([])}
              className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Désélectionner tout ({selectedPersonIds.length})
            </button>
          )}

          <button
            onClick={handleOpenMerge}
            disabled={selectedPersonIds.length < 2}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <GitMerge className="w-4 h-4" /> Fusionner les {selectedPersonIds.length} visages sélectionnés
          </button>
        </div>
      </div>

      {/* AI Merge Suggestions Card (Clustering intelligent) */}
      {mergeSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-6 rounded-3xl border border-blue-100 space-y-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-extrabold tracking-tight">Suggestions de Fusion par IA</h3>
            <span className="text-[10px] font-bold bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full">
              {mergeSuggestions.length} doublons potentiels détectés
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mergeSuggestions.slice(0, 6).map((sugg, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {sugg.person_a.name} <ArrowRight className="w-3 h-3 inline text-slate-400" /> {sugg.person_b.name}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    Similarité: {sugg.similarity}% ({sugg.confidence})
                  </span>
                </div>
                <button
                  onClick={() => onMergeFaces([sugg.person_a.id], sugg.person_b.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs shrink-0 cursor-pointer"
                >
                  Fusionner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faces Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : faces.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Aucun visage trouvé</h3>
          <p className="text-xs text-slate-400">Lancez une analyse dans l'onglet Scanner pour extraire et indexer les visages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {faces.map((face) => {
            const isSelected = selectedPersonIds.includes(face.person_id);

            return (
              <motion.div
                key={face.id}
                whileHover={{ y: -3 }}
                onClick={() => toggleSelectPerson(face.person_id)}
                className={`group relative bg-white rounded-2xl border p-2.5 cursor-pointer shadow-xs transition-all ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="absolute top-4 left-4 z-10">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-black/40 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Square className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 mb-2 border border-slate-100">
                  <img
                    src={face.thumbnail_url}
                    alt={face.person_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-slate-800 truncate">
                    {face.person_name}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    Confiance: {(face.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MERGE MODAL */}
      {isMergingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <GitMerge className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Fusionner les visages sélectionnés</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Vous allez fusionner <strong>{selectedPersonsList.length} profils</strong> ensemble. Choisissez sous quel profil principal toutes ces photos et visages seront regroupés :
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Profil cible principal :
              </label>
              <select
                value={targetPersonId || ''}
                onChange={(e) => setTargetPersonId(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs bg-white font-semibold"
              >
                {selectedPersonsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMergingModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Confirmer la fusion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
