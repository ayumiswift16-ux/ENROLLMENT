import { Course, YearLevel } from './types';

export const COURSES: { id: Course; title: string; description: string; duration: string; slots: number; institute: string }[] = [
  {
    id: 'BSIT',
    title: 'BS in Information Technology',
    description: 'Expertise in software development, networking, and human-computer interaction.',
    duration: '4 Years',
    slots: 45,
    institute: 'ICS'
  },
  {
    id: 'BSCPE',
    title: 'BS in Computer Engineering',
    description: 'Specialization in hardware design, microprocessor systems, and network integration.',
    duration: '4 Years',
    slots: 40,
    institute: 'ICS'
  },
  {
    id: 'BEEd Gen',
    title: 'BE in Elementary Education (General)',
    description: 'Core pedagogies and strategies for all elementary grade levels.',
    duration: '4 Years',
    slots: 60,
    institute: 'ITE'
  },
  {
    id: 'BSBA HRM',
    title: 'BSBA in Human Resource Management',
    description: 'Strategic personnel management, labor laws, and corporate organizational behavior.',
    duration: '4 Years',
    slots: 50,
    institute: 'IBE'
  },
  {
    id: 'BS ENTREP',
    title: 'BS in Entrepreneurship',
    description: 'Focus on business innovation, venture creation, and strategic risk management.',
    duration: '4 Years',
    slots: 45,
    institute: 'IBE'
  },
  {
    id: 'BECEd',
    title: 'BE in Early Childhood Education',
    description: 'Expertise in early childhood development and preschool education methods.',
    duration: '4 Years',
    slots: 40,
    institute: 'ITE'
  },
  {
    id: 'BECEd SCI',
    title: 'BECEd - Specialization in Science',
    description: 'Science-focused early education strategies and elementary science teaching.',
    duration: '4 Years',
    slots: 35,
    institute: 'ITE'
  },
  {
    id: 'BTLED-ICT',
    title: 'BT in Livelihood Education (ICT)',
    description: 'Technology-driven livelihood education and ICT pedagogical skills.',
    duration: '4 Years',
    slots: 30,
    institute: 'ITE'
  },
  {
    id: 'TCP',
    title: 'Teacher Certificate Program',
    description: 'Professional education units for non-education degree holders.',
    duration: '1 Year',
    slots: 100,
    institute: 'ITE'
  }
];

export const PHILIPPINES_ADDRESS_DATA = {
  provinces: [
    'Metro Manila', 'Rizal', 'Laguna', 'Cavite', 'Batangas', 'Bulacan', 'Pampanga', 'Pangasinan', 
    'Quezon', 'Cebu', 'Davao del Sur', 'Iloilo', 'Leyte', 'Bataan', 'Zambales', 'Tarlac', 'Nueva Ecija'
  ],
  municipalities: {
    'Metro Manila': ['Quezon City', 'Manila', 'Makati', 'Taguig', 'Pasig', 'Marikina', 'Mandaluyong', 'San Juan', 'Caloocan', 'Malabon', 'Navotas', 'Valenzuela', 'Las Piñas', 'Parañaque', 'Muntinlupa', 'Pasay', 'Pateros'],
    'Rizal': ['Rodriguez (Montalban)', 'San Mateo', 'Antipolo', 'Taytay', 'Cainta', 'Binangonan', 'Angono', 'Tanay', 'Morong', 'Baras', 'Pililla', 'Jalajala', 'Teresa'],
    'Laguna': ['Santa Cruz', 'Calamba', 'Biñan', 'San Pablo', 'Cabuyao', 'Santa Rosa', 'Los Baños', 'Pagsanjan', 'San Pedro', 'Pila', 'Nagcarlan', 'Victoria', 'Siniloan'],
    'Cavite': ['Dasmariñas', 'Bacoor', 'Imus', 'Tagaytay', 'General Trias', 'Trece Martires', 'Silang', 'Kawit', 'Rosario', 'Tanza', 'Naic', 'General Mariano Alvarez'],
    'Batangas': ['Batangas City', 'Lipa', 'Tanauan', 'Santo Tomas', 'Bauuan', 'Nasugbu', 'Lemery', 'Balayan', 'Calatagan', 'San Pascual', 'Mabini'],
    'Bulacan': ['Malolos', 'Meycauayan', 'San Jose del Monte', 'Baliuag', 'Bocaue', 'Marilao', 'Santa Maria', 'Plaridel', 'Guiguinto', 'Balagtas'],
    'Quezon': ['Lucena', 'Tayabas', 'Sariaya', 'Candelaria', 'Lucban', 'Pagbilao', 'Mauban', 'Gumaca', 'Lopez', 'Calauag'],
    'Pampanga': ['San Fernando', 'Angeles', 'Mabalacat', 'Guagua', 'Lubao', 'Mexico', 'Arayat', 'Porac', 'Floridablanca'],
    'Pangasinan': ['Lingayen', 'Dagupan', 'San Carlos', 'Urdaneta', 'Alaminos', 'Mangaldan', 'Calasiao', 'Malasiqui', 'Bayambang']
  },
  barangays: {
    'Rodriguez (Montalban)': ['San Jose', 'San Rafael', 'San Isidro', 'San Roque', 'Manggahan', 'Balite', 'Burgos', 'Geronimo', 'Macabud', 'Puray', 'Rosario'],
    'San Mateo': ['Ampid I', 'Ampid II', 'Dulang Bayan I', 'Dulang Bayan II', 'Guinayang', 'Guitnang Bayan I', 'Guitnang Bayan II', 'Maly', 'Malanday', 'Patiis', 'Santa Ana', 'Silangan'],
    'Antipolo': ['Bagong Nayon', 'Beverly Hills', 'Dalig', 'Dela Paz', 'Mambugan', 'Mayamot', 'Muntindilaw', 'San Isidro', 'San Jose', 'San Roque', 'Santa Cruz', 'Boso-Boso'],
    'Quezon City': ['Bagong Silangan', 'Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Payatas', 'Diliman', 'Socorro', 'Cubao', 'Loyola Heights', 'Matandang Balara', 'Pansol', 'UP Campus', 'Tandang Sora', 'Novaliches Proper', ' Fairview'],
    'Marikina': ['Concepcion Uno', 'Concepcion Dos', 'Fortune', 'Marikina Heights', 'Nangka', 'Parang', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tumana'],
    'Cainta': ['Santo Domingo', 'San Juan', 'San Andres', 'San Roque', 'Santa Rosa', 'San Isidro'],
    'Taytay': ['Dolores', 'Muzon', 'San Isidro', 'San Juan', 'Santa Ana'],
    'Binangonan': ['Calumpang', 'Libis', 'Layunan', 'Ithan', 'Bilibiran', 'Lunsad', 'Tagpos'],
    'Angono': ['Bagumbayan', ' Poblacion Itaas', 'Poblacion Ibaba', 'San Isidro', 'San Roque', 'San Vicente'],
    'San Fernando': ['Del Pilar', 'Dolores', 'Lourdes', 'Magliman', 'San Agustin', 'San Jose', 'San Nicolas', 'Santa Lucia'],
    'Angeles': ['Balibago', 'Cutcut', 'Malabanias', 'Pandan', 'Pulung Maragul', 'Sapa Libutad', 'Sto. Rosario'],
    'Calamba': ['Bayanihan', ' Bucal', 'Halang', 'Lecheria', 'Real', 'Canlubang', 'Parian'],
    'Sta. Rosa': ['Balibago', 'Dila', 'Don Jose', 'Labas', 'Malitlit', 'Pooc', 'Sinalhan', 'Tagapo']
  }
};

export const YEAR_LEVELS: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ENROLLMENT_TYPES = [
  {
    id: 'Regular',
    title: 'Regular Student',
    description: 'Full-load student following the standard curriculum sequence.',
    icon: 'UserCheck'
  },
  {
    id: 'Irregular',
    title: 'Irregular Student',
    description: 'Students with balanced subjects or varying academic loads.',
    icon: 'UserMinus'
  },
  {
    id: 'Transferee',
    title: 'Transferee',
    description: 'Students transferring from other colleges or higher education institutions.',
    icon: 'ArrowRightLeft'
  },
  {
    id: 'Returnee',
    title: 'Returnee',
    description: 'Students returning after a leave of absence or stop-out.',
    icon: 'RotateCcw'
  }
];
