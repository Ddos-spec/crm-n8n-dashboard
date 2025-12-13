import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string; // e.g. 'var(--accent)'
  iconBg?: string; // e.g. 'var(--accent-glow)'
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ 
  title, 
  action, 
  icon, 
  iconColor, 
  iconBg,
  className = '' 
}: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`}>
      <div className="card-title">
        {icon && (
          <div 
            className="card-title-icon" 
            style={{ 
              color: iconColor, 
              background: iconBg 
            }}
          >
            {icon}
          </div>
        )}
        {title}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, noPadding = false, className = '' }: { children: React.ReactNode; noPadding?: boolean; className?: string }) {
  return (
    <div className={`card-body ${noPadding ? 'no-padding' : ''} ${className}`}>
      {children}
    </div>
  );
}
