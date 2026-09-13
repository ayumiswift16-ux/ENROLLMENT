<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'title',
        'description',
        'duration',
        'slots',
        'institute',
    ];

    public function sections()
    {
        return $this->hasMany(Section::class, 'course_code', 'code');
    }
}
