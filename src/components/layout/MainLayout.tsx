import { ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BackgroundBlobs } from './BackgroundBlobs';
import { User, EnrollmentRecord } from '@/src/types';
import { Menu, X, Camera, Shield, Mail, IdCard, Calendar, Check, Edit2, Save, Flag, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, onSnapshot, query, collection, where, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/src/utils/cn';
import { sendNotification } from '@/src/lib/notifications';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface MainLayoutProps {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

export function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShowProfile = () => {
    if (user?.role === 'admin') {
      navigate('/settings');
    } else {
      setShowProfileModal(true);
    }
  };


  // Sync enrollment data for student ID
  useEffect(() => {
    if (!user || user.role !== 'student') {
      setEnrollment(null);
      return;
    }

    if (!user?.username) return;

    let unsub: (() => void) | null = null;

    const fetchEnrollment = async () => {
      try {
        // Try direct doc get first by user.uid
        const directDoc = await getDoc(doc(db, 'enrollments', user.uid));
        if (directDoc.exists()) {
          setEnrollment(directDoc.data() as EnrollmentRecord);
          return;
        }

        // Try direct doc get by user.username
        if (user.username && user.username !== user.uid) {
          const userDoc = await getDoc(doc(db, 'enrollments', user.username));
          if (userDoc.exists()) {
            setEnrollment(userDoc.data() as EnrollmentRecord);
            return;
          }
        }

        // Fallback to query
        const q = query(
          collection(db, 'enrollments'),
          where('userId', '==', user.uid),
          limit(1)
        );

        unsub = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setEnrollment(snapshot.docs[0].data() as EnrollmentRecord);
          } else {
            setEnrollment(null);
          }
        }, (err) => {
          // Gracefully suppress permission warning if new student is not yet enrolled
          console.debug("Enrollment status: not yet enrolled or query restricted", err);
        });
      } catch (err) {
        console.debug("Enrollment fetch:", err);
      }
    };

    fetchEnrollment();

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Initialize temp email when modal opens
  useEffect(() => {
    if (showProfileModal && user) {
      setTempEmail(user.email);
    }
  }, [showProfileModal, user]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendReport = async () => {
    if (!reportMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSendingReport(true);
    try {
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminsSnap = await getDocs(adminsQuery);
      const adminIds = adminsSnap.docs.map(doc => doc.id);
      
      if (adminIds.length === 0) {
        toast.error("No administrators found to receive the report");
        setIsSendingReport(false);
        return;
      }

      const promises = adminIds.map(adminId => 
        sendNotification(
          adminId, 
          'New System Report', 
          `Report from ${user?.name} (${user?.email}): ${reportMessage}`, 
          'warning'
        )
      );

      await Promise.all(promises);
      
      toast.success("Report sent to administrators");
      setReportMessage('');
      setShowReportModal(false);
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Failed to send report");
    } finally {
      setIsSendingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:p-0">
      <div className="no-print">
        <BackgroundBlobs />
      </div>
      
      {/* PC Sidebar */}
      <div className="no-print">
        <Sidebar 
          user={user} 
          onLogout={onLogout} 
          isEnrolled={enrollment?.status === 'Enrolled'}
          className="fixed left-0 top-0 bottom-0 w-[240px] z-40 hidden lg:flex"
        />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="no-print flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#042017] border-r border-slate-700 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <Sidebar 
                user={user} 
                onLogout={onLogout} 
                isEnrolled={enrollment?.status === 'Enrolled'}
                onItemClick={() => setIsMobileMenuOpen(false)}
                className="border-none"
              />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-[-40px] bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-r border-y border-r border-slate-700 shadow-md"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] flex flex-col min-h-screen bg-glass-gradient print:pl-0 print:bg-white print:m-0 relative">
        <div className="no-print">
          <Navbar 
            user={user} 
            onMenuClick={() => setIsMobileMenuOpen(true)} 
            onLogout={onLogout}
            onShowProfile={handleShowProfile}
            onShowReport={() => setShowReportModal(true)}
          />
        </div>
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden print:p-0 print:m-0 print:overflow-visible">
          {children}
        </main>
      </div>

      {/* Global Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-white">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">{user?.name}</h3>
                    <p className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                      {user?.role === 'admin' ? 'Registrar' : 'Student'} Profile
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded border border-transparent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-slate-200">
                  <div className="relative group shrink-0">
                    <div className="h-28 w-28 rounded-md bg-white border border-slate-300 p-1 shadow-sm">
                      <div className={cn(
                        "h-full w-full rounded flex items-center justify-center text-3xl font-bold overflow-hidden relative",
                        user?.profilePicture ? "bg-slate-50" : "bg-blue-50 text-blue-800"
                      )}>
                        {user?.profilePicture ? (
                          <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.[0]
                        )}
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white"
                        >
                          <Camera className="h-6 w-6 mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Change Photo</span>
                        </button>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          try {
                            await updateDoc(doc(db, 'users', user.uid), { profilePicture: base64 });
                            toast.success("Profile picture updated!");
                          } catch (err) {
                            toast.error("Failed to update picture");
                          }
                        };
                        reader.readAsDataURL(file);
                      }} 
                      className="hidden" 
                      accept="image/*" 
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left pt-1">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">{user?.name}</h2>
                    <p className="text-slate-500 font-semibold uppercase text-xs flex items-center justify-center sm:justify-start gap-1.5 mb-3">
                      <Shield className="h-3.5 w-3.5 text-blue-700" />
                      {user?.role === 'admin' ? 'Registrar Administrator' : 'Enrolled Student'}
                    </p>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-700">
                      <span>ID:</span>
                      <span className="font-bold">
                        {enrollment ? (enrollment.studentId || enrollment.studentInfo.studentId || 'PENDING') : (user?.role === 'admin' ? 'REG-STAFF' : 'NO-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Email</p>
                        {isEditingEmail ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              autoFocus
                              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-700"
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  toast.error("Email changes must be requested through Registry");
                                  setIsEditingEmail(false);
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                toast.error("Email changes must be requested through Registry");
                                setIsEditingEmail(false);
                              }}
                              className="px-2 py-1 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 transition-colors"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/email">
                            <p className="text-xs font-semibold text-slate-900 truncate">{user?.email}</p>
                            <button 
                              onClick={() => setIsEditingEmail(true)}
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded border border-transparent transition-all"
                              title="Edit Email"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 shrink-0">
                        <IdCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Student ID</p>
                        <p className="text-xs font-bold text-slate-900 font-mono">
                          {enrollment ? (enrollment.studentId || enrollment.studentInfo.studentId || 'PENDING') : 'No Enrollment'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Member Since</p>
                        <p className="text-xs font-semibold text-slate-900">June 2023</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 shrink-0">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Enrollment Status</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded border uppercase tracking-wider",
                          enrollment?.status === 'Enrolled' ? "bg-emerald-50 text-emerald-800 border-emerald-300" : 
                          enrollment ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-600 border-slate-300"
                        )}>
                           {enrollment?.status === 'Enrolled' && <Check className="h-3 w-3" />}
                           {enrollment?.status || 'Not Enrolled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 rounded-md shadow-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSendingReport && setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-300 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-red-100 text-red-700 border border-red-200 rounded flex items-center justify-center">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">System Report</h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Support Ticket</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded border border-transparent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Describe the issue or feedback you'd like to report to the system administrators.
                </p>
                
                <textarea
                  autoFocus
                  placeholder="Type your report message here..."
                  className="w-full h-36 p-3 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all resize-none"
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  disabled={isSendingReport}
                />

                <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors"
                    disabled={isSendingReport}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReport}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold text-white rounded-md shadow-sm transition-colors flex items-center gap-2",
                      isSendingReport ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                    )}
                    disabled={isSendingReport}
                  >
                    {isSendingReport ? (
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {isSendingReport ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
