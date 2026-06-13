const express = require('express');
const router = express.Router();

const admin = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get(
'/dashboard-stats',
protect, adminOnly, admin.getDashboardStats
);

router.get(
'/quick-analytics',
protect, adminOnly, admin.getQuickAnalytics
);

router.get(
'/analytics',
protect, adminOnly, admin.getAnalytics
);

router.get(
'/list-admins',
protect, adminOnly, admin.getAdminList
);

router.post(
'/create-admin',
protect, adminOnly, admin.createAdmin
);

router.get(
'/students',
protect, adminOnly, admin.getAllStudents
);

router.post(
'/students',
protect, adminOnly, admin.addStudent
);

router.delete(
'/students/:id/now',
protect, adminOnly, admin.deleteStudentNow
);

router.post(
  '/reset-batch',
  protect, adminOnly, admin.resetBatch
);

module.exports = router;