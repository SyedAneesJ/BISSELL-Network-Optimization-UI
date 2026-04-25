import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  fullWidth = false,
  type = 'button',
  className = '',
  title,
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm hover:shadow';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-white/70 text-slate-700 hover:bg-white focus:ring-slate-500 border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-500 disabled:text-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
