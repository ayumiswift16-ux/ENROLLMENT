import React, { useState } from 'react';
import { ScheduleItem, Day, Section } from '@/src/types';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { formatTime12h } from '@/src/utils/scheduleData';
import { Copy, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/src/utils/cn';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ScheduleItem | null;
  sections: Section[];
  existingSchedules: ScheduleItem[];
  onDuplicateConfirm: (targetDay: Day, targetSection: string) => Promise<void>;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  isOpen,
  onClose,
  item,
  sections,
  existingSchedules,
  onDuplicateConfirm,
}) => {
  if (!item) return null;

  const [targetDay, setTargetDay] = useState<Day>(item.day === 'Monday' ? 'Thursday' : 'Monday');
  const [targetSection, setTargetSection] = useState<string>(item.section);
  const [submitting, setSubmitting] = useState(false);

  // Check if conflict exists on target day & section
  const hasConflict = existingSchedules.some(s => {
    if (s.day !== targetDay) return false;
    if (s.section !== targetSection) return false;

    const newStart = parseInt(item.startTime.replace(':', ''), 10);
    const newEnd = parseInt(item.endTime.replace(':', ''), 10);
    const itemStart = parseInt(s.startTime.replace(':', ''), 10);
    const itemEnd = parseInt(s.endTime.replace(':', ''), 10);

    return (newStart < itemEnd) && (newEnd > itemStart);
  });

  const handleConfirm = async () => {
    if (hasConflict) return;
    setSubmitting(true);
    try {
      await onDuplicateConfirm(targetDay, targetSection);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Class Schedule"
      subtitle={`Copy "${item.subject}" to another day or section`}
      icon={<Copy className="h-5 w-5 text-blue-700" />}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Source Class Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="font-bold text-slate-900 text-sm">{item.subject}</div>
          <div className="text-slate-600">
            Source: <span className="font-semibold text-slate-800">{item.section}</span> • <span>{item.day}</span> ({formatTime12h(item.startTime)} - {formatTime12h(item.endTime)})
          </div>
          {item.room && <div className="text-slate-500">Room: {item.room} {item.instructor ? `• ${item.instructor}` : ''}</div>}
        </div>

        {/* Target Day */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Copy to Day *
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setTargetDay(d)}
                className={cn(
                  "p-2 text-xs font-bold rounded-md border text-center transition-all",
                  targetDay === d
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Target Section */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Target Section *
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            value={targetSection}
            onChange={e => setTargetSection(e.target.value)}
          >
            {sections.map(s => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.yearLevel})
              </option>
            ))}
          </select>
        </div>

        {/* Conflict Check */}
        {hasConflict ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-800 text-xs">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              A class already occupies this time slot on <strong>{targetDay}</strong> for section <strong>{targetSection}</strong>.
            </span>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-emerald-600" />
            <span>Ready to copy to {targetDay} ({targetSection})</span>
          </div>
        )}

        {/* Actions */}
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
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || hasConflict}
          >
            {submitting ? 'Copying...' : 'Duplicate Class'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
