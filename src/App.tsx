/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { User, EnrollmentRecord } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enroll from './pages/Enroll';
import Records from './pages/Records';
import Courses from './pages/Courses';
import Settings from './pages/Settings';
import Scheduling from './pages/Scheduling';
import Steps from './pages/Steps';
import { MainLayout } from './components/layout/MainLayout';
import { PageTransition } from './components/layout/PageTransition';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeAdminDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners if auth state changes
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeAdminDoc) unsubscribeAdminDoc();
      unsubscribeUserDoc = null;
      unsubscribeAdminDoc = null;

      if (firebaseUser) {
        const isAdmin = firebaseUser.email === 'davevenzon789@gmail.com' || 
                        firebaseUser.email === 'admin@school.portal' ||
                        !!firebaseUser.email?.match(/^admin[0-9]*@school\.portal$/);
        
        if (isAdmin) {
          const adminUser: User = {
            uid: firebaseUser.uid,
            username: 'admin',
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Administrator',
            role: 'admin'
          };
          setUser(adminUser);
          localStorage.setItem('cdm_user', JSON.stringify(adminUser));
          setIsLoading(false);
          return;
        }

        // For non-admin accounts, verify if an established user document or professor document exists.
        let existingProfile: any = null;
        try {
          // 1. Check users doc by UID
          const uDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (uDoc.exists()) {
            existingProfile = uDoc.data();
          }

          // 2. Check users doc by username
          const username = firebaseUser.email?.split('@')[0]?.toLowerCase()?.replace(/\s+/g, '');
          if (!existingProfile && username) {
            const uNameDoc = await getDoc(doc(db, 'users', username));
            if (uNameDoc.exists()) {
              existingProfile = uNameDoc.data();
            }
          }

          // 3. Check users doc by email query
          if (!existingProfile && firebaseUser.email) {
            const uQ = query(collection(db, 'users'), where('email', '==', firebaseUser.email.toLowerCase()), limit(1));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              existingProfile = uSnap.docs[0].data();
            }
          }

          // 4. Check admins collection by email or UID
          if (firebaseUser.email) {
            const aDoc = await getDoc(doc(db, 'admins', firebaseUser.email.toLowerCase()));
            if (aDoc.exists()) {
              const aData = aDoc.data();
              existingProfile = { ...existingProfile, ...aData, role: aData.role || 'professor' };
            }
          }
          const aDocUid = await getDoc(doc(db, 'admins', firebaseUser.uid));
          if (aDocUid.exists()) {
            const aData = aDocUid.data();
            existingProfile = { ...existingProfile, ...aData, role: aData.role || 'professor' };
          }

          // 5. Check teacher_requests to see if professor is approved
          if (!existingProfile || existingProfile.role !== 'professor') {
            let trData: any = null;
            if (firebaseUser.email) {
              const trDoc = await getDoc(doc(db, 'teacher_requests', firebaseUser.email.toLowerCase()));
              if (trDoc.exists()) trData = trDoc.data();
            }
            if (!trData && username) {
              const trQ = query(collection(db, 'teacher_requests'), where('username', '==', username), limit(1));
              const trSnap = await getDocs(trQ);
              if (!trSnap.empty) trData = trSnap.docs[0].data();
            }
            if (trData && trData.status === 'approved') {
              existingProfile = {
                ...existingProfile,
                ...trData,
                role: 'professor',
                assignedSections: trData.assignedSections || [],
                assignedSection: trData.assignedSections?.[0] || null
              };
            }
          }
        } catch (checkErr) {
          console.warn("Auth state profile check:", checkErr);
        }

        // Fallback to local storage cache if previously authenticated
        if (!existingProfile) {
          try {
            const cached = JSON.parse(localStorage.getItem('cdm_user') || 'null');
            if (cached && (cached.uid === firebaseUser.uid || cached.email === firebaseUser.email)) {
              existingProfile = cached;
            }
          } catch (e) {}
        }

        if (!existingProfile) {
          // No profile registered in Colegio de Montalban yet.
          setUser(null);
          localStorage.removeItem('cdm_user');
          setIsLoading(false);
          return;
        }

        const initialUser: User = {
          uid: firebaseUser.uid,
          username: existingProfile.username || firebaseUser.email?.split('@')[0] || firebaseUser.uid,
          email: existingProfile.email || firebaseUser.email || '',
          name: existingProfile.name || existingProfile.fullName || firebaseUser.displayName || 'User',
          role: (existingProfile.role || 'student') as any,
          studentId: existingProfile.studentId,
          course: existingProfile.course,
          assignedSections: existingProfile.assignedSections || [],
          assignedSection: existingProfile.assignedSection || existingProfile.assignedSections?.[0] || null,
          institute: existingProfile.institute || 'ICS',
          ...existingProfile
        };
        
        setUser(initialUser);
        localStorage.setItem('cdm_user', JSON.stringify(initialUser));

        // Sync with users collection
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser(prev => {
              const updated = { ...prev, ...userData } as User;
              localStorage.setItem('cdm_user', JSON.stringify(updated));
              return updated;
            });
          }
        }, (err) => console.error("User doc error:", err));

        // Professor/Admin sync
        if (firebaseUser.email && !isAdmin) {
          const adminIds = [firebaseUser.email.toLowerCase(), firebaseUser.uid];
          const adminUnsubs = adminIds.map(id => 
            onSnapshot(doc(db, 'admins', id), (snap) => {
              if (snap.exists()) {
                const adminData = snap.data();
                
                setUser(prev => {
                  if (!prev) return prev;
                  if (prev.role === 'admin') return prev; // Never downgrade a hardcoded admin
                  
                  const updated = {
                    ...prev,
                    role: 'professor' as any,
                    assignedSections: adminData.assignedSections || prev.assignedSections || [],
                    assignedSection: adminData.assignedSection || adminData.assignedSections?.[0] || prev.assignedSection || null
                  };
                  localStorage.setItem('cdm_user', JSON.stringify(updated));
                  return updated;
                });
                
                // Check master request status for deletion (REAL-TIME)
                const emailToCheck = adminData.email || (id.includes('@') ? id : firebaseUser.email);
                if (emailToCheck) {
                  const reqRef = doc(db, 'teacher_requests', emailToCheck.toLowerCase());
                  const unsubReq = onSnapshot(reqRef, (reqSnap) => {
                    if (reqSnap.exists()) {
                      const reqData = reqSnap.data();
                      if (reqData.status === 'deleted' && (reqData.email === firebaseUser.email || (reqData.username && firebaseUser.email?.includes(reqData.username)))) {
                        console.warn("Professor account deleted by admin, signing out...");
                        signOut(auth);
                      }
                    }
                  });
                  (window as any)._teacherReqUnsubs = (window as any)._teacherReqUnsubs || [];
                  (window as any)._teacherReqUnsubs.push(unsubReq);
                }
              }
            }, (err) => {
              // Silently ignore permission errors
              if (err.code !== 'permission-denied') console.error("Admin sync error:", err);
            })
          );
          unsubscribeAdminDoc = () => adminUnsubs.forEach(unsub => unsub());
        }
      } else {
        setUser(null);
        localStorage.removeItem('cdm_user');
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeAdminDoc) unsubscribeAdminDoc();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" gutter={8} />
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={setUser} initialMode="login" /> : <Navigate to="/dashboard" replace />} 
        />
        <Route 
          path="/register" 
          element={!user ? <Login onLogin={setUser} initialMode="register" /> : <Navigate to="/dashboard" replace />} 
        />
        <Route 
          path="/create-account" 
          element={!user ? <Login onLogin={setUser} initialMode="register" /> : <Navigate to="/dashboard" replace />} 
        />
        
        <Route
          path="/*"
          element={
            user ? (
              <MainLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<PageTransition><Dashboard user={user} /></PageTransition>} />
                  <Route path="/enroll" element={<PageTransition><Enroll user={user} /></PageTransition>} />
                  <Route 
                    path="/records" 
                    element={
                      (user.role === 'admin' || user.role === 'professor')
                        ? <PageTransition><Records user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    } 
                  />
                  <Route path="/steps" element={<PageTransition><Steps /></PageTransition>} />
                  <Route path="/courses" element={<PageTransition><Courses /></PageTransition>} />
                  <Route 
                    path="/scheduling" 
                    element={
                      (user.role === 'admin' || user.role === 'professor' || user.role === 'student')
                        ? <PageTransition><Scheduling user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    }
                  />
                  <Route 
                    path="/settings" 
                    element={
                      user.role === 'admin' 
                        ? <PageTransition><Settings user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    } 
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

