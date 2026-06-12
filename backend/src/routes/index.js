const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const { protect, adminOnly, studentOnly } = require('../middleware/auth');

const authRoutes = require('./adminRoutes');

const auth    = require('../controllers/authController');
const menu    = require('../controllers/menuController');
const reg     = require('../controllers/registrationController');
const fb      = require('../controllers/feedbackController');
const settings = require('../controllers/settingsController');

// ── Auth ────────────────────────────────────────────────────────────────

router.post('/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  body('portal').isIn(['student','admin']),
], auth.login);


router.post('/auth/register', [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password')
    .isLength({min:8})
    .matches(/[A-Z]/)
    .matches(/[0-9]/),
  body('phone').matches(/^\d{10}$/),
], auth.register);


router.get('/auth/me', protect, auth.getMe);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/verify-otp', auth.verifyOTP);
router.post('/auth/reset-password', auth.resetPassword);

// ── Settings ───────────────────────────────────────────────────────────

router.get('/settings/upi-qr', settings.getPublicUPIQR);
router.get('/settings',
  protect,adminOnly,
  settings.getSettings
);

router.put('/settings',
  protect, adminOnly,
  settings.updateSettings
);

// ── Registrations ───────────────────────────────────────────────────────

router.post('/registrations',
 protect,studentOnly,
 [
  body('mess_type')
  .isIn(['Veg','Non-Veg','Special','Breakfast+Lunch'])
 ],
 reg.createRegistration
);

router.get('/registrations/my',
 protect, studentOnly, reg.getMyRegistration
);
router.get('/registrations',
 protect, adminOnly, reg.getAllRegistrations
);
router.put('/registrations/:id/approve',
 protect, adminOnly,reg.approveRegistration
);

// ── Menus ───────────────────────────────────────────────────────────────

router.get('/menus',
 protect, menu.getMenus
);
router.post('/menus',
 protect, adminOnly, menu.addMenuItem
);
router.delete('/menus/:id',
 protect, adminOnly, menu.deleteMenuItem
);
router.post('/menus/select',
 protect, studentOnly, menu.selectMenu
);

router.get('/menus/my-selection',
 protect,studentOnly, menu.getMyMenuSelection
);
router.get('/menus/all-selections',
 protect,adminOnly,menu.getAllMenuSelections
);

// ── Weekly Plan ─────────────────────────────────────────────────────────

router.get('/weekly-plan',
 protect,
 menu.getWeeklyPlan
);
router.post('/weekly-plan/add-item',
 protect,
 adminOnly,
 menu.addItemToPlan
);
router.delete('/weekly-plan/remove-item/:plan_id',
 protect,
 adminOnly,
 menu.removeItemFromPlan
);
router.delete('/weekly-plan/reset',
 protect,
 adminOnly,
 menu.resetWeekPlan
);
router.get('/weekly-plan/available-weeks',
 protect,
 adminOnly,
 menu.getAvailableWeeks
);
// ── Feedback ───────────────────────────────────────────────────────────

router.post('/feedback',
 protect,
 studentOnly,
 fb.submitFeedback
);
router.get('/feedback',
 protect,
 adminOnly,
 fb.getAllFeedback
);

// ── Student Account ────────────────────────────────────────────────────

const admin = require('../controllers/adminController');
router.post('/student/deactivate',
 protect,
 studentOnly,
 admin.deactivateSelf
);
router.delete('/student/delete-account',
 protect,
 studentOnly,
 admin.deleteSelf
);

// ── Archive ────────────────────────────────────────────────────────────

const archive = require('../controllers/archiveController');
router.post('/archive/run',
 protect,
 adminOnly,
 archive.runArchive
);
router.get('/archive/years',
 protect,
 adminOnly,
 archive.getArchiveYears
);
router.get('/archive/registrations',
 protect,
 adminOnly,
 archive.getArchivedRegistrations
);
router.get('/archive/feedback',
 protect,
 adminOnly,
 archive.getArchivedFeedback
);
router.get('/archive/export',
 protect,
 adminOnly,
 archive.exportArchive
);
router.delete('/archive/:year',
 protect,
 adminOnly,
 archive.deleteArchive
);

// ── Payments ───────────────────────────────────────────────────────────

const payment = require('../controllers/paymentController');
router.get('/payments/pending',
 protect,
 adminOnly,
 payment.getPendingPayments
);
router.get('/payments/:user_id',
 protect,
 adminOnly,
 payment.getPaymentHistory
);
router.post('/payments/record',
 protect,
 adminOnly,
 payment.recordPayment
);
router.put('/payments/:payment_id/verify',
 protect,
 adminOnly,
 payment.verifyPayment
);

// ── ADMIN ROUTES IMPORTED HERE ─────────────────────────────────────────
// this connects /api/admin/*

router.use('/admin', authRoutes);

module.exports = router;