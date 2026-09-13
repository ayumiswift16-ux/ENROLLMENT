<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('student_id')->nullable()->index(); // College student ID number (e.g. 2024-00123)
            
            // Student Information Fields
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('age')->nullable();
            $table->string('gender')->default('Male');
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->string('birthday')->nullable();
            $table->text('address')->nullable();
            $table->string('province')->nullable();
            $table->string('city')->nullable();
            $table->string('barangay')->nullable();
            $table->string('street')->nullable();
            
            // Enrollment Details
            $table->enum('type', ['Regular', 'Irregular', 'Transferee', 'Returnee'])->default('Regular');
            $table->string('course');
            $table->string('second_choice')->nullable();
            $table->string('year_level')->default('1st Year');
            $table->enum('status', ['Pending', 'Validating', 'Approved', 'Enrolled', 'Rejected'])->default('Pending');
            $table->string('section')->nullable();
            
            // Entrance Exam & Validation Fields
            $table->date('exam_date')->nullable();
            $table->string('exam_start_time')->nullable();
            $table->string('exam_end_time')->nullable();
            $table->string('exam_venue')->nullable();
            
            // Documents and Official Forms (JSON payloads)
            $table->json('documents')->nullable(); // summaryOfGrades, goodMoral, birthCertificate, twoByTwoPhoto
            $table->json('registration_form')->nullable(); // academicYear, semester, courses, totalUnits, fees
            
            // Timestamps
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
