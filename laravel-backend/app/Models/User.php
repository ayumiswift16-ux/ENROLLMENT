<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'full_name',
        'username',
        'email',
        'gmail',
        'password',
        'role',
        'institute',
        'assigned_section',
        'assigned_sections',
        'profile_picture',
        'contact_number'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'assigned_sections' => 'array',
        'password' => 'hashed',
    ];

    public function enrollment()
    {
        return $this->hasOne(Enrollment::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
}
