import React, { useState, useEffect } from 'react';
import { ScheduleItem, Day } from '@/src/types';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { 
  CURRICULUM_SUBJECTS, 
  STANDARD_TIME_SLOTS, 
  DURATION_OPTIONS, 
  COMMON_ROOMS, 
  SCHEDULE_COLORS,
  addMinutesToTime,
  calculateDurationHours,
  formatTime12h
} from '@/src/utils/scheduleData';
import { BookOpen, Clock, AlertCircle, CheckCircle2, Sparkles, MapPin, Palette } from 'lucide-react';
import { cn } from '@/src/utils/cn';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ScheduleItem, 'id'>, editId?: string) => Promise<void>;
  editingItem: ScheduleItem | null;
  sectionName: string;
  existingSchedules: ScheduleItem[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  sectionName,
  existingSchedules,
}) => {
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState<Day>('Monday');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:00');
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState<'Lecture' | 'Laboratory'>('Lecture');
  const [color, setColor] = useState('blue');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isSuggestingSubjects, setIsSuggestingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize or reset form values
  useEffect(() => {
    if (editingItem) {
      setSubject(editingItem.subject || '');
      setDay(editingItem.day || 'Monday');
      setStartTime(editingItem.startTime || '07:30');
      setEndTime(editingItem.endTime || '09:00');
      setInstructor(editingItem.instructor || '');
      setRoom(editingItem.room || '');
      setType(editingItem.type || 'Lecture');
      setColor(editingItem.color || 'blue');
    } else {
      setSubject('');
      setDay('Monday');
      setStartTime('07:30');
      setEndTime('09:00');
      setInstructor('');
      setRoom('');
      setType('Lecture');
      setColor('blue');
    }
    setSubjectSearch('');
    setIsSuggestingSubjects(false);
  }, [editingItem, isOpen]);

  // Extract program prefix from section name e.g. "BSIT - 1A" -> "BSIT"
  const programPrefix = sectionName.split('-')[0]?.trim().toUpperCase() || 'ALL';

  // Filter curriculum subjects
  const filteredSuggestions = CURRICULUM_SUBJECTS.filter(s => {
    const matchesProgram = s.program === 'ALL' || s.program === programPrefix || programPrefix.includes(s.program);
    const query = subjectSearch.toLowerCase();
    const matchesQuery = !query || s.code.toLowerCase().includes(query) || s.title.toLowerCase().includes(query);
    return matchesProgram && matchesQuery;
  });

  // Calculate live conflict
  const findConflict = () => {
    return existingSchedules.find(item => {
      if (editingItem && item.id === editingItem.id) return false;
      if (item.day !== day) return false;
      if (item.section !== sectionName) return false;

      const newStart = parseInt(startTime.replace(':', ''), 10);
      const newEnd = parseInt(endTime.replace(':', ''), 10);
      const itemStart = parseInt(item.startTime.replace(':', ''), 10);
      const itemEnd = parseInt(item.endTime.replace(':', ''), 10);

      // Overlap condition
      return (newStart < itemEnd) && (newEnd > itemStart);
    });
  };

  const conflictItem = findConflict();
  const durationHours = calculateDurationHours(startTime, endTime);

  // Apply duration offset to current start time
  const handleSelectDuration = (minutes: number) => {
    const newEnd = addMinutesToTime(startTime, minutes);
    setEndTime(newEnd);
  };

  // Quick preset period select
  const handleSelectPresetSlot = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    if (startTime >= endTime) {
      return;
    }

    if (conflictItem) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        section: sectionName,
        subject: subject.trim(),
        day,
        startTime,
        endTime,
        instructor: instructor.trim(),
        room: room.trim(),
        type,
        color,
      }, editingItem?.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Class Schedule' : 'Add Class Schedule'}
      subtitle={`Section: ${sectionName}`}
      icon={<BookOpen className="h-5 w-5 text-blue-700" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject Input with Smart Curriculum Suggestions */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Subject Name / Course Title *
            </label>
            <button
              type="button"
              onClick={() => setIsSuggestingSubjects(!isSuggestingSubjects)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isSuggestingSubjects ? 'Hide Suggestions' : 'Pick from Curriculum'}
            </button>
          </div>

          <Input
            placeholder="e.g. IT 102 - Computer Programming 1"
            required
            value={subject}
            onChange={e => {
              setSubject(e.target.value);
              setSubjectSearch(e.target.value);
            }}
          />

          {/* Quick Curriculum Suggestions Drawer */}
          {isSuggestingSubjects && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Recommended Subjects for {programPrefix}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredSuggestions.map(s => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => {
                      setSubject(`${s.code} - ${s.title}`);
                      setType(s.type);
                      setIsSuggestingSubjects(false);
                    }}
                    className="text-left p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors flex items-start justify-between gap-1 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{s.code}</span>
                      <span className="text-slate-600 text-[11px] line-clamp-1">{s.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded shrink-0">
                      {s.type === 'Laboratory' ? 'LAB' : 'LEC'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Day & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Day of Week *
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              value={day}
              onChange={e => setDay(e.target.value as Day)}
            >
              {DAYS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-2 h-10">
              <button
                type="button"
                onClick={() => setType('Lecture')}
                className={cn(
                  "rounded-md border text-xs font-bold transition-colors flex items-center justify-center",
                  type === 'Lecture' 
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                )}
              >
                Lecture
              </button>
              <button
                type="button"
                onClick={() => setType('Laboratory')}
                className={cn(
                  "rounded-md border text-xs font-bold transition-colors flex items-center justify-center",
                  type === 'Laboratory' 
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                )}
              >
                Laboratory
              </button>
            </div>
          </div>
        </div>

        {/* Time Inputs & Presets */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              Class Time & Duration
            </label>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
            </span>
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Quick Set Duration from {formatTime12h(startTime)}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => handleSelectDuration(d.minutes)}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:border-blue-600 hover:text-blue-700 transition-colors"
                >
                  +{d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start and End Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time *"
              type="time"
              required
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
            <Input
              label="End Time *"
              type="time"
              required
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>

          {/* Standard Period Chips */}
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Standard Campus Time Slots:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {STANDARD_TIME_SLOTS.slice(0, 4).map(slot => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => handleSelectPresetSlot(slot.start, slot.end)}
                  className={cn(
                    "text-[11px] p-1.5 rounded border text-center font-medium transition-all truncate",
                    startTime === slot.start && endTime === slot.end
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conflict Detection Banner */}
        {conflictItem ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Time Slot Conflict Detected!</span>
              <span>
                Conflicts with <strong>{conflictItem.subject}</strong> on {day} ({formatTime12h(conflictItem.startTime)} - {formatTime12h(conflictItem.endTime)}). Please choose another time.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-emerald-800 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Time slot is available with no conflicting classes for this section.</span>
          </div>
        )}

        {/* Instructor & Room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Instructor / Professor"
            placeholder="e.g. Prof. Maria Santos"
            value={instructor}
            onChange={e => setInstructor(e.target.value)}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Room / Venue
              </label>
              <select
                className="text-[11px] text-blue-600 bg-transparent outline-none cursor-pointer"
                onChange={e => e.target.value && setRoom(e.target.value)}
                value=""
              >
                <option value="" disabled>Common Rooms</option>
                {COMMON_ROOMS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <Input
              placeholder="e.g. Lab 304 or AVR 1"
              value={room}
              onChange={e => setRoom(e.target.value)}
            />
          </div>
        </div>

        {/* Color Badge Picker */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Palette className="h-3.5 w-3.5 text-slate-500" />
            Subject Color Tag
          </label>
          <div className="flex items-center gap-2">
            {SCHEDULE_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform",
                  c.badge,
                  color === c.id ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : "opacity-80 hover:opacity-100"
                )}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || !!conflictItem || startTime >= endTime}
          >
            {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Confirm Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
