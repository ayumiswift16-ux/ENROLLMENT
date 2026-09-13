import { Bell, Search, User, Menu, X, Check, Info, AlertTriangle, AlertCircle, Clock, Settings, LogOut, Camera, Mail, Phone, MapPin, Shield, Calendar, IdCard, Flag, Send } from 'lucide-react';
import { User as UserType, Notification } from '@/src/types';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/src/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface NavbarProps {
  user: UserType | null;
  onMenuClick?: () => void;
  onLogout?: () => void;
  onShowProfile?: () => void;
  onShowReport?: () => void;
}

export function Navbar({ user, onMenuClick, onLogout, onShowProfile, onShowReport }: NavbarProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);


  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    // Use a simple query with a strict limit to save quota
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Notification[];
      // Sort in memory to avoid index requirements
      setNotifications(notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      import('@/src/lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }).catch(() => console.error("Firestore Error in Navbar:", error));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-emerald-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50';
      case 'warning': return 'bg-amber-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-blue-50';
    }
  };

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-slate-300 bg-white px-4 md:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-300 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="relative w-64 lg:w-80 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student ID, name, or records..."
            className="w-full h-8 pl-8 pr-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {user?.role === 'student' && (
          <button 
            onClick={onShowReport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded border border-slate-300 text-xs font-semibold transition-all"
            title="Report an issue"
          >
            <Flag className="h-4 w-4 text-red-600" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>
        )}

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={cn(
              "relative p-1.5 rounded border border-slate-300 transition-colors",
              isNotifOpen ? "bg-slate-100 text-slate-900 border-slate-400" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-[10px] text-white flex items-center justify-center rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-1.5 w-80 md:w-96 bg-white rounded-md shadow-lg border border-slate-300 overflow-hidden"
              >
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded border border-red-200">{unreadCount} New</span>}
                  </h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "p-3 hover:bg-slate-50 transition-all cursor-pointer flex gap-3 relative",
                          !notif.read && "bg-blue-50/40"
                        )}
                      >
                        {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-700" />}
                        <div className={cn("h-8 w-8 rounded border border-slate-200 flex items-center justify-center shrink-0", getBg(notif.type))}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-xs font-bold truncate", notif.read ? "text-slate-700" : "text-slate-900")}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className={cn("text-xs mt-0.5 leading-normal", notif.read ? "text-slate-500" : "text-slate-700")}>
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <Bell className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-800">No notifications yet</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">We'll notify you when there's an update.</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
                    <button className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                      View all activities
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="h-6 w-[1px] bg-slate-300 mx-1" />

        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              if (user?.role === 'admin') {
                navigate('/settings');
              } else {
                setIsProfileOpen(!isProfileOpen);
              }
            }}
            className={cn(
              "flex items-center gap-2.5 p-1 rounded border border-slate-300 hover:bg-slate-100 transition-colors",
              isProfileOpen && "bg-slate-100 border-slate-400"
            )}
          >
            <div className="text-right hidden sm:block pl-1">
              <p className="text-xs font-bold text-slate-900 leading-none">
                {user?.name || 'Guest'}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                {user?.role || 'User'}
              </p>
            </div>
            <div className={cn(
              "h-7 w-7 rounded border border-slate-300 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0",
              user?.profilePicture ? "bg-slate-100" : "bg-slate-700"
            )}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || <User className="h-4 w-4" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-1.5 w-56 bg-white rounded-md shadow-lg border border-slate-300 overflow-hidden"
              >
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Signed in as</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                </div>
                <div className="p-1">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      onShowProfile?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    My Profile
                  </button>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    Account Settings
                  </button>
                </div>
                <div className="p-1 border-t border-slate-200">
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5 text-red-600" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
