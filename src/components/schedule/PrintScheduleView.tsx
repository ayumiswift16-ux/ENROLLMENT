import React from 'react';
import { ScheduleItem, Day } from '@/src/types';
import { formatTime12h, calculateDurationHours } from '@/src/utils/scheduleData';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Printer, Download } from 'lucide-react';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface PrintScheduleViewProps {
  isOpen: boolean;
  onClose: () => void;
  sectionName: string;
  schedules: ScheduleItem[];
  academicYear?: string;
  semester?: string;
}

export const PrintScheduleView: React.FC<PrintScheduleViewProps> = ({
  isOpen,
  onClose,
  sectionName,
  schedules,
  academicYear = '2026-2027',
  semester = '1st Semester',
}) => {
  // Sort schedules by Day order and start time
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayOrder !== 0) return dayOrder;
    return a.startTime.localeCompare(b.startTime);
  });

  const totalHours = sortedSchedules.reduce((acc, curr) => {
    return acc + calculateDurationHours(curr.startTime, curr.endTime);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Class Schedule"
      subtitle={`Certificate of Matriculation & Study Load for ${sectionName}`}
      icon={<Printer className="h-5 w-5 text-blue-700" />}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Printable Paper Document Container */}
        <div 
          id="printable-schedule"
          className="p-6 bg-white border border-slate-300 rounded-lg shadow-inner font-sans text-slate-900"
        >
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-800 mb-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-slate-600">Republic of the Philippines</h2>
            <h1 className="text-xl font-black uppercase tracking-tight text-blue-900">Colegio de Montalban</h1>
            <p className="text-xs text-slate-500">Kasiglahan Village, San Jose, Rodriguez, Rizal</p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-800 uppercase tracking-wider">
              Official Class Schedule & Study Load • A.Y. {academicYear} ({semester})
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4 p-3 bg-slate-50 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block font-medium">Academic Section:</span>
              <span className="font-extrabold text-slate-900 text-sm">{sectionName}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Total Subjects:</span>
              <span className="font-extrabold text-slate-900 text-sm">{sortedSchedules.length} Subjects</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Weekly Contact Hours:</span>
              <span className="font-extrabold text-slate-900 text-sm">{totalHours.toFixed(1)} Hours</span>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider font-extrabold border-b border-slate-300">
                <tr>
                  <th className="p-2.5">Day</th>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Subject Description</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Instructor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedSchedules.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2.5 font-bold text-slate-900">{item.day}</td>
                    <td className="p-2.5 whitespace-nowrap font-semibold text-slate-700">
                      {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                    </td>
                    <td className="p-2.5 font-extrabold text-blue-950">{item.subject}</td>
                    <td className="p-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-200 text-slate-800">
                        {item.type || 'Lecture'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-700 font-medium">{item.room || 'TBA'}</td>
                    <td className="p-2.5 text-slate-700 font-medium">{item.instructor || 'To Be Announced'}</td>
                  </tr>
                ))}
                {sortedSchedules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                      No classes scheduled for this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signature Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <p className="font-bold text-slate-800">College Registrar</p>
              <p className="text-[10px] text-slate-500">Verified & Certified</p>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <p className="font-bold text-slate-800">Institute Dean</p>
              <p className="text-[10px] text-slate-500">Approved Academic Load</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
};
