
import React from 'react';

interface IconButtonProps {
  onClick: () => void;
  text: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, text, children, variant = 'primary', disabled = false }) => {
  const baseClasses = "flex items-center justify-center px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100";
  
  const variantClasses = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400",
    secondary: "bg-slate-600 hover:bg-slate-500 text-slate-100 focus:ring-slate-400"
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`} disabled={disabled}>
      <span className="mr-2">{children}</span>
      {text}
    </button>
  );
};

export default IconButton;
