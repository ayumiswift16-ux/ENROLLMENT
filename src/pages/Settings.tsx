import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  User as UserIcon, 
  School, 
  Bell, 
  Moon, 
  LogOut, 
  Shield, 
  Smartphone,
  Globe,
  Camera,
  Mail,
  GraduationCap,
  Calendar,
  Clock,
  Info,
  Check,
  Save,
  Users,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import toast from 'react-hot-toast';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { SystemSettings, User as UserType, Section } from '@/src/types';
import { cn } from '@/src/utils/cn';
import { MOCK_ENROLLMENTS } from '@/src/mockData';

interface SettingsProps {
  user: UserType;
}

  type TabType = 'General' | 'Enrollment Schedule' | 'Account Security' | 'Notifications' | 'System Maintenance';

export default function Settings({ user }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Database Reset State
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [enrollmentSettings, setEnrollmentSettings] = useState<SystemSettings>({
    academicYear: '2025-2026',
    semester: '1',
    enrollmentStartDate: '',
    enrollmentEndDate: ''
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'enrollment');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEnrollmentSettings(docSnap.data() as SystemSettings);
        }

        if (user.role === 'admin') {
          // Fetch Sections for assignment
          const sectionsSnap = await getDocs(collection(db, 'sections'));
          setSections(sectionsSnap.docs.map(doc => doc.data() as Section));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [user.role]);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'enrollment'), enrollmentSettings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: profileData.name
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExecuteDatabaseReset = async () => {
    if (confirmResetText.trim().toUpperCase() !== 'RESET') {
      toast.error('Please type RESET in capital letters to confirm.');
      return;
    }
    setIsResettingDb(true);
    const toastId = toast.loading('Resetting database to fresh state...');
    try {
      // 1. Delete users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        await deleteDoc(doc(db, 'users', d.id));
      }
      // 2. Delete teacher requests
      const trSnap = await getDocs(collection(db, 'teacher_requests'));
      for (const d of trSnap.docs) {
        await deleteDoc(doc(db, 'teacher_requests', d.id));
      }
      // 3. Delete enrollments
      const enrollSnap = await getDocs(collection(db, 'enrollments'));
      for (const d of enrollSnap.docs) {
        await deleteDoc(doc(db, 'enrollments', d.id));
      }
      // 4. Delete notifications
      const notifSnap = await getDocs(collection(db, 'notifications'));
      for (const d of notifSnap.docs) {
        await deleteDoc(doc(db, 'notifications', d.id));
      }
      // 5. Seed default administrator in admins
      await setDoc(doc(db, 'admins', 'davevenzon789@gmail.com'), {
        email: 'davevenzon789@gmail.com',
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      // 6. Seed mock enrollments
      for (const mock of MOCK_ENROLLMENTS) {
        await setDoc(doc(db, 'enrollments', mock.id), {
          ...mock,
          updatedAt: new Date().toISOString()
        });
      }
      // 7. Seed system settings
      await setDoc(doc(db, 'settings', 'enrollment'), {
        academicYear: '2025-2026',
        semester: '1',
        enrollmentStartDate: '2026-05-01',
        enrollmentEndDate: '2026-10-31'
      });
      // 8. Clear client local caches
      localStorage.removeItem('cdm_registered_students');

      toast.success('Database has been completely reset! Ready for fresh start.', { id: toastId, duration: 6000 });
      setShowResetConfirm(false);
      setConfirmResetText('');
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error(`Reset error: ${err.message}`, { id: toastId });
    } finally {
      setIsResettingDb(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">System Settings</h2>
          <p className="text-slate-500 mt-2 font-medium">Manage portal configuration and administrative preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card glass className="border-none shadow-sm overflow-hidden rounded-[2rem]">
            <CardContent className="p-0">
              <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
                <div className="relative inline-block mb-6">
                  <div className={cn(
                    "h-28 w-28 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl relative overflow-hidden group transition-transform hover:scale-105",
                    user.profilePicture ? "bg-white" : "bg-blue-600 shadow-blue-600/20 text-white"
                  )}>
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.name?.[0]
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
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
                  />
                </div>
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">{user.name}</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
                  {user.role === 'admin' ? 'Registrar' : 'Student'}
                </p>
              </div>
              <div className="p-4 space-y-1">
                {[
                  { label: 'General', icon: Smartphone },
                  { label: 'Enrollment Schedule', icon: Calendar },
                  { label: 'Account Security', icon: Shield },
                  { label: 'Notifications', icon: Bell },
                  ...(user.role === 'admin' ? [{ label: 'System Maintenance', icon: RotateCcw }] : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.label as TabType)}
                    className={cn(
                      "flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                      activeTab === item.label ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", activeTab === item.label ? "text-white" : "text-slate-400")} />
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card glass className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest">Portal Access</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
                You are currently signed in with administrator privileges. Ensure all sensitive configurations are verified.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-slate-700 hover:bg-white/10 text-white rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest"
              >
                Sign Out Everywhere
              </Button>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {activeTab === 'General' && (
            <>
              {/* Profile Information */}
              <Card glass className="border-none shadow-sm rounded-[2rem]">
                <CardHeader className="border-b border-slate-50 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                  </div>
                  <CardDescription>Update your personal details and how others see you.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 text-left">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                        <Input 
                          placeholder="Full Name" 
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          className="rounded-2xl bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            value={profileData.email}
                            disabled
                            className="rounded-2xl bg-slate-50 border-slate-100 pl-11 text-slate-400 italic"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 px-1 mt-1 font-medium">To change your email, please contact IT support.</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSavingProfile || profileData.name === user.name}
                        className="bg-blue-600 hover:bg-blue-700 px-8 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest flex gap-2"
                      >
                        {isSavingProfile ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Profile Updates
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card glass className="border-none shadow-sm rounded-[2rem]">
                <CardHeader className="border-b border-slate-50 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <School className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">School Information</CardTitle>
                  </div>
                  <CardDescription>Update identity details for the institution.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Institution Name</label>
                    <Input className="rounded-2xl border-slate-200" defaultValue="Colegio de Montalban" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Official Address</label>
                    <Input className="rounded-2xl border-slate-200" defaultValue="Kasiglahan Village, San Jose, Rodriguez, Rizal" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Office Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="rounded-2xl border-slate-200 pl-11" defaultValue="info@cdm.edu.ph" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Website URL</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="rounded-2xl border-slate-200 pl-11" defaultValue="www.cdm.edu.ph" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'Enrollment Schedule' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Enrollment Period</CardTitle>
                </div>
                <CardDescription>Configure when students can access the enrollment portal.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Academic Year</label>
                    <Input 
                      value={enrollmentSettings.academicYear} 
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, academicYear: e.target.value})}
                      className="rounded-2xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Semester</label>
                    <Input 
                      value={enrollmentSettings.semester} 
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, semester: e.target.value})}
                      className="rounded-2xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Enrollment Start Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="datetime-local" 
                        className="w-full pl-11 pr-4 h-12 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-bold"
                        value={enrollmentSettings.enrollmentStartDate}
                        onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentStartDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Enrollment End Date & Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="datetime-local" 
                        className="w-full pl-11 pr-4 h-12 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-bold"
                        value={enrollmentSettings.enrollmentEndDate}
                        onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentEndDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                  <Info className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Important</p>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">The enrollment button will be visible to students only during this specified period. Ensure the local system time matches the server time.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveSettings} 
                    className="bg-[#064e3b] hover:bg-[#053d2e] px-10 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest flex gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Account Security' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    < Shield className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Security & MFA</CardTitle>
                </div>
                <CardDescription>Manage your account security and authentication methods.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Shield className="h-10 w-10 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-2">Advanced Security Settings</p>
                <p className="text-xs text-slate-500 max-w-sm font-medium">Security settings are managed by the institution. Contact the IT department to enable Multi-Factor Authentication.</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Notifications' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Bell className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                </div>
                <CardDescription>Control which updates you receive through the portal.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  { title: 'New Admissions', desc: 'Notify when a new enrollment application is submitted.', checked: true },
                  { title: 'System Updates', desc: 'Receive updates about portal maintenance and new features.', checked: true },
                  { title: 'Student Reports', desc: 'Get alerts when students report technical issues.', checked: true },
                  { title: 'Email Digests', desc: 'Weekly summary of institution activities.', checked: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                      item.checked ? "bg-blue-600" : "bg-slate-200"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        item.checked ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'System Maintenance' && user.role === 'admin' && (
            <div className="space-y-6">
              <Card glass className="border-none shadow-sm rounded-[2rem]">
                <CardHeader className="border-b border-slate-50 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">System Maintenance & Database Reset</CardTitle>
                  </div>
                  <CardDescription>
                    Manage institution-wide data persistence, test account purging, and fresh-start database resets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                          Fresh Start & Database Wipe
                        </p>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          Resetting the database permanently purges all registered student and faculty user profiles, teacher approval requests, student enrollment records, and notifications.
                        </p>
                        <ul className="text-xs text-amber-800/90 list-disc list-inside space-y-1 pt-2 font-medium">
                          <li>Clears all user profiles so you and other students can register again cleanly.</li>
                          <li>Clears all pending & submitted teacher requests and test admissions.</li>
                          <li>Re-seeds standard mock enrollments and default academic settings.</li>
                          <li>Official academic course catalog and section lists remain intact.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border border-red-100 bg-red-50/40 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-red-900">Factory Reset Database</h4>
                        <p className="text-xs text-red-700/80 mt-1">
                          Wipe all test records and start fresh with default data.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset Database
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confirmation Modal */}
              {showResetConfirm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="h-12 w-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Are you sure you want to reset?</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-5">
                      This will delete all student and teacher accounts, enrollment applications, and notifications so you can start from a completely fresh slate.
                    </p>
                    <div className="mb-5">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Type <span className="text-red-600 font-mono font-black">RESET</span> to confirm:
                      </label>
                      <Input
                        value={confirmResetText}
                        onChange={(e) => setConfirmResetText(e.target.value)}
                        placeholder="RESET"
                        className="h-11 rounded-xl text-center font-bold tracking-widest uppercase text-sm border-slate-300"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowResetConfirm(false);
                          setConfirmResetText('');
                        }}
                        className="flex-1 rounded-xl h-11 text-xs font-bold uppercase tracking-wider"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={confirmResetText.trim().toUpperCase() !== 'RESET' || isResettingDb}
                        onClick={handleExecuteDatabaseReset}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isResettingDb ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          'Confirm Reset'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
