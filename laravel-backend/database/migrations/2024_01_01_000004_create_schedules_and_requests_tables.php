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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->string('section_name');
            $table->string('course_code');
            $table->string('subject_code'); // e.g. IT101
            $table->string('subject_name'); // e.g. Introduction to Computing
            $table->integer('units')->default(3);
            $table->integer('lecture_hours')->default(3);
            $table->integer('lab_hours')->default(0);
            $table->string('day'); // Monday, Tuesday, etc.
            $table->string('start_time'); // e.g. 08:00
            $table->string('end_time'); // e.g. 11:00
            $table->string('room')->default('TBA');
            $table->string('instructor')->nullable();
            $table->timestamps();
        });

        Schema::create('teacher_requests', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('institute'); // ICS, ITE, IBE
            $table->string('email');
            $table->string('username')->unique();
            $table->string('password');
            $table->enum('status', ['pending', 'approved', 'rejected', 'deleted'])->default('pending');
            $table->json('assigned_sections')->nullable();
            $table->string('rejected_by')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('info'); // info, success, warning, danger
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('teacher_requests');
        Schema::dropIfExists('schedules');
    }
};
