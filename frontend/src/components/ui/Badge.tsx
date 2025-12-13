import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray';
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'gray', dot = false, className = '' }: BadgeProps) {
  // Styles are defined in globals.css under .badge class
  // We just compose the class names here
  return (
    <span className={`badge ${variant} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
