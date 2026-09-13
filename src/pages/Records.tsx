import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  File,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  User,
  Hash,
  School,
  Clock,
  ShieldCheck,
  Briefcase,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EnrollmentRecord, TeacherRequest } from '@/src/types';
import toast from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where, limit, getDocs, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { COURSES } from '@/src/constants';
import { sendNotification } from '@/src/lib/notifications';

interface RecordsProps {
  user: any;
}

export default function Records({ user }: RecordsProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'professors'>('students');
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [teacherRequests, setTeacherRequests] = useState<TeacherRequest[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('type-irreg-first');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EnrollmentRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<EnrollmentRecord | null>(null);
  const [validationData, setValidationData] = useState({ 
    studentId: '', 
    section: '',
    examDate: '',
    examStartTime: '',
    examEndTime: '',
    examVenue: ''
  });
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [sections, setSections] = useState<{name: string, yearLevel: string}[]>([]);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [profDeleteId, setProfDeleteId] = useState<string | null>(null);
  const [profSectionAssign, setProfSectionAssign] = useState<Record<string, string[]>>({});
  const [profSectionSearch, setProfSectionSearch] = useState<string>('');
  const [isProfSectionsModalOpen, setIsProfSectionsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<TeacherRequest | null>(null);
  
  const navigate = useNavigate();

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

  const filteredSectionsForStudent = useMemo(() => {
    if (!selectedRecord) return [];
    // Filter sections by year level and check if the section name includes either the primary course or the second choice ID
    return sections.filter(section => {
      const matchesYear = section.yearLevel === selectedRecord.yearLevel;
      const matchesPrimary = section.name.toLowerCase().includes(selectedRecord.course.toLowerCase());
      const matchesSecond = selectedRecord.secondChoice ? section.name.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase()) : false;
      return matchesYear && (matchesPrimary || matchesSecond);
    });
  }, [sections, selectedRecord]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    enrollments.forEach(enroll => {
      const sec = enroll.section || enroll.studentInfo.section;
      if (sec && enroll.status === 'Enrolled') {
        counts[sec] = (counts[sec] || 0) + 1;
      }
    });
    return counts;
  }, [enrollments]);

  useEffect(() => {
    // Real-time Enrollments
    let qEnroll;
    if (user?.role === 'professor') {
      const professorSections = user.assignedSections || (user.assignedSection ? [user.assignedSection] : []);
      if (professorSections.length > 0) {
        // Firestore 'in' operator supports up to 30 items
        // Important: Professors can ONLY list Enrolled students to avoid listing applications
        qEnroll = query(
          collection(db, 'enrollments'), 
          where('section', 'in', professorSections), 
          where('status', '==', 'Enrolled')
        );
      } else {
        // If no sections assigned, show nothing for professors
        qEnroll = query(collection(db, 'enrollments'), where('section', '==', 'NONE_ASSIGNED'));
      }
    } else if (user?.role === 'admin') {
      qEnroll = query(collection(db, 'enrollments'), orderBy('updatedAt', 'desc'), limit(100));
    } else {
      // Not an admin or professor yet, likely a race condition or unauthorized
      // Return empty to prevent permission errors
      setEnrollments([]);
      return;
    }

    const unsubscribeEnroll = onSnapshot(qEnroll, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as EnrollmentRecord[];
      setEnrollments(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'enrollments'));

    // Real-time Users (for profile pictures) - ONLY FOR ADMINS as per security rules
    let unsubscribeUsers = () => {};
    if (user?.role === 'admin') {
      const qUsers = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const profileMap: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          const userData = doc.data() as { profilePicture?: string };
          if (userData.profilePicture) {
            profileMap[doc.id] = userData.profilePicture;
          }
        });
        setStudentProfiles(profileMap);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    }

    // Real-time Sections
    const unsubscribeSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      const sectionData = snapshot.docs.map(doc => doc.data() as {name: string, yearLevel: string});
      setSections(sectionData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sections'));

    // Real-time Teacher Requests (only for admins)
    let unsubscribeProf = () => {};
    if (user?.role === 'admin') {
      const qProf = collection(db, 'teacher_requests');
      unsubscribeProf = onSnapshot(qProf, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as TeacherRequest[];
        // Sort in memory to avoid index requirements
        setTeacherRequests(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'teacher_requests'));
    }

    return () => {
      unsubscribeEnroll();
      unsubscribeUsers();
      unsubscribeSections();
      unsubscribeProf();
    };
  }, [user]);

  const TYPE_ORDER_IRREG_FIRST: Record<string, number> = {
    'Irregular': 1,
    'Regular': 2,
    'Transferee': 3,
    'Returnee': 4,
  };

  const TYPE_ORDER_REG_FIRST: Record<string, number> = {
    'Regular': 1,
    'Irregular': 2,
    'Transferee': 3,
    'Returnee': 4,
  };

  const TYPE_ORDER_TRANSFEREE_FIRST: Record<string, number> = {
    'Transferee': 1,
    'Irregular': 2,
    'Regular': 3,
    'Returnee': 4,
  };

  const TYPE_ORDER_RETURNEE_FIRST: Record<string, number> = {
    'Returnee': 1,
    'Transferee': 2,
    'Irregular': 3,
    'Regular': 4,
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: enrollments.length,
      Regular: 0,
      Irregular: 0,
      Transferee: 0,
      Returnee: 0,
    };
    enrollments.forEach(enrollment => {
      const t = enrollment.type;
      if (counts[t] !== undefined) {
        counts[t]++;
      } else {
        counts[t] = 1;
      }
    });
    return counts;
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    const list = enrollments.filter(enrollment => {
      const matchesSearch = (
        enrollment.studentInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.studentInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (enrollment.studentId && enrollment.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (enrollment.studentInfo.studentId && enrollment.studentInfo.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (enrollment.userId && enrollment.userId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const matchesCourse = filterCourse === 'All' || enrollment.course === filterCourse;
      const enrollmentSection = enrollment.section || enrollment.studentInfo.section;
      const matchesSection = filterSection === 'All' || enrollmentSection === filterSection;
      const matchesType = filterType === 'All' || enrollment.type === filterType;
      return matchesSearch && matchesCourse && matchesSection && matchesType;
    });

    return list.sort((a, b) => {
      if (sortOption === 'type-irreg-first') {
        const orderA = TYPE_ORDER_IRREG_FIRST[a.type] || 99;
        const orderB = TYPE_ORDER_IRREG_FIRST[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'type-asc') {
        const orderA = TYPE_ORDER_REG_FIRST[a.type] || 99;
        const orderB = TYPE_ORDER_REG_FIRST[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'type-desc') {
        const orderA = TYPE_ORDER_REG_FIRST[a.type] || 99;
        const orderB = TYPE_ORDER_REG_FIRST[b.type] || 99;
        if (orderA !== orderB) return orderB - orderA;
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'type-transferee-first') {
        const orderA = TYPE_ORDER_TRANSFEREE_FIRST[a.type] || 99;
        const orderB = TYPE_ORDER_TRANSFEREE_FIRST[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'type-returnee-first') {
        const orderA = TYPE_ORDER_RETURNEE_FIRST[a.type] || 99;
        const orderB = TYPE_ORDER_RETURNEE_FIRST[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'name-asc') {
        return a.studentInfo.lastName.localeCompare(b.studentInfo.lastName);
      }
      if (sortOption === 'name-desc') {
        return b.studentInfo.lastName.localeCompare(a.studentInfo.lastName);
      }
      if (sortOption === 'date-desc') {
        const dateA = new Date(a.enrolledAt || a.submittedAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.enrolledAt || b.submittedAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortOption === 'date-asc') {
        const dateA = new Date(a.enrolledAt || a.submittedAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.enrolledAt || b.submittedAt || b.updatedAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortOption === 'id-asc') {
        const idA = a.studentId || a.studentInfo.studentId || '';
        const idB = b.studentId || b.studentInfo.studentId || '';
        return idA.localeCompare(idB);
      }
      return 0;
    });
  }, [enrollments, searchTerm, filterCourse, filterSection, filterType, sortOption]);

  const filteredProfessors = useMemo(() => {
    return teacherRequests.filter(req => 
      req.status !== 'deleted' && (
        req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [teacherRequests, searchTerm]);

  const handleApproveProfessor = async (request: TeacherRequest) => {
    const professorName = request.fullName || (request as any).name || 'Faculty Member';
    const toastId = toast.loading(`Approving ${professorName}...`);
    try {
      const assignedSections = profSectionAssign[request.id] || (request as any).assignedSections || [];
      if (assignedSections.length === 0) {
        toast.error("Please assign at least one section to this professor.", { id: toastId });
        return;
      }

      // 1. Mark request as approved
      await updateDoc(doc(db, 'teacher_requests', request.id), { 
        status: 'approved',
        assignedSections,
        updatedAt: new Date().toISOString()
      });
      
      // 2. Create / update user record
      const rawUsername = request.username || (request.email ? request.email.split('@')[0] : 'faculty');
      const sanitizedUsername = rawUsername.toLowerCase().replace(/\s+/g, '');
      const officialEmail = `${sanitizedUsername}@school.portal`;
      const userDocId = (request as any).uid || sanitizedUsername;
      
      const userRecord: Record<string, any> = {
        fullName: professorName,
        name: professorName,
        institute: request.institute || 'ICS',
        username: sanitizedUsername,
        role: 'professor',
        status: 'approved',
        assignedSections,
        assignedSection: assignedSections[0] || null,
        updatedAt: new Date().toISOString()
      };

      if (officialEmail) {
        userRecord.email = officialEmail;
      }
      if (request.email) {
        userRecord.gmail = request.email.toLowerCase().trim();
      }
      if (request.password) {
        userRecord.password = request.password;
      }

      await setDoc(doc(db, 'users', userDocId), userRecord, { merge: true });

      // If userDocId is UID, also keep a record under sanitizedUsername for fast login resolution
      if (userDocId !== sanitizedUsername) {
        await setDoc(doc(db, 'users', sanitizedUsername), {
          ...userRecord,
          uid: userDocId
        }, { merge: true });
      }

      // 3. Add to admins collection for rules access via email as ID
      const emailId = officialEmail; // Safe ID
      const adminData: Record<string, any> = {
        email: officialEmail,
        name: professorName,
        role: 'professor', // Use lowercase for consistency
        assignedSections,
        assignedSection: assignedSections[0] || null,
        updatedAt: new Date().toISOString()
      };
      if (userDocId) {
        adminData.uid = userDocId;
      }

      await setDoc(doc(db, 'admins', emailId), adminData, { merge: true });

      // Also add UID in admins so request.auth.uid rules checks pass
      if (userDocId && userDocId !== emailId) {
        await setDoc(doc(db, 'admins', userDocId), adminData, { merge: true });
      }
      
      // Also add their real Gmail if provided
      if (request.email) {
        const gmailId = request.email.toLowerCase().trim();
        await setDoc(doc(db, 'admins', gmailId), {
          ...adminData,
          email: request.email
        }, { merge: true });
      }
      
      toast.success(`${professorName} approved as Professor!`, { id: toastId });
    } catch (error: any) {
      console.error("Error approving professor:", error);
      toast.error(`Failed to approve professor: ${error.message}`, { id: toastId });
    }
  };

  const handleOpenValidate = (record: EnrollmentRecord) => {
    setSelectedRecord(record);
    setValidationData({ 
      studentId: record.studentId || record.studentInfo.studentId || '', 
      section: record.section || record.studentInfo.section || '',
      examDate: record.examDate || '',
      examStartTime: record.examStartTime || '',
      examEndTime: record.examEndTime || '',
      examVenue: record.examVenue || ''
    });
    
    // Initialize registration form if not exists
    if (record.registrationForm) {
      setRegistrationData(record.registrationForm);
    } else {
      setRegistrationData({
        academicYear: '2025-2026',
        semester: '1',
        program: record.course,
        institute: 'None entered',
        courses: [],
        assessedFees: {
          tuition: 0, admission: 0, athletic: 0, computer: 0, cultural: 0,
          developmental: 0, guidance: 0, laboratory: 0, library: 0,
          medicalDental: 0, nstp: 0, registration: 0, schoolId: 0,
          handbook: 0, total: 0
        },
        paymentDetails: { mode: 'UNIFFAST', amount: 'c/o UNIFAST', date: new Date().toLocaleDateString() }
      });
    }
    
    setIsValidationModalOpen(true);
  };

  const handleRegistrationSubmit = async () => {
    if (!selectedRecord || !registrationData) return;
    
    try {
      const docRef = doc(db, 'enrollments', selectedRecord.id);
      const now = new Date().toISOString();
      
      // Determine if course needs to change based on section
      let finalCourse = selectedRecord.course;
      if (selectedRecord.yearLevel === '1st Year' && selectedRecord.secondChoice && validationData.section) {
        const isSecondChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
        const isFirstChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.course.toLowerCase());
        if (isSecondChoiceSection && !isFirstChoiceSection) {
          finalCourse = selectedRecord.secondChoice;
        }
      }

      const updates: any = {
        status: 'Enrolled' as const,
        studentId: validationData.studentId,
        section: validationData.section,
        course: finalCourse,
        enrolledAt: now,
        updatedAt: now, 
        'studentInfo.studentId': validationData.studentId,
        'studentInfo.section': validationData.section,
        registrationForm: { ...registrationData, program: finalCourse }
      };
      
      await updateDoc(docRef, updates);

      // Send notification to student
      if (selectedRecord.userId) {
        const oldId = selectedRecord.studentId || selectedRecord.studentInfo.studentId;
        const oldSection = selectedRecord.section || selectedRecord.studentInfo.section;
        const idChanged = validationData.studentId !== oldId;
        const sectionChanged = validationData.section !== oldSection;

        let message = `Your enrollment for ${selectedRecord.course} has been finalized.`;
        if (idChanged && sectionChanged) {
          message += ` Your student number is now ${validationData.studentId} and your section is ${validationData.section}.`;
        } else if (idChanged) {
          message += ` Your student number is now ${validationData.studentId}.`;
        } else if (sectionChanged) {
          message += ` Your assigned section is ${validationData.section}.`;
        }
        message += " You can now view your Official Registration Form.";

        await sendNotification(
          selectedRecord.userId,
          'Enrollment Finalized',
          message,
          'success'
        );
      }

      setIsRegistrationModalOpen(false);
      setIsValidationModalOpen(false);
      toast.success('Registration Form Saved successfully!');
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to save registration form.");
    }
  };

  const handleValidateSubmit = async (newStatus?: 'Enrolled' | 'Validating') => {
    if (!selectedRecord) return;
    
    const targetStatus = newStatus || 'Enrolled';
    const now = new Date().toISOString();
    
    try {
      const docRef = doc(db, 'enrollments', selectedRecord.id);
      
      // Determine if course needs to change based on section
      let finalCourse = selectedRecord.course;
      if (selectedRecord.yearLevel === '1st Year' && selectedRecord.secondChoice && validationData.section) {
        const isSecondChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
        const isFirstChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.course.toLowerCase());
        if (isSecondChoiceSection && !isFirstChoiceSection) {
          finalCourse = selectedRecord.secondChoice;
        }
      }

      const updates: any = {
        status: targetStatus,
        course: finalCourse,
        studentId: validationData.studentId,
        section: validationData.section,
        examDate: validationData.examDate,
        examStartTime: validationData.examStartTime,
        examEndTime: validationData.examEndTime,
        examVenue: validationData.examVenue,
        updatedAt: now,
        'studentInfo.studentId': validationData.studentId,
        'studentInfo.section': validationData.section
      };

      if (targetStatus === 'Enrolled') {
        updates.enrolledAt = now;
      }

      await updateDoc(docRef, updates);

      // Sync studentId to users collection for student ID login
      if (validationData.studentId) {
        try {
          if (selectedRecord.userId) {
            await setDoc(doc(db, 'users', selectedRecord.userId), { 
              studentId: validationData.studentId,
              section: validationData.section
            }, { merge: true });
          }
          if (selectedRecord.studentInfo?.email) {
            const userQ = query(collection(db, 'users'), where('email', '==', selectedRecord.studentInfo.email));
            const userSnaps = await getDocs(userQ);
            for (const uDoc of userSnaps.docs) {
              await setDoc(doc(db, 'users', uDoc.id), { 
                studentId: validationData.studentId,
                section: validationData.section 
              }, { merge: true });
            }
          }
        } catch (syncErr) {
          console.warn("Could not sync studentId to user doc:", syncErr);
        }
      }

      // Send notification to student
      if (selectedRecord.userId) {
        let message = '';
        let title = '';

        if (targetStatus === 'Enrolled') {
          title = selectedRecord.status === 'Enrolled' ? 'Record Updated' : 'Enrollment Approved';
          message = `Your enrollment for ${selectedRecord.course} has been approved! Your student number is ${validationData.studentId} and section is ${validationData.section}.`;
        } else if (validationData.examDate) {
          title = 'Entrance Exam Scheduled';
          message = `Your entrance exam has been scheduled for ${validationData.examDate} at ${formatTime(validationData.examStartTime)} - ${formatTime(validationData.examEndTime)} (${validationData.examVenue}). Please be on time.`;
        } else {
          title = 'Information Updated';
          message = 'Your student information has been updated by the registrar.';
        }

        await sendNotification(selectedRecord.userId, title, message, 'info');
      }

      setIsValidationModalOpen(false);
      toast.success(targetStatus === 'Enrolled' ? 'Student enrolled successfully!' : 'Information updated & exam scheduled!');
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Failed to update student information.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    // Find the record first to get the userId
    const recordToDelete = enrollments.find(e => e.id === deleteConfirmId);
    
    try {
      // 1. Delete Enrollment Record
      await deleteDoc(doc(db, 'enrollments', deleteConfirmId));
      
      // 2. Clear associated user data if userId exists
      if (recordToDelete?.userId) {
        // Delete user document from 'users' collection
        await deleteDoc(doc(db, 'users', recordToDelete.userId));
        
        // Delete notifications associated with this user
        const notifQuery = query(collection(db, 'notifications'), where('userId', '==', recordToDelete.userId));
        const notifSnap = await getDocs(notifQuery);
        const deleteNotifPromises = notifSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteNotifPromises);
      }
      
      toast.success('Record and student data wiped successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to wipe record. Check your permissions.");
      setDeleteConfirmId(null);
    }
  };

  const [profToReject, setProfToReject] = useState<{prof: TeacherRequest, isRevoke: boolean} | null>(null);

  const handleDeclineProfessor = async (prof: TeacherRequest, isRevoke = false) => {
    const action = isRevoke ? 'Decline' : 'Reject';
    const toastId = toast.loading(`${action}ing professor...`);

    try {
      // 1. Update status in teacher_requests
      await updateDoc(doc(db, 'teacher_requests', prof.id), { 
        status: 'rejected',
        rejectedBy: user?.fullName || user?.name || user?.email || 'Admin',
        rejectedAt: new Date().toISOString()
      });

      // 2. Cleanup associated permissions (from admins collection)
      const sanitizedUsername = prof.username.toLowerCase().replace(/\s+/g, '');
      const portalEmail = `${sanitizedUsername}@school.portal`;
      
      const adminDocsToDelete = new Set([portalEmail]);
      if (prof.email) adminDocsToDelete.add(prof.email);

      for (const id of Array.from(adminDocsToDelete)) {
        try {
          await deleteDoc(doc(db, 'admins', id));
        } catch (e) {
          console.warn(`Could not delete admin doc ${id}:`, e);
        }
      }

      // 3. Update user role if doc exists
      const userDocId = (prof as any).uid || sanitizedUsername;
      try {
        const uDoc = await getDoc(doc(db, 'users', userDocId));
        if (uDoc.exists()) {
          await updateDoc(uDoc.ref, { 
            role: 'student', 
            updatedAt: new Date().toISOString() 
          });
        }
      } catch (e) {
        console.warn("Could not update user role during decline:", e);
      }

      toast.success(`Professor access ${isRevoke ? 'revoked' : 'rejected'}.`, { id: toastId });
    } catch (err: any) {
      console.error(`Error ${action.toLowerCase()}ing professor:`, err);
      toast.error(`Failed to ${action.toLowerCase()} professor: ${err.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const confirmDeleteProfessor = async () => {
    if (!profDeleteId) return;
    const prof = teacherRequests.find(p => p.id === profDeleteId);
    if (!prof) {
      setProfDeleteId(null);
      return;
    }

    // Security: Don't allow admin to delete themselves to prevent logout/orphaning
    if (prof.email === user.email) {
      toast.error("You cannot delete your own account from here. Please contact another administrator.");
      setProfDeleteId(null);
      return;
    }

    try {
      // 1. Mark as deleted in teacher_requests (keep for blocking)
      await updateDoc(doc(db, 'teacher_requests', profDeleteId), { 
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });

      // 2. Cleanup associated users
      const sanitizedUsername = prof.username.toLowerCase().replace(/\s+/g, '');
      const userDocsToDelete = new Set<string>();
      
      // Add known IDs
      userDocsToDelete.add(sanitizedUsername);
      userDocsToDelete.add(prof.username);
      if ((prof as any).uid) userDocsToDelete.add((prof as any).uid);

      // IMPORTANT: Never delete the currently logged in user's doc
      userDocsToDelete.delete(user.uid);
      userDocsToDelete.delete(user.username);

      // Query for potential user docs by emails
      const portalEmail = `${sanitizedUsername}@school.portal`;
      const queries = [
        query(collection(db, 'users'), where('email', '==', portalEmail)),
        query(collection(db, 'users'), where('username', '==', sanitizedUsername))
      ];
      
      if (prof.email) {
        queries.push(query(collection(db, 'users'), where('gmail', '==', prof.email)));
        queries.push(query(collection(db, 'users'), where('email', '==', prof.email)));
      }

      for (const q of queries) {
        const snap = await getDocs(q);
        snap.forEach(d => {
          // Double check to never delete self
          if (d.id !== user.uid) {
            userDocsToDelete.add(d.id);
          }
        });
      }
      
      // Execute deletions
      const deletePromises = Array.from(userDocsToDelete).map(id => deleteDoc(doc(db, 'users', id)));
      await Promise.all(deletePromises);

      // 3. Delete from admins
      const adminDocsToDelete = new Set([portalEmail]);
      if (prof.email) adminDocsToDelete.add(prof.email);
      if ((prof as any).uid) adminDocsToDelete.add((prof as any).uid);

      // Never delete self from admins
      adminDocsToDelete.delete(user.email);
      adminDocsToDelete.delete(user.uid);

      for (const id of Array.from(adminDocsToDelete)) {
         await deleteDoc(doc(db, 'admins', id));
      }

      toast.success('Professor account and all related records deleted.');
    } catch (error) {
      console.error("Professor delete error:", error);
      toast.error('Failed to fully delete professor account.');
    } finally {
      setProfDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'professor' ? 'Class List' : 'College Records'}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'professor' 
              ? `Viewing enrolled students for section ${user.assignedSection}`
              : 'Manage student applications and professor account requests.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-300 p-1 rounded-md shadow-sm">
            <button
              onClick={() => setActiveTab('students')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all",
                activeTab === 'students' 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Students
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('professors')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-2",
                  activeTab === 'professors' 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Professors
                {teacherRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="h-4 w-4 rounded bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {teacherRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {activeTab === 'students' ? (
        <>
          {/* Section Counts Summary - Classic Frame */}
          <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setFilterSection('All')}
              className={cn(
                "flex flex-col bg-white border rounded-md p-3 min-w-[150px] shadow-sm transition-all text-left group relative",
                filterSection === 'All' 
                  ? "border-slate-800 ring-1 ring-slate-800 bg-slate-50" 
                  : "border-slate-300 hover:border-slate-400"
              )}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">View Mode</span>
              <span className="text-sm font-bold text-slate-900 mb-1">SHOW ALL</span>
              <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">{enrollments.length} Total Records</span>
              </div>
            </button>

            {Object.entries(sectionCounts).length > 0 ? (
              Object.entries(sectionCounts).sort().map(([section, count]) => (
                <button 
                  key={section} 
                  onClick={() => setFilterSection(section)}
                  className={cn(
                    "flex flex-col bg-white border rounded-md p-3 min-w-[150px] shadow-sm transition-all text-left group relative",
                    filterSection === section 
                      ? "border-slate-800 ring-1 ring-slate-800 bg-slate-50" 
                      : "border-slate-300 hover:border-slate-400"
                  )}
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</span>
                  <span className="text-sm font-bold text-slate-900 mb-1">{section}</span>
                  <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600">{count} Enrolled</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex items-center justify-center p-4 bg-white rounded-md border border-dashed border-slate-300 min-w-[200px]">
                <p className="text-xs text-slate-500 font-medium italic">No sections with students found</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Student List {filterSection !== 'All' && <span className="text-blue-700">— {filterSection}</span>}
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold">
                {filteredEnrollments.length} Result{filteredEnrollments.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filterSection !== 'All' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilterSection('All')}
                className="text-[11px] font-semibold uppercase tracking-wider h-8 border-slate-300"
              >
                Clear Section Filter
              </Button>
            )}
          </div>

          {/* Student Type Filter & Quick Sort Toolbar - Classic Frame */}
          <div className="bg-white rounded-md border border-slate-300 p-3 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  Filter Type:
                </span>
                {(['All', 'Regular', 'Irregular', 'Transferee', 'Returnee'] as const).map((t) => {
                  const count = typeCounts[t] ?? 0;
                  const isSelected = filterType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 border",
                        isSelected 
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span>{t === 'All' ? 'All Types' : t}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[10px] font-bold",
                        isSelected 
                          ? "bg-slate-700 text-white" 
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Type Sort Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                  Sort By Type:
                </span>
                <button
                  onClick={() => setSortOption('type-irreg-first')}
                  className={cn(
                    "px-2.5 py-1 rounded border text-xs font-medium transition-all",
                    sortOption === 'type-irreg-first'
                      ? "bg-blue-800 text-white border-blue-800 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  )}
                  title="Irregular → Regular → Transferee → Returnee"
                >
                  Irregular First
                </button>
                <button
                  onClick={() => setSortOption('type-asc')}
                  className={cn(
                    "px-2.5 py-1 rounded border text-xs font-medium transition-all",
                    sortOption === 'type-asc'
                      ? "bg-blue-800 text-white border-blue-800 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  )}
                  title="Regular → Irregular → Transferee → Returnee"
                >
                  Regular First
                </button>
                <button
                  onClick={() => setSortOption('type-transferee-first')}
                  className={cn(
                    "px-2.5 py-1 rounded border text-xs font-medium transition-all",
                    sortOption === 'type-transferee-first'
                      ? "bg-blue-800 text-white border-blue-800 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  )}
                  title="Transferee First"
                >
                  Transferee First
                </button>
                <button
                  onClick={() => setSortOption('type-returnee-first')}
                  className={cn(
                    "px-2.5 py-1 rounded border text-xs font-medium transition-all",
                    sortOption === 'type-returnee-first'
                      ? "bg-blue-800 text-white border-blue-800 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  )}
                  title="Returnee First"
                >
                  Returnee First
                </button>
              </div>
            </div>
          </div>

          <Card className="border border-slate-300 shadow-sm overflow-hidden rounded-md bg-white">
            <CardHeader className="border-b border-slate-300 p-4 bg-slate-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md bg-white shadow-sm">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <select 
                      aria-label="Filter records by course"
                      className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                    >
                      <option value="All">All Courses</option>
                      {COURSES.map(course => (
                        <option key={course.id} value={course.id}>{course.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md bg-white shadow-sm">
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                    <select 
                      aria-label="Sort student records"
                      className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                    >
                      <option value="type-irreg-first">Sort: Irregular → Regular → Transferee → Returnee</option>
                      <option value="type-asc">Sort: Regular → Irregular → Transferee → Returnee</option>
                      <option value="type-desc">Sort: Returnee → Transferee → Irregular → Regular</option>
                      <option value="type-transferee-first">Sort: Transferee First</option>
                      <option value="type-returnee-first">Sort: Returnee First</option>
                      <option value="name-asc">Sort: Student Name (A → Z)</option>
                      <option value="name-desc">Sort: Student Name (Z → A)</option>
                      <option value="date-desc">Sort: Date Applied (Newest)</option>
                      <option value="date-asc">Sort: Date Applied (Oldest)</option>
                      <option value="id-asc">Sort: Student ID</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Student Profile</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Course & Year</th>
                    <th 
                      onClick={() => {
                        if (sortOption === 'type-irreg-first') setSortOption('type-asc');
                        else if (sortOption === 'type-asc') setSortOption('type-transferee-first');
                        else if (sortOption === 'type-transferee-first') setSortOption('type-returnee-first');
                        else setSortOption('type-irreg-first');
                      }}
                      className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors select-none"
                      title="Click to toggle type sorting order"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Type</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Applied on</th>
                    {user?.role === 'admin' && <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEnrollments.length > 0 ? (
                    filteredEnrollments.map((enrollment, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-9 w-9 rounded border border-slate-300 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0",
                              (studentProfiles[enrollment.userId || ''] || enrollment.studentInfo.documents?.twoByTwoPhoto) ? "bg-white" : "bg-slate-100 text-slate-700"
                            )}>
                              {studentProfiles[enrollment.userId || ''] ? (
                                <img src={studentProfiles[enrollment.userId || '']} alt="Profile" className="w-full h-full object-cover" />
                              ) : enrollment.studentInfo.documents?.twoByTwoPhoto ? (
                                <img src={enrollment.studentInfo.documents.twoByTwoPhoto} alt="Record Photo" className="w-full h-full object-cover" />
                              ) : (
                                <span className="uppercase">{enrollment.studentInfo.firstName[0]}{enrollment.studentInfo.lastName[0]}</span>
                              )}
                            </div>
                            <div>
                              <p 
                                onClick={() => setSelectedDetailRecord(enrollment)}
                                className="text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-700 hover:underline transition-colors"
                              >
                                {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{enrollment.studentInfo.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900">{enrollment.course}</p>
                              {enrollment.status !== 'Enrolled' && enrollment.secondChoice && (
                                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">/ {enrollment.secondChoice}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{enrollment.yearLevel}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1",
                            enrollment.type === 'Regular' && "bg-blue-50 text-blue-800 border-blue-300",
                            enrollment.type === 'Irregular' && "bg-amber-50 text-amber-800 border-amber-300",
                            enrollment.type === 'Transferee' && "bg-purple-50 text-purple-800 border-purple-300",
                            enrollment.type === 'Returnee' && "bg-teal-50 text-teal-800 border-teal-300"
                          )}>
                            {enrollment.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider",
                            enrollment.status === 'Enrolled' ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                            enrollment.status === 'Pending' ? "bg-amber-50 text-amber-800 border-amber-300" :
                            enrollment.status === 'Validating' ? (
                              enrollment.studentInfo.yearLevel === '1st Year' ? "bg-purple-50 text-purple-800 border-purple-300" : "bg-blue-50 text-blue-800 border-blue-300"
                            ) :
                            "bg-blue-50 text-blue-800 border-blue-300"
                          )}>
                            {(enrollment.status === 'Validating' && enrollment.studentInfo.yearLevel === '1st Year') ? 'Assessment' : enrollment.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                          {(enrollment.submittedAt || enrollment.enrolledAt).split('T')[0]}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleOpenValidate(enrollment)}
                                className={cn(
                                  "px-3 py-1.5 text-white text-[10px] font-bold uppercase tracking-wider rounded border transition-all shadow-sm",
                                  enrollment.status === 'Enrolled' 
                                    ? "bg-slate-700 hover:bg-slate-800 border-slate-800" 
                                    : "bg-blue-700 hover:bg-blue-800 border-blue-800"
                                )}
                              >
                                {enrollment.status === 'Enrolled' ? 'Edit Info' : 'Update'}
                              </button>
                              <button 
                                onClick={() => handleDelete(enrollment.id)}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-12 w-12 rounded border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400">
                            <Search className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900">No records found</p>
                            <p className="text-xs text-slate-500">We couldn't find any students matching your criteria.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setFilterCourse('All'); setFilterSection('All'); setFilterType('All'); }}>
                            Reset All Filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-300 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-600 font-medium text-left">
                Showing <span className="font-bold text-slate-900">{filteredEnrollments.length}</span> of <span className="font-bold text-slate-900">{enrollments.length}</span> students
              </p>
              <div className="flex items-center gap-1.5">
                <button className="h-8 w-8 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 rounded border border-slate-800 bg-slate-800 text-white text-xs font-bold">1</button>
                </div>
                <button className="h-8 w-8 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40" disabled>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="border border-slate-300 shadow-sm overflow-hidden rounded-md bg-white">
          <CardHeader className="border-b border-slate-300 p-4 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Professor Accounts & Requests</CardTitle>
                <CardDescription className="text-xs text-slate-500">Review and approve account creation requests for faculty members.</CardDescription>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search professors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Professor</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Institute</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Account Details</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Requested on</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProfessors.length > 0 ? (
                  filteredProfessors.map((prof) => (
                    <tr key={prof.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded border border-slate-300 bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {prof.fullName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{prof.fullName}</p>
                            <p className="text-xs text-slate-500">{prof.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">{prof.institute}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold text-slate-800">Account: {prof.username}</p>
                          <div className="flex flex-wrap gap-1">
                            {(profSectionAssign[prof.id] || (prof as any).assignedSections || []).map((s: string) => (
                              <span key={s} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300 font-semibold">
                                {s}
                              </span>
                            ))}
                            <button 
                              onClick={() => {
                                setEditingProf(prof);
                                setProfSectionAssign({
                                  ...profSectionAssign,
                                  [prof.id]: (prof as any).assignedSections || profSectionAssign[prof.id] || []
                                });
                                setIsProfSectionsModalOpen(true);
                              }}
                              className="text-[10px] text-blue-700 font-bold hover:underline uppercase"
                            >
                              { (profSectionAssign[prof.id] || (prof as any).assignedSections || []).length > 0 ? '+ Manage' : '+ Add Sections' }
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider",
                          prof.status === 'approved' ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                          prof.status === 'pending' ? "bg-amber-50 text-amber-800 border-amber-300" :
                          "bg-red-50 text-red-800 border-red-300"
                        )}>
                          {prof.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                        {prof.createdAt.split('T')[0]}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {prof.status === 'pending' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleApproveProfessor(prof);
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-800 shadow-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setProfToReject({ prof, isRevoke: false });
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded border border-slate-300 transition-all flex items-center justify-center"
                                title="Reject Request"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {prof.status === 'approved' && (
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setProfToReject({ prof, isRevoke: true });
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 rounded border border-red-300 transition-all uppercase tracking-wider"
                              title="Revoke Professor Access"
                            >
                              Revoke
                            </button>
                          )}
                          {prof.status === 'rejected' && (
                             <button 
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleApproveProfessor(prof);
                               }}
                               className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-300 transition-all uppercase tracking-wider"
                             >
                               Re-approve
                             </button>
                          )}
                          <button 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setProfDeleteId(prof.id);
                             }}
                             className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition-colors"
                             title="Wipe Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-10 w-10 text-slate-300" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No professor requests found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed Student Profile Modal - Classic Frame */}
      <AnimatePresence>
        {selectedDetailRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setSelectedDetailRecord(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
            >
              {/* Classic Title Bar */}
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-300" />
                  <span className="text-sm font-bold uppercase tracking-wider">Student Profile & Academic Record</span>
                </div>
                <button 
                  onClick={() => setSelectedDetailRecord(null)}
                  className="h-7 w-7 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                  title="Close Dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Classic Student Banner */}
              <div className="bg-slate-50 border-b border-slate-300 p-5 flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <div className="h-20 w-20 rounded border border-slate-300 bg-white p-1 shadow-sm shrink-0 flex items-center justify-center">
                  {studentProfiles[selectedDetailRecord.userId || ''] || selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto ? (
                    <img 
                      src={studentProfiles[selectedDetailRecord.userId || ''] || selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedDetailRecord.studentInfo.firstName} {selectedDetailRecord.studentInfo.middleName ? `${selectedDetailRecord.studentInfo.middleName} ` : ''}{selectedDetailRecord.studentInfo.lastName}
                    </h2>
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                      selectedDetailRecord.status === 'Enrolled' ? "text-emerald-800 bg-emerald-50 border-emerald-300" :
                      selectedDetailRecord.status === 'Pending' ? "text-amber-800 bg-amber-50 border-amber-300" :
                      "text-blue-800 bg-blue-50 border-blue-300"
                    )}>
                      {selectedDetailRecord.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-800">{selectedDetailRecord.course}</span> — {selectedDetailRecord.yearLevel} ({selectedDetailRecord.type})
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student ID: <span className="font-semibold text-slate-800">{selectedDetailRecord.studentId || selectedDetailRecord.studentInfo.studentId || 'Pending Assignment'}</span>
                  </p>
                </div>
                {user?.role === 'admin' && (
                  <Button 
                    onClick={() => {
                      handleOpenValidate(selectedDetailRecord);
                      setSelectedDetailRecord(null);
                    }}
                    className="h-9 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    {selectedDetailRecord.status === 'Enrolled' ? 'Edit Record' : 'Process Enrollment'}
                  </Button>
                )}
              </div>

              {/* Content Grid */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Personal Info */}
                  <div className="bg-white border border-slate-300 rounded-md p-4 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <User className="h-4 w-4 text-slate-600" />
                      <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Personal Information</h4>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Gender & Age</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.studentInfo.gender} — {selectedDetailRecord.studentInfo.age} years old</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Date of Birth</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.studentInfo.birthday}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Residential Address</span>
                        <span className="text-slate-800 font-medium leading-relaxed block">{selectedDetailRecord.studentInfo.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Contact & Academic */}
                  <div className="bg-white border border-slate-300 rounded-md p-4 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Phone className="h-4 w-4 text-slate-600" />
                      <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Contact & Registration</h4>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Email Address</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.studentInfo.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Mobile Contact</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.studentInfo.contactNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Student Type</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Assigned Section</span>
                        <span className="text-slate-800 font-bold">{selectedDetailRecord.section || selectedDetailRecord.studentInfo.section || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase text-[10px]">Application Timestamp</span>
                        <span className="text-slate-800 font-medium">{selectedDetailRecord.submittedAt ? new Date(selectedDetailRecord.submittedAt).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Uploaded Documents */}
                  <div className="bg-white border border-slate-300 rounded-md p-4 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <ShieldCheck className="h-4 w-4 text-slate-600" />
                      <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Document Validation</h4>
                    </div>
                    
                    {selectedDetailRecord.studentInfo.documents ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        {['summaryOfGrades', 'goodMoral', 'birthCertificate', 'twoByTwoPhoto'].map((docKey) => {
                          const docImg = selectedDetailRecord.studentInfo.documents?.[docKey as keyof typeof selectedDetailRecord.studentInfo.documents];
                          const label = docKey === 'twoByTwoPhoto' ? '2x2 Photo' : docKey.replace(/([A-Z])/g, ' $1').trim();
                          
                          return (
                            <div key={docKey} className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-600 uppercase block truncate">{label}</span>
                              <div 
                                className={cn(
                                  "aspect-[4/3] rounded border border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-blue-600 transition-all shadow-xs",
                                  !docImg && "opacity-40"
                                )}
                                onClick={() => docImg && setPreviewImage({ url: docImg, title: label })}
                              >
                                {docImg ? (
                                  <img src={docImg} alt={label} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 opacity-50">
                                    <File className="h-4 w-4 text-slate-400" />
                                    <span className="text-[8px] font-bold">MISSING</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-center">
                        <File className="h-6 w-6 text-slate-300 mb-1" />
                        <p className="text-xs font-semibold text-slate-400">No Documents Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Load (If Enrolled) */}
                {selectedDetailRecord.registrationForm && selectedDetailRecord.registrationForm.courses.length > 0 && (
                  <div className="bg-white border border-slate-300 rounded-md p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Current Enrolled Subjects & Courses</h4>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                        AY {selectedDetailRecord.registrationForm.academicYear} | Semester {selectedDetailRecord.registrationForm.semester}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedDetailRecord.registrationForm.courses.map((course, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 bg-white border border-slate-300 px-1.5 py-0.2 rounded text-[11px]">
                              {course.code}
                            </span>
                            <span className="font-semibold text-slate-600">
                              {course.units} Units
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 truncate">
                            {course.description}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            Section: <span className="text-slate-800">{course.section}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Classic Dialog Footer */}
              <div className="bg-slate-100 border-t border-slate-300 px-5 py-3 flex items-center justify-end gap-2 shrink-0">
                <Button 
                  variant="outline"
                  onClick={() => setSelectedDetailRecord(null)}
                  className="h-8 px-4 border-slate-300 rounded text-xs font-bold uppercase tracking-wider"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Validation Modal - Classic Frame */}
      <AnimatePresence>
        {isValidationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsValidationModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-left mx-auto flex flex-col max-h-[90vh]"
            >
              {/* Classic Title Bar */}
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Validate Enrollment Application</h3>
                  <p className="text-xs text-slate-300">Assign Student ID, Section, or Entrance Examination</p>
                </div>
                <button 
                  onClick={() => setIsValidationModalOpen(false)} 
                  className="h-7 w-7 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                  title="Close Dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Student summary card */}
                <div className="bg-slate-50 p-4 rounded-md border border-slate-300 flex items-center gap-4">
                  <div className="h-16 w-16 rounded border border-slate-300 bg-white shrink-0 overflow-hidden flex items-center justify-center">
                    {selectedRecord?.studentInfo.documents?.twoByTwoPhoto ? (
                      <img 
                        src={selectedRecord.studentInfo.documents.twoByTwoPhoto} 
                        alt="Profile" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                    <p className="text-xs text-slate-500">{selectedRecord?.studentInfo.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded">{selectedRecord?.course}</span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">{selectedRecord?.yearLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Document Check: Verified
                  </span>
                  <button 
                    onClick={() => setSelectedDetailRecord(selectedRecord)}
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 uppercase"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Dossier
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  {(selectedRecord?.yearLevel !== '1st Year' || (selectedRecord?.examDate && new Date(selectedRecord.examDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0))) ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Assign Student ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={validationData.studentId}
                          onChange={(e) => setValidationData({ ...validationData, studentId: e.target.value })}
                          placeholder="e.g. 2026-XXXXX"
                          className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Assign Section <span className="text-red-500">*</span>
                        </label>
                        <select 
                          className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                          value={validationData.section}
                          onChange={(e) => {
                            const newSection = e.target.value;
                            setValidationData({ ...validationData, section: newSection });
                            
                            if (selectedRecord?.yearLevel === '1st Year' && selectedRecord.secondChoice) {
                              const isSecondChoiceSection = newSection.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
                              const isFirstChoiceSection = newSection.toLowerCase().includes(selectedRecord.course.toLowerCase());
                              
                              if (isSecondChoiceSection && !isFirstChoiceSection) {
                                if (registrationData) {
                                  setRegistrationData({ ...registrationData, program: selectedRecord.secondChoice });
                                }
                              } else if (isFirstChoiceSection) {
                                if (registrationData) {
                                  setRegistrationData({ ...registrationData, program: selectedRecord.course });
                                }
                              }
                            }
                          }}
                        >
                          <option value="">Select Section</option>
                          {filteredSectionsForStudent.map(section => (
                            <option key={section.name} value={section.name}>
                              {section.name} ({sectionCounts[section.name] || 0} enrolled)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-2">
                        <Calendar className="h-4 w-4 text-blue-700" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Entrance Examination Details</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase">Exam Date</label>
                        <input
                          type="date"
                          value={validationData.examDate}
                          onChange={(e) => setValidationData({ ...validationData, examDate: e.target.value })}
                          className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 uppercase">Start Time</label>
                          <input
                            type="time"
                            value={validationData.examStartTime}
                            onChange={(e) => setValidationData({ ...validationData, examStartTime: e.target.value })}
                            className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-600"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 uppercase">End Time</label>
                          <input
                            type="time"
                            value={validationData.examEndTime}
                            onChange={(e) => setValidationData({ ...validationData, examEndTime: e.target.value })}
                            className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase">Exam Venue</label>
                        <input
                          value={validationData.examVenue}
                          onChange={(e) => setValidationData({ ...validationData, examVenue: e.target.value })}
                          placeholder="e.g., Computer Lab 1, 3rd Floor"
                          className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Classic Dialog Footer */}
              <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-end gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  className="h-8 px-4 rounded border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => setIsValidationModalOpen(false)}
                >
                  Cancel
                </Button>
                {(selectedRecord?.yearLevel !== '1st Year' || (selectedRecord?.examDate && new Date(selectedRecord.examDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0))) ? (
                  <Button 
                    className="h-8 px-4 rounded border border-blue-700 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider"
                    onClick={() => setIsRegistrationModalOpen(true)}
                    disabled={!validationData.studentId || !validationData.section}
                  >
                    Next: Fill Form
                  </Button>
                ) : (
                  <Button 
                    className="h-8 px-4 rounded border border-emerald-700 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider"
                    onClick={() => handleValidateSubmit('Validating')}
                    disabled={!validationData.examDate || !validationData.examVenue}
                  >
                    Schedule Exam
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Form Modal - Classic Frame */}
      <AnimatePresence>
        {isRegistrationModalOpen && registrationData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
            >
              {/* Classic Title Bar */}
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-slate-300" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Official Certificate of Matriculation & Registration</h3>
                    <p className="text-xs text-slate-300">Student: {selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRegistrationModalOpen(false)} 
                  className="h-7 w-7 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                  title="Close Dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
                {/* Header Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-md border border-slate-300 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Academic Year</label>
                    <input 
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      value={registrationData.academicYear} 
                      onChange={(e) => setRegistrationData({...registrationData, academicYear: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Semester</label>
                    <input 
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      value={registrationData.semester} 
                      onChange={(e) => setRegistrationData({...registrationData, semester: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Program / Degree</label>
                    <input 
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      value={registrationData.program} 
                      onChange={(e) => setRegistrationData({...registrationData, program: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Institute / Department</label>
                    <input 
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      value={registrationData.institute} 
                      onChange={(e) => setRegistrationData({...registrationData, institute: e.target.value})} 
                    />
                  </div>
                </div>

                {/* Courses Enrolled */}
                <div className="bg-white rounded-md border border-slate-300 shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Courses & Subjects Enrolled</h4>
                    <Button 
                      size="sm" 
                      className="h-7 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 text-[10px] font-bold uppercase tracking-wider" 
                      onClick={() => {
                        if (selectedRecord?.yearLevel === '1st Year' && registrationData.courses.length >= 10) {
                          toast.error("1st Year students are limited to 10 subjects only.");
                          return;
                        }
                        const newCourse = { code: '', description: '', section: validationData.section, lec: 0, lab: 0, compLab: 0, units: 3, rate: 250, fee: 750 };
                        setRegistrationData({
                          ...registrationData,
                          courses: [...registrationData.courses, newCourse]
                        });
                      }}
                    >
                      + Add Course
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
                          <th className="px-3 py-2">Subject Code</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Section</th>
                          <th className="px-2 py-2 text-center">Lec</th>
                          <th className="px-2 py-2 text-center">Lab</th>
                          <th className="px-2 py-2 text-center">Comp</th>
                          <th className="px-2 py-2 text-center">Units</th>
                          <th className="px-3 py-2 text-right">Fee</th>
                          <th className="px-2 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {registrationData.courses.map((course: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 min-w-[100px]">
                              <input 
                                className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs font-bold text-slate-900 focus:border-blue-600" 
                                value={course.code} 
                                placeholder="e.g. IT101"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].code = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 min-w-[200px]">
                              <input 
                                className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs text-slate-900 focus:border-blue-600" 
                                value={course.description} 
                                placeholder="e.g. Intro to Computing"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].description = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-24">
                              <input 
                                className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs font-semibold text-slate-900 text-center focus:border-blue-600" 
                                value={course.section} 
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].section = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-7 bg-white rounded border border-slate-300 text-xs text-slate-900 text-center focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.lec === 0 ? '' : course.lec} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].lec = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-7 bg-white rounded border border-slate-300 text-xs text-slate-900 text-center focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.lab === 0 ? '' : course.lab} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].lab = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-7 bg-white rounded border border-slate-300 text-xs text-slate-900 text-center focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.compLab === 0 ? '' : course.compLab} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].compLab = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-7 bg-white rounded border border-slate-300 text-xs font-bold text-slate-900 text-center focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.units === 0 ? '' : course.units} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].units = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 text-xs font-bold text-slate-800 text-right pr-3">
                              ₱{course.fee.toLocaleString()}
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                onClick={() => {
                                  const newCourses = registrationData.courses.filter((_: any, i: number) => i !== idx);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                                className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                title="Remove Subject"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-2.5 bg-slate-100 border-t border-slate-300 text-right px-4">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Total Units: <span className="text-blue-700 ml-1 font-extrabold">{registrationData.courses.reduce((acc: number, c: any) => acc + c.units, 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Fees and Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-md border border-slate-300 shadow-sm p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                      Assessed Tuition & Fees
                    </h4>
                    <div className="space-y-2">
                      {Object.keys(registrationData.assessedFees).map((key) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-700 uppercase">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <input 
                              type="number" 
                              className="w-24 h-7 text-right px-2 bg-white rounded border border-slate-300 text-xs font-semibold text-slate-900 focus:border-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              value={registrationData.assessedFees[key] === 0 ? '' : registrationData.assessedFees[key]} 
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                const newFees = {...registrationData.assessedFees, [key]: val};
                                const total = Object.keys(newFees).reduce((acc, k) => k === 'total' ? acc : acc + newFees[k], 0);
                                setRegistrationData({...registrationData, assessedFees: {...newFees, total}});
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 uppercase">Total Assessment</p>
                      <p className="text-base font-bold text-emerald-700">₱{registrationData.assessedFees.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-md border border-slate-300 shadow-sm p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                      Payment Verification
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Payment Mode</label>
                        <input 
                          className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs font-medium text-slate-900 focus:border-blue-600"
                          value={registrationData.paymentDetails.mode} 
                          onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, mode: e.target.value}})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Amount Paid</label>
                        <input 
                          className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs font-medium text-slate-900 focus:border-blue-600"
                          value={registrationData.paymentDetails.amount} 
                          onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, amount: e.target.value}})} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Transaction Date</label>
                      <input 
                        type="date"
                        className="w-full h-7 px-2 bg-white rounded border border-slate-300 text-xs font-medium text-slate-900 focus:border-blue-600"
                        value={registrationData.paymentDetails.date} 
                        onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, date: e.target.value}})} 
                      />
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded border border-blue-200 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-snug">Saving this form marks the student's status as Enrolled and generates their academic load.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Classic Dialog Footer */}
              <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  className="h-8 px-4 rounded border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => setIsRegistrationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="h-8 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded border border-emerald-900 text-xs font-bold uppercase tracking-wider" 
                  onClick={handleRegistrationSubmit}
                >
                  Finalize & Save Enrollment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col items-center justify-center"
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewImage.url;
                    link.download = `${previewImage.title.toLowerCase().replace(/\s+/g, '_')}.png`;
                    link.click();
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                  title="Download Document"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                />
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <h4 className="text-white font-bold text-xl drop-shadow-md">{previewImage.title}</h4>
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Full Image View</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Professor Sections Modal - Classic Frame */}
      <AnimatePresence>
        {isProfSectionsModalOpen && editingProf && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsProfSectionsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Assign Sections</h3>
                  <p className="text-xs text-slate-300">Professor: {editingProf.fullName}</p>
                </div>
                <button 
                  onClick={() => setIsProfSectionsModalOpen(false)} 
                  className="h-7 w-7 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={profSectionSearch}
                    onChange={(e) => setProfSectionSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Assigned Sections ({profSectionAssign[editingProf.id]?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white rounded border border-slate-300">
                    {(profSectionAssign[editingProf.id] || []).length > 0 ? (
                      profSectionAssign[editingProf.id].map(s => (
                        <div key={s} className="flex items-center gap-1.5 bg-slate-800 text-white px-2.5 py-1 rounded border border-slate-700 text-xs font-semibold">
                          {s}
                          <button 
                            onClick={() => {
                              const updated = profSectionAssign[editingProf.id].filter(sec => sec !== s);
                              setProfSectionAssign({ ...profSectionAssign, [editingProf.id]: updated });
                            }}
                            className="hover:text-red-400 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1">No sections assigned yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Available Sections ({editingProf.institute} Only)</p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {sections
                      .filter(s => {
                        const matchesSearch = s.name.toLowerCase().includes(profSectionSearch.toLowerCase());
                        const notAssigned = !(profSectionAssign[editingProf.id] || []).includes(s.name);
                        
                        // Institute filtering
                        const instituteCourses = COURSES.filter(c => c.institute === editingProf.institute).map(c => c.id.toLowerCase());
                        const sectionNameLower = s.name.toLowerCase();
                        const matchesInstitute = instituteCourses.some(courseId => sectionNameLower.includes(courseId));
                        
                        return matchesSearch && notAssigned && matchesInstitute;
                      })
                      .map(s => (
                        <button
                          key={s.name}
                          onClick={() => {
                            const current = profSectionAssign[editingProf.id] || [];
                            setProfSectionAssign({...profSectionAssign, [editingProf.id]: [...current, s.name]});
                          }}
                          className="flex items-center justify-between text-left px-3 py-2 rounded border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{s.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{s.yearLevel}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-700">+ Assign</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  className="h-8 px-4 rounded border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => setIsProfSectionsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="h-8 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-800 text-xs font-bold uppercase tracking-wider"
                  onClick={async () => {
                    if (editingProf.status === 'approved') {
                      try {
                        const sectionsArr = profSectionAssign[editingProf.id] || [];
                        const { doc, updateDoc, setDoc } = await import('firebase/firestore');
                        
                        // Update teacher request
                        await updateDoc(doc(db, 'teacher_requests', editingProf.id), { assignedSections: sectionsArr });
                        
                        // 1. Update user by UID (if they logged in already)
                        if ((editingProf as any).uid) {
                          await setDoc(doc(db, 'users', (editingProf as any).uid), { 
                            assignedSections: sectionsArr,
                            assignedSection: sectionsArr[0] || null 
                          }, { merge: true });
                        }
                        
                        // 2. Update user by username (original portal account)
                        await setDoc(doc(db, 'users', editingProf.username), { 
                            assignedSections: sectionsArr,
                            assignedSection: sectionsArr[0] || null 
                          }, { merge: true });

                        // 3. Update admins collection for Gmail/Portal access migration
                        const officialEmail = `${editingProf.username.toLowerCase()}@school.portal`;
                        const emailId = officialEmail;
                        await setDoc(doc(db, 'admins', emailId), { 
                          assignedSections: sectionsArr,
                          assignedSection: sectionsArr[0] || null 
                        }, { merge: true });

                        if (editingProf.email) {
                          const gmailId = editingProf.email;
                          await setDoc(doc(db, 'admins', gmailId), { 
                            assignedSections: sectionsArr,
                            assignedSection: sectionsArr[0] || null 
                          }, { merge: true });
                        }

                        toast.success("Professor sections updated successfully!");
                      } catch (e) {
                         console.error(e);
                         toast.error("Failed to update sections.");
                      }
                    }
                    setIsProfSectionsModalOpen(false);
                  }}
                >
                  {editingProf.status === 'pending' ? 'Confirm Sections' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal - Classic Frame */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-center p-6"
            >
              <div className="h-14 w-14 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Record?</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Are you sure you want to delete this record? This will completely reset the student's enrollment status. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-8 rounded border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 h-8 rounded bg-red-700 hover:bg-red-800 text-white border border-red-800 text-xs font-bold uppercase tracking-wider"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professor Delete Confirmation Modal - Classic Frame */}
      <AnimatePresence>
        {profDeleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setProfDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-center p-6"
            >
              <div className="h-14 w-14 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Professor?</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Are you sure you want to delete this professor account? All associated portal access and user data will be removed.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-8 rounded border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => setProfDeleteId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 h-8 rounded bg-red-700 hover:bg-red-800 text-white border border-red-800 text-xs font-bold uppercase tracking-wider"
                  onClick={confirmDeleteProfessor}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professor Reject Confirmation Modal - Classic Frame */}
      {profToReject && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-md border border-slate-300 shadow-2xl max-w-sm w-full overflow-hidden p-6 text-center"
          >
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <X className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {profToReject.isRevoke ? 'Revoke Professor Access?' : 'Reject Professor Request?'}
            </h3>
            <p className="text-slate-600 text-xs mb-6 leading-relaxed">
              {profToReject.isRevoke 
                ? `Are you sure you want to revoke ${profToReject.prof.fullName}'s access? They will be downgraded to a student account.`
                : `Are you sure you want to reject the application from ${profToReject.prof.fullName}?`}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setProfToReject(null)}
                className="flex-1 h-8 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeclineProfessor(profToReject.prof, profToReject.isRevoke);
                  setProfToReject(null);
                }}
                className="flex-1 h-8 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded border border-red-800 uppercase tracking-wider shadow-sm transition-colors"
              >
                {profToReject.isRevoke ? 'Revoke' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
