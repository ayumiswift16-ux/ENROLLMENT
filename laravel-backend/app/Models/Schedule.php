<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_name',
        'course_code',
        'subject_code',
        'subject_name',
        'units',
        'lecture_hours',
        'lab_hours',
        'day',
        'start_time',
        'end_time',
        'room',
        'instructor',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_name', 'name');
    }
}
