<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Section;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::query();

        if ($request->filled('section')) {
            $query->where('section_name', $request->section);
        }

        if ($request->filled('course')) {
            $query->where('course_code', $request->course);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get()
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'section_name' => 'required|string',
            'course_code' => 'required|string',
            'subject_code' => 'required|string',
            'subject_name' => 'required|string',
            'units' => 'required|integer',
            'lecture_hours' => 'nullable|integer',
            'lab_hours' => 'nullable|integer',
            'day' => 'required|string',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'room' => 'nullable|string',
            'instructor' => 'nullable|string',
        ]);

        $schedule = Schedule::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Schedule slot added.',
            'data' => $schedule
        ], 201);
    }

    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Schedule slot deleted.'
        ]);
    }
}
