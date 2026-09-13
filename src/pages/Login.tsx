import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  GraduationCap, 
  School, 
  Mail, 
  ArrowLeft, 
  RefreshCw, 
  KeyRound, 
  IdCard,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import toast from 'react-hot-toast';
import { User as UserType } from '../types';
import { cn } from '@/src/utils/cn';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  limit, 
  setDoc 
} from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: UserType) => void;
  initialMode?: AuthMode;
}

type AuthMode = 'login' | 'register';
type RegisterRole = 'student' | 'professor';

export default function Login({ onLogin, initialMode = 'login' }: LoginProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [registerRole, setRegisterRole] = useState<RegisterRole>('student');

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    institute: 'ICS' as 'ICS' | 'IBE' | 'ITE',
    course: 'BSIT'
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [resendingCode, setResendingCode] = useState(false);

  // Google Registration State
  const [googleVerified, setGoogleVerified] = useState(false);
  const [googleVerifiedAccount, setGoogleVerifiedAccount] = useState<{
    email: string;
    displayName: string;
    uid: string;
    photoURL?: string;
  } | null>(null);
  const [googleEnrolledId, setGoogleEnrolledId] = useState('');

  const navigate = useNavigate();

  // Switch between tabs cleanly
  const handleSwitchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsVerifying(false);
    setGoogleVerified(false);
    setGoogleVerifiedAccount(null);
    setGoogleEnrolledId('');
    setUserEnteredCode('');
  };

  // Step 1: Send 6-Digit Verification Code to Gmail
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    
    // Basic validations
    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error("Please provide a valid Gmail address.");
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters long.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if email is already in use
      try {
        // Check users collection for email or gmail
        const emailQ = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
        const emailSnap = await getDocs(emailQ);
        if (!emailSnap.empty) {
          toast.error("This email address is already registered in the system.");
          setLoading(false);
          return;
        }

        const gmailQ = query(collection(db, 'users'), where('gmail', '==', cleanEmail), limit(1));
        const gmailSnap = await getDocs(gmailQ);
        if (!gmailSnap.empty) {
          toast.error("This Gmail address is already registered in the system.");
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Could not check users collection by email:", checkErr);
      }

      // If professor, check teacher_requests
      if (registerRole === 'professor') {
        try {
          const reqDoc = await getDoc(doc(db, 'teacher_requests', cleanEmail));
          if (reqDoc.exists()) {
            const reqData = reqDoc.data();
            if (reqData.status === 'pending') {
              toast.error("A faculty application for this email is already pending approval.");
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Could not check teacher_requests doc:", e);
        }
      }

      // 2. Check if username is taken
      try {
        const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          toast.error("This username is already taken. Please choose another.");
          setLoading(false);
          return;
        }

        const trUserQ = query(collection(db, 'teacher_requests'), where('username', '==', cleanUsername), limit(1));
        const trUserSnap = await getDocs(trUserQ);
        if (!trUserSnap.empty) {
          toast.error("An account with this username is already registered or pending.");
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Could not check username uniqueness:", checkErr);
      }

      // 3. Generate 6-Digit Code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);

      // 4. Dispatch Email via API
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code,
          role: registerRole,
          name: formData.fullName.trim()
        }),
      });

      let result: any = {};
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.warn("Could not parse JSON response:", parseErr);
      }

      if (response.ok) {
        if (result.message?.includes("not configured") || result.code) {
          // Dev / fallback environment notification
          toast.success(`Verification Code: ${code}`, { 
            duration: 9000, 
            icon: '🔑' 
          });
        } else {
          toast.success(`6-Digit verification code sent to ${cleanEmail}!`);
        }
        setIsVerifying(true);
      } else {
        const errorMsg = result.message || result.error || "Failed to dispatch verification code.";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("Verification dispatch error:", error);
      toast.error(error.message || "Network error sending verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    setResendingCode(true);
    const cleanEmail = formData.email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);

    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code,
          role: registerRole,
          name: formData.fullName.trim()
        }),
      });

      let result: any = {};
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch (e) {}

      if (response.ok) {
        if (result.message?.includes("not configured") || result.code) {
          toast.success(`New Verification Code: ${code}`, { duration: 9000, icon: '🔑' });
        } else {
          toast.success(`New verification code sent to ${cleanEmail}!`);
        }
      } else {
        toast.error(result.message || "Failed to resend code.");
      }
    } catch (err) {
      toast.error("Failed to resend verification code.");
    } finally {
      setResendingCode(false);
    }
  };

  // Step 2: Confirm 6-Digit Code and Complete Account Creation
  const handleVerifyAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userEnteredCode.trim() !== verificationCode) {
      toast.error("Invalid verification code. Please check your Gmail.");
      return;
    }

    setLoading(true);
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const portalEmail = `${cleanUsername}@school.portal`;

    try {
      if (registerRole === 'student') {
        // === STUDENT ACCOUNT CREATION ===
        // 1. Create Firebase Auth account
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, portalEmail, formData.password);
          uid = userCredential.user.uid;
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            toast.error("An account with this username already exists.");
            setLoading(false);
            return;
          }
          throw authError;
        }

        // 2. Create user document in Firestore
        const newStudentDoc = {
          uid,
          username: cleanUsername,
          name: formData.fullName.trim(),
          fullName: formData.fullName.trim(),
          email: cleanEmail,
          gmail: cleanEmail,
          role: 'student',
          studentId: '', // Assigned upon enrollment validation
          course: formData.course || 'BSIT',
          createdAt: new Date().toISOString(),
          hasCompletedSetup: true
        };

        try {
          // Store by Auth UID
          await setDoc(doc(db, 'users', uid), newStudentDoc);
          // Also store by username for instant lookup during login resolution
          await setDoc(doc(db, 'users', cleanUsername), newStudentDoc);
        } catch (docErr) {
          console.warn("Could not save to users doc:", docErr);
        }

        // 3. Keep local cache for bulletproof client resolution
        try {
          const localStudents = JSON.parse(localStorage.getItem('cdm_registered_students') || '[]');
          localStudents.push({
            uid,
            username: cleanUsername,
            email: cleanEmail,
            name: formData.fullName.trim(),
            studentId: '',
            hasCompletedSetup: true
          });
          localStorage.setItem('cdm_registered_students', JSON.stringify(localStudents));
        } catch (e) {}

        // 4. Sign out so the user can experience the official institutional login sequence
        await signOut(auth);

        toast.success("Student account created successfully! You may now sign in.", { duration: 5000 });
        
        // Auto-fill the identifier in the Sign In form
        setIdentifier(cleanUsername);
        setAuthMode('login');
        setIsVerifying(false);
        setUserEnteredCode('');
        setFormData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          institute: 'ICS',
          course: 'BSIT'
        });

      } else {
        // === FACULTY / PROFESSOR APPLICATION ===
        // 1. Create Auth account
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, portalEmail, formData.password);
          uid = userCredential.user.uid;
        } catch (authError: any) {
          if (authError.code !== 'auth/email-already-in-use') {
            throw authError;
          }
        }

        // Sign out immediately as their faculty application requires admin approval
        await signOut(auth);

        // 2. Submit teacher_request
        await setDoc(doc(db, 'teacher_requests', cleanEmail), {
          fullName: formData.fullName.trim(),
          institute: formData.institute,
          username: cleanUsername,
          email: cleanEmail,
          uid: uid || null,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        toast.success("Faculty application submitted! Please wait for administrator approval.", { duration: 6000 });
        setAuthMode('login');
        setIsVerifying(false);
        setUserEnteredCode('');
        setFormData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          institute: 'ICS',
          course: 'BSIT'
        });
      }
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Complete Account Setup when signing up via Google
  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = (googleVerifiedAccount?.email || formData.email).trim().toLowerCase();
    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const portalEmail = `${cleanUsername}@school.portal`;

    // Validations
    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters long.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      toast.error("Username can only contain letters, numbers, hyphens, and periods.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if username is already taken
      try {
        const uDoc = await getDoc(doc(db, 'users', cleanUsername));
        if (uDoc.exists()) {
          toast.error("This username is already taken. Please choose another username.");
          setLoading(false);
          return;
        }

        const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          toast.error("This username is already taken. Please choose another username.");
          setLoading(false);
          return;
        }

        const trUserQ = query(collection(db, 'teacher_requests'), where('username', '==', cleanUsername), limit(1));
        const trUserSnap = await getDocs(trUserQ);
        if (!trUserSnap.empty) {
          toast.error("An account with this username is already registered or pending.");
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Username availability check warning:", checkErr);
      }

      // 2. Temporarily sign out of Google Auth session so we can create official portal credentials
      await signOut(auth);

      // 3. Create Firebase Auth account for Portal Username (${cleanUsername}@school.portal)
      let portalUid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, portalEmail, formData.password);
        portalUid = userCredential.user.uid;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          toast.error("This portal username is already in use. Please select a different username.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      // 4. Save User Profile in Firestore
      const newUserData: any = {
        uid: portalUid,
        googleUid: googleVerifiedAccount?.uid || '',
        username: cleanUsername,
        name: formData.fullName.trim(),
        fullName: formData.fullName.trim(),
        email: cleanEmail,
        gmail: cleanEmail,
        role: registerRole,
        studentId: googleEnrolledId || '',
        createdAt: new Date().toISOString(),
        hasCompletedSetup: true,
      };

      if (registerRole === 'student') {
        newUserData.course = formData.course || 'BSIT';
      } else {
        newUserData.institute = formData.institute || 'ICS';
        newUserData.status = 'pending';
      }

      // Store in users by Auth UID
      await setDoc(doc(db, 'users', portalUid), newUserData, { merge: true });
      // Store in users by Username for fast resolution
      await setDoc(doc(db, 'users', cleanUsername), newUserData, { merge: true });
      // Store in users by Google UID so future Google logins immediately find their profile
      if (googleVerifiedAccount?.uid) {
        await setDoc(doc(db, 'users', googleVerifiedAccount.uid), newUserData, { merge: true });
      }

      // Link enrollment if exists
      if (googleEnrolledId) {
        try {
          await setDoc(doc(db, 'enrollments', googleEnrolledId), { userId: portalUid }, { merge: true });
        } catch (linkErr) {
          console.warn("Could not auto-link enrollment doc:", linkErr);
        }
      }

      // Cache locally
      try {
        const localStudents = JSON.parse(localStorage.getItem('cdm_registered_students') || '[]');
        localStudents.push({
          uid: portalUid,
          username: cleanUsername,
          email: cleanEmail,
          name: formData.fullName.trim(),
          studentId: googleEnrolledId || '',
          hasCompletedSetup: true
        });
        localStorage.setItem('cdm_registered_students', JSON.stringify(localStudents));
      } catch (e) {}

      // 5. Handle Faculty Request vs Student Login
      if (registerRole === 'professor') {
        const teacherReqData: Record<string, any> = {
          id: cleanEmail,
          uid: portalUid,
          googleUid: googleVerifiedAccount?.uid || '',
          name: formData.fullName.trim(),
          fullName: formData.fullName.trim(),
          email: cleanEmail,
          gmail: cleanEmail,
          username: cleanUsername,
          institute: formData.institute || 'ICS',
          status: 'pending',
          role: 'professor',
          createdAt: new Date().toISOString()
        };

        if (formData.password) {
          teacherReqData.password = formData.password;
        }

        await setDoc(doc(db, 'teacher_requests', cleanEmail), teacherReqData);

        await signOut(auth);
        toast.success("Faculty account request submitted! Please await administrator approval before logging in.", { duration: 6000 });
        handleSwitchMode('login');
      } else {
        // Student login
        toast.success(`Account created! Welcome to Colegio de Montalban, ${formData.fullName.trim()}!`, { duration: 6000 });
        onLogin({
          uid: portalUid,
          username: cleanUsername,
          name: formData.fullName.trim(),
          email: cleanEmail,
          role: 'student',
          studentId: googleEnrolledId || undefined
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Error completing Google registration:", err);
      toast.error(err.message || "Failed to complete account registration.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Comprehensive Institutional Login (Supports Username, Student ID, or Gmail)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawInput = identifier.trim();
    if (!rawInput || !password) {
      toast.error("Please enter your login identifier and security password.");
      return;
    }

    setLoading(true);

    try {
      let resolvedPortalEmail = '';
      let resolvedUsername = '';
      let matchedUserData: any = null;

      // 1. Is the input an assigned Student ID? (e.g. 2024-00123, 2023-0104)
      try {
        const studentIdQ = query(collection(db, 'users'), where('studentId', '==', rawInput), limit(1));
        const studentIdSnap = await getDocs(studentIdQ);
        if (!studentIdSnap.empty) {
          matchedUserData = studentIdSnap.docs[0].data();
        }
      } catch (err) {
        console.warn("Could not query users by studentId:", err);
      }

      // Check enrollments by studentId if not found in users
      if (!matchedUserData) {
        try {
          const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', rawInput), limit(1));
          const enrollSnap = await getDocs(enrollQ);
          if (!enrollSnap.empty) {
            const enrollRec = enrollSnap.docs[0].data();
            if (enrollRec.userId) {
              const uDoc = await getDoc(doc(db, 'users', enrollRec.userId));
              if (uDoc.exists()) {
                matchedUserData = uDoc.data();
              } else {
                matchedUserData = { username: enrollRec.userId, email: enrollRec.studentInfo?.email };
              }
            }
          } else {
            const enrollQ2 = query(collection(db, 'enrollments'), where('studentInfo.studentId', '==', rawInput), limit(1));
            const enrollSnap2 = await getDocs(enrollQ2);
            if (!enrollSnap2.empty) {
              const enrollRec = enrollSnap2.docs[0].data();
              if (enrollRec.userId) {
                const uDoc = await getDoc(doc(db, 'users', enrollRec.userId));
                if (uDoc.exists()) {
                  matchedUserData = uDoc.data();
                } else {
                  matchedUserData = { username: enrollRec.userId, email: enrollRec.studentInfo?.email };
                }
              }
            }
          }
        } catch (enrollErr) {
          console.warn("Could not query enrollments by studentId:", enrollErr);
        }
      }

      // Check local cache if studentId still not found
      if (!matchedUserData) {
        try {
          const cached = JSON.parse(localStorage.getItem('cdm_registered_students') || '[]');
          const found = cached.find((s: any) => s.studentId === rawInput || s.username === rawInput.toLowerCase());
          if (found) {
            matchedUserData = found;
          }
        } catch (e) {}
      }

      // 2. Is the input a Gmail / Email?
      if (!matchedUserData && rawInput.includes('@')) {
        if (rawInput.endsWith('@school.portal')) {
          resolvedPortalEmail = rawInput.toLowerCase();
          resolvedUsername = rawInput.split('@')[0].toLowerCase();
        } else {
          // Look up user by email or gmail
          try {
            const emailQ = query(collection(db, 'users'), where('email', '==', rawInput.toLowerCase()), limit(1));
            const emailSnap = await getDocs(emailQ);
            if (!emailSnap.empty) {
              matchedUserData = emailSnap.docs[0].data();
            } else {
              const gmailQ = query(collection(db, 'users'), where('gmail', '==', rawInput.toLowerCase()), limit(1));
              const gmailSnap = await getDocs(gmailQ);
              if (!gmailSnap.empty) {
                matchedUserData = gmailSnap.docs[0].data();
              }
            }
          } catch (e) {
            console.warn("Could not search users by email:", e);
          }

          // Check teacher_requests by email
          if (!matchedUserData) {
            try {
              const reqDoc = await getDoc(doc(db, 'teacher_requests', rawInput.toLowerCase()));
              if (reqDoc.exists()) {
                const reqData = reqDoc.data();
                matchedUserData = { username: reqData.username, role: 'professor' };
              }
            } catch (e) {}
          }
        }
      }

      // 3. Resolve to portal email
      if (matchedUserData?.username) {
        resolvedUsername = matchedUserData.username.toLowerCase().replace(/\s+/g, '');
        resolvedPortalEmail = `${resolvedUsername}@school.portal`;
      } else if (!resolvedPortalEmail) {
        // Standard username entry (e.g. "admin1", "davevenzon")
        const cleanUser = rawInput.toLowerCase().replace(/\s+/g, '');
        resolvedUsername = cleanUser;
        resolvedPortalEmail = `${cleanUser}@school.portal`;
      }

      // 4. Perform Authentication with Firebase Auth
      let userCredential = null;
      try {
        userCredential = await signInWithEmailAndPassword(auth, resolvedPortalEmail, password);
      } catch (authError: any) {
        // If initial portal email fails and input had '@', attempt direct email login
        if (rawInput.includes('@') && rawInput !== resolvedPortalEmail) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, rawInput.toLowerCase(), password);
          } catch (secondaryError) {
            throw authError; // rethrow primary error for clearer message
          }
        } else {
          throw authError;
        }
      }

      const fbUser = userCredential.user;

      // 5. Post-Login Status & Role Resolution
      const isAdmin = (fbUser.email && (fbUser.email.toLowerCase() === 'davevenzon789@gmail.com' || !!fbUser.email.toLowerCase().match(/^admin[1-5]@school\.portal$/))) || resolvedUsername.startsWith('admin');
      
      if (isAdmin) {
        const adminUser: UserType = {
          uid: fbUser.uid,
          email: fbUser.email || resolvedPortalEmail,
          name: fbUser.displayName || 'Administrator',
          username: resolvedUsername || 'admin',
          role: 'admin',
        };
        localStorage.setItem('cdm_user', JSON.stringify(adminUser));
        onLogin(adminUser);
        toast.success("Welcome back, Administrator!");
        navigate('/dashboard');
        return;
      }

      // Check if user is a Professor in teacher_requests, admins, or users
      let profData: any = null;
      try {
        // Query teacher_requests by username
        if (resolvedUsername) {
          const trQuery = query(collection(db, 'teacher_requests'), where('username', '==', resolvedUsername), limit(1));
          const trSnap = await getDocs(trQuery);
          if (!trSnap.empty) {
            profData = trSnap.docs[0].data();
          }
        }
        // If not found, check by rawInput or email
        if (!profData && rawInput.includes('@')) {
          const trDoc = await getDoc(doc(db, 'teacher_requests', rawInput.toLowerCase()));
          if (trDoc.exists()) {
            profData = trDoc.data();
          }
        }
        // Check admins doc
        if (!profData && resolvedPortalEmail) {
          const aDoc = await getDoc(doc(db, 'admins', resolvedPortalEmail.toLowerCase()));
          if (aDoc.exists()) profData = aDoc.data();
        }
        if (!profData) {
          const aDocUid = await getDoc(doc(db, 'admins', fbUser.uid));
          if (aDocUid.exists()) profData = aDocUid.data();
        }
      } catch (checkErr) {
        console.warn("Post-login status check warning:", checkErr);
      }

      // Handle Pending / Rejected faculty applications
      if (profData) {
        if (profData.status === 'pending') {
          await auth.signOut();
          toast.error("Account Pending: Your faculty application is still awaiting administrator approval.");
          setLoading(false);
          return;
        } else if (profData.status === 'rejected' || profData.status === 'deleted') {
          await auth.signOut();
          const reason = profData.status === 'rejected' && profData.rejectedBy 
            ? `rejected by ${profData.rejectedBy}` 
            : profData.status;
          toast.error(`Access Denied: Your faculty account has been ${reason}.`);
          setLoading(false);
          return;
        }
      }

      // 6. Handle Approved Professor Login
      const isProfessor = (profData && profData.status === 'approved') || profData?.role === 'professor';
      if (isProfessor) {
        const profName = profData.fullName || profData.name || 'Faculty Member';
        const assignedSections = profData.assignedSections || (profData.assignedSection ? [profData.assignedSection] : []);
        
        const profUser: UserType = {
          uid: fbUser.uid,
          email: resolvedPortalEmail || fbUser.email || `${resolvedUsername}@school.portal`,
          name: profName,
          fullName: profName,
          username: resolvedUsername,
          role: 'professor',
          assignedSections,
          assignedSection: assignedSections[0] || null,
          institute: profData.institute || 'ICS',
          status: 'approved'
        };

        // Self-heal and sync user & admin documents for this UID
        try {
          await setDoc(doc(db, 'users', fbUser.uid), profUser, { merge: true });
          if (resolvedUsername) {
            await setDoc(doc(db, 'users', resolvedUsername), profUser, { merge: true });
          }
          await setDoc(doc(db, 'admins', fbUser.uid), profUser, { merge: true });
          if (resolvedPortalEmail) {
            await setDoc(doc(db, 'admins', resolvedPortalEmail.toLowerCase()), profUser, { merge: true });
          }
        } catch (syncErr) {
          console.warn("Professor doc auto-heal warning:", syncErr);
        }

        localStorage.setItem('cdm_user', JSON.stringify(profUser));
        onLogin(profUser);
        toast.success(`Welcome back, Professor ${profName}!`);
        navigate('/dashboard');
        return;
      }

      // 7. Handle Student Login
      let userDocData: any = null;
      try {
        let userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
        
        // If user doc doesn't exist by UID, try by username
        if (!userDocSnap.exists() && resolvedUsername) {
          const altDoc = await getDoc(doc(db, 'users', resolvedUsername));
          if (altDoc.exists()) {
            const data = altDoc.data();
            await setDoc(doc(db, 'users', fbUser.uid), { ...data, uid: fbUser.uid }, { merge: true });
            userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
          }
        }

        if (userDocSnap.exists()) {
          userDocData = userDocSnap.data();
        }

        // Sync studentId if student was enrolled
        if (userDocData && !userDocData.studentId) {
          const enrollQ = query(collection(db, 'enrollments'), where('userId', '==', fbUser.uid), limit(1));
          const enrollSnap = await getDocs(enrollQ);
          if (!enrollSnap.empty) {
            const enrollData = enrollSnap.docs[0].data();
            const sid = enrollData.studentId || enrollData.studentInfo?.studentId;
            if (sid) {
              await setDoc(doc(db, 'users', fbUser.uid), { studentId: sid }, { merge: true });
              userDocData.studentId = sid;
            }
          }
        }
      } catch (syncErr) {
        console.warn("Student user doc sync warning:", syncErr);
      }

      const studentName = userDocData?.name || userDocData?.fullName || matchedUserData?.name || resolvedUsername;
      const studentUser: UserType = {
        uid: fbUser.uid,
        email: userDocData?.email || fbUser.email || resolvedPortalEmail,
        name: studentName,
        username: resolvedUsername,
        role: (userDocData?.role || 'student') as any,
        studentId: userDocData?.studentId || matchedUserData?.studentId,
        course: userDocData?.course || matchedUserData?.course || 'BSIT',
        ...userDocData
      };

      localStorage.setItem('cdm_user', JSON.stringify(studentUser));
      onLogin(studentUser);
      toast.success(`Welcome back, ${studentName}!`);
      navigate('/dashboard');

    } catch (authError: any) {
      console.error("Authentication error:", authError);
      const code = authError.code;
      let errorMsg = "Login failed. Please check your credentials.";

      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        errorMsg = "Incorrect username, student ID, or password.";
      } else if (code === 'auth/too-many-requests') {
        errorMsg = "Too many failed attempts. Please try again in a few minutes.";
      } else if (code === 'auth/user-disabled') {
        errorMsg = "This portal account has been disabled. Please contact the registrar.";
      } else if (code === 'auth/invalid-email') {
        errorMsg = "Invalid account format. Please enter a valid username or student ID.";
      }

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Google Login (Allows registered students to log in seamlessly with Gmail)
  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      if (!gUser.email) {
        throw new Error("No email found on Google account.");
      }

      const emailId = gUser.email.toLowerCase();

      // 1. Check if Administrator (davevenzon789@gmail.com or admin[1-5])
      const isAdmin = emailId === 'davevenzon789@gmail.com' || !!emailId.match(/^admin[1-5]@school\.portal$/);
      if (isAdmin) {
        const adminUser: UserType = {
          uid: gUser.uid,
          email: emailId,
          name: gUser.displayName || 'Administrator',
          username: 'admin',
          role: 'admin',
        };
        onLogin(adminUser);
        toast.success("Welcome back, Administrator!");
        navigate('/dashboard');
        return;
      }

      // 2. Check if Professor in admins collection
      let existingAdminRecord: any = null;
      try {
        const aDoc = await getDoc(doc(db, 'admins', emailId));
        if (aDoc.exists()) existingAdminRecord = aDoc.data();
        if (!existingAdminRecord) {
          const aDocUid = await getDoc(doc(db, 'admins', gUser.uid));
          if (aDocUid.exists()) existingAdminRecord = aDocUid.data();
        }
      } catch (e) {}

      if (existingAdminRecord) {
        const role = existingAdminRecord.role || 'professor';
        const profUser: UserType = {
          ...existingAdminRecord,
          uid: gUser.uid,
          email: emailId,
          name: existingAdminRecord.name || gUser.displayName || 'Faculty Member',
          username: existingAdminRecord.username || emailId.split('@')[0],
          role,
        };
        localStorage.setItem('cdm_user', JSON.stringify(profUser));
        onLogin(profUser);
        toast.success(`Welcome back, ${profUser.name}!`);
        navigate('/dashboard');
        return;
      }

      // 3. Check teacher_requests
      try {
        const trDoc = await getDoc(doc(db, 'teacher_requests', emailId));
        if (trDoc.exists()) {
          const reqData = trDoc.data();
          if (reqData.status === 'pending') {
            await auth.signOut();
            toast.error("Account Pending: Your faculty application is awaiting administrator approval.");
            setLoading(false);
            return;
          } else if (reqData.status === 'rejected' || reqData.status === 'deleted') {
            await auth.signOut();
            const reason = reqData.status === 'rejected' && reqData.rejectedBy 
              ? `rejected by ${reqData.rejectedBy}` 
              : reqData.status;
            toast.error(`Access Denied: Your account has been ${reason}.`);
            setLoading(false);
            return;
          } else if (reqData.status === 'approved') {
            const profName = reqData.fullName || reqData.name || gUser.displayName || 'Faculty Member';
            const assignedSections = reqData.assignedSections || (reqData.assignedSection ? [reqData.assignedSection] : []);
            const profUser: UserType = {
              uid: gUser.uid,
              email: emailId,
              name: profName,
              fullName: profName,
              username: reqData.username || emailId.split('@')[0],
              role: 'professor',
              assignedSections,
              assignedSection: assignedSections[0] || null,
              institute: reqData.institute || 'ICS',
              status: 'approved'
            };
            await setDoc(doc(db, 'users', gUser.uid), profUser, { merge: true });
            await setDoc(doc(db, 'admins', emailId), profUser, { merge: true });
            await setDoc(doc(db, 'admins', gUser.uid), profUser, { merge: true });
            localStorage.setItem('cdm_user', JSON.stringify(profUser));
            onLogin(profUser);
            toast.success(`Welcome back, Professor ${profName}!`);
            navigate('/dashboard');
            return;
          }
        }
      } catch (trErr) {
        console.warn("Could not check teacher_requests doc:", trErr);
      }

      // 4. Check if student already registered in users collection
      let existingStudentRecord: any = null;
      try {
        const uidDoc = await getDoc(doc(db, 'users', gUser.uid));
        if (uidDoc.exists()) {
          existingStudentRecord = uidDoc.data();
        }
      } catch (e) {}

      if (!existingStudentRecord) {
        try {
          const uQ1 = query(collection(db, 'users'), where('email', '==', emailId), limit(1));
          const snap1 = await getDocs(uQ1);
          if (!snap1.empty) {
            existingStudentRecord = snap1.docs[0].data();
          } else {
            const uQ2 = query(collection(db, 'users'), where('gmail', '==', emailId), limit(1));
            const snap2 = await getDocs(uQ2);
            if (!snap2.empty) {
              existingStudentRecord = snap2.docs[0].data();
            } else {
              const uQ3 = query(collection(db, 'users'), where('googleUid', '==', gUser.uid), limit(1));
              const snap3 = await getDocs(uQ3);
              if (!snap3.empty) {
                existingStudentRecord = snap3.docs[0].data();
              }
            }
          }
        } catch (e) {
          console.warn("Could not query existing student by email:", e);
        }
      }

      // Check local cache
      if (!existingStudentRecord) {
        try {
          const cached = JSON.parse(localStorage.getItem('cdm_registered_students') || '[]');
          const found = cached.find((s: any) => s.email?.toLowerCase() === emailId || s.uid === gUser.uid);
          if (found) {
            existingStudentRecord = found;
          }
        } catch (e) {}
      }

      // Check if student has an enrollment record
      let enrolledStudentId = '';
      try {
        const enrollQ = query(collection(db, 'enrollments'), where('studentInfo.email', '==', emailId), limit(1));
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          const enrollData = enrollSnap.docs[0].data();
          enrolledStudentId = enrollData.studentId || enrollData.studentInfo?.studentId || '';
        }
      } catch (e) {}

      // 5. Check if user already has an established account
      const hasEstablishedAccount = Boolean(
        existingStudentRecord && 
        (existingStudentRecord.username || existingStudentRecord.studentId || existingStudentRecord.role)
      );

      if (hasEstablishedAccount) {
        // User is already registered: Log them straight into the portal!
        const baseUserData: any = {
          ...existingStudentRecord,
          uid: existingStudentRecord.uid || gUser.uid,
          email: emailId,
          gmail: emailId,
          name: existingStudentRecord?.fullName || existingStudentRecord?.name || gUser.displayName || 'Student',
          fullName: existingStudentRecord?.fullName || existingStudentRecord?.name || gUser.displayName || 'Student',
          role: existingStudentRecord?.role || 'student',
          username: existingStudentRecord?.username || emailId.split('@')[0],
          hasCompletedSetup: true,
        };

        if (existingStudentRecord?.studentId || enrolledStudentId) {
          baseUserData.studentId = existingStudentRecord?.studentId || enrolledStudentId;
        }

        try {
          await setDoc(doc(db, 'users', gUser.uid), baseUserData, { merge: true });
          if (existingStudentRecord?.uid && existingStudentRecord.uid !== gUser.uid) {
            await setDoc(doc(db, 'users', existingStudentRecord.uid), { googleUid: gUser.uid }, { merge: true });
          }
        } catch (e) {}

        onLogin(baseUserData);
        toast.success(`Welcome back, ${baseUserData.name}!`);
        navigate('/dashboard');
        return;
      }

      // 6. User has NO account in Colegio de Montalban yet:
      // Direct them immediately to the Creation Page to choose Username & Password!
      // Sign out from the temporary session so App.tsx does not redirect to dashboard:
      await signOut(auth);

      setGoogleVerifiedAccount({
        email: emailId,
        displayName: gUser.displayName || '',
        uid: gUser.uid,
        photoURL: gUser.photoURL || ''
      });
      setGoogleEnrolledId(enrolledStudentId);
      setGoogleVerified(true);

      const suggestedUsername = emailId.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      setFormData(prev => ({
        ...prev,
        fullName: gUser.displayName || prev.fullName || '',
        email: emailId,
        username: suggestedUsername,
        password: '',
        confirmPassword: '',
        course: prev.course || 'BSIT',
        institute: prev.institute || 'ICS'
      }));

      // Switch to Creation Page directly!
      setAuthMode('register');
      setIsVerifying(false);
      setLoading(false);

      toast.success("Google account verified! Please choose your official Username & Password below to complete account creation.", {
        duration: 7000,
        icon: '🔑'
      });
      navigate('/register');
      return;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Google sign-in was cancelled.");
      } else {
        console.error("Google login error:", error);
        toast.error("Failed to sign in with Google account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-x-hidden font-sans bg-slate-900">
      {/* Background Campus Photo with Institutional Overlay */}
      <img 
        src={`${import.meta.env.BASE_URL}school-bg.jpg`}
        alt="School Campus"
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-25"
        referrerPolicy="no-referrer"
      />
      <div className="fixed inset-0 z-0 bg-[#031d13]/85" />

      <div className="w-full max-w-md relative z-10 my-8">
        <div className="bg-white rounded-md border border-slate-300 shadow-2xl overflow-hidden text-left">
          
          {/* Institutional Header Banner */}
          <div className="bg-[#052e16] text-white px-6 py-5 border-b-2 border-emerald-700 flex items-center gap-4">
            <div className="h-14 w-14 bg-white rounded border border-emerald-800 p-1 shrink-0 flex items-center justify-center shadow-sm">
              <img 
                src={`${import.meta.env.BASE_URL}cdm-logo.png`} 
                alt="Colegio de Montalban Seal" 
                className="h-11 w-11 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <h1 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">Colegio de Montalban</h1>
              <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider mt-0.5">Student Information & Enrollment System</span>
              <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5">Official Academic Portal</span>
            </div>
          </div>

          {/* Institutional Mode Switcher (Sign In vs Create Account) */}
          <div className="grid grid-cols-2 bg-slate-200 border-b border-slate-300 p-1 gap-1 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={cn(
                "py-2.5 px-3 rounded transition-all text-center flex items-center justify-center gap-2",
                authMode === 'login'
                  ? "bg-white text-[#064e3b] shadow-sm border border-slate-300"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={cn(
                "py-2.5 px-3 rounded transition-all text-center flex items-center justify-center gap-2",
                authMode === 'register'
                  ? "bg-white text-[#064e3b] shadow-sm border border-slate-300"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <User className="h-3.5 w-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          <div className="p-6 md:p-8 bg-slate-50 space-y-4 text-slate-800">
            
            {/* === MODE: SIGN IN === */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Information Callout */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-start gap-2.5 text-xs text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Log in with your <strong>Username</strong>, assigned <strong>Student ID</strong> (e.g. 2024-00123), or registered <strong>Gmail</strong>.
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Portal Username / Student ID / Gmail
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. juan123, 2024-00123, or user@gmail.com"
                        className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Security Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your security password"
                        className="w-full h-9 pl-9 pr-10 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 h-3.5 w-3.5" />
                    <span>Remember login</span>
                  </label>
                  <span className="text-slate-500 text-[11px] font-medium">Registrar Accounts [1-5]</span>
                </div>

                <Button
                  type="submit"
                  className={cn(
                    "w-full h-9 rounded bg-[#064e3b] hover:bg-[#043d2e] active:bg-[#022c21] text-white font-bold text-xs uppercase tracking-wider border border-[#043d2e] shadow-sm transition-colors",
                    loading && "opacity-80"
                  )}
                  isLoading={loading}
                >
                  Enter Institutional Portal
                </Button>

                {/* Google Authentication Section */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                    <span className="bg-slate-50 px-3 text-slate-500">Student & Google Authentication</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full h-9 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-300 shadow-sm transition-colors flex items-center justify-center gap-2.5"
                  disabled={loading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Sign in with Google Account</span>
                </Button>

                {/* Create Account Link Footer */}
                <div className="pt-3 border-t border-slate-200 flex flex-col items-center gap-1.5 text-center">
                  <div className="text-xs text-slate-600">
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('register')}
                      className="font-bold text-[#064e3b] hover:text-[#043d2e] hover:underline uppercase tracking-wider"
                    >
                      Create Account
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Authorized Personnel & Enrolled Students Only
                  </p>
                </div>
              </form>
            )}

            {/* === MODE: CREATE ACCOUNT (DUAL-ROLE: STUDENT OR PROFESSOR) === */}
            {authMode === 'register' && (
              <div>
                {/* 6-Digit Code Verification Sub-View */}
                {isVerifying ? (
                  <form onSubmit={handleVerifyAndCreateAccount} className="space-y-4">
                    <div className="text-center pb-2 border-b border-slate-200">
                      <div className="h-10 w-10 bg-emerald-100 rounded border border-emerald-300 flex items-center justify-center mx-auto mb-2 text-emerald-800">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Gmail 6-Digit Verification
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Enter the verification code dispatched to:<br />
                        <strong className="text-slate-900">{formData.email}</strong>
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center">
                          6-Digit Verification Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={userEnteredCode}
                          onChange={(e) => setUserEnteredCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-12 text-center tracking-[0.6em] text-2xl font-bold rounded border border-slate-300 bg-white text-slate-900 focus:border-emerald-700 focus:outline-none shadow-inner font-mono"
                          placeholder="000000"
                          autoFocus
                          required
                        />
                      </div>

                      <p className="text-[11px] text-slate-500 text-center">
                        Did not receive code?{' '}
                        <button 
                          type="button" 
                          onClick={handleResendCode}
                          disabled={resendingCode}
                          className="text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          {resendingCode && <RefreshCw className="h-3 w-3 animate-spin" />}
                          Resend Code
                        </button>
                      </p>
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button
                        type="submit"
                        className="w-full h-9 rounded bg-[#064e3b] hover:bg-[#043d2e] active:bg-[#022c21] text-white font-bold text-xs uppercase tracking-wider border border-[#043d2e] shadow-sm transition-colors"
                        isLoading={loading}
                      >
                        {registerRole === 'student' ? 'Verify & Create Student Account' : 'Confirm & Submit Application'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsVerifying(false)}
                        className="w-full h-9 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-300 shadow-sm transition-colors"
                      >
                        Edit Details / Back
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Account Details Registration Form */
                  <form onSubmit={googleVerified ? handleCompleteGoogleRegistration : handleSendVerification} className="space-y-3.5">
                    
                    {/* Role Selection Tabs (Student vs Professor) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Select Account Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRegisterRole('student')}
                          className={cn(
                            "py-2 px-3 rounded border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors",
                            registerRole === 'student'
                              ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          )}
                        >
                          <GraduationCap className="h-4 w-4" />
                          <span>Student</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegisterRole('professor')}
                          className={cn(
                            "py-2 px-3 rounded border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors",
                            registerRole === 'professor'
                              ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          )}
                        >
                          <School className="h-4 w-4" />
                          <span>Faculty / Prof</span>
                        </button>
                      </div>
                    </div>

                    {/* Role Description Badge or Google Verification Banner */}
                    {googleVerified ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 flex items-start gap-2.5 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">Google Identity Verified</span>
                            <span className="font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {googleVerifiedAccount?.email}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Your Gmail account is verified. Choose your <strong>Portal Username</strong> and <strong>Security Password</strong> below to finish your official registration.
                          </p>
                          {googleEnrolledId && (
                            <div className="mt-1 inline-flex items-center gap-1 bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">
                              <IdCard className="h-3 w-3" />
                              <span>Official Student ID Linked: #{googleEnrolledId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-950 flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>
                          {registerRole === 'student'
                            ? "Student Registration: Requires a valid Gmail address to receive a 6-digit verification code. Student ID will be assigned upon enrollment validation."
                            : "Faculty Registration: Requires 6-digit email verification and administrative review before access is activated."}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {/* Full Name */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder={registerRole === 'student' ? "e.g. Juan Dela Cruz" : "e.g. Dr. Juan Dela Cruz"}
                          className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                          required
                        />
                      </div>

                      {/* Student Program OR Professor Institute */}
                      {registerRole === 'student' ? (
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Intended Academic Program / Course
                          </label>
                          <select
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                          >
                            <option value="BSIT">BS Information Technology (BSIT)</option>
                            <option value="BSCPE">BS Computer Engineering (BSCPE)</option>
                            <option value="BSBA HRM">BSBA Human Resource Management</option>
                            <option value="BS ENTREP">BS Entrepreneurship</option>
                            <option value="BEEd Gen">Bachelor of Elementary Education (BEEd)</option>
                            <option value="BECEd">Bachelor of Early Childhood Education (BECEd)</option>
                            <option value="BTLED-ICT">BTLED - ICT Specialization</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Academic Institute
                          </label>
                          <select
                            value={formData.institute}
                            onChange={(e) => setFormData({ ...formData, institute: e.target.value as any })}
                            className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                            required
                          >
                            <option value="ICS">Institute of Computer Studies (ICS)</option>
                            <option value="IBE">Institute of Business and Entrepreneurship (IBE)</option>
                            <option value="ITE">Institute of Teacher Education (ITE)</option>
                          </select>
                        </div>
                      )}

                      {/* Gmail Address */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Gmail Address
                          </label>
                          {googleVerified ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified by Google
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-normal text-[10px]">
                              (6-digit verification code will be sent here)
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="email"
                            value={formData.email}
                            readOnly={googleVerified}
                            onChange={(e) => !googleVerified && setFormData({ ...formData, email: e.target.value })}
                            placeholder="username@gmail.com"
                            className={cn(
                              "w-full h-8 pl-8 pr-2.5 rounded border text-xs text-slate-900 font-medium",
                              googleVerified
                                ? "bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed"
                                : "bg-white border-slate-300 focus:border-emerald-700 focus:outline-none"
                            )}
                            required
                          />
                        </div>
                      </div>

                      {/* Desired Username */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Desired Portal Username
                        </label>
                        <div className="relative">
                          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="e.g. juandc24"
                            className="w-full h-8 pl-8 pr-2.5 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:border-emerald-700 focus:outline-none font-medium"
                            required
                          />
                        </div>
                      </div>

                      {/* Password & Confirm Password */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Password
                          </label>
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Min 6 chars"
                            className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Confirm Password
                          </label>
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="Repeat password"
                            className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showRegPassword}
                            onChange={() => setShowRegPassword(!showRegPassword)}
                            className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 h-3 w-3"
                          />
                          <span>Show passwords</span>
                        </label>
                        <span>At least 6 characters</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button
                        type="submit"
                        className="w-full h-9 rounded bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs uppercase tracking-wider border border-[#043d2e] shadow-sm transition-colors flex items-center justify-center gap-2"
                        isLoading={loading}
                      >
                        {googleVerified ? (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            <span>Complete Registration & Set Password</span>
                          </>
                        ) : (
                          <span>Send 6-Digit Verification Code</span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSwitchMode('login')}
                        className="w-full h-9 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-300 shadow-sm transition-colors"
                      >
                        Return to Sign In
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Institutional Card Footer */}
          <div className="bg-slate-100 px-6 py-3 border-t border-slate-300 text-center text-[10px] text-slate-500 font-medium space-y-0.5">
            <p className="font-semibold text-slate-600">Republic of the Philippines • Municipality of Rodriguez, Rizal</p>
            <p>© Colegio de Montalban. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
