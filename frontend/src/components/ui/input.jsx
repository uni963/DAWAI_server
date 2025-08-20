import React from 'react'

const Input = ({ 
  className = '', 
  type = 'text',
  onPaste,
  onKeyDown,
  ...props 
}) => {
  const baseClasses = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
  
  const handlePaste = (e) => {
    if (onPaste) {
      onPaste(e);
    }
  };

  const handleKeyDown = (e) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };
  
  return (
    <input
      type={type}
      className={`${baseClasses} ${className}`}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { Input }

