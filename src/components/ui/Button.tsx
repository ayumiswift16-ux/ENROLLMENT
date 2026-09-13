import * as React from "react"
import { cn } from "@/src/utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'emerald';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 border border-blue-800 shadow-sm active:translate-y-px',
      emerald: 'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 border border-emerald-800 shadow-sm active:translate-y-px',
      secondary: 'bg-slate-800 text-white hover:bg-slate-900 active:bg-slate-950 border border-slate-900 shadow-sm active:translate-y-px',
      outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm active:bg-slate-100 active:translate-y-px',
      ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 active:translate-y-px',
      danger: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-red-800 shadow-sm active:translate-y-px',
      destructive: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-red-800 shadow-sm active:translate-y-px',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold rounded-md',
      md: 'px-4 py-2 text-sm font-semibold rounded-md',
      lg: 'px-6 py-3 text-base font-semibold rounded-md',
      icon: 'p-2 rounded-md',
    }

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-100 font-medium tracking-normal select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
