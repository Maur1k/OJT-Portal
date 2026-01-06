# Testing Guide for System Updates

## Server Status
✅ Server is running on http://localhost:3000

## Test Accounts
- **Coordinator**: coordinator@psu.edu
- **Director**: director@psu.edu
- **Student**: Create a new account or use existing student accounts

---

## 1. Test Registration Form (Company Info & OJT Schedule Removed)

### Steps:
1. Open browser and go to: `http://localhost:3000/auth/register`
2. **Expected Result**: 
   - ✅ Should see: Account Information, Student Information, Emergency Contact sections
   - ❌ Should NOT see: Company Information section
   - ❌ Should NOT see: Supervisor Information section
   - ❌ Should NOT see: OJT Schedule section

### What to Check:
- Form should only ask for:
  - Email & Password
  - Student Number, Name, Course, Year Level, Section
  - Contact Number, Address
  - Emergency Contact (optional)
  - Profile Photo (optional)

### Test Registration:
- Fill out the form with test data
- Submit and verify it creates account without company/OJT fields

---

## 2. Test Company Filtering by Department/Course

### Steps:
1. Login as a student (or register a new one)
2. Go to: `http://localhost:3000/student/companies`
3. **Expected Result**: 
   - Companies should be filtered based on student's course
   - If student course is "BSIT", only companies with `availableForCourses` containing "BSIT" or no restriction should show

### What to Check:
- View the company list
- Companies should be filtered appropriately
- If no course restriction is set on companies, all should show

### To Test Properly:
- Create/update a company in MongoDB with `availableForCourses: ["BSIT"]`
- Login as student with course "BSIT" - should see the company
- Login as student with different course - should NOT see the company (if restriction exists)

---

## 3. Test Resume, Narrative, and Proof Photos

### Steps:
1. Login as a student
2. Go to: `http://localhost:3000/student/profile`

### Test Resume Upload:
1. Click "Upload Resume" button
2. Upload a PDF/DOC file
3. **Expected Result**: Resume should appear with "View Resume" link

### Test Narrative:
1. Click "Edit Narrative" button
2. Enter some text about OJT experience
3. Save
4. **Expected Result**: Narrative should display on profile page

### Test Proof Photos:
1. Click "Upload Photos" button
2. Select multiple images (up to 10)
3. Upload
4. **Expected Result**: Photos should display in a grid
5. Test delete: Click × on a photo to delete it

### What to Check:
- All three sections should be visible on profile page
- Upload functionality works
- Files are saved correctly
- Delete functionality works for photos

---

## 4. Test Announcement Dates (Start/End Dates)

### Steps:
1. Login as Coordinator: `coordinator@psu.edu`
2. Go to: `http://localhost:3000/coordinator/announcements/create`

### Test Start Date:
1. Create announcement with:
   - Title: "Test Future Announcement"
   - Start Date: Set to tomorrow's date
   - End Date: Leave empty or set future date
2. Save
3. **Expected Result**: 
   - Announcement should NOT appear to students until start date
   - Should appear after start date passes

### Test End Date:
1. Create announcement with:
   - Title: "Test Expired Announcement"
   - Start Date: Leave empty or set past date
   - End Date: Set to yesterday's date
2. Save
3. **Expected Result**: 
   - Announcement should NOT appear to students (expired)
   - Should not show in student announcements list

### Test Active Announcement:
1. Create announcement with:
   - Title: "Test Active Announcement"
   - Start Date: Leave empty or set past date
   - End Date: Leave empty or set future date
2. Save
3. Login as student
4. Go to: `http://localhost:3000/student/announcements`
5. **Expected Result**: Should see the active announcement

### What to Check:
- Date fields appear in announcement form
- Announcements respect start/end dates
- Only active announcements show to students

---

## 5. Test Archive Functionality (Instead of Deactivate)

### Steps:
1. Login as Coordinator
2. Go to: `http://localhost:3000/coordinator/announcements`
3. Find an active announcement
4. **Expected Result**: 
   - Should see "Archive" button (NOT "Deactivate")
   - Button should be red/danger style

### Test Archive:
1. Click "Archive" button
2. Confirm the action
3. **Expected Result**: 
   - Announcement should be archived
   - Should disappear from student view
   - Should still be visible in coordinator view (but marked as archived)
   - Success message: "Announcement archived successfully"

### What to Check:
- Button text says "Archive" not "Deactivate"
- Archive functionality works
- Archived announcements don't show to students

---

## 6. Test Director Dashboard (Total MOAs Count)

### Steps:
1. Login as Director: `director@psu.edu`
2. Go to: `http://localhost:3000/director/dashboard`

### Expected Result:
- Should see 4 cards:
  1. **Verified Students** (count)
  2. **Total MOAs** (NEW - should show total count) ⭐
  3. **Pending Signatures** (count)
  4. **Completed MOAs** (count)

### What to Check:
- "Total MOAs" card should be visible
- Should display correct count of all MOAs in system
- Card should be styled (likely blue/info color)

---

## Quick Test Checklist

- [ ] Registration form: No company info, no OJT schedule
- [ ] Company list: Filtered by student course
- [ ] Student profile: Resume upload works
- [ ] Student profile: Narrative edit works
- [ ] Student profile: Proof photos upload works
- [ ] Announcement form: Start/End date fields visible
- [ ] Announcements: Respect date ranges
- [ ] Coordinator announcements: "Archive" button (not "Deactivate")
- [ ] Archive: Works correctly
- [ ] Director dashboard: "Total MOAs" card visible

---

## Troubleshooting

### If server not running:
```bash
cd "C:\Users\maurik\Documents\SIA\SIAupd (1)\SIAupd\SIA"
npm start
```

### If port 3000 in use:
```bash
npm run kill-port
npm start
```

### Check MongoDB connection:
- Ensure MongoDB is running
- Check `.env` file has correct `MONGODB_URI`

### Common Issues:
1. **Upload directories not created**: They should auto-create on first upload
2. **Date filtering not working**: Check server console for errors
3. **Company filtering not working**: Verify student has course set in profile

---

## Notes

- All changes are backward compatible with existing data
- Company info and OJT dates are now optional (existing data preserved)
- Archive replaces deactivate but maintains same functionality
- Date filtering is additive (announcements without dates still work)

