/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, GitMerge, Edit3, Play, Folder, Users, AlertCircle } from 'lucide-react';
import { Person } from '../types';

// Modal Wrapper for common overlay and animation
interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalWrapper({ isOpen, onClose, children }: ModalWrapperProps) {
  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden z-10 pointer-events-auto"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Rename Person Modal
interface RenamePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person | null;
  currentName?: string;
  onRename?: (personId: string, newName: string) => void;
  onConfirm?: (newName: string) => void;
}

export function RenamePersonModal({
  isOpen,
  onClose,
  person,
  currentName,
  onRename,
  onConfirm
}: RenamePersonModalProps) {
  const initialName = person?.name || currentName || '';
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(person?.name || currentName || '');
  }, [person, currentName, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (name || '').trim();
    if (trimmed) {
      if (onRename && person) {
        onRename(person.id, trimmed);
      } else if (onConfirm) {
        onConfirm(trimmed);
      }
      onClose();
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Renommer la personne</h3>
        </div>
        <button id="modal-rename-close" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rename-input" className="block text-xs font-semibold text-slate-500 uppercase mb-2">
            Nouveau nom de la personne
          </label>
          <input
            id="rename-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Sophie Martin"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            id="modal-rename-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 text-sm transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            id="modal-rename-submit"
            type="submit"
            disabled={!(name || '').trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// Merge People Modal
interface MergePeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person | null;
  sourcePerson?: Person | null;
  allPeople?: Person[];
  people?: Person[];
  onMerge?: (fromId: string, toId: string) => void;
  onConfirm?: (targetPersonId: string) => void;
}

export function MergePeopleModal({
  isOpen,
  onClose,
  person,
  sourcePerson,
  allPeople,
  people,
  onMerge,
  onConfirm
}: MergePeopleModalProps) {
  const [targetId, setTargetId] = useState('');
  const activePerson = sourcePerson || person;
  const list = people || allPeople || [];

  useEffect(() => {
    if (isOpen) setTargetId('');
  }, [isOpen]);

  if (!activePerson) return null;

  // Filter out the person itself from target candidates
  const candidates = list.filter((p) => p.id !== activePerson.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetId) {
      if (onMerge) {
        onMerge(activePerson.id, targetId);
      } else if (onConfirm) {
        onConfirm(targetId);
      }
      onClose();
    }
  };

  const targetPerson = candidates.find((p) => p.id === targetId);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900 font-sans">Fusionner des profils</h3>
        </div>
        <button id="modal-merge-close" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Toutes les photos associées à <strong className="text-slate-800">{activePerson.name}</strong> seront transférées vers le profil cible. Ce profil sera ensuite supprimé.
        </p>

        {/* Source Person */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <img
            src={activePerson.avatarUrl}
            alt={activePerson.name}
            className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
          />
          <div>
            <div className="text-xs text-slate-400 uppercase font-bold">Fusionner</div>
            <div className="text-sm font-bold text-slate-800">{activePerson.name}</div>
          </div>
        </div>

        {/* Select Target */}
        <div>
          <label htmlFor="merge-target" className="block text-xs font-semibold text-slate-500 uppercase mb-2">
            Vers le profil de :
          </label>
          <select
            id="merge-target"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
          >
            <option value="">Sélectionnez une personne cible...</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.photosCount} photos)
              </option>
            ))}
          </select>
        </div>

        {/* Target Preview */}
        {targetPerson && (
          <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-900">
            <img
              src={targetPerson.avatarUrl}
              alt={targetPerson.name}
              className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
            />
            <div>
              <div className="text-xs text-blue-500 uppercase font-bold">Profil Cible</div>
              <div className="text-sm font-bold text-blue-950">{targetPerson.name}</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            id="modal-merge-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 text-sm transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            id="modal-merge-submit"
            type="submit"
            disabled={!targetId}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
          >
            Confirmer la fusion
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: any;
  type?: 'person' | 'photo' | 'association';
  onConfirm: (id: string) => void;
}

export function DeleteConfirmModal({ isOpen, onClose, target, type = 'person', onConfirm }: DeleteConfirmModalProps) {
  if (!target) return null;

  const handleConfirm = () => {
    onConfirm(target.id);
    onClose();
  };

  const getTitle = () => {
    if (type === 'person') return `Supprimer "${target.name}" ?`;
    if (type === 'photo') return `Supprimer la photo ?`;
    return `Retirer l'association ?`;
  };

  const getDescription = () => {
    if (type === 'person') {
      return `Êtes-vous sûr de vouloir supprimer le profil de ${target.name} ? Cette action est irréversible.`;
    }
    if (type === 'photo') {
      return `Cette photo sera retirée de la base de données.`;
    }
    return `Ce visage ne sera plus associé à cette personne.`;
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center gap-3 text-red-600 mb-4">
        <div className="p-2.5 bg-red-50 rounded-xl">
          <Trash2 className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-sans">{getTitle()}</h3>
      </div>

      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        {getDescription()}
      </p>

      <div className="flex justify-end gap-3">
        <button
          id="modal-delete-cancel"
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 text-sm transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button
          id="modal-delete-confirm"
          type="button"
          onClick={handleConfirm}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
        >
          Supprimer
        </button>
      </div>
    </ModalWrapper>
  );
}
