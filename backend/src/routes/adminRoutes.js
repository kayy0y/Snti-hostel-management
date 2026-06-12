const express = require('express');
const router = express.Router();

const {
  getAllStudents,
  addStudent,
  deleteStudent,
  deleteStudentNow,
  deactivateSelf,
  deleteSelf,
  resetBatch,
  getDashboardStats,
  getQuickAnalytics,
  createAdmin,
  getAdminList,
  deleteExpiredUsers,
  exportExcel,
  exportPDF
} = require('../controllers/adminController');

const { protect, adminOnly } = require('../middleware/auth');

// Dashboard
router.get('/dashboard-stats', protect, adminOnly, getDashboardStats);
router.get('/analytics', protect, adminOnly, getQuickAnalytics);
router.get('/quick-analytics', protect, adminOnly, getQuickAnalytics);

// Students
router.get('/students', protect, adminOnly, getAllStudents);
router.post('/students', protect, adminOnly, addStudent);

router.put('/students/:id/deactivate', protect, adminOnly, deleteStudent);
router.delete('/students/:id', protect, adminOnly, deleteStudentNow);

// Account actions
router.post('/reset-batch', protect, adminOnly, resetBatch);

// Admin management
router.post('/create-admin', protect, adminOnly, createAdmin);
router.get('/list-admins', protect, adminOnly, getAdminList);

// Expiry
router.put('/delete-expired', protect, adminOnly, deleteExpiredUsers);

// Export
router.get('/export/excel', protect, adminOnly, exportExcel);
router.get('/export/pdf', protect, adminOnly, exportPDF);

module.exports = router;