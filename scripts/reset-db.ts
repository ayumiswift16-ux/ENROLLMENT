import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import { MOCK_ENROLLMENTS } from '../src/mockData.js';

const cfg = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(cfg);
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function resetCollection(colName: string) {
  try {
    const snap = await getDocs(collection(db, colName));
    console.log(`Clearing collection '${colName}': found ${snap.size} documents...`);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
      console.log(`  - Deleted ${colName}/${d.id}`);
    }
  } catch (err: any) {
    console.error(`Error clearing ${colName}:`, err.message);
  }
}

async function main() {
  console.log('=== STARTING DATABASE RESET ===');

  // 1. Clear user-generated and test collections
  await resetCollection('users');
  await resetCollection('teacher_requests');
  await resetCollection('enrollments');
  await resetCollection('notifications');
  await resetCollection('admins');

  // 2. Re-seed default Administrator
  console.log('Seeding default administrator in admins collection...');
  await setDoc(doc(db, 'admins', 'davevenzon789@gmail.com'), {
    email: 'davevenzon789@gmail.com',
    name: 'Administrator',
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  // 3. Re-seed default System Settings
  console.log('Seeding default system settings...');
  await setDoc(doc(db, 'settings', 'enrollment'), {
    academicYear: '2025-2026',
    semester: '1',
    enrollmentStartDate: '2026-05-01',
    enrollmentEndDate: '2026-10-31'
  });

  // 4. Seed initial mock enrollments for fresh demo data
  console.log('Seeding initial mock enrollments...');
  for (const mock of MOCK_ENROLLMENTS) {
    await setDoc(doc(db, 'enrollments', mock.id), {
      ...mock,
      updatedAt: new Date().toISOString()
    });
    console.log(`  + Seeded enrollment ${mock.id} (${mock.studentInfo.firstName} ${mock.studentInfo.lastName})`);
  }

  console.log('=== DATABASE RESET COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal reset error:', err);
  process.exit(1);
});
