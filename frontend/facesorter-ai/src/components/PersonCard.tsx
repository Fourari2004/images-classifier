/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { MoreVertical, FolderOpen, Edit2, GitMerge, Trash2, Calendar } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Person } from '../types';

interface PersonCardProps {
  key?: React.Key;
  id: string;
  person: Person;
  onOpen: (personId: string) => void;
  onRename: (person: Person) => void;
  onMerge: (person: Person) => void;
  onDelete: (person: Person) => void;
}

export default function PersonCard({
  id,
  person,
  onOpen,
  onRename,
  onMerge,
  onDelete
}: PersonCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <motion.div
      id={id}
      whileHover={{ y: -4, scale: 1.01 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative flex flex-col"
    >
      {/* Dropdown Menu Trigger */}
      <div className="absolute top-3 right-3 z-10" ref={dropdownRef}>
        <button
          id={`${id}-menu-trigger`}
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="p-1.5 rounded-lg bg-white/80 backdrop-blur-xs border border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 pointer-events-auto">
            <button
              id={`${id}-btn-open`}
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                onOpen(person.id);
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" /> Ouvrir
            </button>
            <button
              id={`${id}-btn-rename`}
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                onRename(person);
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Renommer
            </button>
            <button
              id={`${id}-btn-merge`}
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                onMerge(person);
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2"
            >
              <GitMerge className="w-3.5 h-3.5 text-slate-500" /> Fusionner
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              id={`${id}-btn-delete`}
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                onDelete(person);
              }}
              className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Main Card Content */}
      <div className="p-5 flex flex-col items-center flex-1">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 shadow-inner mb-4 bg-slate-50 relative shrink-0">
          <img
            src={person.avatarUrl}
            alt={person.name}
            className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
            referrerPolicy="no-referrer"
          />
        </div>

        <h4 className="text-sm font-bold text-slate-900 tracking-tight text-center truncate max-w-full">
          {person.name}
        </h4>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="text-center">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Photos</span>
            <span className="text-xs font-bold text-slate-800">{person.photosCount}</span>
          </div>
          <div className="text-center border-l border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visages</span>
            <span className="text-xs font-bold text-slate-800">{person.facesCount}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" /> Vu le {person.lastSeen.split(' ')[0]}
        </span>
        <button
          id={`${id}-open-link`}
          onClick={() => onOpen(person.id)}
          className="text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider hover:underline"
        >
          Consulter
        </button>
      </div>
    </motion.div>
  );
}
