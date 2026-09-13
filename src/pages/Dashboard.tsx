import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar,
  MapPin,
  Bell,
  Plus,
  BookOpen,
  Info,
  Timer,
  Download,
  Edit3,
  CheckSquare
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { CHART_DATA } from '@/src/mockData';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EnrollmentRecord, User as UserType, SystemSettings } from '../types';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

const STATS = [
  { label: 'Total Students', value: '1,284', icon: Users, color: 'text-slate-900', bg: 'bg-emerald-100', trend: '+12.5%' },
  { label: 'Active Enrollees', value: '842', icon: GraduationCap, color: 'text-slate-900', bg: 'bg-green-100', trend: '+8.2%' },
  { label: 'Approved', value: '756', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: '+14.1%' },
  { label: 'Pending Apps', value: '86', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', trend: '-2.4%' },
];

interface DashboardProps {
  user: UserType | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();

  const [stats, setStats] = useState(STATS);
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentRecord[]>([]);
  const [enrollmentRecord, setEnrollmentRecord] = useState<EnrollmentRecord | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [professorStudents, setProfessorStudents] = useState<EnrollmentRecord[]>([]);
  const [professorSchedules, setProfessorSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch Settings
    const settingsUnsub = onSnapshot(doc(db, 'settings', 'enrollment'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      }
    }, (error) => {
      console.error("Firestore Error fetching settings in Dashboard:", error);
    });

    let dataUnsub = () => {};

    if (user.role === 'admin') {
      // Use query limit to reduce data consumption
      const q = query(collection(db, 'enrollments'), orderBy('updatedAt', 'desc'), limit(50));
      dataUnsub = onSnapshot(q, (querySnapshot) => {
        const allDocs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as EnrollmentRecord);
        
        // Stats based on the latest 50 records (as a proxy for global stats to save quota)
        const total = allDocs.length;
        const approved = allDocs.filter(d => d.status === 'Enrolled').length;
        const pending = allDocs.filter(d => d.status === 'Validating').length;
        const active = allDocs.filter(d => d.status === 'Approved' || d.status === 'Enrolled').length;

        setStats([
          { label: 'Total Records', value: total.toLocaleString(), icon: Users, color: 'text-slate-900', bg: 'bg-emerald-100', trend: '--' },
          { label: 'Active Enrollees', value: active.toLocaleString(), icon: GraduationCap, color: 'text-slate-900', bg: 'bg-green-100', trend: '--' },
          { label: 'Approved', value: approved.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: '--' },
          { label: 'Pending Apps', value: pending.toLocaleString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', trend: '--' },
        ]);
        setRecentEnrollments(allDocs.slice(0, 5));
      }, (error) => {
        console.error("Firestore Error in Admin Dashboard data:", error);
      });
    } else if (user.role === 'professor') {
       // Professor View: Fetch their assigned section's students and schedule
       const professorSections = user.assignedSections || (user.assignedSection ? [user.assignedSection] : []);
       if (professorSections.length > 0) {
         const qStudents = query(
           collection(db, 'enrollments'), 
           where('section', 'in', professorSections.slice(0, 30)), // Firestore 'in' limit
           where('status', '==', 'Enrolled')
         );
         const unsubStudents = onSnapshot(qStudents, (snap) => {
           setProfessorStudents(snap.docs.map(d => ({ ...d.data(), id: d.id }) as EnrollmentRecord));
         }, (error) => {
           console.error("Firestore Error in Professor Dashboard students:", error);
         });

         const qSchedule = query(
           collection(db, 'schedules'),
           where('section', 'in', professorSections.slice(0, 30))
         );
         const unsubSchedule = onSnapshot(qSchedule, (snap) => {
           setProfessorSchedules(snap.docs.map(d => ({ ...d.data(), id: d.id })));
         }, (error) => {
           console.error("Firestore Error in Professor Dashboard schedules:", error);
         });

         dataUnsub = () => {
           unsubStudents();
           unsubSchedule();
         };
       }
    } else {
      // For students: listen directly to their enrollment document by UID
      const unsubDoc = onSnapshot(doc(db, 'enrollments', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setEnrollmentRecord({ ...docSnap.data(), id: docSnap.id } as EnrollmentRecord);
        } else if (user.email) {
          // If no doc exists by UID, check by email query (for admin-created enrollments)
          const q = query(
            collection(db, 'enrollments'), 
            where('studentInfo.email', '==', user.email)
          );
          
          getDocs(q).then((snapshot) => {
            if (!snapshot.empty) {
              const enrollDoc = snapshot.docs[0];
              const enrollData = { ...enrollDoc.data(), id: enrollDoc.id } as EnrollmentRecord;
              setEnrollmentRecord(enrollData);

              // Auto-link: update userId to user.uid
              if (enrollData.userId !== user.uid) {
                import('firebase/firestore').then(({ doc, updateDoc }) => {
                  updateDoc(doc(db, 'enrollments', enrollDoc.id), {
                    userId: user.uid
                  }).catch(err => console.error("Error auto-linking enrollment:", err));
                });
              }
            } else if (user.username && user.username !== user.uid) {
              getDoc(doc(db, 'enrollments', user.username)).then(uSnap => {
                if (uSnap.exists()) {
                  setEnrollmentRecord({ ...uSnap.data(), id: uSnap.id } as EnrollmentRecord);
                } else {
                  setEnrollmentRecord(null);
                }
              }).catch(() => setEnrollmentRecord(null));
            } else {
              setEnrollmentRecord(null);
            }
          }).catch(err => {
            console.warn("Student email lookup:", err);
            setEnrollmentRecord(null);
          });
        } else {
          setEnrollmentRecord(null);
        }
      }, (error) => {
        console.error("Firestore Error in Student Dashboard data fetch:", error);
      });

      dataUnsub = () => {
        unsubDoc();
      };
    }

    return () => {
      settingsUnsub();
      dataUnsub();
    };
  }, [user]);

  const isAdmin = user?.role === 'admin';
  const isProfessor = user?.role === 'professor';

  const enrollmentStatus = useMemo(() => {
    if (!settings?.enrollmentStartDate || !settings?.enrollmentEndDate) return 'Not Set';
    const now = new Date();
    const start = new Date(settings.enrollmentStartDate);
    const end = new Date(settings.enrollmentEndDate);

    if (now < start) return 'Upcoming';
    if (now > end) return 'Ended';
    return 'Active';
  }, [settings]);

  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    if (enrollmentStatus !== 'Active' || !settings?.enrollmentEndDate) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(settings.enrollmentEndDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft(null);
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [enrollmentStatus, settings]);

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'pm' : 'am';
      const formattedHours = h % 12 || 12;
      return `${formattedHours}:${minutes}${ampm}`;
    } catch (e) {
      return time;
    }
  };

  const isExamDone = useMemo(() => {
    if (!enrollmentRecord?.examDate) return false;
    const examDate = new Date(enrollmentRecord.examDate);
    const now = new Date();
    
    // Check if date is in the past
    const examDay = new Date(examDate);
    examDay.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (today.getTime() > examDay.getTime()) return true;
    
    // If today, check end time if available
    if (today.getTime() === examDay.getTime() && enrollmentRecord.examEndTime) {
      const [hours, minutes] = enrollmentRecord.examEndTime.split(':');
      const endTime = new Date(examDay);
      endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (now.getTime() > endTime.getTime()) return true;
    }
    
    return false;
  }, [enrollmentRecord]);

  const studentStatus = enrollmentRecord?.status || 'Not Enrolled';

  return (
    <div className="space-y-8 text-left">
      {/* Dashboard Section */}

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl text-white shadow-xl overflow-hidden relative",
          isAdmin ? "bg-linear-to-br from-[#052e16] to-[#064e3b]" : "bg-linear-to-br from-[#064e3b] to-[#065f46]"
        )}
      >
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h2>
          <p className="text-sm opacity-90">
            {isAdmin 
              ? `The ${settings?.academicYear || 'current'} enrollment is ${enrollmentStatus.toLowerCase()}.` 
              : isProfessor
                ? `You are logged in to the CdM Professor Portal. Managing ${user?.assignedSections?.length ? user.assignedSections.length + ' assigned sections' : 'section ' + (user?.assignedSection || 'None')}.`
                : "You are logged in to the CdM Student Portal. Stay updated with your academics."}
          </p>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-2xl text-center backdrop-blur-md border border-white/10 relative z-10 min-w-[180px]">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Enrollment Status</p>
          <div className="flex flex-col items-center">
            <p className={cn(
              "text-2xl font-black uppercase tracking-tighter transition-colors",
              enrollmentStatus === 'Active' ? "text-emerald-400" : 
              enrollmentStatus === 'Upcoming' ? "text-amber-400" : "text-red-400"
            )}>
              {enrollmentStatus}
            </p>
            {enrollmentStatus === 'Active' && timeLeft && (
              <div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                <Timer className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] font-black font-mono text-emerald-200">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      </motion.div>

      {isAdmin ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card glass className="p-5 flex flex-col justify-between h-full group hover:border-emerald-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg text-white", stat.color.replace('text-', 'bg-'))}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {stat.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                    <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Enrollment Activity</CardTitle>
                    <CardDescription>Daily enrollment applications for the current week</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-600 font-semibold hover:text-emerald-600">View Details</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Notifications */}
            <div className="space-y-8">
              <Card className="border-none shadow-sm bg-[#052e16] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <CardHeader>
                  <CardTitle className="text-white text-left">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Generate Report', icon: TrendingUp },
                    { label: 'Manage Courses', icon: GraduationCap },
                    { label: 'Student Support', icon: Bell },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center justify-between w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <action.icon className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 opacity-30" />
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-left">Enrollment Period</CardTitle>
                  <CardDescription>Official schedule for the current semester</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">Starts</span>
                        <span className="text-xs font-black text-slate-700">{new Date(settings.enrollmentStartDate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Ends</span>
                        <span className="text-xs font-black text-slate-700">{new Date(settings.enrollmentEndDate).toLocaleString()}</span>
                      </div>
                      <Button variant="outline" className="w-full text-xs h-9 mt-2" onClick={() => navigate('/settings')}>Change Schedule</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Settings not configured.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Enrollments Table */}
          <Card glass className="overflow-hidden border-none shadow-sm text-left">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/50">
              <div className="text-left">
                <CardTitle>Recent Enrollments</CardTitle>
                <CardDescription>Overview of the latest student applications</CardDescription>
              </div>
              <p className="text-xs font-bold text-slate-400 cursor-pointer hover:text-emerald-600" onClick={() => navigate('/records')}>
                View All
              </p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Year Level</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEnrollments.map((enrollment, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors group text-left">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                            {enrollment.studentInfo.firstName ? enrollment.studentInfo.firstName[0] : 'U'}{enrollment.studentInfo.lastName ? enrollment.studentInfo.lastName[0] : 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}</p>
                            <p className="text-xs text-slate-500">{enrollment.studentId || enrollment.studentInfo.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-slate-900">{enrollment.course}</p>
                          {enrollment.studentInfo.yearLevel === '1st Year' && enrollment.secondChoice && (
                            <p className="text-[10px] font-black text-slate-900 opacity-60">/ {enrollment.secondChoice}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{enrollment.studentInfo.yearLevel}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          enrollment.status === 'Enrolled' ? "bg-emerald-100 text-emerald-700" :
                          enrollment.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                          enrollment.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                          enrollment.status === 'Validating' ? (
                            enrollment.studentInfo.yearLevel === '1st Year' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          ) :
                          "bg-red-100 text-red-700"
                        )}>
                          {(enrollment.status === 'Validating' && enrollment.studentInfo.yearLevel === '1st Year') ? 'Assessment' : enrollment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">{(enrollment.enrolledAt || enrollment.updatedAt || '').split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : isProfessor ? (
        <div className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Professor Stats */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-[#052e16] text-white p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                   <h3 className="text-sm font-bold opacity-70 uppercase tracking-widest mb-4">Assigned Sections</h3>
                   <p className="text-4xl font-black mb-2 tracking-tighter">
                     {user?.assignedSections?.length || (user?.assignedSection ? 1 : 0)}
                   </p>
                   <p className="text-xs opacity-60 font-medium">Currently handling these academic sections.</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Total Students</h3>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{professorStudents.length}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Officially enrolled in your section.</p>
                  <Button 
                    className="w-full mt-6 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    variant="ghost" 
                    onClick={() => navigate('/records')}
                  >
                    View Class List
                  </Button>
                </Card>
              </div>

              {/* Class Schedule Overview */}
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="text-left">
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>Your classes for {new Date().toLocaleDateString('en-US', { weekday: 'long' })}</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/scheduling')}>Full Schedule</Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {professorSchedules.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length > 0 ? (
                       professorSchedules
                        .filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }))
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((schedule, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                                 <BookOpen className="h-5 w-5" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-slate-900">{schedule.subject}</p>
                                 <p className="text-xs text-slate-500">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Room</p>
                               <p className="text-xs font-bold text-emerald-700">{schedule.room}</p>
                             </div>
                          </div>
                        ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                        <Clock className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-sm font-bold">No classes scheduled for today.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
           </div>

           {/* Class List Table */}
           <Card className="border-none shadow-sm text-left">
              <CardHeader className="border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Class List</CardTitle>
                    <CardDescription>Students enrolled in your assigned sections</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-emerald-600 font-bold" onClick={() => navigate('/records')}>
                    Manage Students
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Number</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Year Level</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {professorStudents.map((student, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                {student.studentInfo.firstName[0]}{student.studentInfo.lastName[0]}
                              </div>
                              <span className="text-sm font-bold text-slate-900">{student.studentInfo.firstName} {student.studentInfo.lastName}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600 font-mono italic">{student.studentId || student.studentInfo.studentId}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.yearLevel}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.studentInfo.contactNumber}</td>
                      </tr>
                    ))}
                    {professorStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          No students enrolled in this section yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Enrollment Status Stepper Card */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-[#052e16] text-left">Confirmation</h3>
              </div>
              <CardContent className="p-10">
                <div className="relative">
                  {/* Stepper Line */}
                  <div className="absolute top-2 left-[10%] right-[10%] h-[2px] bg-slate-100 z-0" />
                  
                  {/* Progress Line */}
                  <div 
                    className="absolute top-2 left-[10%] h-[2px] bg-[#052e16] z-0 transition-all duration-1000" 
                    style={{ 
                      width: studentStatus === 'Enrolled' ? '80%' : 
                             studentStatus === 'Approved' ? '40%' : '0%' 
                    }}
                  />

                  <div className="relative z-10 flex justify-between items-start">
                    {/* Step 1: Submitted */}
                    <div className="flex flex-col items-center w-1/3">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 mb-4 transition-colors duration-500",
                        enrollmentRecord ? "bg-[#052e16] border-[#052e16]" : "bg-white border-slate-200"
                      )} />
                      <span className={cn(
                        "text-sm font-bold mb-4",
                        enrollmentRecord ? "text-[#052e16]" : "text-slate-300"
                      )}>Submitted</span>
                      <Edit3 className={cn("h-6 w-6 mb-4", enrollmentRecord ? "text-[#052e16]" : "text-slate-200")} />
                      {enrollmentRecord && (() => {
                        let submissionTime = new Date(enrollmentRecord.submittedAt || enrollmentRecord.enrolledAt);
                        const enrolledTime = enrollmentRecord.status === 'Enrolled' && enrollmentRecord.updatedAt ? new Date(enrollmentRecord.updatedAt) : null;
                        
                        // If they are flipped (common in some migration states), swap them for display consistency
                        if (enrolledTime && submissionTime > enrolledTime) {
                          submissionTime = enrolledTime;
                        }

                        return (
                          <div className="text-center">
                            <p className="text-xs font-bold text-[#052e16]">{submissionTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-[10px] font-bold text-[#052e16]/60 mt-1 uppercase">{submissionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Step 2: Assessment */}
                    <div className="flex flex-col items-center w-1/3">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 mb-4 transition-colors duration-500",
                        (studentStatus === 'Approved' || studentStatus === 'Enrolled') ? "bg-[#052e16] border-[#052e16]" : 
                        studentStatus === 'Validating' ? "bg-white border-[#052e16] animate-pulse" : "bg-white border-slate-200"
                      )} />
                      <span className={cn(
                        "text-sm font-bold mb-4",
                        (studentStatus === 'Approved' || studentStatus === 'Enrolled' || studentStatus === 'Validating') ? "text-[#052e16]" : "text-slate-300"
                      )}>Assessment</span>
                      <Clock className={cn("h-6 w-6 mb-4", (studentStatus === 'Approved' || studentStatus === 'Enrolled' || studentStatus === 'Validating') ? "text-[#052e16]" : "text-slate-200")} />
                      {enrollmentRecord?.examDate && enrollmentRecord.yearLevel === '1st Year' && studentStatus === 'Validating' ? (
                        <div className={cn(
                          "text-center p-4 pt-8 rounded-2xl border mt-2 shadow-sm relative overflow-hidden group min-w-[240px]",
                          isExamDone ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                        )}>
                          <div className="absolute top-0 right-0 p-1">
                            <span className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm",
                              isExamDone ? "bg-emerald-200 text-emerald-700" : "bg-amber-200 text-amber-700"
                            )}>
                              {isExamDone ? 'Schedule Done' : 'Active Schedule'}
                            </span>
                          </div>
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2",
                            isExamDone ? "text-emerald-600" : "text-amber-600"
                          )}>
                            <Calendar className={cn("h-3 w-3", isExamDone ? "text-emerald-600" : "text-amber-600")} />
                            {isExamDone ? 'Exam Date was Done' : 'Entrance Exam Schedule'}
                          </p>
                          <p className={cn(
                            "text-lg font-black",
                            isExamDone ? "text-emerald-900" : "text-amber-900"
                          )}>
                            {new Date(enrollmentRecord.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          {!isExamDone && (
                            <>
                              <p className="text-xs font-bold text-amber-800/80 mt-1">
                                {formatTime(enrollmentRecord.examStartTime)} - {formatTime(enrollmentRecord.examEndTime)}
                              </p>
                              <p className="text-[10px] font-bold text-amber-700 mt-2 bg-white/50 py-1 rounded-lg border border-amber-100 flex items-center justify-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                Venue: {enrollmentRecord.examVenue || 'To be announced'}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (studentStatus === 'Validating' && enrollmentRecord?.yearLevel === '1st Year') ? (() => {
                        const noExamDate = !enrollmentRecord?.examDate;
                        
                        // For 1st years with no exam date yet and still validating, show "Not Set"
                        if (noExamDate) {
                          return (
                            <div className="text-center py-6 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200 mt-2">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-2">
                                  <Clock className="h-6 w-6" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Exam Date Not Set</span>
                                <p className="text-[10px] text-amber-600/70 font-medium px-6">Your entrance exam schedule will appear here once processed by the registrar.</p>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })() : null}
                    </div>

                    {/* Step 3: Enrolled */}
                    <div className="flex flex-col items-center w-1/3">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 mb-4 transition-colors duration-500",
                        studentStatus === 'Enrolled' ? "bg-[#052e16] border-[#052e16]" : "bg-white border-slate-200"
                      )} />
                      <span className={cn(
                        "text-sm font-bold mb-4",
                        studentStatus === 'Enrolled' ? "text-[#052e16]" : "text-slate-300"
                      )}>Enrolled</span>
                      <CheckSquare className={cn("h-6 w-6 mb-4", studentStatus === 'Enrolled' ? "text-[#052e16]" : "text-slate-200")} />
                      {studentStatus === 'Enrolled' && enrollmentRecord && (() => {
                        const submissionTime = new Date(enrollmentRecord.submittedAt || enrollmentRecord.enrolledAt);
                        const enrolledAtTime = new Date(enrollmentRecord.enrolledAt);
                        const updatedAtTime = enrollmentRecord.updatedAt ? new Date(enrollmentRecord.updatedAt) : enrolledAtTime;
                        
                        // Use the maximum of all relevant timestamps for the final enrollment display
                        const enrolledTime = new Date(Math.max(
                          submissionTime.getTime(),
                          enrolledAtTime.getTime(),
                          updatedAtTime.getTime()
                        ));

                        return (
                          <div className="text-center">
                            <p className="text-xs font-bold text-[#052e16]">{enrolledTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-[10px] font-bold text-[#052e16]/60 mt-1 uppercase">{enrolledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row gap-4">
                  <Button 
                    className={cn(
                      "flex-1 py-6 gap-2 text-base font-bold shadow-lg transition-all",
                      studentStatus === 'Enrolled' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#052e16] hover:bg-[#064e3b]"
                    )}
                    onClick={() => navigate('/enroll')}
                    disabled={enrollmentStatus !== 'Active' && studentStatus !== 'Enrolled'}
                  >
                    {studentStatus === 'Enrolled' ? (
                      <>
                        <Download className="h-5 w-5" />
                        Print COE / Reg Form
                      </>
                    ) : (
                      enrollmentStatus === 'Upcoming' ? 'Enrollment Not Yet Open' :
                      enrollmentStatus === 'Ended' ? 'Enrollment Closed' :
                      'View / Update Enrollment'
                    )}
                  </Button>
                  <Button variant="outline" className="flex-1 py-6 font-bold" onClick={() => navigate('/steps')}>
                    Enrollment Guide
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card glass className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center",
                    (studentStatus === 'Enrolled' || studentStatus === 'Approved') ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900">Student Info</h3>
                    <p className="text-xs text-slate-500">{settings?.academicYear || 'A.Y. 2026-2027'} - Sem: {settings?.semester || '1'}</p>
                  </div>
                </div>
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-bold text-slate-900">Selected Program:</span>
                    <span className="text-sm font-black text-slate-900">{enrollmentRecord?.course}</span>
                  </div>
                  
                  {enrollmentRecord?.studentInfo.yearLevel === '1st Year' && enrollmentRecord?.secondChoice && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm font-bold text-slate-900">Second Choice:</span>
                      <span className="text-sm font-black text-slate-900">{enrollmentRecord.secondChoice}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-600">Current Status:</span>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                      studentStatus === 'Enrolled' ? "bg-emerald-100 text-emerald-700" : 
                      studentStatus === 'Approved' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {studentStatus}
                    </span>
                  </div>
                  
                  {(studentStatus === 'Enrolled' || studentStatus === 'Approved') ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                       <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Assigned Section:</span>
                        <span className="text-emerald-700 font-bold">{enrollmentRecord?.section || enrollmentRecord?.studentInfo.section || 'Not Assigned'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Student ID:</span>
                        <span className="text-emerald-700 font-bold">{enrollmentRecord?.studentId || enrollmentRecord?.studentInfo.studentId || 'Not Assigned'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center">
                      Note: Your student ID and section will be visible once the registrar approves your enrollment.
                    </p>
                  )}
                </div>
              </Card>

              <Card glass className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Remaining Time</h3>
                    <p className="text-xs text-slate-500">{enrollmentStatus === 'Active' ? 'Time left to enroll' : 'Period ended'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {settings ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Ends At</p>
                      <p className="text-sm font-black text-slate-900">{new Date(settings.enrollmentEndDate).toLocaleDateString()} {new Date(settings.enrollmentEndDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 text-slate-300">
                      <Clock className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => navigate('/steps')}>
                    Enrollment Guide
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Important links and student resources</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Student Handbook', icon: BookOpen, desc: 'Rules and regulations' },
                  { label: 'Campus Map', icon: Users, desc: 'Find your classrooms' },
                  { label: 'Tuition Fees', icon: TrendingUp, desc: 'Billing information' },
                  { label: 'Support Center', icon: Bell, desc: 'Help and assistance' },
                ].map((info) => (
                  <div key={info.label} className="p-4 rounded-2xl border border-slate-100 hover:border-green-200 hover:bg-green-50/30 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <info.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{info.label}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{info.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <CardHeader>
                <CardTitle className="text-green-900">Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/60 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold text-green-800">Enrollment Period</span>
                  </div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {settings ? (
                      `The ${settings.academicYear} enrollment is ${enrollmentStatus.toLowerCase()}. It ends on ${new Date(settings.enrollmentEndDate).toLocaleDateString()}.`
                    ) : (
                      "Enrollment for the first semester is open from May 1 to June 15, 2026. Please ensure your documents are complete."
                    )}
                  </p>
                </div>
                <Button variant="ghost" className="w-full text-green-700 hover:bg-green-100">View More</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
               <div className="p-6 bg-[#064e3b] text-white">
                <h3 className="font-bold mb-1">Need help?</h3>
                <p className="text-xs opacity-80">Check the enrollment steps to guide you through the process.</p>
              </div>
              <CardContent className="p-6">
                <Button className="w-full" variant="outline" onClick={() => navigate('/steps')}>
                  View Enrollment Steps
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
