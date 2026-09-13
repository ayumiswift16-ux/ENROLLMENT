import * as React from "react"
import { cn } from "@/src/utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700 ml-1">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
            "placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
            error && "border-red-600 focus:border-red-600 focus:ring-red-600",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
