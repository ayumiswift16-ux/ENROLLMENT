<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'student_id',
        'first_name',
        'middle_name',
        'last_name',
        'age',
        'gender',
        'contact_number',
        'email',
        'birthday',
        'address',
        'province',
        'city',
        'barangay',
        'street',
        'type', // Regular, Irregular, Transferee, Returnee
        'course',
        'second_choice',
        'year_level',
        'status',
        'section',
        'exam_date',
        'exam_start_time',
        'exam_end_time',
        'exam_venue',
        'documents',
        'registration_form',
        'submitted_at',
        'enrolled_at',
    ];

    protected $casts = [
        'documents' => 'array',
        'registration_form' => 'array',
        'exam_date' => 'date',
        'submitted_at' => 'datetime',
        'enrolled_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope query to sort by student type order:
     * Regular -> Irregular -> Transferee -> Returnee
     */
    public function scopeOrderByStudentType($query, $direction = 'asc')
    {
        $rawOrder = "FIELD(type, 'Regular', 'Irregular', 'Transferee', 'Returnee')";
        if (strtolower($direction) === 'desc') {
            $rawOrder = "FIELD(type, 'Returnee', 'Transferee', 'Irregular', 'Regular')";
        }
        return $query->orderByRaw($rawOrder);
    }

    /**
     * Scope to filter by specific enrollment category
     */
    public function scopeOfType($query, $type)
    {
        if ($type && $type !== 'All') {
            return $query->where('type', $type);
        }
        return $query;
    }
}
