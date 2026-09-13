import { motion } from 'motion/react';
import { 
  ClipboardCheck, 
  FileSearch, 
  Fingerprint, 
  GraduationCap, 
  CreditCard, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';

const STEPS_INFO = [
  {
    title: "Document Submission",
    description: "Submit digital copies of Summary of Grades, Good Moral Certificate, Birth Certificate, and 2x2 Student Photo.",
    icon: ClipboardCheck,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  {
    title: "Admission Exam",
    description: "Scheduled cognitive and behavioral assessment for qualification.",
    icon: FileSearch,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  {
    title: "Interview Phase",
    description: "Direct mapping of career goals with the academic deans of each department.",
    icon: Fingerprint,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  {
    title: "Course Qualification",
    description: "Final approval based on exam results and vacant course slots.",
    icon: GraduationCap,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  {
    title: "Tuition Settlement",
    description: "Payment of miscellaneous fees and initial registration costs.",
    icon: CreditCard,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  {
    title: "Final Registration",
    description: "Official issuance of the Certificate of Enrollment (COE) and ID.",
    icon: CheckCircle,
    color: "bg-emerald-600",
    shadow: "shadow-emerald-500/20"
  }
];

export default function Steps() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">The Enrollment Journey</h2>
        <p className="text-lg text-slate-500 leading-relaxed">
          At Collegio de Montalban, we ensure a seamless and merit-based admission process for all aspiring students.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
        {/* Connection Line (simplified for visual) */}
        <div className="hidden lg:block absolute top-[150px] left-0 w-full h-0.5 bg-slate-100 -z-10" />

        {STEPS_INFO.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card glass className="h-full border-none shadow-xl shadow-slate-200/40 relative group overflow-hidden">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <div className="mb-8 relative">
                  <div className={`h-20 w-20 ${step.color} rounded-3xl flex items-center justify-center text-white ${step.shadow} z-10 relative transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300`}>
                    <step.icon className="h-10 w-10" />
                  </div>
                  <div className="absolute -inset-4 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 -z-0 opacity-50" />
                </div>
                
                <div className="space-y-4 flex-1">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest rounded-full">
                    Step 0{i + 1}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 leading-tight">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{step.description}</p>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 w-full">
                  <button className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider hover:gap-3 transition-all">
                    Learn Requirements
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>


    </div>
  );
}
