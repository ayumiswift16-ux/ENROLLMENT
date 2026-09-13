import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  IdCard, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Info,
  Download
} from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { SearchableSelect } from '@/src/components/ui/SearchableSelect';
import { ENROLLMENT_TYPES, COURSES, YEAR_LEVELS, PHILIPPINES_ADDRESS_DATA } from '@/src/constants';
import { StudentInfo, EnrollmentType, Course, YearLevel, User as UserType, EnrollmentRecord, SystemSettings } from '@/src/types';
import { cn } from '@/src/utils/cn';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';

import { compressImage } from '@/src/lib/imageUtils';

const STEPS = [
  { id: 1, title: 'Student info', description: 'Personal details' },
  { id: 2, title: 'Enrollment', description: 'Select type' },
  { id: 3, title: 'Course', description: 'Academic path' },
];

const INITIAL_STUDENT_INFO: StudentInfo = {
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: 'Male',
  address: '',
  addressDetails: {
    province: '',
    city: '',
    barangay: '',
    street: ''
  },
  contactNumber: '',
  email: '',
  birthday: '',
  studentId: '',
  yearLevel: '1st Year',
  documents: {
    summaryOfGrades: '',
    goodMoral: '',
    twoByTwoPhoto: '',
    birthCertificate: '',
  }
};

interface EnrollProps {
  user: UserType;
}

export default function Enroll({ user: propUser }: EnrollProps) {
  const [user, setUser] = useState<UserType | null>(propUser);
  const [currentStep, setCurrentStep] = useState(1);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>(INITIAL_STUDENT_INFO);
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>('Regular');
  const [selectedCourse, setSelectedCourse] = useState<Course>('BSIT');
  const [secondChoice, setSecondChoice] = useState<Course | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'Not Started' | 'Validating' | 'Enrolled'>('Not Started');
  const [enrollmentRecord, setEnrollmentRecord] = useState<EnrollmentRecord | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    if (user) {
      // Auto-populate email from auth - only if not admin (admin might be enrolling someone else)
      if (user.email && !studentInfo.email && user.role !== 'admin') {
        setStudentInfo(prev => ({ ...prev, email: user.email }));
      }
      
      const fetchData = async () => {
        try {
          // Fetch Settings
          try {
            const settingsSnap = await getDoc(doc(db, 'settings', 'enrollment'));
            if (settingsSnap.exists()) {
              setSettings(settingsSnap.data() as SystemSettings);
            }
          } catch (settingsErr) {
            console.warn("Settings fetch warning:", settingsErr);
          }

          if (user.role === 'student') {
            let foundData: EnrollmentRecord | null = null;

            // 1. Try fetching by UID as document ID first
            if (user.uid) {
              try {
                const docRef = doc(db, 'enrollments', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  foundData = { ...(docSnap.data() as EnrollmentRecord), id: docSnap.id };
                }
              } catch (uidErr) {
                console.warn("UID enrollment lookup:", uidErr);
              }
            }

            // 2. Try fallback to username if UID not found
            if (!foundData && user.username && user.username !== user.uid) {
              try {
                const userDocRef = doc(db, 'enrollments', user.username);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                  foundData = { ...(docSnap.data() as EnrollmentRecord), id: docSnap.id };
                }
              } catch (usernameErr) {
                // Ignore if not permitted or not found
              }
            }

            // 3. Fallback: search by userId field matching user.uid
            if (!foundData && user.uid) {
              try {
                const q = query(collection(db, 'enrollments'), where('userId', '==', user.uid), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  const snap = querySnapshot.docs[0];
                  foundData = { ...(snap.data() as EnrollmentRecord), id: snap.id };
                }
              } catch (queryErr) {
                console.warn("userId query warning:", queryErr);
              }
            }

            // 4. Fallback: search by email matching user.email
            if (!foundData && user.email) {
              try {
                const qEmail = query(collection(db, 'enrollments'), where('studentInfo.email', '==', user.email), limit(1));
                const querySnapshot = await getDocs(qEmail);
                if (!querySnapshot.empty) {
                  const snap = querySnapshot.docs[0];
                  foundData = { ...(snap.data() as EnrollmentRecord), id: snap.id };
                }
              } catch (emailQueryErr) {
                console.warn("email query warning:", emailQueryErr);
              }
            }

            if (foundData) {
              setEnrollmentRecord(foundData);
              setEnrollmentStatus(foundData.status as any);
              setStudentInfo(foundData.studentInfo);
              setEnrollmentType(foundData.type);
              setSelectedCourse(foundData.course);
            }
          }
        } catch (error) {
          console.warn("Enrollment fetch warning:", error);
        }
      };
      
      fetchData();
    }
  }, [user]);

  // Auto-calculate age from birthday
  useEffect(() => {
    if (studentInfo.birthday) {
      const birthDate = new Date(studentInfo.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age > 0) {
        setStudentInfo(prev => ({ ...prev, age: age.toString() }));
      }
    }
  }, [studentInfo.birthday]);

  const enrollmentPeriodStatus = React.useMemo(() => {
    if (!settings?.enrollmentStartDate || !settings?.enrollmentEndDate) return 'Not Set';
    const now = new Date();
    const start = new Date(settings.enrollmentStartDate);
    const end = new Date(settings.enrollmentEndDate);

    if (now < start) return 'Upcoming';
    if (now > end) return 'Ended';
    return 'Active';
  }, [settings]);

  const isAdmin = user?.role === 'admin';
  const isReadOnly = enrollmentStatus === 'Enrolled' && !isAdmin;

  const isAccessBlocked = !isAdmin && enrollmentPeriodStatus !== 'Active' && enrollmentStatus !== 'Enrolled';

  if (isAccessBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-20 w-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
          <Calendar className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Enrollment is {enrollmentPeriodStatus}</h2>
        <p className="text-slate-500 max-w-md mb-8">
          {enrollmentPeriodStatus === 'Upcoming' 
            ? `Enrollment will open on ${new Date(settings?.enrollmentStartDate || '').toLocaleString()}. Please come back then.`
            : 'Enrollment for the current period has already ended. Please contact the registrar for more information.'
          }
        </p>
        <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'summaryOfGrades' | 'goodMoral' | 'twoByTwoPhoto' | 'birthCertificate') => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic check to prevent massive files from crashing the browser
      if (file.size > 1024 * 1024 * 10) { // 10MB limit for raw upload
        toast.error("File is too large. Please keep it under 10MB.");
        return;
      }

      const toastId = toast.loading(`Optimizing ${field.replace(/([A-Z])/g, ' $1').trim()}...`);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalBase64 = reader.result as string;
          // Compress image to maintain Firestore limits (Targeting ~100-150KB per doc)
          const compressed = await compressImage(originalBase64, 600, 600, 0.4);
          
          setStudentInfo(prev => ({
            ...prev,
            documents: {
              ...prev.documents,
              [field]: compressed
            }
          }));
          
          toast.dismiss(toastId);
          toast.success(`${field.replace(/([A-Z])/g, ' $1').trim()} uploaded and optimized!`);
        } catch (error) {
          toast.dismiss(toastId);
          console.error("Compression error:", error);
          toast.error("Failed to process image. Please try another one.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isStepValid = (step: number) => {
    if (step === 1) {
      const si = studentInfo;
      const hasBasicInfo = !!(si.firstName && si.lastName && si.gender && si.birthday && si.contactNumber && si.email);
      const hasAddress = !!(si.addressDetails?.province && si.addressDetails?.city && si.addressDetails?.barangay && si.addressDetails?.street);
      const hasDocuments = si.yearLevel === '1st Year' 
        ? !!(si.documents?.summaryOfGrades && si.documents?.goodMoral && si.documents?.twoByTwoPhoto && si.documents?.birthCertificate)
        : true;
      
      return hasBasicInfo && hasAddress && hasDocuments;
    }
    if (step === 2) return !!enrollmentType;
    if (step === 3) {
      if (studentInfo.yearLevel === '1st Year') {
        return !!selectedCourse && !!secondChoice && (selectedCourse as any) !== '' && secondChoice !== ('' as any);
      }
      return !!selectedCourse && (selectedCourse as any) !== '';
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Current timestamp
    const now = new Date().toISOString();
    
    // Construct the enrollment record
    const recordUpdates: Partial<EnrollmentRecord> = {
      userId: user?.uid,
      studentInfo: {
        ...studentInfo,
        studentId: studentInfo.studentId || '' 
      },
      type: enrollmentType,
      course: selectedCourse,
      secondChoice: secondChoice || "",
      yearLevel: studentInfo.yearLevel,
      status: 'Validating',
      updatedAt: now
    };

    // Only set submittedAt/enrolledAt if it's a new enrollment
    if (enrollmentStatus === 'Not Started') {
      recordUpdates.submittedAt = now;
      recordUpdates.enrolledAt = now;
    }

    try {
      // Save to Firestore with merge to preserve fields like examDate
      // For admins enrolling others, use a random ID. For students, prefer their existing ID or UID.
      const docId = enrollmentRecord?.id || ((isAdmin && !enrollmentRecord) ? `manual_${Date.now()}` : (user?.uid || user?.username || ''));
      const docRef = doc(db, 'enrollments', docId);
      
      // If admin is enrolling, userId should be empty (will be auto-linked by email later)
      if (isAdmin && !enrollmentRecord) {
        recordUpdates.userId = "";
      } else if (!recordUpdates.userId) {
        recordUpdates.userId = user?.uid || user?.username;
      }

      await setDoc(docRef, recordUpdates, { merge: true });

      setIsSubmitting(false);
      setIsSuccess(true);
      setEnrollmentStatus('Validating');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#064e3b', '#10b981', '#ffffff']
      });
      toast.success(enrollmentStatus === 'Validating' ? 'Information updated successfully!' : 'Enrollment submitted successfully!');
    } catch (error) {
      setIsSubmitting(false);
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${user?.uid}`);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setStudentInfo(INITIAL_STUDENT_INFO);
    setIsSuccess(false);
    navigate(isAdmin ? '/records' : '/dashboard');
  };

  if (enrollmentStatus === 'Enrolled' && enrollmentRecord?.registrationForm) {
    const rf = enrollmentRecord.registrationForm;
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 print:max-w-none print:m-0 print:p-0 print:space-y-2">
        <div className="flex items-center justify-between no-print">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Official Registration Form</h2>
            <p className="text-slate-500">Your enrollment has been finalized. Download or print your official form below.</p>
          </div>
          <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2 border-slate-200">
            <Download className="h-4 w-4" />
            Print Document
          </Button>
        </div>

        <Card className="bg-white border-none shadow-2xl relative overflow-visible print:shadow-none print:p-0 p-1 md:p-4 print:border-none print:overflow-visible">
          <div className="border-[3px] border-[#064e3b] p-6 md:p-8 space-y-6 print:m-0 print:border-2 print:p-4 print:space-y-3">
            {/* Form Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-4 border-b-2 border-[#064e3b] pb-6 print:flex-row print:text-left print:gap-4 print:items-center print:pb-3 print:mb-2">
              <img src={`${import.meta.env.BASE_URL}cdm-logo.png`} alt="Logo" className="h-24 w-24 object-contain" />
              <div className="flex-1 text-center md:text-left print:text-left">
                <h1 className="text-2xl font-black text-[#064e3b] tracking-tight leading-none">COLEGIO DE MONTALBAN</h1>
                <p className="text-sm font-bold text-slate-700 mt-1 italic">Kasiglahan Village, San Jose, Rodriguez, Rizal</p>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mt-1">OFFICE OF THE REGISTRAR</h2>
                <p className="text-[10px] text-slate-500 font-bold mt-1">(02) 8395-9731 | registrar@pnm.edu.ph | www.pnm.edu.ph</p>
              </div>
              <div className="text-center md:text-right flex flex-col items-center md:items-end print:text-right print:items-end print:flex-1">
                <h3 className="text-2xl font-black text-slate-800 leading-tight">Official<br/>Registration<br/>& COE</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Certificate of Enrollment</p>
              </div>
            </div>

            {/* Academic Year Box */}
            <div className="border-2 border-[#064e3b] p-3 text-left print:p-1.5">
              <p className="text-[11px] font-black text-slate-900 print:text-[10px]">
                Academic Year/Term: <span className="font-bold">{rf.academicYear}</span> / Semester: <span className="font-bold">{rf.semester}</span>
              </p>
            </div>

            {/* Student Info Table */}
            <div className="border-2 border-[#064e3b] overflow-hidden print:border">
              <div className="grid grid-cols-12 border-b-2 border-[#064e3b] print:border-b">
                <div className="col-span-3 border-r-2 border-[#064e3b] bg-slate-50/50 p-2 print:p-1 print:border-r">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Student ID</p>
                  <p className="text-xs font-bold text-slate-900 print:text-[10px]">{enrollmentRecord.studentId || enrollmentRecord.studentInfo.studentId}</p>
                </div>
                <div className="col-span-3 border-r-2 border-[#064e3b] bg-slate-50/50 p-2 print:p-1 print:border-r">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Program</p>
                  <p className="text-xs font-bold text-slate-900 print:text-[10px]">{rf.program}</p>
                </div>
                <div className="col-span-3 border-r-2 border-[#064e3b] bg-slate-50/50 p-2 print:p-1 print:border-r">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Student Type</p>
                  <p className="text-xs font-bold text-slate-900 print:text-[10px]">{enrollmentRecord.type}</p>
                </div>
                <div className="col-span-3 bg-slate-50/50 p-2 print:p-1">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Year Level</p>
                  <p className="text-xs font-bold text-slate-900 print:text-[10px]">{enrollmentRecord.yearLevel}</p>
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-6 border-r-2 border-[#064e3b] bg-slate-50/50 p-2 print:p-1 print:border-r">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Name</p>
                  <p className="text-xs font-bold text-slate-900 uppercase print:text-[10px]">{studentInfo.lastName}, {studentInfo.firstName} {studentInfo.middleName}</p>
                </div>
                <div className="col-span-6 bg-slate-50/50 p-2 print:p-1">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider print:text-[8px]">Institute</p>
                  <p className="text-xs font-bold text-slate-900 uppercase print:text-[10px]">{rf.institute}</p>
                </div>
              </div>
            </div>

            {/* Courses Table */}
            <div className="border-2 border-[#064e3b] overflow-hidden print:border">
              <div className="bg-slate-50 p-2 border-b-2 border-[#064e3b] text-center print:bg-white print:p-1 print:border-b">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#064e3b] print:text-[9px]">Courses Enrolled</p>
              </div>
              <table className="w-full text-right text-[10px] print:text-[8px]">
                <thead className="border-b-2 border-[#064e3b] print:border-b">
                  <tr className="font-black text-slate-700">
                    <th className="px-3 py-2 text-left border-r-2 border-[#064e3b] w-24 print:px-1.5 print:py-1 print:border-r print:w-auto">Code</th>
                    <th className="px-3 py-2 text-left border-r-2 border-[#064e3b] print:px-1.5 print:py-1 print:border-r">Description</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-16 text-center print:px-1 print:py-1 print:border-r print:w-12">Section</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-12 text-center print:px-1 print:py-1 print:border-r print:w-8">Lec</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-12 text-center print:px-1 print:py-1 print:border-r print:w-8">Lab</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-16 text-center print:px-1 print:py-1 print:border-r print:w-12">CompLab</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-12 text-center print:px-1 print:py-1 print:border-r print:w-8">Units</th>
                    <th className="px-2 py-2 border-r-2 border-[#064e3b] w-16 text-center print:px-1 print:py-1 print:border-r print:w-12">Rate</th>
                    <th className="px-3 py-2 w-24 print:px-1.5 print:py-1 print:w-auto">Course Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 print:divide-y">
                  {rf.courses.map((course, i) => (
                    <tr key={i} className="font-bold text-slate-700">
                      <td className="px-3 py-2 text-left border-r-2 border-[#064e3b] uppercase print:px-1.5 print:py-1 print:border-r">{course.code}</td>
                      <td className="px-3 py-2 text-left border-r-2 border-[#064e3b] truncate uppercase print:px-1.5 print:py-1 print:border-r">{course.description}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center uppercase print:px-1 print:py-1 print:border-r">{course.section}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center print:px-1 print:py-1 print:border-r">{course.lec}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center print:px-1 print:py-1 print:border-r">{course.lab}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center print:px-1 print:py-1 print:border-r">{course.compLab}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center print:px-1 print:py-1 print:border-r">{course.units}</td>
                      <td className="px-2 py-2 border-r-2 border-[#064e3b] text-center print:px-1 print:py-1 print:border-r">{course.rate}</td>
                      <td className="px-3 py-2 font-black print:px-1.5 print:py-1">₱{course.fee.toLocaleString()}.00</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[#064e3b] bg-slate-50 font-black text-slate-900 print:border-t print:bg-white print:text-[8px]">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-right uppercase tracking-[0.2em] border-r-2 border-[#064e3b] print:px-1.5 print:py-1 print:border-r">Total Units</td>
                    <td className="px-2 py-2 text-center border-r-2 border-[#064e3b] print:px-1 print:py-1 print:border-r">{rf.courses.reduce((acc, c) => acc + c.units, 0)}</td>
                    <td colSpan={2} className="px-3 py-2 print:px-1.5 print:py-1"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 items-start">
              {/* Assessed Fees (Page 1 Left) */}
              <div className="border-2 border-[#064e3b] overflow-hidden print:border-2">
                <div className="bg-slate-50 p-2 border-b-2 border-[#064e3b] print:bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-[#064e3b]">Assessed Fees</p>
                </div>
                <div className="divide-y-2 divide-slate-100 print:divide-y">
                  {[
                    { label: 'Tuition Fee', val: rf.assessedFees.tuition },
                    { label: 'Admission Fee', val: rf.assessedFees.admission },
                    { label: 'Athletic Fee', val: rf.assessedFees.athletic },
                    { label: 'Computer Fee', val: rf.assessedFees.computer },
                    { label: 'Cultural Fee', val: rf.assessedFees.cultural },
                    { label: 'Developmental Fee', val: rf.assessedFees.developmental },
                    { label: 'Guidance Fee', val: rf.assessedFees.guidance },
                    { label: 'Laboratory Fee', val: rf.assessedFees.laboratory },
                    { label: 'Library Fee', val: rf.assessedFees.library },
                    { label: 'Medical and Dental Fee', val: rf.assessedFees.medicalDental },
                    { label: 'NSTP Fee', val: rf.assessedFees.nstp },
                    { label: 'Registration Fee', val: rf.assessedFees.registration },
                    { label: 'School ID Fee', val: rf.assessedFees.schoolId },
                    { label: 'Student Handbook Fee', val: rf.assessedFees.handbook },
                  ].map((fee, i) => (
                    <div key={i} className="flex justify-between text-[10px] px-3 py-1.5 font-bold text-slate-700 print:p-1 print:text-[8px]">
                      <span className="uppercase">{fee.label}</span>
                      <span>₱ {fee.val.toLocaleString()}.00</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs px-3 py-2 font-black bg-[#064e3b] text-white print:p-1.5 print:text-[10px]">
                    <span className="uppercase tracking-widest">Total Amount</span>
                    <span>₱ {rf.assessedFees.total.toLocaleString()}.00</span>
                  </div>
                </div>
              </div>

              {/* Pledge and Signatures */}
              <div className="space-y-6 flex flex-col h-full print:space-y-4">
                <div className="border-2 border-[#064e3b] p-4 text-left print:border-2">
                  <h4 className="text-[11px] font-black uppercase text-[#064e3b] mb-2">Pledge of Admission</h4>
                  <p className="text-[9px] font-bold text-slate-700 leading-relaxed italic print:text-slate-700">
                    In consideration of my admission to Colegio de Montalban and the privileges granted to students, I hereby pledge to abide by and comply with all rules and regulations established by the competent authorities of Colegio de Montalban.
                  </p>
                </div>

                <div className="mt-auto space-y-12 print:mt-12 print:space-y-10">
                  <div className="text-center pt-8 border-t-2 border-slate-900 flex flex-col items-center print:pt-6 print:border-t-2">
                    <p className="text-xs font-black uppercase underline underline-offset-4 decoration-2">{studentInfo.lastName}, {studentInfo.firstName} {studentInfo.middleName}</p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1 print:text-slate-600">Student's Name and Signature</p>
                  </div>
                  <div className="text-center pt-8 border-t-2 border-slate-900 flex flex-col items-center print:pt-6 print:border-t-2">
                    <p className="text-xs font-black uppercase underline underline-offset-4 decoration-2">JOHN MICHAEL R. QUINQUE, LPT</p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1 print:text-slate-600">Head, Office of the Registrar</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details (Page 2 Box) */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 items-end pt-4">
              <div className="border-2 border-[#064e3b] overflow-hidden max-w-sm print:border-2">
                <div className="bg-slate-50 p-2 border-b-2 border-[#064e3b] print:bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-[#064e3b]">Payment Details</p>
                </div>
                <div className="divide-y-2 divide-slate-100 print:divide-y-2">
                  <div className="grid grid-cols-2 text-[10px] print:grid-cols-2">
                    <div className="p-2 font-black uppercase text-slate-500 border-r-2 border-slate-100 print:border-r-2 print:border-slate-300">Mode of Payment:</div>
                    <div className="p-2 font-black text-right uppercase text-[#064e3b]">{rf.paymentDetails.mode}</div>
                  </div>
                  <div className="grid grid-cols-2 text-[10px] print:grid-cols-2">
                    <div className="p-2 font-black uppercase text-slate-500 border-r-2 border-slate-100 print:border-r-2 print:border-slate-300">Amount Paid:</div>
                    <div className="p-2 font-black text-right uppercase text-[#064e3b]">{rf.paymentDetails.amount}</div>
                  </div>
                  <div className="grid grid-cols-2 text-[10px] print:grid-cols-2">
                    <div className="p-2 font-black uppercase text-slate-500 border-r-2 border-slate-100 print:border-r-2 print:border-slate-300">Date Paid:</div>
                    <div className="p-2 font-black text-right uppercase text-[#064e3b]">{rf.paymentDetails.date}</div>
                  </div>
                </div>
              </div>
              <div className="text-right print:text-right">
                 <p className="text-[8px] font-bold text-slate-400 uppercase">GENERATED ON: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Red Note */}
            <p className="mt-8 text-[9px] text-red-600 font-bold leading-relaxed text-center px-12 italic uppercase tracking-wider print:mt-4 print:px-6">
              NOTE: This document is not valid without the student's signature, registrar's signature, and official college seal.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="h-14 w-14" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold text-slate-900 mb-2"
        >
          {enrollmentStatus === 'Validating' ? 'Information Updated!' : 'Congratulations!'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-500 max-w-md mb-8"
        >
          {enrollmentStatus === 'Validating' 
            ? `Your information for ${studentInfo.firstName} ${studentInfo.lastName} has been updated.`
            : `Your enrollment application for ${studentInfo.firstName} ${studentInfo.lastName} has been successfully submitted to CdM.`
          }
          {isAdmin ? " The record has been modified in the system." : " Your status is 'Validating'. Please wait for the registrar's approval."}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Button 
            onClick={handleReset} 
            variant="primary" 
            size="lg" 
            className="px-10"
          >
            {isAdmin ? 'View Student Records' : 'Back to Dashboard'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3 w-3" />
            Qualification Phase
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">New Student Enrollment</h2>
          <p className="text-slate-500">Fill out the requirements to qualify for admission.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
          Step {currentStep} of 3
        </div>
      </div>

      {/* Stepper */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10" />
        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-3">
              <motion.div
                animate={{
                  backgroundColor: currentStep >= step.id ? '#059669' : '#f1f5f9',
                  color: currentStep >= step.id ? '#ffffff' : '#94a3b8',
                  scale: currentStep === step.id ? 1.1 : 1
                }}
                className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
              >
                {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : step.id}
              </motion.div>
              <div className="text-center hidden sm:block">
                <p className={cn("text-xs font-bold uppercase tracking-wider", currentStep >= step.id ? "text-emerald-600" : "text-slate-400")}>
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card glass className="border-none shadow-xl shadow-slate-200/30">
            {isReadOnly && (
              <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-900">Enrollment Finalized</p>
                  <p className="text-xs text-amber-700">Your enrollment has been approved. Information is now read-only. Contact the Registrar for any changes.</p>
                </div>
              </div>
            )}
            <CardContent className="p-10">
              {/* Step 1: Student Information */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <User className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input 
                      label="First Name" 
                      placeholder="e.g. Juan" 
                      value={studentInfo.firstName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, firstName: e.target.value })}
                      disabled={isReadOnly}
                    />
                    <Input 
                      label="Middle Name" 
                      placeholder="e.g. Dela Cruz" 
                      value={studentInfo.middleName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, middleName: e.target.value })}
                      disabled={isReadOnly}
                    />
                    <Input 
                      label="Last Name" 
                      placeholder="e.g. Ramos" 
                      value={studentInfo.lastName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, lastName: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Input 
                      label="Age (Auto-calculated)" 
                      placeholder="Age" 
                      value={studentInfo.age}
                      readOnly
                      className="bg-slate-50 font-bold"
                      disabled={isReadOnly}
                    />
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700 ml-1">Gender</label>
                      <select 
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                        value={studentInfo.gender}
                        onChange={(e) => setStudentInfo({ ...studentInfo, gender: e.target.value })}
                        disabled={isReadOnly}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <Input 
                      label="Birthday" 
                      type="date"
                      value={studentInfo.birthday}
                      onChange={(e) => setStudentInfo({ ...studentInfo, birthday: e.target.value })}
                      disabled={isReadOnly}
                    />
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700 ml-1">Year Level</label>
                      <select 
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                        value={studentInfo.yearLevel}
                        onChange={(e) => setStudentInfo({ ...studentInfo, yearLevel: e.target.value as YearLevel })}
                        disabled={isReadOnly}
                      >
                        {YEAR_LEVELS.map(lvl => <option key={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                    <div className="space-y-6">
                      <label className="text-sm font-bold text-slate-700 ml-1 block text-left">Location / Residential Address</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SearchableSelect
                          label="Province"
                          placeholder="Search Province..."
                          options={PHILIPPINES_ADDRESS_DATA.provinces}
                          value={studentInfo.addressDetails?.province || ''}
                          onChange={(val) => {
                            const details = { ...studentInfo.addressDetails, province: val, city: '', barangay: '' } as any;
                            const fullAddress = [details.street, details.barangay, details.city, details.province].filter(Boolean).join(', ');
                            setStudentInfo({ ...studentInfo, addressDetails: details, address: fullAddress });
                          }}
                          disabled={isReadOnly}
                          icon={<MapPin className="h-4 w-4" />}
                        />

                        <SearchableSelect
                          label="City / Municipality"
                          placeholder={studentInfo.addressDetails?.province ? "Search City..." : "Select Province first"}
                          options={studentInfo.addressDetails?.province ? (PHILIPPINES_ADDRESS_DATA.municipalities[studentInfo.addressDetails.province as keyof typeof PHILIPPINES_ADDRESS_DATA.municipalities] || []) : []}
                          value={studentInfo.addressDetails?.city || ''}
                          onChange={(val) => {
                            const details = { ...studentInfo.addressDetails, city: val, barangay: '' } as any;
                            const fullAddress = [details.street, details.barangay, details.city, details.province].filter(Boolean).join(', ');
                            setStudentInfo({ ...studentInfo, addressDetails: details, address: fullAddress });
                          }}
                          disabled={isReadOnly || !studentInfo.addressDetails?.province}
                          icon={<MapPin className="h-4 w-4" />}
                        />

                        <SearchableSelect
                          label="Barangay"
                          placeholder={studentInfo.addressDetails?.city ? "Search Barangay..." : "Select City first"}
                          options={studentInfo.addressDetails?.city ? (PHILIPPINES_ADDRESS_DATA.barangays[studentInfo.addressDetails.city as keyof typeof PHILIPPINES_ADDRESS_DATA.barangays] || []) : []}
                          value={studentInfo.addressDetails?.barangay || ''}
                          onChange={(val) => {
                            const details = { ...studentInfo.addressDetails, barangay: val } as any;
                            const fullAddress = [details.street, details.barangay, details.city, details.province].filter(Boolean).join(', ');
                            setStudentInfo({ ...studentInfo, addressDetails: details, address: fullAddress });
                          }}
                          disabled={isReadOnly || !studentInfo.addressDetails?.city}
                          icon={<MapPin className="h-4 w-4" />}
                        />

                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            label="House No / Street" 
                            className="pl-10" 
                            placeholder="Unit/Street" 
                            value={studentInfo.addressDetails?.street || ''}
                            onChange={(e) => {
                              const details = { ...studentInfo.addressDetails, street: e.target.value } as any;
                              const fullAddress = [details.street, details.barangay, details.city, details.province].filter(Boolean).join(', ');
                              setStudentInfo({ ...studentInfo, addressDetails: details, address: fullAddress });
                            }}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Full Address (Auto-generated)" 
                        className="pl-10 bg-slate-50 font-medium" 
                        value={studentInfo.address || ''}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <IdCard className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label={isAdmin ? "Student ID" : "Student ID (Assigned by Registrar)"} 
                        className="pl-10" 
                        placeholder={isAdmin ? "20XX-XXXXX" : "To be assigned"} 
                        value={studentInfo.studentId}
                        onChange={(e) => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                        disabled={!isAdmin || isReadOnly}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Contact Number" 
                        className="pl-10" 
                        placeholder="09XX XXX XXXX" 
                        value={studentInfo.contactNumber}
                        onChange={(e) => setStudentInfo({ ...studentInfo, contactNumber: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Email Address" 
                        className="pl-10" 
                        placeholder="example@email.com" 
                        value={studentInfo.email}
                        onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>

                  {studentInfo.yearLevel === '1st Year' && (
                    <div className="pt-8 border-t border-slate-100 space-y-6">
                      <div className="flex items-center gap-3 text-slate-900">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-bold">Requirement Documents (1st Year Only)</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Summary of Grades</label>
                          <div className={cn(
                            "relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 transition-all overflow-hidden",
                            studentInfo.documents?.summaryOfGrades ? "border-emerald-200 bg-emerald-50" : "hover:border-emerald-400 hover:bg-white"
                          )}>
                            {studentInfo.documents?.summaryOfGrades ? (
                              <img src={studentInfo.documents.summaryOfGrades} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-40" />
                            ) : (
                              <Info className="h-6 w-6 text-slate-400 mb-2" />
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase text-center relative z-10">
                              {studentInfo.documents?.summaryOfGrades ? 'Change Document' : 'Upload Grades'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => handleFileChange(e, 'summaryOfGrades')}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Good Moral Certificate</label>
                          <div className={cn(
                            "relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 transition-all overflow-hidden",
                            studentInfo.documents?.goodMoral ? "border-emerald-200 bg-emerald-50" : "hover:border-emerald-400 hover:bg-white"
                          )}>
                            {studentInfo.documents?.goodMoral ? (
                              <img src={studentInfo.documents.goodMoral} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-40" />
                            ) : (
                              <Info className="h-6 w-6 text-slate-400 mb-2" />
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase text-center relative z-10">
                              {studentInfo.documents?.goodMoral ? 'Change Document' : 'Upload Certificate'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => handleFileChange(e, 'goodMoral')}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Birth Certificate</label>
                          <div className={cn(
                            "relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 transition-all overflow-hidden",
                            studentInfo.documents?.birthCertificate ? "border-emerald-200 bg-emerald-50" : "hover:border-emerald-400 hover:bg-white"
                          )}>
                            {studentInfo.documents?.birthCertificate ? (
                              <img src={studentInfo.documents.birthCertificate} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-40" />
                            ) : (
                              <Info className="h-6 w-6 text-slate-400 mb-2" />
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase text-center relative z-10">
                              {studentInfo.documents?.birthCertificate ? 'Change Document' : 'Upload Birth Cert'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => handleFileChange(e, 'birthCertificate')}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">2x2 Student Photo</label>
                          <div className={cn(
                            "relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 transition-all overflow-hidden",
                            studentInfo.documents?.twoByTwoPhoto ? "border-emerald-200 bg-emerald-50" : "hover:border-emerald-400 hover:bg-white"
                          )}>
                            {studentInfo.documents?.twoByTwoPhoto ? (
                              <img src={studentInfo.documents.twoByTwoPhoto} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-40" />
                            ) : (
                              <Info className="h-6 w-6 text-slate-400 mb-2" />
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase text-center relative z-10">
                              {studentInfo.documents?.twoByTwoPhoto ? 'Change Photo' : 'Upload 2x2 Image'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => handleFileChange(e, 'twoByTwoPhoto')}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Enrollment Type */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-slate-900 text-center justify-center mb-8">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Info className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">Select Enrollment Type</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ENROLLMENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        disabled={isReadOnly}
                        onClick={() => setEnrollmentType(type.id as EnrollmentType)}
                        className={cn(
                          "relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group",
                          isReadOnly && "cursor-not-allowed opacity-80",
                          enrollmentType === type.id 
                            ? "border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/10" 
                            : "border-slate-100 bg-slate-50" + (isReadOnly ? "" : " hover:border-slate-300 hover:bg-white")
                        )}
                      >
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                          enrollmentType === type.id ? "bg-blue-600 text-white" : "bg-white text-slate-400 shadow-sm"
                        )}>
                          {/* We'd map icons here appropriately */}
                          <CardTitle className={cn(enrollmentType === type.id ? "text-white" : "text-slate-400")}>{type.id[0]}</CardTitle>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{type.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{type.description}</p>
                        
                        {enrollmentType === type.id && (
                          <motion.div
                            layoutId="active-type"
                            className="absolute top-4 right-4 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center text-white"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>


                  <Card className="bg-blue-900 text-white p-6 border-none">
                    <div className="flex gap-4">
                      <Info className="h-6 w-6 text-blue-300 shrink-0" />
                      <div>
                        <p className="font-bold mb-1">Important Note</p>
                        <p className="text-sm text-blue-100 opacity-80">
                          Please ensure you have selected the correct enrollment category. "Regular" is for students who passed all subjects from the previous semester, "Irregular" for those with balanced or back subjects, "Transferee" for students transferring from another college or university, and "Returnee" for those resuming studies after a leave of absence.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Step 3: Course & Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-10">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                       Course Selection
                    </h3>
                    
                    <div className="space-y-10">
                      {['ICS', 'IBE', 'ITE'].map((inst) => {
                        const coursesInInstitute = COURSES.filter(c => c.institute === inst);
                        if (coursesInInstitute.length === 0) return null;
                        
                        return (
                          <div key={inst} className="flex flex-col md:flex-row gap-6">
                            <div className="md:w-32 shrink-0">
                              <h4 className="text-sm font-black text-black uppercase tracking-widest leading-none mt-2">{inst}</h4>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                              {coursesInInstitute.map((course) => (
                                <button
                                  key={course.id}
                                  disabled={isReadOnly}
                                  onClick={() => {
                                    if (studentInfo.yearLevel === '1st Year') {
                                      if (selectedCourse === course.id) {
                                        // Unselect first choice
                                        setSelectedCourse('' as any);
                                      } else if (secondChoice === course.id) {
                                        // Unselect second choice
                                        setSecondChoice(undefined);
                                      } else if (!selectedCourse) {
                                        setSelectedCourse(course.id);
                                      } else if (!secondChoice && selectedCourse !== course.id) {
                                        setSecondChoice(course.id);
                                      } else {
                                        // Rotate selection: new becomes second, old second becomes first?
                                        // Better: just replace the one that was clicked if already selected
                                        toast.error("You have already selected two programs. Deselect one first.");
                                      }
                                    } else {
                                      setSelectedCourse(course.id);
                                    }
                                  }}
                                  className={cn(
                                    "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group",
                                    isReadOnly && "cursor-not-allowed opacity-80",
                                    (selectedCourse === course.id || secondChoice === course.id)
                                      ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/5" 
                                      : "border-slate-100 bg-white" + (isReadOnly ? "" : " hover:border-slate-200 hover:shadow-md")
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={cn(
                                      "text-[10px] font-black px-2 py-0.5 rounded tracking-widest transition-colors", 
                                      (selectedCourse === course.id || secondChoice === course.id) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                    )}>
                                      {course.id}
                                      {selectedCourse === course.id && " (1st)"}
                                      {secondChoice === course.id && " (2nd)"}
                                    </span>
                                    {(selectedCourse === course.id || secondChoice === course.id) && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{course.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1">{course.slots} slots remaining</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-10">
                    <h3 className="text-xl font-bold mb-6">Review Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ring-1 ring-slate-100 p-8 rounded-3xl bg-slate-50/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <GraduationCap className="h-40 w-40" />
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-left">Student Profile</p>
                        <div className="text-left">
                          <p className="text-2xl font-black text-slate-900">{studentInfo.firstName} {studentInfo.lastName}</p>
                          <p className="text-sm text-slate-500 font-medium">{studentInfo.email} • {studentInfo.contactNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Student ID</p>
                            <p className="text-sm font-bold text-slate-700">{studentInfo.studentId || (enrollmentStatus === 'Validating' ? 'Pending' : 'New Student')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Year Level</p>
                            <p className="text-sm font-bold text-slate-700">{studentInfo.yearLevel}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest text-left">Enrollment Details</p>
                        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold text-slate-900">{studentInfo.yearLevel === '1st Year' ? '1st Choice' : 'Course'}</span>
                            <span className="font-bold text-slate-900">{selectedCourse}</span>
                          </div>
                          {studentInfo.yearLevel === '1st Year' && secondChoice && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-bold text-slate-900">2nd Choice</span>
                              <span className="font-bold text-slate-900">{secondChoice}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Academic Type</span>
                            <span className="font-bold text-slate-900">{enrollmentType}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Semester</span>
                            <span className="font-bold text-slate-900">1st Semester 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Step
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!isStepValid(currentStep)}
                    className={cn(
                      "gap-2 min-w-[140px]",
                      !isStepValid(currentStep) && "opacity-50 grayscale"
                    )}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    disabled={isReadOnly || !isStepValid(3)}
                    className={cn(
                      "gap-2 min-w-[160px] border-none",
                      (isReadOnly || !isStepValid(3)) 
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white"
                    )}
                  >
                    {isReadOnly ? 'Form Finalized' : (enrollmentStatus === 'Validating' ? 'Update Info' : 'Confirm & Enroll')}
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
