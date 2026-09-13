# Collegio de Montalban — Student Information & Enrollment System

A comprehensive institutional student enrollment, records validation, and academic scheduling management platform.

---

## Features

- **Enrollment Management**
  - **Online Student Application Wizard**: Multi-step registration for new and continuing college students.
  - **Student Classification Workflows**:
    - **Regular Students**: Standard curriculum path and subject sequencing.
    - **Irregular Students**: Custom units selection and prerequisite load adjustments.
    - **Transferees**: Credit and transcript evaluation from previous colleges/universities.
    - **Returnees**: Re-admission workflow for returning students after leave.
  - **Program / Course Selection**: Primary degree program choice with secondary alternative selection.
  - **Digital Document Uploading**: Upload and preview of Form 137 / Report Card, Certificate of Good Moral Character, PSA Birth Certificate, and 2x2 ID photo.

- **Student Records & Validation**
  - **Real-Time Student Roster**: Dynamic list of all applicants with search by name, student ID, email, and program.
  - **Dedicated Student Type Sorting**:
    - Quick sort by student category: **Regular → Irregular → Transferee → Returnee** (and reverse).
    - Alphabetical sorting by Student Name (A–Z / Z–A).
    - Numerical / alphanumeric sorting by Student ID.
    - Submission date sorting (Newest to Oldest / Oldest to Newest).
  - **Type Filter Badges**: Instant filtering by All, Regular, Irregular, Transferee, and Returnee students with live count indicators.
  - **Application Validation**:
    - Assign official institutional Student ID.
    - Assign official Academic Section (e.g., `BSIT-1A`).
    - Schedule Entrance Examination (Date, Start Time, End Time, Venue).
    - Status management: `Pending`, `Validating`, `Approved`, `Enrolled`, `Rejected`.
  - **Comprehensive Student Profile**: Modal viewing detailed personal background, contact information, complete address, and high-resolution document previews with lightbox download.

- **Official Certificate of Registration (COR)**
  - Institutional Certificate of Matriculation & Registration with official layout.
  - Automatic calculation of enrolled subject units (Lecture, Laboratory, Computer Lab).
  - Itemized assessment of tuition, laboratory fees, registration fees, library fees, athletic fees, and total balances.
  - Official payment recording (Mode of payment, amount, and receipt reference date).

- **Academic Scheduling**
  - Section-based weekly visual timetables (Monday to Saturday, Sunday rest day).
  - Time conflict and overlap detection per academic section.
  - Class details including Subject Name, Day of Week, Start Time, End Time, Room / Laboratory Hall, and Faculty Instructor.
  - Section manager with live capacity monitoring and year level association.

- **Faculty & Professor Portal**
  - Professor registration request verification with institutional institute assignment (ICS, ITE, IBE).
  - Dean/Registrar section assignment to faculty accounts.
  - Section roster viewer for professors showing enrolled students under their assigned sections.

- **Notification Dispatcher**
  - Direct student alerts for exam schedules, section assignments, validation updates, and enrollment approval.

---

## Data Schema & Fields

### Student Information
- **StudentID**: Unique institutional student identification number (e.g., `2024-00123`).
- **StudentName**: Full composite student name.
  - **FirstName**: Given first name.
  - **MiddleName**: Middle name or middle initial.
  - **LastName**: Family surname.
- **Age**: Age in years.
- **Gender**: Gender identity (`Male`, `Female`, `Other`).
- **Birthday**: Date of birth (`YYYY-MM-DD`).
- **ContactNumber**: Mobile telephone number.
- **Email**: Primary contact or institutional email address.
- **AddressDetails**:
  - **Province**: Province of residence.
  - **City**: City or municipality.
  - **Barangay**: Barangay of residence.
  - **Street**: Street address, house number, or subdivision.
- **UploadedDocuments**:
  - **SummaryOfGrades**: Document URL / Form 137.
  - **GoodMoral**: Certificate of Good Moral Character.
  - **BirthCertificate**: PSA Birth Certificate.
  - **TwoByTwoPhoto**: Formal 2x2 ID photo.

### Enrollment Record
- **EnrollmentID**: Unique application identifier.
- **UserID**: Authentication ID of student account.
- **EnrollmentType**: Category of student:
  - `Regular`
  - `Irregular`
  - `Transferee`
  - `Returnee`
- **Course**: Primary degree program (e.g., `BSIT`, `BSCPE`, `BSBA HRM`, `BEEd Gen`).
- **SecondChoice**: Secondary program preference for freshmen applicants.
- **YearLevel**: Current academic standing (`1st Year`, `2nd Year`, `3rd Year`, `4th Year`).
- **Status**: Current admission status (`Pending`, `Validating`, `Approved`, `Enrolled`, `Rejected`).
- **AssignedSection**: Official section code (e.g., `BSIT-1A`).
- **ExamSchedule**:
  - **ExamDate**: Scheduled entrance examination date.
  - **ExamStartTime**: Examination start time (`HH:mm`).
  - **ExamEndTime**: Examination end time (`HH:mm`).
  - **ExamVenue**: Assigned examination room or campus hall.
- **SubmittedAt**: Timestamp when the application was initially filed.
- **EnrolledAt**: Timestamp when the applicant was officially marked as Enrolled.

### Certificate of Registration & Financial Assessment
- **AcademicYear**: Academic school year (e.g., `2024-2025`).
- **Semester**: Academic term (`1st Semester`, `2nd Semester`, `Summer`).
- **EnrolledCourses**:
  - **SubjectCode**: Course code (e.g., `IT101`, `GE102`).
  - **Description**: Descriptive subject title.
  - **Section**: Enrolled section.
  - **LecHours**: Weekly lecture hours.
  - **LabHours**: Weekly laboratory hours.
  - **CompLabHours**: Weekly computer laboratory hours.
  - **Units**: Academic credit units.
  - **Fee**: Computed subject fee.
- **AssessedFees**:
  - **Tuition**: Total tuition charge based on enrolled credits.
  - **RegistrationFee**: Institutional registration fee.
  - **AthleticFee**: Campus athletic and sports facility fee.
  - **LibraryFee**: Library resource fee.
  - **LabFee**: Laboratory and equipment maintenance fee.
  - **OtherFees**: Miscellaneous student service fees.
  - **Total**: Aggregate total assessed balance.
- **PaymentDetails**:
  - **PaymentMode**: Transaction mode (`Cash`, `GCash`, `Bank Transfer`, `Scholarship`).
  - **AmountPaid**: Numerical amount paid.
  - **DatePaid**: Transaction confirmation date.

### Academic Course & Section
- **CourseCode**: Program code identifier (e.g., `BSIT`, `BSCPE`).
- **CourseTitle**: Descriptive title of the degree program.
- **Institute**: Academic department / institute (`ICS`, `ITE`, `IBE`).
- **SectionName**: Section code identifier (e.g., `BSIT-1A`).
- **YearLevel**: Associated year level (`1st Year` to `4th Year`).
- **MaxCapacity**: Maximum student capacity.
- **EnrolledCount**: Current count of officially enrolled students.

### Class Schedule
- **ScheduleID**: Unique class schedule slot identifier.
- **SectionName**: Associated section code.
- **SubjectCode**: Subject code (e.g., `IT101`).
- **SubjectName**: Subject title.
- **Day**: Scheduled day (`Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`).
- **StartTime**: Class start time (`HH:mm`).
- **EndTime**: Class end time (`HH:mm`).
- **Room**: Assigned lecture room or computer lab.
- **Instructor**: Assigned professor or instructor name.

### Faculty & Professor Record
- **ProfessorID**: Unique faculty request/account identifier.
- **FullName**: Faculty full name and title.
- **Username**: Official login username.
- **Email**: Faculty email address.
- **Institute**: Assigned academic institute (`ICS`, `ITE`, `IBE`).
- **AssignedSections**: Array of sections officially assigned to the professor.
- **Status**: Authorization status (`pending`, `approved`, `rejected`).

---

## Laravel Backend & Database Structure

The project comes with a complete Laravel 11 backend located in `/laravel-backend`.

### Directory Layout
```
laravel-backend/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       ├── AuthController.php
│   │       ├── EnrollmentController.php
│   │       ├── ScheduleController.php
│   │       └── SectionController.php
│   └── Models/
│       ├── Course.php
│       ├── Enrollment.php
│       ├── Notification.php
│       ├── Schedule.php
│       ├── Section.php
│       ├── TeacherRequest.php
│       └── User.php
├── database/
│   └── migrations/
│       ├── 2024_01_01_000001_create_users_table.php
│       ├── 2024_01_01_000002_create_courses_and_sections_tables.php
│       ├── 2024_01_01_000003_create_enrollments_table.php
│       └── 2024_01_01_000004_create_schedules_and_requests_tables.php
└── routes/
    └── api.php
```

### Laravel Database Migrations
1. `create_users_table.php`: Handles user identity, roles (`student`, `professor`, `admin`), student credentials, institute affiliation, and assigned sections.
2. `create_courses_and_sections_tables.php`: Relational tables for academic courses and sections with maximum capacity constraints.
3. `create_enrollments_table.php`: Stores all student applications with categorized student types (`Regular`, `Irregular`, `Transferee`, `Returnee`), exam scheduling, validation details, address components, and uploaded document links.
4. `create_schedules_and_requests_tables.php`: Stores section timetables with time-slot management, faculty registration requests, and notification alerts.

### REST API Endpoints
```http
# Authentication
POST   /api/auth/login                  # User authentication
POST   /api/auth/register               # Student account registration

# Enrollments
GET    /api/enrollments                 # List all enrollments with sorting & filtering
POST   /api/enrollments                 # Submit new student application
GET    /api/enrollments/{id}            # Get enrollment details
PUT    /api/enrollments/{id}/validate   # Validate, schedule exam, and assign section
DELETE /api/enrollments/{id}            # Delete enrollment record

# Schedules
GET    /api/schedules                   # Get class timetable by section
POST   /api/schedules                   # Add class schedule slot
DELETE /api/schedules/{id}              # Delete schedule slot

# Sections
GET    /api/sections                    # List academic sections
POST   /api/sections                    # Create new section
DELETE /api/sections/{id}              # Delete section
```

### Setup Instructions

#### Frontend (Vite + React)
```bash
npm install
npm run build
```

#### Laravel Backend
```bash
cd laravel-backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```
