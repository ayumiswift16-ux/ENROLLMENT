import { Day } from '../types';

export interface SubjectPreset {
  code: string;
  title: string;
  program: string; // 'ALL' | 'BSIT' | 'BSCPE' | 'BSBA' | 'BEED' | 'BSED'
  type: 'Lecture' | 'Laboratory';
  units: number;
}

export const CURRICULUM_SUBJECTS: SubjectPreset[] = [
  // General Education (All Programs)
  { code: 'GE 101', title: 'Purposive Communication', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 102', title: 'Understanding the Self', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 103', title: 'Readings in Philippine History', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 104', title: 'Mathematics in the Modern World', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 105', title: 'Art Appreciation', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 106', title: 'Ethics', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 107', title: 'Science, Technology, and Society', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'GE 108', title: 'The Contemporary World', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'PE 101', title: 'Physical Education 1 (Physical Fitness)', program: 'ALL', type: 'Lecture', units: 2 },
  { code: 'PE 102', title: 'Physical Education 2 (Rhythmic Activities)', program: 'ALL', type: 'Lecture', units: 2 },
  { code: 'PE 103', title: 'Physical Education 3 (Individual & Dual Sports)', program: 'ALL', type: 'Lecture', units: 2 },
  { code: 'PE 104', title: 'Physical Education 4 (Team Sports)', program: 'ALL', type: 'Lecture', units: 2 },
  { code: 'NSTP 1', title: 'National Service Training Program 1', program: 'ALL', type: 'Lecture', units: 3 },
  { code: 'NSTP 2', title: 'National Service Training Program 2', program: 'ALL', type: 'Lecture', units: 3 },

  // BS Information Technology
  { code: 'IT 101', title: 'Introduction to Computing', program: 'BSIT', type: 'Lecture', units: 3 },
  { code: 'IT 102', title: 'Computer Programming 1 (Python)', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 103', title: 'Computer Programming 2 (Java/C++)', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 104', title: 'Data Structures and Algorithms', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 201', title: 'Database Management Systems 1', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 202', title: 'Object-Oriented Programming', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 203', title: 'Web Systems and Technologies 1', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 204', title: 'Computer Networks and Data Comm', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 301', title: 'Information Assurance and Security', program: 'BSIT', type: 'Lecture', units: 3 },
  { code: 'IT 302', title: 'Mobile Applications Development', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 303', title: 'Systems Analysis and Design', program: 'BSIT', type: 'Lecture', units: 3 },
  { code: 'IT 304', title: 'Cloud Computing Architecture', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 401', title: 'Capstone Project and Research 1', program: 'BSIT', type: 'Lecture', units: 3 },
  { code: 'IT 402', title: 'Capstone Project and Research 2', program: 'BSIT', type: 'Laboratory', units: 3 },
  { code: 'IT 403', title: 'Systems Administration & Maintenance', program: 'BSIT', type: 'Laboratory', units: 3 },

  // BS Computer Engineering
  { code: 'CPE 101', title: 'Discrete Mathematics', program: 'BSCPE', type: 'Lecture', units: 3 },
  { code: 'CPE 102', title: 'Logic Circuits and Design', program: 'BSCPE', type: 'Laboratory', units: 4 },
  { code: 'CPE 201', title: 'Microprocessor Systems', program: 'BSCPE', type: 'Laboratory', units: 3 },
  { code: 'CPE 202', title: 'Embedded Systems Design', program: 'BSCPE', type: 'Laboratory', units: 3 },
  { code: 'CPE 301', title: 'Computer Architecture & Org', program: 'BSCPE', type: 'Lecture', units: 3 },
  { code: 'CPE 302', title: 'Digital Signal Processing', program: 'BSCPE', type: 'Laboratory', units: 3 },

  // BS Business Administration & Entrepreneurship
  { code: 'BA 101', title: 'Principles of Management', program: 'BSBA', type: 'Lecture', units: 3 },
  { code: 'BA 102', title: 'Financial Accounting Fundamentals', program: 'BSBA', type: 'Lecture', units: 3 },
  { code: 'BA 201', title: 'Human Resource Management', program: 'BSBA', type: 'Lecture', units: 3 },
  { code: 'BA 202', title: 'Business Law and Obligations', program: 'BSBA', type: 'Lecture', units: 3 },
  { code: 'BA 203', title: 'Marketing Management & Sales', program: 'BSBA', type: 'Lecture', units: 3 },
  { code: 'ENT 101', title: 'Opportunity Seeking and Analysis', program: 'BS ENTREP', type: 'Lecture', units: 3 },
  { code: 'ENT 201', title: 'Business Plan Implementation', program: 'BS ENTREP', type: 'Lecture', units: 3 },

  // Education Programs
  { code: 'ED 101', title: 'Child and Adolescent Development', program: 'BEED', type: 'Lecture', units: 3 },
  { code: 'ED 102', title: 'The Teaching Profession', program: 'BEED', type: 'Lecture', units: 3 },
  { code: 'ED 201', title: 'Facilitating Learner-Centered Teaching', program: 'BEED', type: 'Lecture', units: 3 },
  { code: 'ED 202', title: 'Assessment of Learning 1', program: 'BEED', type: 'Lecture', units: 3 },
  { code: 'ED 301', title: 'Curriculum Development & Evaluation', program: 'BEED', type: 'Lecture', units: 3 },
];

export const STANDARD_TIME_SLOTS = [
  { label: '07:30 - 09:00 AM (Morning 1)', start: '07:30', end: '09:00' },
  { label: '09:00 - 10:30 AM (Morning 2)', start: '09:00', end: '10:30' },
  { label: '10:30 - 12:00 PM (Morning 3)', start: '10:30', end: '12:00' },
  { label: '01:00 - 02:30 PM (Afternoon 1)', start: '13:00', end: '14:30' },
  { label: '02:30 - 04:00 PM (Afternoon 2)', start: '14:30', end: '16:00' },
  { label: '04:00 - 05:30 PM (Afternoon 3)', start: '16:00', end: '17:30' },
  { label: '05:30 - 07:00 PM (Evening 1)', start: '17:30', end: '19:00' },
  { label: '07:00 - 08:30 PM (Evening 2)', start: '19:00', end: '20:30' },
];

export const DURATION_OPTIONS = [
  { label: '1.0 hr', minutes: 60 },
  { label: '1.5 hrs', minutes: 90 },
  { label: '2.0 hrs', minutes: 120 },
  { label: '3.0 hrs Lab', minutes: 180 },
];

export const COMMON_ROOMS = [
  'Room 101',
  'Room 102',
  'Room 103',
  'Room 201',
  'Room 202',
  'Room 203',
  'Computer Lab 1',
  'Computer Lab 2',
  'Computer Lab 3',
  'Multimedia Lab',
  'CPE Hardware Lab',
  'Speech Lab',
  'AVR 1',
  'AVR 2',
  'Auditorium',
  'Gymnasium',
  'Covered Court'
];

export const SCHEDULE_COLORS = [
  { id: 'blue', label: 'Blue', border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald', border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-600' },
  { id: 'violet', label: 'Violet', border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-600' },
  { id: 'amber', label: 'Amber', border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-600' },
  { id: 'cyan', label: 'Cyan', border: 'border-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-600' },
  { id: 'indigo', label: 'Indigo', border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-600' },
];

export function getScheduleColorStyle(colorId?: string) {
  const found = SCHEDULE_COLORS.find(c => c.id === colorId);
  return found || SCHEDULE_COLORS[0];
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${mStr} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function addMinutesToTime(startHHmm: string, minutesToAdd: number): string {
  try {
    const [h, m] = startHHmm.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutesToAdd;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return startHHmm;
  }
}

export function calculateDurationHours(startTime: string, endTime: string): number {
  try {
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, Number((diffMin / 60).toFixed(1)));
  } catch {
    return 0;
  }
}

export function isClassHappeningNow(day: Day, startTime: string, endTime: string, now = new Date()): boolean {
  const days: Day[] = ['Sunday' as Day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[now.getDay()];
  if (todayName !== day) return false;

  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentMinutes = currentH * 60 + currentM;

  const [sh, sm] = startTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;

  const [eh, em] = endTime.split(':').map(Number);
  const endMinutes = eh * 60 + em;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function isClassUpcomingToday(day: Day, startTime: string, now = new Date()): boolean {
  const days: Day[] = ['Sunday' as Day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[now.getDay()];
  if (todayName !== day) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;

  return startMinutes > currentMinutes && startMinutes - currentMinutes <= 90; // Next within 90 mins
}
