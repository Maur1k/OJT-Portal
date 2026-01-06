# Course-Based Company Filtering Guide

## Overview
Companies are now filtered based on student courses. Students will only see companies that are available for their specific course.

## How It Works

### For Students
- Students see only companies available for their course
- Companies without course restrictions are available to ALL courses
- Companies with restrictions only show to matching courses
- The company list shows which courses each company is available for

### For Coordinators
- When creating a new company, you can select which courses can apply
- Leave all checkboxes unchecked to make the company available to ALL courses
- Check specific courses to restrict the company to those courses only

## Current Course Restrictions

The following companies have been set with course restrictions:

**IT/CS Related (BSIT, BSCS, BSIS):**
- DICT - Pangasinan
- PSU - Information and Communication Technology Management Office
- Makerspace Innovhub
- Offshore Concept BPO Services, Inc. (FullSuite)

**Engineering Related:**
- B&M Fiber-Tech Fiber Optics Installation Services (BSIT, BSCE, BSECE)
- National Irrigation Administration - PIMO (BSME, BSCE)
- Villasis Water District (BSME, BSCE)

**Available to All Courses:**
- Bureau of Internal Revenue - CAR
- DepEd Schools Division Office - Urdaneta City
- Department of Agrarian Reform
- DENR - CENRO Baguio City
- Local Government Unit of Manaoag
- Local Government Unit of Sual
- PruLife UK - Urdaneta Branch

## Testing the Filtering

1. **Register a student with course "BSIT":**
   - Should see IT/CS companies + all unrestricted companies
   - Should NOT see BSME-only companies

2. **Register a student with course "BSME":**
   - Should see engineering companies + all unrestricted companies
   - Should NOT see IT/CS-only companies

3. **Register a student with course "BSCE":**
   - Should see companies that include BSCE in their restrictions + all unrestricted companies

## Updating Course Restrictions

### For Partner Companies (via MongoDB):
Run the script: `npm run set-company-courses`

Edit `scripts/set-company-courses.js` to modify course assignments.

### For Regular Companies (via UI):
1. Go to Coordinator Dashboard
2. Click "Add Company"
3. Select courses in the "Available For Courses" section
4. Leave empty for all courses

## UI Features

### Student Company List:
- Shows student's course at the top
- Shows count of available companies
- Displays course badges for each company
- Shows "All Courses" badge for unrestricted companies

### Company Profile:
- Shows which courses the company is available for
- Displays course badges in the header

## Troubleshooting

**Issue:** Student sees all companies regardless of course
- **Solution:** Check that the student's profile has a course set
- **Solution:** Verify company has `availableForCourses` field in database

**Issue:** Student sees no companies
- **Solution:** Check if any companies have course restrictions matching the student's course
- **Solution:** Verify companies without restrictions exist (they should show to all)

**Issue:** Company shows to wrong courses
- **Solution:** Check the `availableForCourses` array in the database
- **Solution:** Run `npm run set-company-courses` to reset restrictions

