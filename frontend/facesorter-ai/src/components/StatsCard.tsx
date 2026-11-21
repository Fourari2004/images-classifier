/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import * as Lucide from 'lucide-react';

interface StatsCardProps {
  id: string;
  title: string;
  value: string | number;
  iconName: keyof typeof Lucide;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description: string;
}

export default function StatsCard({
  id,
  title,
  value,
  iconName,
  change,
  changeType = 'positive',
  description
}: StatsCardProps) {
  const IconComponent = Lucide[iconName] as Lucide.LucideIcon;

  return (
    <motion.div
      id={id}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            {title}
          </span>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </h3>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          {IconComponent && <IconComponent className="w-6 h-6" />}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500 font-medium">
          {description}
        </span>
        {change && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              changeType === 'positive'
                ? 'bg-emerald-50 text-emerald-700'
                : changeType === 'negative'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
