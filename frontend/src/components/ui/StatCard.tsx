import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'cyan';
  change?: string;
  trend?: 'up' | 'down';
  miniChart?: React.ReactNode;
}

export function StatCard({ 
  label, 
  value, 
  icon, 
  color, 
  change, 
  trend,
  miniChart 
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      
      {change && (
        <span className={`stat-change ${trend}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      )}

      {miniChart}
    </div>
  );
}
