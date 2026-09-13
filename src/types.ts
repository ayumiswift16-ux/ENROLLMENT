export type EnrollmentType = 'Regular' | 'Irregular' | 'Transferee' | 'Returnee';

export type YearLevel = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type Course = 'BSIT' | 'BSCPE' | 'BEEd Gen' | 'BSBA HRM' | 'BS ENTREP' | 'BECEd' | 'BECEd SCI' | 'BTLED-ICT' | 'TCP';

export interface DocumentUploads {
  summaryOfGrades?: string;
  goodMoral?: string;
  twoByTwoPhoto?: string;
  birthCertificate?: string;
}

export interface StudentInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  age: string;
  gender: string;
  address: string;
  addressDetails?: {
    province: string;
    city: string;
    barangay: string;
    street: string;
  };
  contactNumber: string;
  email: string;
  birthday: string;
  studentId: string;
  yearLevel: YearLevel;
  section?: string;
  documents?: DocumentUploads;
}

export interface EnrollmentRecord {
  id: string;
  userId?: string;
  studentInfo: StudentInfo;
  type: EnrollmentType;
  course: Course;
  secondChoice?: Course;
  yearLevel: YearLevel;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Enrolled' | 'Validating';
  submittedAt?: string;
  enrolledAt: string;
  updatedAt?: string;
  studentId?: string;
  section?: string;
  examDate?: string;
  examStartTime?: string;
  examEndTime?: string;
  examVenue?: string;
  registrationForm?: RegistrationForm;
}

export interface RegistrationForm {
  academicYear: string;
  semester: string;
  program: string;
  institute: string;
  courses: EnrolledCourse[];
  assessedFees: AssessedFees;
  paymentDetails: PaymentDetails;
}

export interface EnrolledCourse {
  code: string;
  description: string;
  section: string;
  lec: number;
  lab: number;
  compLab: number;
  units: number;
  rate: number;
  fee: number;
}

export interface AssessedFees {
  tuition: number;
  admission: number;
  athletic: number;
  computer: number;
  cultural: number;
  developmental: number;
  guidance: number;
  laboratory: number;
  library: number;
  medicalDental: number;
  nstp: number;
  registration: number;
  schoolId: number;
  handbook: number;
  total: number;
}

export interface PaymentDetails {
  mode: string;
  amount: string;
  date: string;
}

export interface User {
  uid: string;
  username: string;
  email: string;
  name: string;
  fullName?: string;
  role: 'admin' | 'student' | 'professor';
  profilePicture?: string;
  studentId?: string;
  course?: string;
  assignedSection?: string;
  assignedSections?: string[];
  institute?: 'ICS' | 'IBE' | 'ITE';
  status?: string;
}

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Section {
  name: string;
  yearLevel: YearLevel;
}

export interface ScheduleItem {
  id: string;
  section: string;
  subject: string;
  day: Day;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  instructor: string;
  room: string;
  type?: 'Lecture' | 'Laboratory';
  color?: string;
}

export interface SystemSettings {
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  academicYear: string;
  semester: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface TeacherRequest {
  id: string;
  fullName: string;
  institute: 'ICS' | 'IBE' | 'ITE';
  username: string;
  password?: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  rejectedBy?: string;
  rejectedAt?: string;
  deletedAt?: string;
  createdAt: string;
}
