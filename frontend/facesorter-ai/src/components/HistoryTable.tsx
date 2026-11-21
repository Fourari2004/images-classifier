/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { PlayCircle, CheckCircle, XCircle, ChevronRight, Folder, Calendar, Clock, Image } from 'lucide-react';
import { ScanHistory } from '../types';

interface HistoryTableProps {
  id: string;
  history: ScanHistory[];
  onViewDetails: (scan: ScanHistory) => void;
}

export default function HistoryTable({ id, history, onViewDetails }: HistoryTableProps) {
  return (
    <div id={id} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Historique des Traitements</h3>
          <p className="text-xs text-slate-400 font-medium">Liste complète des dossiers de photos analysés par l'IA</p>
        </div>
        <span className="font-mono text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-full uppercase">
          {history.length} scans enregistrés
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date / Heure</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dossier Analysé</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Photos</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Visages</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durée</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progression / Statut</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {history.map((scan, idx) => {
              const isSuccess = scan.status === 'success';
              const isFailed = scan.status === 'failed';

              return (
                <tr
                  key={scan.id}
                  id={`history-row-${scan.id}`}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {scan.date}
                    </span>
                  </td>

                  {/* Folder */}
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-slate-900 font-semibold text-xs truncate max-w-xs">
                      <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                      {scan.folderPath}
                    </span>
                  </td>

                  {/* Photos count */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      <Image className="w-3.5 h-3.5 text-slate-400" /> {scan.photosCount}
                    </span>
                  </td>

                  {/* Visages detected */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-800 font-extrabold text-xs">
                      {scan.detectedFaces}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                      <Clock className="w-4 h-4 text-slate-300" />
                      {scan.duration}
                    </span>
                  </td>

                  {/* Progress / Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Mini Bar */}
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                        <div
                          style={{ width: `${scan.progress}%` }}
                          className={`h-full rounded-full ${isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-blue-500'}`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSuccess && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {isFailed && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                        {!isSuccess && !isFailed && <PlayCircle className="w-4 h-4 text-blue-500 shrink-0 animate-spin" />}
                        <span
                          className={`text-xs font-bold ${
                            isSuccess
                              ? 'text-emerald-700'
                              : isFailed
                              ? 'text-rose-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {isSuccess ? 'Succès' : isFailed ? 'Échoué' : 'En cours'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      id={`btn-view-scan-${scan.id}`}
                      onClick={() => onViewDetails(scan)}
                      className="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-xs inline-flex items-center gap-1 transition-all"
                    >
                      Détails <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
