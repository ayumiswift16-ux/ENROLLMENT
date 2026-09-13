import React from 'react';
import { ScheduleItem, Day } from '@/src/types';
import { getScheduleColorStyle, formatTime12h, isClassHappeningNow } from '@/src/utils/scheduleData';
import { Clock, MapPin, User, Edit3, Trash2, Copy, BookOpen } from 'lucide-react';
import { cn } from '@/src/utils/cn';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

interface TimetableGridProps {
  schedules: ScheduleItem[];
  isAdmin: boolean;
  onEdit?: (item: ScheduleItem) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (item: ScheduleItem) => void;
  currentDayName: string;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  schedules,
  isAdmin,
  onEdit,
  onDelete,
  onDuplicate,
  currentDayName,
}) => {
  // Convert "HH:mm" to minutes from 07:00 AM
  const getMinutesFromStart = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      return Math.max(0, (h - 7) * 60 + m);
    } catch {
      return 0;
    }
  };

  const totalGridHeight = (HOURS.length) * 64; // 64px per hour

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Timetable Header */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
            <div className="p-3 text-center border-r border-slate-200 text-slate-400">
              <Clock className="h-4 w-4 mx-auto mb-1" />
              <span>Time</span>
            </div>
            {DAYS.map(day => {
              const isToday = currentDayName.toLowerCase() === day.toLowerCase();
              const count = schedules.filter(s => s.day === day).length;
              return (
                <div 
                  key={day} 
                  className={cn(
                    "p-3 text-center border-r border-slate-200 last:border-r-0 transition-colors",
                    isToday ? "bg-blue-50/80 text-blue-900 border-b-2 border-b-blue-600" : ""
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="uppercase tracking-tight">{day.slice(0, 3)}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-blue-600 text-white rounded-full uppercase">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                    {count} {count === 1 ? 'class' : 'classes'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timetable Body */}
          <div className="relative grid grid-cols-7" style={{ height: `${totalGridHeight}px` }}>
            {/* Time Slot Labels Column */}
            <div className="border-r border-slate-200 bg-slate-50/50">
              {HOURS.map(hour => {
                const hourFormatted = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
                return (
                  <div 
                    key={hour} 
                    className="h-16 border-b border-slate-100 px-2 py-1 text-right text-[11px] font-semibold text-slate-500 select-none"
                  >
                    {hourFormatted}
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            {DAYS.map(day => {
              const daySchedules = schedules.filter(s => s.day === day);
              const isToday = currentDayName.toLowerCase() === day.toLowerCase();

              return (
                <div 
                  key={day} 
                  className={cn(
                    "relative border-r border-slate-200 last:border-r-0",
                    isToday ? "bg-blue-50/20" : ""
                  )}
                >
                  {/* Horizontal Hour Guideline Rows */}
                  {HOURS.map(hour => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-slate-100 pointer-events-none" 
                    />
                  ))}

                  {/* Absolute Positioned Class Blocks */}
                  {daySchedules.map(item => {
                    const startMin = getMinutesFromStart(item.startTime);
                    const endMin = getMinutesFromStart(item.endTime);
                    const durationMin = Math.max(30, endMin - startMin);

                    // 64px = 60 mins -> 1 min ≈ 1.0667px
                    const topPx = (startMin / 60) * 64;
                    const heightPx = Math.max(36, (durationMin / 60) * 64 - 3);

                    const colorStyle = getScheduleColorStyle(item.color);
                    const isNow = isClassHappeningNow(item.day, item.startTime, item.endTime);

                    return (
                      <div
                        key={item.id}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                        }}
                        className={cn(
                          "absolute left-1 right-1 rounded-lg border p-2 shadow-xs transition-all overflow-hidden flex flex-col justify-between group z-10 hover:z-20 hover:shadow-md cursor-pointer",
                          colorStyle.bg,
                          colorStyle.border,
                          isNow && "ring-2 ring-emerald-500 animate-pulse"
                        )}
                        onClick={() => onEdit && onEdit(item)}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={cn("text-[11px] font-black truncate leading-tight", colorStyle.text)}>
                              {item.subject}
                            </span>
                            {item.type && (
                              <span className="text-[9px] px-1 py-0.2 font-bold uppercase rounded bg-white/80 border border-slate-200 text-slate-600 shrink-0">
                                {item.type === 'Laboratory' ? 'LAB' : 'LEC'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                            </span>
                          </div>
                        </div>

                        {/* Room & Instructor Footer (shown if height allows) */}
                        {heightPx >= 55 && (
                          <div className="pt-1 mt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5 truncate font-medium">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {item.room || 'TBA'}
                            </span>
                            <span className="flex items-center gap-0.5 truncate font-medium">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              {item.instructor ? item.instructor.split(' ').pop() : 'Staff'}
                            </span>
                          </div>
                        )}

                        {/* Hover Quick Action Buttons */}
                        {isAdmin && (
                          <div 
                            className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-white/95 rounded shadow-sm border border-slate-200 p-0.5"
                            onClick={e => e.stopPropagation()}
                          >
                            {onDuplicate && (
                              <button 
                                onClick={() => onDuplicate(item)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded"
                                title="Duplicate Class"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                            {onEdit && (
                              <button 
                                onClick={() => onEdit(item)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded"
                                title="Edit Class"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            )}
                            {onDelete && (
                              <button 
                                onClick={() => onDelete(item.id)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                                title="Delete Class"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
