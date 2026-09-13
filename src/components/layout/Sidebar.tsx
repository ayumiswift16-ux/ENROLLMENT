import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { MENU_ITEMS } from './Sidebar.data';
import { cn } from '@/src/utils/cn';
import { User } from '@/src/types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  onItemClick?: () => void;
  className?: string;
  isEnrolled?: boolean;
}

export function Sidebar({ user, onLogout, onItemClick, className, isEnrolled }: SidebarProps) {
  const navigate = useNavigate();

  const filteredItems = MENU_ITEMS.filter(item => {
    const hasRole = !item.roles || (user && item.roles.includes(user.role));
    if (!hasRole) return false;
    
    // Students must be enrolled to see items marked with requiresEnrollment
    if (user?.role === 'student' && (item as any).requiresEnrollment && !isEnrolled) {
      return false;
    }
    
    return true;
  });

  return (
    <aside className={cn(
      "bg-[#042017] text-slate-300 border-r border-slate-700 flex flex-col h-full select-none shadow-lg",
      className
    )}>
      {/* Header / Branding - Classic Institutional Seal */}
      <div 
        className="p-4 flex items-center gap-3 border-b border-emerald-900/80 bg-[#021710] cursor-pointer hover:bg-[#031d14] transition-colors" 
        onClick={() => navigate('/dashboard')}
        title="Go to Dashboard"
      >
        <div className="h-11 w-11 p-1 bg-white rounded border border-emerald-800 shrink-0 flex items-center justify-center shadow-sm">
          <img 
            src={`${import.meta.env.BASE_URL}cdm-logo.png`} 
            alt="Colegio de Montalban Seal" 
            className="h-9 w-9 object-contain" 
          />
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-white font-bold text-xs tracking-wider uppercase truncate">Colegio de Montalban</span>
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mt-0.5 truncate">Student Information System</span>
        </div>
      </div>

      {/* Classic Navigation Section */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 mb-1 border-b border-emerald-950/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portal Operations</p>
        </div>
        
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded border text-xs font-semibold uppercase tracking-wider transition-colors",
                isActive 
                  ? "bg-[#064e3b] text-white border-emerald-600 border-l-4 border-l-emerald-400 font-bold shadow-sm" 
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 border-transparent"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-emerald-300" : "text-slate-400 group-hover:text-white"
                  )} />
                  <span className="truncate">
                    {user?.role === 'professor' && item.path === '/records' ? 'Class List' : item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Classic Footer / Sign Out Button */}
      <div className="p-3 border-t border-emerald-950 bg-[#021710] mt-auto">
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 hover:bg-red-900 hover:border-red-700 text-slate-200 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider shadow-sm"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
