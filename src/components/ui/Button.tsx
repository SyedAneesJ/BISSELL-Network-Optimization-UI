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
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 active:scale-[0.98] hover:-translate-y-0.5 disabled:translate-y-0 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:hover:shadow-none';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_10px_28px_rgba(37,99,235,0.20)] hover:from-blue-500 hover:via-blue-600 hover:to-indigo-500 focus:ring-blue-500 disabled:from-blue-300 disabled:via-blue-300 disabled:to-indigo-300',
    secondary: 'border border-white/70 bg-white/75 text-slate-700 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:bg-white hover:text-slate-900 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100/80 focus:ring-slate-400 disabled:text-slate-300',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_10px_28px_rgba(225,29,72,0.18)] hover:from-rose-500 hover:to-red-500 focus:ring-rose-500 disabled:from-rose-300 disabled:to-red-300',
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
