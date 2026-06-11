const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { protect, adminOnly, studentOnly } = require('../middleware/auth');

const auth = require('../controllers/authController');
const menu = require('../controllers/menuController');
const reg = require('../controllers/registrationController');
const fb = require('../controllers/feedbackController');
const admin = require('../controllers/adminController');
const settings = require('../controllers/settingsController');
const archive = require('../controllers/archiveController');


// ======================================================
// AUTH
// ======================================================

router.post('/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  body('portal').isIn(['student', 'admin'])
], auth.login);

router.post('/auth/register', [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .matches(/[0-9]/),
  body('phone').matches(/^\d{10}$/)
], auth.register);

router.get('/auth/me', protect, auth.getMe);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/verify-otp', auth.verifyOTP);
router.post('/auth/reset-password', auth.resetPassword);


// ======================================================
// SETTINGS
// ======================================================

router.get('/settings/upi-qr', settings.getPublicUPIQR);

router.get(
  '/settings',
  protect,
  adminOnly,
  settings.getSettings
);

router.put(
  '/settings',
  protect,
  adminOnly,
  settings.updateSettings
);


// ======================================================
// REGISTRATIONS
// ======================================================

router.post(
  '/registrations',
  protect,
  studentOnly,
  [
    body('mess_type')
      .isIn(['Veg', 'Non-Veg', 'Special', 'Breakfast+Lunch'])
  ],
  reg.createRegistration
);

router.get(
  '/registrations/my',
  protect,
  studentOnly,
  reg.getMyRegistration
);

router.get(
  '/registrations',
  protect,
  adminOnly,
  reg.getAllRegistrations
);

router.put(
  '/registrations/:id/approve',
  protect,
  adminOnly,
  reg.approveRegistration
);


// ======================================================
// MENUS
// ======================================================

router.get('/menus', protect, menu.getMenus);

router.post(
  '/menus',
  protect,
  adminOnly,
  [
    body('meal_type')
      .isIn(['Breakfast', 'Lunch', 'Dinner']),
    body('item_name').notEmpty(),
    body('category')
      .isIn(['Veg', 'Non-Veg', 'Special'])
  ],
  menu.addMenuItem
);

router.delete(
  '/menus/:id',
  protect,
  adminOnly,
  menu.deleteMenuItem
);

router.post(
  '/menus/select',
  protect,
  studentOnly,
  menu.selectMenu
);

router.get(
  '/menus/my-selection',
  protect,
  studentOnly,
  menu.getMyMenuSelection
);

router.get(
  '/menus/all-selections',
  protect,
  adminOnly,
  menu.getAllMenuSelections
);


// ======================================================
// WEEKLY PLAN
// ======================================================

router.get(
  '/weekly-plan',
  protect,
  menu.getWeeklyPlan
);

router.post(
  '/weekly-plan/add-item',
  protect,
  adminOnly,
  menu.addItemToPlan
);

router.delete(
  '/weekly-plan/remove-item/:plan_id',
  protect,
  adminOnly,
  menu.removeItemFromPlan
);

router.delete(
  '/weekly-plan/reset',
  protect,
  adminOnly,
  menu.resetWeekPlan
);

router.get(
  '/weekly-plan/available-weeks',
  protect,
  adminOnly,
  menu.getAvailableWeeks
);


// ======================================================
// FEEDBACK
// ======================================================

router.post(
  '/feedback',
  protect,
  studentOnly,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('category').isIn([
      'Food Quality',
      'Cleanliness',
      'Service',
      'Variety',
      'Other'
    ])
  ],
  fb.submitFeedback
);

router.get(
  '/feedback',
  protect,
  adminOnly,
  fb.getAllFeedback
);


// ======================================================
// ADMIN
// ======================================================

router.get(
  '/admin/students',
  protect,
  adminOnly,
  admin.getAllStudents
);

router.post(
  '/admin/students',
  protect,
  adminOnly,
  admin.addStudent
);

router.delete(
  '/admin/students/:id',
  protect,
  adminOnly,
  admin.deleteStudent
);

router.delete(
  '/admin/students/:id/now',
  protect,
  adminOnly,
  admin.deleteStudentNow
);

router.post(
  '/admin/reset-batch',
  protect,
  adminOnly,
  admin.resetBatch
);


// ---------- Dashboard ----------

router.get(
  '/admin/dashboard-stats',
  protect,
  adminOnly,
  admin.getDashboardStats
);

router.get(
  '/admin/quick-analytics',
  protect,
  adminOnly,
  admin.getQuickAnalytics
);

router.delete(
  '/admin/expired-users',
  protect,
  adminOnly,
  admin.deleteExpiredUsers
);

router.get(
  '/admin/export-excel',
  protect,
  adminOnly,
  admin.exportExcel
);

router.get(
  '/admin/export-pdf',
  protect,
  adminOnly,
  admin.exportPDF
);

router.post(
  '/admin/create-admin',
  protect,
  adminOnly,
  admin.createAdmin
);

router.get(
  '/admin/list-admins',
  protect,
  adminOnly,
  admin.getAdminList
);


// ======================================================
// STUDENT SELF SERVICE
// ======================================================

router.post(
  '/student/deactivate',
  protect,
  studentOnly,
  admin.deactivateSelf
);

router.delete(
  '/student/delete-account',
  protect,
  studentOnly,
  admin.deleteSelf
);


// ======================================================
// ARCHIVE
// ======================================================

router.post(
  '/archive/run',
  protect,
  adminOnly,
  archive.runArchive
);

router.get(
  '/archive/years',
  protect,
  adminOnly,
  archive.getArchiveYears
);

router.get(
  '/archive/registrations',
  protect,
  adminOnly,
  archive.getArchivedRegistrations
);

router.get(
  '/archive/feedback',
  protect,
  adminOnly,
  archive.getArchivedFeedback
);

router.get(
  '/archive/export',
  protect,
  adminOnly,
  archive.exportArchive
);

router.delete(
  '/archive/:year',
  protect,
  adminOnly,
  archive.deleteArchive
);


module.exports = router;