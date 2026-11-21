/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Users, Eye, Image } from 'lucide-react';
import { Photo } from '../types';

interface GalleryCardProps {
  key?: React.Key;
  id: string;
  photo: Photo;
  onClick: (photo: Photo) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function GalleryCard({
  id,
  photo,
  onClick,
  size = 'md'
}: GalleryCardProps) {
  // Dimensions based on user's thumbnail size preferences
  const sizeClasses = {
    sm: 'aspect-square md:col-span-1',
    md: 'aspect-square',
    lg: 'aspect-video md:col-span-2'
  };

  return (
    <motion.div
      id={id}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => onClick(photo)}
      className={`group relative bg-slate-900 rounded-2xl border border-slate-200 overflow-hidden cursor-pointer shadow-xs ${sizeClasses[size]}`}
    >
      {/* Photo Element */}
      <img
        src={photo.url}
        alt={photo.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 opacity-90" />

      {/* Hover action overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/20">
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white shadow-lg scale-90 group-hover:scale-100 transition-transform">
          <Eye className="w-5 h-5" />
        </div>
      </div>

      {/* Top Overlays */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Face Count Badge */}
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/60 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
          <Image className="w-3 h-3 text-blue-400" />
          {photo.facesCount} {photo.facesCount > 1 ? 'visages' : 'visage'}
        </span>

        {/* Multi-person indicator */}
        {photo.facesCount > 1 && (
          <span className="p-1.5 rounded-full bg-blue-600 text-white shadow-xs">
            <Users className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5 pointer-events-none">
        <p className="text-xs font-bold truncate tracking-tight">{photo.name}</p>
        <div className="flex items-center justify-between text-[10px] text-slate-300">
          <span>{photo.date}</span>
          <span>{photo.size}</span>
        </div>
      </div>
    </motion.div>
  );
}
