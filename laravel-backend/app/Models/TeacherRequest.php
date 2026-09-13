<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'full_name',
        'institute',
        'email',
        'username',
        'password',
        'status',
        'assigned_sections',
        'rejected_by',
        'rejected_at',
    ];

    protected $casts = [
        'assigned_sections' => 'array',
        'rejected_at' => 'datetime',
    ];
}
