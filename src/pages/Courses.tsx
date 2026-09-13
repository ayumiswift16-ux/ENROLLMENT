import { motion } from 'motion/react';
import { 
  BookOpen, 
  Clock, 
  Users, 
  ArrowRight, 
  Terminal, 
  Cpu, 
  Briefcase, 
  Scale, 
  BookMarked,
  Layers
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { COURSES } from '@/src/constants';
import { cn } from '@/src/utils/cn';

const COURSE_ICONS: Record<string, any> = {
  BSIT: Terminal,
  BSCS: Cpu,
  BSBA: Briefcase,
  BSED: BookOpen,
  BEED: BookMarked,
  Criminology: Scale,
};

const COURSE_COLORS: Record<string, string> = {
  BSIT: 'bg-blue-600',
  BSCS: 'bg-slate-900',
  BSBA: 'bg-emerald-600',
  BSED: 'bg-amber-600',
  BEED: 'bg-orange-600',
  Criminology: 'bg-red-700',
};

export default function Courses() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Programs</h2>
          <p className="text-slate-500 mt-1">Explore our range of specialized degree programs.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl text-blue-700 font-bold text-sm">
          <Layers className="h-4 w-4" />
          Academic Year 2026-2027
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {COURSES.map((course, i) => {
          const Icon = COURSE_ICONS[course.id] || BookOpen;
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card glass className="h-full group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-md overflow-hidden">
                <div className={cn("h-2 w-full", COURSE_COLORS[course.id])} />
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className={cn("p-4 rounded-2xl text-white shadow-lg", COURSE_COLORS[course.id])}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Duration</p>
                      <p className="font-bold text-slate-900">{course.duration}</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-6 mb-8 py-4 border-y border-slate-50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Full Time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">{course.slots} Slots</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full group/btn">
                    View Curriculum
                    <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
