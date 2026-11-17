import React from 'react';
import { Layers, Clock, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

export default function StatsGrid({ stats }) {
  const statItems = [
    {
      label: 'Total Tasks',
      value: stats.total || 0,
      icon: Layers,
      color: '#818cf8',
      bg: 'rgba(99, 102, 241, 0.15)'
    },
    {
      label: 'Pending',
      value: stats.pending || 0,
      icon: Clock,
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.15)'
    },
    {
      label: 'In Progress',
      value: stats.inProgress || 0,
      icon: AlertCircle,
      color: '#60a5fa',
      bg: 'rgba(59, 130, 246, 0.15)'
    },
    {
      label: 'Completed',
      value: stats.completed || 0,
      icon: CheckCircle2,
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.15)'
    },
    {
      label: 'Urgent',
      value: stats.urgent || 0,
      icon: Flame,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.15)'
    }
  ];

  return (
    <div className="stats-grid">
      {statItems.map((item, idx) => {
        const IconComponent = item.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: item.bg, color: item.color }}>
              <IconComponent size={22} strokeWidth={2.2} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{item.value}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
