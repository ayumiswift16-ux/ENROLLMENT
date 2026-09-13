<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\ScheduleController;

/*
|--------------------------------------------------------------------------
| API Routes for Collegio de Montalban Enrollment System
|--------------------------------------------------------------------------
*/

// Authentication
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Enrollments (with sorting for Regular, Irregular, Transferee, Returnee)
Route::get('/enrollments', [EnrollmentController::class, 'index']);
Route::post('/enrollments', [EnrollmentController::class, 'store']);
Route::get('/enrollments/{id}', [EnrollmentController::class, 'show']);
Route::put('/enrollments/{id}/validate', [EnrollmentController::class, 'validateRecord']);
Route::delete('/enrollments/{id}', [EnrollmentController::class, 'destroy']);

// Schedules
Route::get('/schedules', [ScheduleController::class, 'index']);
Route::post('/schedules', [ScheduleController::class, 'store']);
Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);
