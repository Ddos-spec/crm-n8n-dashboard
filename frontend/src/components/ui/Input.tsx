import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export function Input({ icon, className = '', ...props }: InputProps) {
  return (
    <div className="input-group">
      {icon && <div className="input-icon">{icon}</div>}
      <input 
        className={`input ${className}`} 
        {...props} 
      />
    </div>
  );
}
