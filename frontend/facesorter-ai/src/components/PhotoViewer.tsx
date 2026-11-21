/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, UserPlus, UserCheck, ShieldAlert, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Photo, Person, Face } from '../types';

interface PhotoViewerProps {
  photo: Photo | null;
  onClose: () => void;
  people: Person[];
  onAssociateFace: (faceId: string, personId: string | null) => void;
  onCreateAndAssociateFace: (faceId: string, name: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function PhotoViewer({
  photo,
  onClose,
  people,
  onAssociateFace,
  onCreateAndAssociateFace,
  onPrev,
  onNext
}: PhotoViewerProps) {
  const [hoveredFaceId, setHoveredFaceId] = useState<string | null>(null);
  const [activeSelectFaceId, setActiveSelectFaceId] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!photo) return null;

  const handleAssociation = (faceId: string, personId: string | null) => {
    onAssociateFace(faceId, personId);
    setActiveSelectFaceId(null);
  };

  const handleCreateAndAssociate = (e: React.FormEvent, faceId: string) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      onCreateAndAssociateFace(faceId, newPersonName.trim());
      setNewPersonName('');
      setIsCreatingNew(false);
      setActiveSelectFaceId(null);
    }
  };

  return (
    <div id="photo-viewer-root" className="fixed inset-0 bg-slate-900/95 z-40 flex flex-col md:flex-row pointer-events-auto overflow-hidden">
      {/* Left side: Large photo canvas */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-slate-950">
        {/* Navigation / Close tools */}
        <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
          <button
            id="viewer-close-btn"
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/10 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-white text-xs font-semibold px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl">
            {photo.name} • {photo.size}
          </div>
        </div>

        {/* Swipe Controls */}
        {onPrev && (
          <button
            id="viewer-prev-btn"
            onClick={onPrev}
            className="absolute left-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition-all z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {onNext && (
          <button
            id="viewer-next-btn"
            onClick={onNext}
            className="absolute right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition-all z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Photo Container */}
        <div className="relative max-w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden group">
          <img
            src={photo.url}
            alt={photo.name}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/5 shadow-2xl select-none"
            referrerPolicy="no-referrer"
          />

          {/* Render Bounding Boxes */}
          {photo.faces.map((face) => {
            const isHovered = hoveredFaceId === face.id;
            const person = people.find((p) => p.id === face.personId);

            return (
              <div
                key={face.id}
                onMouseEnter={() => setHoveredFaceId(face.id)}
                onMouseLeave={() => setHoveredFaceId(null)}
                style={{
                  left: `${face.boundingBox.x}%`,
                  top: `${face.boundingBox.y}%`,
                  width: `${face.boundingBox.w}%`,
                  height: `${face.boundingBox.h}%`
                }}
                className={`absolute rounded-xl border-2 transition-all duration-300 pointer-events-auto ${
                  isHovered
                    ? 'border-blue-400 bg-blue-500/10 ring-4 ring-blue-500/20 shadow-lg'
                    : 'border-white/50 bg-black/5 hover:border-blue-400'
                }`}
              >
                {/* Float Card on Hover */}
                {isHovered && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-[10px] text-white font-bold whitespace-nowrap shadow-xl">
                    {person ? person.name : 'Inconnu'} ({Math.round(face.confidence * 100)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Detailed info and face matching list */}
      <div className="w-full md:w-96 bg-white flex flex-col border-l border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Analyse des Visages</h3>
            <p className="text-xs text-slate-500">{photo.facesCount} visage(s) détecté(s)</p>
          </div>
          <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full uppercase">
            IA Acton
          </span>
        </div>

        {/* Visages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {photo.faces.map((face) => {
            const person = people.find((p) => p.id === face.personId);
            const isHovered = hoveredFaceId === face.id;
            const isEditing = activeSelectFaceId === face.id;

            return (
              <div
                key={face.id}
                id={`face-detail-${face.id}`}
                onMouseEnter={() => setHoveredFaceId(face.id)}
                onMouseLeave={() => setHoveredFaceId(null)}
                className={`p-4 rounded-2xl border transition-all ${
                  isHovered || isEditing
                    ? 'border-blue-200 bg-blue-50/20 shadow-md'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Face Crop Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50 relative group">
                    <img
                      src={face.croppedUrl}
                      alt="Crop"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-bold">
                      Zoom
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold uppercase">Personne</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        • Confiance: {Math.round(face.confidence * 100)}%
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {person ? person.name : 'Profil Inconnu'}
                    </h4>

                    {/* Quick Badge */}
                    <div className="flex items-center gap-1.5">
                      {person ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                          <UserCheck className="w-3 h-3" /> Associé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-100">
                          <ShieldAlert className="w-3 h-3" /> Non classifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Face Actions Panel */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  <button
                    id={`btn-change-${face.id}`}
                    onClick={() => {
                      setActiveSelectFaceId(isEditing ? null : face.id);
                      setIsCreatingNew(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 text-xs transition-colors flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" /> Changer d'association
                  </button>

                  {person && (
                    <button
                      id={`btn-unlink-${face.id}`}
                      onClick={() => handleAssociation(face.id, null)}
                      className="px-3 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-50 font-semibold text-rose-700 text-xs transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Dissocier
                    </button>
                  )}
                </div>

                {/* Sub-Panel: Select Association Person */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-100 overflow-hidden space-y-3"
                    >
                      {!isCreatingNew ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Associer à :</span>
                            <button
                              id={`btn-new-p-${face.id}`}
                              onClick={() => setIsCreatingNew(true)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Nouvelle personne
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                            {people.map((p) => {
                              const isSelected = p.id === face.personId;
                              return (
                                <button
                                  id={`select-p-${p.id}`}
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleAssociation(face.id, p.id)}
                                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-700 font-bold'
                                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                                  }`}
                                >
                                  <img
                                    src={p.avatarUrl}
                                    alt={p.name}
                                    className="w-5 h-5 rounded-full object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="flex-1 truncate">{p.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <form onSubmit={(e) => handleCreateAndAssociate(e, face.id)} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Créer un profil :</span>
                            <button
                              id={`btn-back-p-${face.id}`}
                              type="button"
                              onClick={() => setIsCreatingNew(false)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              Annuler
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <input
                              id={`input-new-name-${face.id}`}
                              type="text"
                              value={newPersonName}
                              onChange={(e) => setNewPersonName(e.target.value)}
                              placeholder="Nom de la personne"
                              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              id={`submit-new-p-${face.id}`}
                              type="submit"
                              disabled={!newPersonName.trim()}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs shrink-0 transition-colors"
                            >
                              Créer
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
