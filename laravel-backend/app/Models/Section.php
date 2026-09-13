<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'course_code',
        'year_level',
        'room',
        'max_capacity',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class, 'course_code', 'code');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class, 'section_name', 'name');
    }
}
