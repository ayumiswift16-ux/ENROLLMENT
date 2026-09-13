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
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // e.g. BSIT, BSCPE, BEEd Gen
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('duration')->default('4 Years');
            $table->integer('slots')->default(40);
            $table->string('institute'); // ICS, ITE, IBE
            $table->timestamps();
        });

        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g. BSIT-1A, BSIT-1B
            $table->string('course_code');
            $table->string('year_level'); // 1st Year, 2nd Year, etc.
            $table->string('room')->nullable();
            $table->integer('max_capacity')->default(45);
            $table->timestamps();

            $table->foreign('course_code')->references('code')->on('courses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sections');
        Schema::dropIfExists('courses');
    }
};
