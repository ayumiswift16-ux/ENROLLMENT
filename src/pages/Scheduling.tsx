import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  BookOpen, 
  User as UserIcon, 
  MapPin, 
  AlertCircle, 
  Settings, 
  ChevronDown, 
  Search,
  Grid,
  Columns,
  List,
  Edit3,
  Copy,
  Printer,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { Day, ScheduleItem, Section, YearLevel, User as UserType, EnrollmentRecord } from '../types';
import { toast } from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { COURSES } from '../constants';
import { TimetableGrid } from '../components/schedule/TimetableGrid';
import { ScheduleModal } from '../components/schedule/ScheduleModal';
import { DuplicateModal } from '../components/schedule/DuplicateModal';
import { PrintScheduleView } from '../components/schedule/PrintScheduleView';
import { 
  formatTime12h, 
  calculateDurationHours, 
  getScheduleColorStyle, 
  isClassHappeningNow, 
  isClassUpcomingToday 
} from '../utils/scheduleData';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SchedulingProps {
  user: UserType;
}

type ViewMode = 'cards' | 'timetable' | 'list';

export default function Scheduling({ user }: SchedulingProps) {
  const isAdmin = user?.role === 'admin';
  const isProfessor = user?.role === 'professor';

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [duplicateSchedule, setDuplicateSchedule] = useState<ScheduleItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isManagingSections, setIsManagingSections] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Section management state
  const [sectionSearch, setSectionSearch] = useState('');
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [dropdownYearFilter, setDropdownYearFilter] = useState<string>('All');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionYear, setNewSectionYear] = useState<YearLevel>('1st Year');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Sections
        const sectionSnap = await getDocs(collection(db, 'sections'));
        const sectionData = sectionSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Section[];
        setSections(sectionData);
        
        if (isAdmin && sectionData.length > 0 && !selectedSection) {
          setSelectedSection(sectionData[0].name);
        }

        // Fetch Schedules
        const scheduleSnap = await getDocs(collection(db, 'schedules'));
        setSchedules(scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as ScheduleItem[]);

        // If student or professor, set assigned section
        if (user) {
          if (user.role === 'professor') {
            const profSections = user.assignedSections || (user.assignedSection ? [user.assignedSection] : []);
            if (profSections.length > 0) {
              if (!selectedSection || !profSections.includes(selectedSection)) {
                setSelectedSection(profSections[0]);
              }
            }
          } else if (user.role === 'student') {
            const docRef = doc(db, 'enrollments', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const mine = docSnap.data() as EnrollmentRecord;
              const assigned = mine.section || mine.studentInfo?.section;
              if (assigned) {
                setSelectedSection(assigned);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching scheduling data:", error);
      }
    };
    
    fetchData();
  }, [isAdmin, user]);

  // Section Filtering for Dropdown
  const filteredDropdownSections = useMemo(() => {
    return sections
      .filter(s => {
        if (isAdmin) return true;
        if (isProfessor) {
          const profSections = user?.assignedSections || (user?.assignedSection ? [user.assignedSection] : []);
          return profSections.includes(s.name);
        }
        return false;
      })
      .filter(s => s && s.name && s.name.trim() !== '')
      .filter(s => {
        if (dropdownYearFilter === 'All') return true;
        return s.yearLevel === dropdownYearFilter;
      })
      .filter(s => 
        s.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
        s.yearLevel.toLowerCase().includes(dropdownSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, isAdmin, isProfessor, user, dropdownYearFilter, dropdownSearch]);

  // Schedules for selected section
  const sectionSchedules = useMemo(() => {
    return schedules
      .filter(s => s.section?.trim().toLowerCase() === selectedSection?.trim().toLowerCase())
      .sort((a, b) => {
        const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [schedules, selectedSection]);

  // Filtered schedules for search
  const filteredSchedules = useMemo(() => {
    if (!searchTerm.trim()) return sectionSchedules;
    const q = searchTerm.toLowerCase();
    return sectionSchedules.filter(s => 
      s.subject.toLowerCase().includes(q) ||
      (s.instructor && s.instructor.toLowerCase().includes(q)) ||
      (s.room && s.room.toLowerCase().includes(q)) ||
      s.day.toLowerCase().includes(q)
    );
  }, [sectionSchedules, searchTerm]);

  // Section summary metrics
  const totalWeeklyHours = useMemo(() => {
    return sectionSchedules.reduce((acc, curr) => {
      return acc + calculateDurationHours(curr.startTime, curr.endTime);
    }, 0);
  }, [sectionSchedules]);

  const lectureCount = useMemo(() => {
    return sectionSchedules.filter(s => s.type !== 'Laboratory').length;
  }, [sectionSchedules]);

  const labCount = useMemo(() => {
    return sectionSchedules.filter(s => s.type === 'Laboratory').length;
  }, [sectionSchedules]);

  // Find currently ongoing and next upcoming class today
  const currentDayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const ongoingClass = useMemo(() => {
    return sectionSchedules.find(s => isClassHappeningNow(s.day, s.startTime, s.endTime, currentTime));
  }, [sectionSchedules, currentTime]);

  const upcomingClass = useMemo(() => {
    return sectionSchedules.find(s => isClassUpcomingToday(s.day, s.startTime, currentTime));
  }, [sectionSchedules, currentTime]);

  // Schedule CRUD Handlers
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditModal = (item: ScheduleItem) => {
    setEditingSchedule(item);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (itemData: Omit<ScheduleItem, 'id'>, editId?: string) => {
    try {
      const scheduleId = editId || crypto.randomUUID();
      const savedItem: ScheduleItem = {
        id: scheduleId,
        ...itemData,
      };

      await setDoc(doc(db, 'schedules', scheduleId), savedItem, { merge: true });

      if (editId) {
        setSchedules(prev => prev.map(s => s.id === editId ? savedItem : s));
        toast.success('Schedule updated successfully');
      } else {
        setSchedules(prev => [...prev, savedItem]);
        toast.success('Schedule added successfully');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Class removed from schedule');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${id}`);
    }
  };

  const handleDuplicateConfirm = async (targetDay: Day, targetSection: string) => {
    if (!duplicateSchedule) return;
    try {
      const newId = crypto.randomUUID();
      const newItem: ScheduleItem = {
        ...duplicateSchedule,
        id: newId,
        day: targetDay,
        section: targetSection,
      };
      await setDoc(doc(db, 'schedules', newId), newItem);
      setSchedules(prev => [...prev, newItem]);
      toast.success(`Class copied to ${targetDay} for ${targetSection}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    }
  };

  const handleClearSectionSchedules = async () => {
    const toDelete = sectionSchedules;
    if (toDelete.length === 0) return;

    try {
      for (const item of toDelete) {
        await deleteDoc(doc(db, 'schedules', item.id));
      }
      setSchedules(prev => prev.filter(s => s.section !== selectedSection));
      setIsClearConfirmOpen(false);
      toast.success(`Cleared all ${toDelete.length} classes for ${selectedSection}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'schedules');
    }
  };

  // Section Management
  const addSection = async () => {
    if (!newSectionName.trim()) return;
    const name = newSectionName.trim().toUpperCase();
    if (sections.some(s => s.name === name)) {
      toast.error('Section already exists');
      return;
    }
    
    try {
      const newSection = { name, yearLevel: newSectionYear };
      await setDoc(doc(db, 'sections', name), newSection);
      setSections([...sections, newSection]);
      setNewSectionName('');
      toast.success('Section added');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sections/${name}`);
    }
  };

  const removeSection = async (name: string) => {
    try {
      await deleteDoc(doc(db, 'sections', name));
      const updated = sections.filter(s => s.name !== name);
      setSections(updated);
      if (selectedSection === name) setSelectedSection(updated[0]?.name || '');
      toast.success('Section removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sections/${name}`);
    }
  };

  const seedDefaultSections = async () => {
    const defaults: { name: string; yearLevel: string }[] = [];
    const yearLevels: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    
    COURSES.forEach(course => {
      yearLevels.forEach((year, idx) => {
        const yearNum = idx + 1;
        ['A', 'B', 'C', 'D'].forEach(letter => {
          defaults.push({
            name: `${course.id} - ${yearNum}${letter}`,
            yearLevel: year
          });
        });
      });
    });

    let count = 0;
    for (const s of defaults) {
      if (!sections.some(existing => existing.name === s.name)) {
        try {
          await setDoc(doc(db, 'sections', s.name), s);
          count++;
        } catch (e) {
          console.error("Error seeding section", s.name, e);
        }
      }
    }

    if (count > 0) {
      const sectionSnap = await getDocs(collection(db, 'sections'));
      setSections(sectionSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Section[]);
      toast.success(`Seeded ${count} sections across all programs!`);
    } else {
      toast.error('All default sections for available programs already exist.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {currentDayName}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Class Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin 
              ? "Design, customize, and manage weekly academic schedules." 
              : `Viewing weekly timetable and enrolled classes for ${selectedSection || 'your section'}`}
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsPrintModalOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            disabled={!selectedSection || sectionSchedules.length === 0}
          >
            <Printer className="h-4 w-4 text-slate-600" />
            Print Timetable
          </Button>

          {isAdmin && (
            <>
              <Button 
                onClick={() => setIsManagingSections(true)} 
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Settings className="h-4 w-4 text-slate-600" />
                Sections
              </Button>
              <Button 
                onClick={handleOpenAddModal} 
                variant="primary"
                size="sm"
                disabled={!selectedSection}
                className="flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Class
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Status Card (If Class is ongoing or up next) */}
      {(ongoingClass || upcomingClass) && (
        <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center font-black text-white shrink-0",
              ongoingClass ? "bg-emerald-600 animate-pulse" : "bg-blue-600"
            )}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider",
                  ongoingClass ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                )}>
                  {ongoingClass ? '● Ongoing Right Now' : 'Up Next Today'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {formatTime12h(ongoingClass ? ongoingClass.startTime : upcomingClass?.startTime)} - {formatTime12h(ongoingClass ? ongoingClass.endTime : upcomingClass?.endTime)}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                {ongoingClass ? ongoingClass.subject : upcomingClass?.subject}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                <span>Room: <strong>{ongoingClass ? ongoingClass.room || 'TBA' : upcomingClass?.room || 'TBA'}</strong></span>
                <span>•</span>
                <span>Instructor: <strong>{ongoingClass ? ongoingClass.instructor || 'Staff' : upcomingClass?.instructor || 'Staff'}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200">
            Section: <strong className="text-slate-800">{selectedSection}</strong>
          </div>
        </div>
      )}

      {/* Control Bar: Section Selector + View Mode Switcher + Quick Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Section Selector */}
        {(isAdmin || isProfessor) ? (
          <div className="relative z-30 min-w-[260px]">
            <button
              onClick={() => setIsSectionOpen(!isSectionOpen)}
              className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-all text-slate-900 font-bold text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>{selectedSection || 'Select Section'}</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", isSectionOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isSectionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden py-2 z-40"
                >
                  {/* Search and Year filter */}
                  <div className="px-3 pb-2 pt-1 border-b border-slate-200 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search section..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-blue-600 focus:bg-white"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {/* Year level filter chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] custom-scrollbar">
                      {['All', '1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownYearFilter(yr);
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-full whitespace-nowrap font-bold transition-colors",
                            dropdownYearFilter === yr
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section List */}
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredDropdownSections.map(section => {
                      const classCount = schedules.filter(s => s.section === section.name).length;
                      return (
                        <button
                          key={section.name}
                          onClick={() => {
                            setSelectedSection(section.name);
                            setIsSectionOpen(false);
                            setDropdownSearch('');
                          }}
                          className={cn(
                            "flex items-center justify-between w-full px-4 py-2 text-xs transition-colors border-b last:border-0 border-slate-100",
                            selectedSection === section.name 
                              ? "bg-blue-600 text-white font-bold" 
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="text-left">
                            <div className={cn(
                              "font-bold",
                              selectedSection === section.name ? "text-white" : "text-slate-900"
                            )}>
                              {section.name}
                            </div>
                            <div className={cn(
                              "text-[10px]",
                              selectedSection === section.name ? "text-blue-100" : "text-slate-500"
                            )}>
                              {section.yearLevel}
                            </div>
                          </div>

                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            selectedSection === section.name 
                              ? "bg-blue-700 text-white" 
                              : "bg-slate-100 text-slate-600"
                          )}>
                            {classCount} {classCount === 1 ? 'class' : 'classes'}
                          </span>
                        </button>
                      );
                    })}
                    {filteredDropdownSections.length === 0 && (
                      <div className="px-6 py-6 text-center text-xs text-slate-400">
                        {dropdownSearch ? "No sections match your search." : "No sections configured."}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Assigned Section:</span>
            <span className="text-sm font-extrabold text-blue-900 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              {selectedSection || 'No Section Assigned'}
            </span>
          </div>
        )}

        {/* Center: Search Within Section */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject, instructor, room..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-end md:self-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
              viewMode === 'cards' 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Weekly Day Cards"
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Days</span>
          </button>

          <button
            onClick={() => setViewMode('timetable')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
              viewMode === 'timetable' 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Visual Timetable Matrix"
          >
            <Grid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timetable</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
              viewMode === 'list' 
                ? "bg-white text-blue-700 shadow-xs" 
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Class List Table"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Section Quick Summary Strip */}
      {selectedSection && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Classes</span>
            <span className="text-xl font-black text-slate-900">{sectionSchedules.length} Subjects</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Weekly Hours</span>
            <span className="text-xl font-black text-blue-700">{totalWeeklyHours.toFixed(1)} Hours</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lecture Sessions</span>
            <span className="text-xl font-black text-slate-900">{lectureCount} Sessions</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lab Sessions</span>
              <span className="text-xl font-black text-purple-700">{labCount} Sessions</span>
            </div>
            {isAdmin && sectionSchedules.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1"
                title="Clear all classes for this section"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning for unassigned students */}
      {!isAdmin && !selectedSection && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">
            You haven't been assigned to a section yet. Please wait for the registrar to approve your enrollment.
          </p>
        </div>
      )}

      {/* VIEW 1: WEEKLY DAY CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DAYS.map(day => {
            const dayItems = filteredSchedules.filter(s => s.day === day);
            const isToday = currentDayName.toLowerCase() === day.toLowerCase();

            return (
              <Card 
                key={day} 
                glass 
                className={cn(
                  "border shadow-sm flex flex-col transition-all",
                  isToday ? "border-blue-300 ring-1 ring-blue-400/50" : "border-slate-200"
                )}
              >
                <CardHeader className="pb-3 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("h-4 w-4", isToday ? "text-blue-600" : "text-slate-500")} />
                    <CardTitle className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                      {day}
                    </CardTitle>
                    {isToday && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-600 text-white rounded-full uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {dayItems.length} {dayItems.length === 1 ? 'Class' : 'Classes'}
                  </span>
                </CardHeader>

                <CardContent className="p-4 flex-1 space-y-3">
                  {dayItems.length > 0 ? (
                    dayItems.map(item => {
                      const colorStyle = getScheduleColorStyle(item.color);
                      const isNow = isClassHappeningNow(item.day, item.startTime, item.endTime, currentTime);
                      const isNext = isClassUpcomingToday(item.day, item.startTime, currentTime);

                      return (
                        <div 
                          key={item.id} 
                          className={cn(
                            "group relative bg-white rounded-lg p-3 border transition-all hover:shadow-md",
                            colorStyle.border,
                            isNow && "ring-2 ring-emerald-500 bg-emerald-50/20"
                          )}
                        >
                          {/* Live Status Badge */}
                          {isNow && (
                            <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                              Ongoing Now
                            </div>
                          )}
                          {isNext && !isNow && (
                            <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded uppercase tracking-wider">
                              Up Next
                            </div>
                          )}

                          {/* Admin Action Buttons */}
                          {isAdmin && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 rounded p-0.5 shadow-xs border border-slate-200">
                              <button
                                onClick={() => setDuplicateSchedule(item)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                                title="Duplicate to another day"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                                title="Edit Class"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSchedule(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Remove Class"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Subject Header */}
                          <div className="flex items-start gap-2.5 mb-2">
                            <div className={cn(
                              "h-7 w-7 rounded flex items-center justify-center font-bold text-xs shrink-0",
                              colorStyle.bg,
                              colorStyle.text
                            )}>
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 pr-12">
                              <h4 className="text-xs font-black text-slate-900 leading-snug truncate">
                                {item.subject}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                                </span>
                                {item.type && (
                                  <span className="text-[9px] px-1 font-extrabold uppercase rounded bg-slate-100 text-slate-600">
                                    {item.type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Room & Instructor Footer */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                              <UserIcon className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.instructor || 'Staff'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.room || 'TBA'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                      <Clock className="h-5 w-5 mb-1 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">No classes scheduled</p>
                      {isAdmin && (
                        <button
                          onClick={handleOpenAddModal}
                          className="mt-1.5 text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          + Add a class
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* VIEW 2: VISUAL TIMETABLE MATRIX */}
      {viewMode === 'timetable' && (
        <TimetableGrid
          schedules={filteredSchedules}
          isAdmin={isAdmin}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteSchedule}
          onDuplicate={item => setDuplicateSchedule(item)}
          currentDayName={currentDayName}
        />
      )}

      {/* VIEW 3: COMPACT TABLE LIST */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="p-3">Day</th>
                  <th className="p-3">Time Slot</th>
                  <th className="p-3">Subject Description</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Instructor</th>
                  {isAdmin && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSchedules.map((item, idx) => {
                  const colorStyle = getScheduleColorStyle(item.color);
                  const isNow = isClassHappeningNow(item.day, item.startTime, item.endTime, currentTime);

                  return (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        isNow ? "bg-emerald-50/30" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      )}
                    >
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.day}
                          {isNow && (
                            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold text-slate-600">
                        {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", colorStyle.badge)} />
                          <span className="font-extrabold text-slate-900">{item.subject}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-700">
                          {item.type || 'Lecture'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{item.room || 'TBA'}</td>
                      <td className="p-3 font-medium text-slate-700">{item.instructor || 'Staff'}</td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDuplicateSchedule(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Duplicate Class"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Edit Class"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                              title="Delete Class"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredSchedules.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      {searchTerm ? `No classes matching "${searchTerm}"` : "No classes scheduled for this section yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rest Day Indicator */}
      <div className="mt-4">
        <Card className="bg-slate-50 border-slate-200 border-dashed">
          <CardContent className="p-4 flex items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Sunday - Rest Day</h3>
              <p className="text-[11px] text-slate-500">Classes are exclusively held Monday through Saturday.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleSaveSchedule}
        editingItem={editingSchedule}
        sectionName={selectedSection}
        existingSchedules={schedules}
      />

      {/* Duplicate Modal */}
      <DuplicateModal
        isOpen={!!duplicateSchedule}
        onClose={() => setDuplicateSchedule(null)}
        item={duplicateSchedule}
        sections={sections}
        existingSchedules={schedules}
        onDuplicateConfirm={handleDuplicateConfirm}
      />

      {/* Printable Schedule Modal */}
      <PrintScheduleView
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sectionName={selectedSection}
        schedules={sectionSchedules}
      />

      {/* Reset Section Schedules Confirmation Modal */}
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title="Reset Section Schedule"
        subtitle={`Clear all classes for ${selectedSection}`}
        icon={<RotateCcw className="h-5 w-5 text-red-600" />}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete all <strong>{sectionSchedules.length}</strong> classes from <strong>{selectedSection}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleClearSectionSchedules} className="bg-red-600 hover:bg-red-700">
              Clear All Classes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Sections Modal */}
      <Modal
        isOpen={isManagingSections}
        onClose={() => setIsManagingSections(false)}
        title="Manage Academic Sections"
        subtitle="Add, configure, or seed sections across courses and year levels"
        icon={<Settings className="h-5 w-5 text-blue-700" />}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={seedDefaultSections}>
              Seed All Programs
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsManagingSections(false)}>
              Done
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Add New Section */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Add Section</label>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. BSIT - 1A"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSection()}
              />
              <select
                className="flex h-10 w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                value={newSectionYear}
                onChange={e => setNewSectionYear(e.target.value as YearLevel)}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <Button onClick={addSection} variant="primary" size="sm" className="w-full">
              Add Section
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Sections ({sections.length})
              </h4>
              <div className="relative w-44">
                <input
                  type="text"
                  placeholder="Filter sections..."
                  value={sectionSearch}
                  onChange={e => setSectionSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar border border-slate-200 rounded-md p-2 bg-slate-50/50">
              {sections
                .filter(s => s && s.name && s.name.toLowerCase().includes(sectionSearch.toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(section => (
                  <div key={section.id || section.name} className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200 group hover:border-slate-300 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{section.name}</span>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">{section.yearLevel}</span>
                    </div>
                    <button 
                      onClick={() => removeSection(section.name)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              {sections.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400">No sections configured.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
