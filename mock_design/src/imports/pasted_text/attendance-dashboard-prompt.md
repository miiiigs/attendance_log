# Figma Make Master Prompt — Professional Attendance Management Dashboard

Design and build a complete, polished, responsive **Attendance Management Admin Dashboard** for a small organization with approximately 150 employees.

This is the **admin web interface** for an employee attendance system.

The employee-facing attendance scanner will be a separate mobile application. This project focuses specifically on the **administrator web dashboard UI/UX and frontend interactions**.

The dashboard must feel like a real production-ready internal business application, not a generic template or marketing website.

Build the complete interactive frontend experience using realistic mock data.

---

# PRODUCT PURPOSE

Administrators use this dashboard to:

* Monitor daily employee attendance
* See who has logged in
* See who has logged out
* See employees who have not logged attendance
* View recent attendance activity
* Search attendance records
* Filter attendance by date
* Filter by department
* Review individual attendance history
* Add employees
* Edit employee information
* Deactivate employees
* Reactivate employees
* Reset employee passwords
* View active and inactive employees
* Display an attendance QR code
* Configure basic attendance settings

The design should prioritize:

* clarity
* speed
* professionalism
* simplicity
* information hierarchy
* responsive usability

Do not make the dashboard visually overwhelming.

---

# DESIGN DIRECTION

Create a modern SaaS-style administrative interface.

Visual personality:

* professional
* minimal
* trustworthy
* clean
* operational
* contemporary
* calm
* data-oriented

Avoid:

* excessive gradients
* neon colors
* glassmorphism everywhere
* overly rounded toy-like interfaces
* excessive animation
* huge decorative illustrations
* marketing-page styling
* futuristic AI-style visuals

This is an internal business application.

The visual hierarchy should resemble modern professional tools such as:

* Linear
* Stripe Dashboard
* modern Supabase interfaces
* modern HR dashboards
* polished B2B SaaS software

Do not copy these brands directly.

Use them only as general quality references.

---

# COLOR SYSTEM

Create a restrained professional design system.

Use:

* neutral white / very light gray page surfaces
* dark charcoal text
* muted gray secondary text
* one strong primary brand color
* green for successful/present/completed states
* amber/orange for late or warning states
* red for destructive/inactive/error states
* subtle blue or primary color for informational states

Ensure sufficient contrast.

Do not make every card colorful.

Use color primarily to communicate status and action importance.

---

# TYPOGRAPHY

Use a modern professional sans-serif typeface.

Create a clear hierarchy:

Page Title

24–30px desktop

Section Heading

18–20px

Card Metric

28–36px

Normal UI text

14–16px

Secondary text

12–14px

Table text

13–14px

Keep typography clean and readable.

---

# RESPONSIVE REQUIREMENTS

The dashboard must be properly designed for:

* large desktop
* normal laptop
* tablet
* mobile browser

Design responsive behavior intentionally.

Do NOT simply shrink the desktop design.

---

# DESKTOP LAYOUT

On desktop:

Use a left sidebar.

Suggested layout:

```text
┌───────────────┬─────────────────────────────────────────┐
│               │                                         │
│ Attendance    │ Header                                  │
│ Manager       │                                         │
│               │ Main Content                            │
│ Dashboard     │                                         │
│ Attendance    │                                         │
│ Employees     │                                         │
│ QR Code       │                                         │
│ Settings      │                                         │
│               │                                         │
│ Admin Profile │                                         │
│ Logout        │                                         │
└───────────────┴─────────────────────────────────────────┘
```

Sidebar width:

approximately 230–260px.

Allow collapsing sidebar at intermediate widths.

---

# MOBILE DASHBOARD LAYOUT

For mobile:

Do not keep the permanent sidebar.

Use:

* top navigation bar
* menu/hamburger button
* slide-out navigation drawer
* page title
* responsive content cards

Tables should transform appropriately.

For complicated data tables:

either

* allow controlled horizontal scrolling

or

* transform rows into clean stacked record cards

Choose whichever gives the best usability for the specific screen.

Actions must remain easily accessible.

---

# GLOBAL HEADER

Desktop header should contain:

* current page title
* optional supporting description
* notifications icon placeholder if useful
* administrator profile avatar or initials
* administrator name
* optional dropdown

Example:

```text
Dashboard

Sunday, August 16, 2026

                         Joel Admin ▼
```

Keep the header uncluttered.

---

# SIDEBAR

Include:

### Main

Dashboard

Attendance

Employees

Attendance QR

Settings

### Bottom

Administrator Profile

Logout

Use simple professional icons.

Clearly highlight the active route.

---

# 1. LOGIN PAGE

Create a dedicated administrator login screen.

Layout:

Clean centered authentication panel.

Fields:

Email

Password

Show/Hide Password

Remember me if appropriate

Login button

Example:

```text
Attendance Manager

Welcome back

Sign in to manage employee attendance.

Email
admin@company.com

Password
••••••••

[ Sign In ]
```

Include:

* loading state
* invalid credentials error
* field validation
* disabled submission state

Do NOT include public registration.

---

# 2. DASHBOARD OVERVIEW

Create a polished operational dashboard.

Top area:

Page title:

Dashboard

Description:

Overview of today's employee attendance.

Display today's date prominently but subtly.

---

# SUMMARY KPI CARDS

Create four primary metric cards.

### Active Employees

Example:

150

Supporting text:

Total active employees

Icon:

people/users

---

### Present Today

Example:

137

Supporting text:

91.3% attendance

Icon:

check/user-check

---

### Not Yet Logged

Example:

13

Supporting text:

Employees without attendance

Icon:

clock/user-minus

---

### Completed Attendance

Example:

72

Supporting text:

Time In and Time Out recorded

Icon:

check-circle

---

If lateness is included, create an optional fifth secondary metric:

Late Today

Example:

8

Use warning/amber styling.

---

# KPI CARD STYLE

Cards should have:

* clean surface
* subtle border
* slight shadow only if necessary
* icon
* metric
* label
* small supporting information

Avoid oversized cards.

The cards should form:

4 columns desktop

2 columns tablet

1–2 columns mobile depending on width

---

# ATTENDANCE VISUALIZATION

Create a meaningful visualization section.

Include a professional **Today's Attendance Overview**.

Recommended visualization:

horizontal progress/distribution bar showing:

Present

Not Yet Logged

Completed

Late if applicable

Also create a second visualization:

**Attendance This Week**

Show Monday through Sunday.

Use a clean bar or line visualization showing employee attendance count per day.

Use realistic mock values around 120–150 employees.

Example:

Monday 143

Tuesday 139

Wednesday 145

Thursday 141

Friday 137

Saturday 52

Sunday 0 or current-day value depending on context

Do not overcrowd charts.

Charts should be readable and useful rather than decorative.

---

# RECENT ATTENDANCE ACTIVITY

Create a card/table titled:

Recent Attendance Activity

Columns:

Employee

Employee ID

Department

Action

Time

Status

Mock examples:

Juan Dela Cruz

EMP-001

Accounting

Time In

8:02 AM

On Time

Maria Santos

EMP-014

Human Resources

Time In

8:11 AM

Late

Kevin Reyes

EMP-027

Operations

Time Out

5:03 PM

Completed

Show approximately 5–8 entries.

Provide:

View All Attendance →

---

# QUICK ATTENDANCE STATUS

Create a smaller panel showing:

Employees not yet logged today

Display maybe 5 employees and:

View all 13 →

This gives administrators quick operational visibility.

---

# 3. ATTENDANCE PAGE

Create a full attendance management screen.

Page title:

Attendance

Supporting text:

View and monitor employee attendance records.

---

# ATTENDANCE TOOLBAR

Create a responsive toolbar.

Include:

Date picker

Default:

August 16, 2026

Employee search

Placeholder:

Search employee or ID...

Department dropdown

Options:

All Departments

Accounting

Human Resources

Operations

IT

Finance

Marketing

Attendance Status dropdown

Options:

All Statuses

On Time

Late

Not Yet Logged

Completed

Clear Filters action

Desktop:

All controls mostly inline.

Mobile:

Stack fields vertically or use a filter drawer.

---

# ATTENDANCE TABLE

Desktop columns:

Employee

Employee ID

Department

Time In

Time Out

Status

Actions

Sample rows:

Juan Dela Cruz

EMP-001

Accounting

8:02 AM

5:04 PM

Completed

Maria Santos

EMP-014

Human Resources

8:11 AM

—

Late

Pedro Reyes

EMP-023

Operations

—

—

Not Yet Logged

Anna Cruz

EMP-031

IT

7:56 AM

5:01 PM

Completed

Use status badges.

On Time:

green

Late:

amber

Not Yet Logged:

gray/red subtle

Completed:

green/blue depending on hierarchy

---

# ATTENDANCE ROW ACTIONS

Provide an action menu:

View Details

View Attendance History

Do not prioritize manual attendance editing in this version.

---

# MOBILE ATTENDANCE VIEW

Transform table rows into stacked cards.

Example:

```text
Juan Dela Cruz
EMP-001 · Accounting

TIME IN       TIME OUT
8:02 AM       5:04 PM

✓ Completed

[ View Details ]
```

Keep filters accessible through:

Filter button

which opens a mobile filter sheet.

---

# ATTENDANCE DETAIL DRAWER/MODAL

When administrator selects:

View Details

open a polished side drawer on desktop.

On mobile use full-screen modal.

Display:

Employee avatar/initials

Employee Name

Employee ID

Department

Position

Date

Time In

Time Out

Attendance Status

Raw scan activity

Example:

8:02 AM

Time In recorded

5:04 PM

Time Out recorded

Provide:

View Full Attendance History

Close

---

# 4. EMPLOYEES PAGE

Create a comprehensive employee management page.

Header:

Employees

Supporting text:

Manage employee accounts and information.

Primary action:

* Add Employee

---

# EMPLOYEE SUMMARY

Optionally show small summary chips/cards:

150 Active

6 Inactive

5 Departments

Do not dominate the page.

---

# EMPLOYEE TOOLBAR

Include:

Search employee

Placeholder:

Search name, email or employee ID...

Department Filter

Status Filter

Options:

Active

Inactive

All

Sort dropdown if useful

---

# EMPLOYEE TABLE

Desktop columns:

Employee

Employee ID

Email

Department

Position

Status

Actions

Mock data:

Juan Dela Cruz

EMP-001

[juan.delacruz@company.com](mailto:juan.delacruz@company.com)

Accounting

Accounting Staff

Active

Maria Santos

EMP-014

[maria.santos@company.com](mailto:maria.santos@company.com)

Human Resources

HR Specialist

Active

Pedro Reyes

EMP-023

[pedro.reyes@company.com](mailto:pedro.reyes@company.com)

Operations

Operations Associate

Inactive

---

# EMPLOYEE AVATAR

Use simple initials-based avatars.

Example:

JD

MS

PR

No profile photo upload is needed.

---

# EMPLOYEE ROW ACTIONS

Use a three-dot menu.

Actions:

View Details

Edit Employee

Reset Password

Deactivate Employee

If inactive:

Reactivate Employee

Do not include permanent Delete as the primary workflow.

---

# 5. ADD EMPLOYEE EXPERIENCE

Clicking:

* Add Employee

should open either:

* dedicated page

or

* large modal/drawer

For desktop prefer a right-side drawer or dedicated form page.

For mobile use a full-screen form.

Title:

Add Employee

Description:

Create a new employee account and login credentials.

Fields:

Employee ID *

First Name *

Last Name *

Email *

Department

Position

Temporary Password *

Confirm Temporary Password *

Optional role field:

Employee

but hide admin role unless needed.

---

# FORM DESIGN

Use clear labels above inputs.

Provide inline validation.

Example:

Employee ID

EMP-151

First Name

John

Last Name

Santos

Email

[john.santos@company.com](mailto:john.santos@company.com)

Department

Operations

Position

Operations Staff

Temporary Password

••••••••••

---

# ADD EMPLOYEE ACTIONS

Bottom buttons:

Cancel

Create Employee

Create Employee should be primary.

During submission:

Creating Employee...

Success state:

Employee created successfully.

Provide simulated frontend behavior.

Add the employee to the displayed mock employee table after creation.

---

# FORM ERROR STATES

Visualize:

required field error

invalid email

duplicate employee ID

duplicate email

password too short

password mismatch

Use concise inline error messages.

---

# 6. EMPLOYEE DETAILS PAGE / DRAWER

When clicking an employee, show detailed information.

Header:

Juan Dela Cruz

EMP-001

Active

Sections:

Personal Information

Employment Information

Account Information

Attendance Summary

---

# PERSONAL INFORMATION

First Name

Last Name

Email

---

# EMPLOYMENT INFORMATION

Employee ID

Department

Position

Account Status

---

# ATTENDANCE SUMMARY

This Month

Days Present: 19

Late: 2

Completed: 18

Average Time In:

8:03 AM

These are frontend mock statistics only.

---

# RECENT ATTENDANCE

Show recent 5 records.

Date

Time In

Time Out

Status

Provide:

View Full Attendance History

---

# DETAIL ACTIONS

Top-right actions:

Edit Employee

Reset Password

More menu

Deactivate Employee

---

# 7. EDIT EMPLOYEE

When administrator selects Edit Employee:

Open editable form.

Fields:

Employee ID

First Name

Last Name

Email

Department

Position

Status

Use existing values.

Bottom actions:

Cancel

Save Changes

Include:

unsaved changes state

saving state

success notification

---

# EDIT SUCCESS

Display a toast:

Employee information updated successfully.

Simulate updating the displayed employee record.

---

# 8. DEACTIVATE EMPLOYEE FLOW

Do NOT immediately deactivate on click.

Open confirmation modal.

Example:

```text
Deactivate Employee?

Juan Dela Cruz will no longer be able to record attendance.

Their historical attendance records will remain available.

[ Cancel ]   [ Deactivate Employee ]
```

Use a red/destructive button for confirmation.

After simulated confirmation:

change employee badge to:

Inactive

Show toast:

Employee deactivated successfully.

---

# 9. REACTIVATE EMPLOYEE

For inactive employees provide:

Reactivate Employee

Confirmation may be lighter.

Example:

```text
Reactivate Employee?

Juan Dela Cruz will regain access to the attendance application.

[ Cancel ] [ Reactivate ]
```

After confirmation:

Status → Active

Toast:

Employee reactivated successfully.

---

# 10. RESET PASSWORD

Selecting Reset Password should open a modal.

Title:

Reset Employee Password

Employee:

Juan Dela Cruz

Fields:

New Temporary Password

Confirm Password

Add optional button:

Generate Password

Provide password visibility toggle.

Actions:

Cancel

Reset Password

Success state:

Password reset successfully.

Then display a temporary credential confirmation area:

```text
Temporary password

G8s#21LpX

Copy Password
```

Include warning:

For security, this password will only be shown once.

This is frontend simulation only.

Do not implement actual authentication.

---

# 11. ATTENDANCE QR PAGE

Create a dedicated:

Attendance QR

page.

This should be visually optimized for being displayed on an office monitor.

Header:

Attendance QR

Description:

Employees can scan this code using the attendance mobile application.

---

# QR DISPLAY CARD

Large centered QR placeholder.

Use a realistic generated-looking QR graphic.

Below it display:

Active

Expires in 43 seconds

Progress/countdown indicator

Generated at 8:04:00 AM

---

# QR ACTIONS

Buttons:

Refresh QR

Revoke Current QR

Use appropriate icons.

Include a toggle:

Auto Refresh

Enabled

Show supporting text:

QR codes automatically refresh every 60 seconds for security.

---

# FULLSCREEN QR MODE

Provide a:

Display Full Screen

button.

Fullscreen layout should show:

organization name

large QR

instruction:

Scan using the Attendance App

current date/time

minimal distractions

This is intended for a reception/front desk/office display.

---

# QR REVOKE CONFIRMATION

When clicking Revoke Current QR:

Show confirmation modal.

Current QR will stop working immediately.

Cancel

Revoke QR

Then simulate generating another QR.

---

# 12. SETTINGS PAGE

Create a simple professional settings screen.

Page title:

Settings

Description:

Configure basic attendance system preferences.

---

# ORGANIZATION SETTINGS

Fields:

Organization Name

Example Company Inc.

Timezone

Asia/Manila

---

# ATTENDANCE SETTINGS

Work Start Time

8:00 AM

Work End Time

5:00 PM

Grace Period

10 minutes

Display explanatory text:

Employees logging in after the grace period will be marked late.

---

# SETTINGS ACTION

Save Changes

Display success toast:

Settings updated successfully.

---

# 13. EMPTY STATES

Create polished empty states.

Examples:

No Employees

```text
No employees found.

Add your first employee to begin tracking attendance.

[ Add Employee ]
```

No Attendance:

```text
No attendance records found.

Try changing the selected date or filters.
```

No Search Results:

```text
No employees match your search.
```

Avoid large decorative illustrations.

Simple icon + text + action is sufficient.

---

# 14. LOADING STATES

Create proper loading states.

Use:

* skeleton metric cards
* skeleton table rows
* button spinner
* subtle page loading states

Do not use huge full-screen spinners unless initial authentication is loading.

---

# 15. TOAST NOTIFICATIONS

Create consistent toasts.

Success:

Employee created successfully.

Employee updated successfully.

Employee deactivated successfully.

Employee reactivated successfully.

Password reset successfully.

Settings saved successfully.

QR refreshed successfully.

Error:

Unable to complete the action. Please try again.

Use top-right desktop positioning.

On mobile use top or bottom toast appropriately.

---

# 16. CONFIRMATION MODALS

Create reusable modal style for:

Deactivate employee

Reactivate employee

Reset password

Revoke QR

Unsaved changes

Use:

clear title

short explanation

cancel action

specific confirmation action

Do not use generic:

Are you sure?

without explaining the consequence.

---

# 17. MOBILE EMPLOYEE MANAGEMENT

Design employees page specifically for small screens.

Instead of a cramped table:

Use cards.

Example:

```text
[JD] Juan Dela Cruz
EMP-001

Accounting
Accounting Staff

● Active

juan.delacruz@company.com

[ View ]

⋯
```

Three-dot menu includes:

Edit

Reset Password

Deactivate

---

# MOBILE ADD EMPLOYEE

Full screen form.

Top bar:

← Add Employee

Fields stacked vertically.

Sticky bottom action bar:

Cancel

Create Employee

Ensure keyboard does not hide important controls.

---

# MOBILE EDIT EMPLOYEE

Same responsive form pattern.

Save Changes should remain easily accessible.

---

# 18. MOBILE DASHBOARD

Design dashboard cards appropriately.

Example:

Top:

```text
Good morning, Admin

Sunday, Aug 16
```

Then 2-column metrics:

```text
Present
137

Not Logged
13

Completed
72

Late
8
```

Then:

Today's Attendance

simple visualization

Then:

Recent Activity

stacked employee cards.

Do not force desktop charts into unreadable widths.

---

# 19. MOBILE NAVIGATION DRAWER

Hamburger menu opens:

Dashboard

Attendance

Employees

Attendance QR

Settings

divider

Admin profile

Logout

Use clear icons and active states.

---

# 20. TABLE PAGINATION

For mock frontend:

Desktop:

Show:

Rows per page: 25

1–25 of 150

Previous / Next

For mobile:

Prefer:

Load More

or simplified pagination.

---

# 21. DESIGN COMPONENT SYSTEM

Build reusable UI components and variants:

Primary Button

Secondary Button

Destructive Button

Ghost Button

Icon Button

Input

Select

Search Field

Date Picker

Status Badge

Metric Card

Employee Avatar

Data Table

Dropdown Menu

Modal

Drawer

Toast

Tabs

Filter Chip

Pagination

Skeleton

Empty State

Page Header

Sidebar Item

Mobile Navigation Drawer

Use consistent:

border radius

spacing

heights

typography

interaction states

---

# 22. BUTTON STATES

Every important button must visually support:

default

hover

pressed

focus

disabled

loading

Use accessible focus indicators.

---

# 23. FORM STATES

Inputs should support:

default

focus

filled

disabled

error

Include clear helper text.

---

# 24. ACCESSIBILITY

Design with accessibility in mind.

Requirements:

* readable contrast
* clear labels
* do not rely entirely on color for statuses
* useful icons plus text
* adequate touch targets
* visible focus indicators
* proper modal hierarchy
* buttons have clear text labels

---

# 25. MOCK DATA

Populate the frontend with approximately 15–20 realistic employees.

Use Filipino-style names and departments appropriate to a Philippine organization.

Example names:

Juan Dela Cruz

Maria Santos

Anna Reyes

Kevin Garcia

Paolo Mendoza

Angela Cruz

Michael Bautista

Sofia Ramos

Daniel Flores

Patricia Aquino

Departments:

Accounting

Human Resources

Operations

Information Technology

Finance

Marketing

Administration

Use:

EMP-001

EMP-002

etc.

Use `@company.com` placeholder emails.

Do not use real personal information.

---

# 26. INTERACTIONS

This should be an interactive frontend prototype.

Implement simulated behavior for:

Navigation

Search

Filters

Date selection

Add Employee

Edit Employee

Deactivate Employee

Reactivate Employee

Reset Password

View Employee

View Attendance Details

QR refresh

QR revoke

Settings changes

Login

Logout

Modal opening/closing

Drawer opening/closing

Toast notifications

Do not leave major controls inert.

---

# 27. DATA MUTATION SIMULATION

Because this is UI/frontend only, maintain temporary mock application state.

For example:

When Add Employee is submitted:

* close form
* add employee to employees collection
* refresh displayed list
* show success toast

When Edit Employee is submitted:

* update displayed information
* show toast

When Deactivate Employee:

* change status
* update filters/counts
* show toast

When Reactivate:

* reverse status

This should make the prototype feel like a functioning application.

---

# 28. SEARCH INTERACTION

Employee search should dynamically filter mock employee data.

Match:

first name

last name

full name

employee ID

email

Attendance search should behave similarly.

---

# 29. FILTER INTERACTION

Department and status filters should actually update displayed mock records.

Show active filter chips.

Provide:

Clear Filters

---

# 30. RESPONSIVE BREAKPOINT BEHAVIOR

Plan at least:

Large Desktop

1440px+

Desktop/Laptop

1024–1439px

Tablet

768–1023px

Mobile

320–767px

At large desktop:

expanded sidebar

multi-column cards

large tables

At tablet:

collapsible sidebar

2-column cards

responsive filters

At mobile:

navigation drawer

stacked content

cards replacing complex tables

full-screen forms/modals where appropriate

---

# 31. DASHBOARD VISUAL HIERARCHY

Desktop dashboard should roughly flow:

```text
Page Header

Metric Cards

Attendance Overview + Weekly Chart

Recent Attendance Activity

Employees Not Yet Logged
```

Do not place every section inside visually heavy cards.

Allow breathing room.

---

# 32. DESKTOP EMPLOYEES FLOW

Prototype this complete flow:

```text
Employees
    ↓
Add Employee
    ↓
Complete Form
    ↓
Create
    ↓
Success Toast
    ↓
New Employee Appears
```

Also:

```text
Employee Row
    ↓
Edit Employee
    ↓
Change Position
    ↓
Save
    ↓
Table Updates
```

Also:

```text
Employee Row
    ↓
Deactivate
    ↓
Confirmation
    ↓
Inactive
```

---

# 33. MOBILE EMPLOYEE FLOW

Prototype the same actions responsively.

Ensure the administrator can complete:

add

view

edit

deactivate

reactivate

reset password

from a phone without needing desktop.

---

# 34. ATTENDANCE DETAIL VISUALIZATION

On employee details, optionally include a small 7-day or 30-day attendance visualization.

Keep it compact.

Possible representation:

simple calendar/attendance streak

or

small bar chart showing arrival times

Do not create unnecessary complex analytics.

---

# 35. STATUS VISUAL SYSTEM

Use consistent badges.

Examples:

Active

green dot + Active

Inactive

gray/red dot + Inactive

On Time

green check + On Time

Late

amber clock + Late

Not Yet Logged

gray clock + Not Yet Logged

Completed

green/blue check-circle + Completed

Keep badges compact.

---

# 36. ICONOGRAPHY

Use a consistent clean outline icon family.

Suggested conceptual icons:

Dashboard → grid/home

Attendance → calendar-check

Employees → users

QR → qr-code

Settings → gear

Search → magnifier

Add → plus

Edit → pencil

Deactivate → user-minus

Reactivate → user-check

Password → key

Time In → log-in

Time Out → log-out

Use icons to support text, not replace essential labels.

---

# 37. DESKTOP QR PRESENTATION

The QR page should be particularly polished.

Consider two-column desktop layout:

Left:

large QR display

Right:

QR status

expiration

auto-refresh setting

security information

controls

Below:

short instructions.

---

# 38. QR SECURITY EXPLANATION

Display subtle informational text:

```text
For security, attendance QR codes automatically expire and refresh regularly.
```

No need for detailed technical explanation.

---

# 39. TOP-LEVEL DESIGN QUALITY

Make this interface feel ready to show to:

* a client
* a company manager
* an operations administrator
* an internal development team

It should not feel like:

* a school exercise
* wireframes
* generic generated dashboard
* incomplete mockup

Use realistic spacing and content density.

---

# 40. FRONTEND-ONLY LIMITATION

IMPORTANT:

This prototype is for UI/UX and frontend demonstration.

Do not require:

Supabase

Firebase

external APIs

real authentication

real database

real QR validation

real email

real password resets

All backend actions should be mocked/simulated in frontend state.

However:

Structure the components and frontend code cleanly so a developer can later replace the mock data layer with Supabase APIs without redesigning the interface.

---

# 41. CODE STRUCTURE

If Figma Make is generating functional frontend code, organize logically.

Recommended conceptual structure:

```text
components/
    layout/
    dashboard/
    attendance/
    employees/
    qr/
    settings/
    ui/

data/
    mockEmployees
    mockAttendance

types/

pages or routes/
```

Keep reusable business components separate from generic UI components.

---

# 42. FINAL REQUIRED SCREENS

Create ALL of these:

1. Admin Login

2. Dashboard Desktop

3. Dashboard Mobile

4. Attendance List Desktop

5. Attendance List Mobile

6. Attendance Detail Drawer

7. Employees Desktop

8. Employees Mobile

9. Add Employee Desktop

10. Add Employee Mobile

11. Employee Details

12. Edit Employee

13. Deactivate Confirmation Modal

14. Reactivate Confirmation

15. Password Reset Modal

16. Attendance QR Desktop

17. Attendance QR Full-Screen Display

18. Attendance QR Mobile

19. Settings Desktop

20. Settings Mobile

21. Empty States

22. Loading States

23. Error States

24. Toast States

25. Mobile Navigation Drawer

---

# 43. REQUIRED PROTOTYPE ACTIONS

Make these functional within the prototype:

* Sign In
* Navigation
* Open/close mobile navigation
* Search employees
* Filter employees
* Search attendance
* Filter attendance
* Change attendance date
* Add employee
* View employee
* Edit employee
* Deactivate employee
* Reactivate employee
* Reset password
* View attendance detail
* Refresh QR
* Revoke QR
* Toggle automatic QR refresh
* Save settings
* Logout

Use simulated frontend state where backend behavior is required.

---

# 44. FINAL RESULT

Produce a cohesive, production-quality frontend prototype for a small employee attendance management platform.

The final design should communicate:

```text
Simple daily attendance management
+
Professional employee administration
+
Clear operational visibility
+
Fast administrator workflows
+
Responsive desktop and mobile usability
```

Do not add features outside the attendance scope.

Prioritize usability, visual polish, responsiveness, and complete interactive flows.

Build the entire design system and all required screens as one coherent product.
