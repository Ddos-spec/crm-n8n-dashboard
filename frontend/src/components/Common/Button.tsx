import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => {
  return (
    <button
      className={`px-4 py-2 bg-primary text-white rounded hover:bg-teal-800 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};
