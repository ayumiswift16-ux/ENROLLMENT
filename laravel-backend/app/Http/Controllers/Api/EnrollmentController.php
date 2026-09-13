<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EnrollmentController extends Controller
{
    /**
     * Display a listing of enrollment records with searching, filtering, and student-type sorting.
     */
    public function index(Request $request)
    {
        $query = Enrollment::query();

        // 1. Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // 2. Course filter
        if ($request->filled('course') && $request->course !== 'All') {
            $query->where('course', $request->course);
        }

        // 3. Section filter
        if ($request->filled('section') && $request->section !== 'All') {
            $query->where('section', $request->section);
        }

        // 4. Student Type Filter (Regular, Irregular, Transferee, Returnee)
        if ($request->filled('type') && $request->type !== 'All') {
            $query->where('type', $request->type);
        }

        // 5. Status filter
        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        // 6. Sorting
        $sortBy = $request->input('sort_by', 'type-asc');
        switch ($sortBy) {
            case 'type-asc':
                // Regular -> Irregular -> Transferee -> Returnee
                $query->orderByStudentType('asc')->orderBy('last_name', 'asc');
                break;
            case 'type-desc':
                // Returnee -> Transferee -> Irregular -> Regular
                $query->orderByStudentType('desc')->orderBy('last_name', 'asc');
                break;
            case 'name-asc':
                $query->orderBy('last_name', 'asc')->orderBy('first_name', 'asc');
                break;
            case 'name-desc':
                $query->orderBy('last_name', 'desc')->orderBy('first_name', 'desc');
                break;
            case 'date-desc':
                $query->orderBy('created_at', 'desc');
                break;
            case 'date-asc':
                $query->orderBy('created_at', 'asc');
                break;
            case 'id-asc':
                $query->orderBy('student_id', 'asc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        $records = $query->paginate($request->input('per_page', 25));

        // Aggregate counts by student type for UI badges
        $typeCounts = [
            'All' => Enrollment::count(),
            'Regular' => Enrollment::where('type', 'Regular')->count(),
            'Irregular' => Enrollment::where('type', 'Irregular')->count(),
            'Transferee' => Enrollment::where('type', 'Transferee')->count(),
            'Returnee' => Enrollment::where('type', 'Returnee')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'type_counts' => $typeCounts
        ]);
    }

    /**
     * Store a newly created enrollment application.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:150',
            'contact_number' => 'required|string|max:30',
            'course' => 'required|string|max:50',
            'year_level' => 'required|string|max:30',
            'type' => 'required|in:Regular,Irregular,Transferee,Returnee',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['status'] = $data['status'] ?? 'Pending';
        $data['submitted_at'] = now();

        $enrollment = Enrollment::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Enrollment record submitted successfully.',
            'data' => $enrollment
        ], 201);
    }

    /**
     * Display the specified enrollment record.
     */
    public function show($id)
    {
        $enrollment = Enrollment::with('user')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $enrollment
        ]);
    }

    /**
     * Validate and update enrollment status, section, ID, and exam scheduling.
     */
    public function validateRecord(Request $request, $id)
    {
        $enrollment = Enrollment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:Pending,Validating,Approved,Enrolled,Rejected',
            'student_id' => 'nullable|string|max:50',
            'section' => 'nullable|string|max:50',
            'exam_date' => 'nullable|date',
            'exam_start_time' => 'nullable|string',
            'exam_end_time' => 'nullable|string',
            'exam_venue' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $enrollment->fill($request->only([
            'status',
            'student_id',
            'section',
            'exam_date',
            'exam_start_time',
            'exam_end_time',
            'exam_venue',
        ]));

        if ($request->status === 'Enrolled' && !$enrollment->enrolled_at) {
            $enrollment->enrolled_at = now();
        }

        $enrollment->save();

        // Dispatch notification to user if linked
        if ($enrollment->user_id) {
            Notification::create([
                'user_id' => $enrollment->user_id,
                'title' => 'Enrollment Status Updated',
                'message' => "Your enrollment status is now {$enrollment->status}.",
                'type' => $enrollment->status === 'Enrolled' ? 'success' : 'info'
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Record validated and updated successfully.',
            'data' => $enrollment
        ]);
    }

    /**
     * Delete an enrollment record.
     */
    public function destroy($id)
    {
        $enrollment = Enrollment::findOrFail($id);
        $enrollment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Enrollment record removed.'
        ]);
    }
}
