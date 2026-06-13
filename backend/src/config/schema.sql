CREATE DATABASE IF NOT EXISTS snti_hostel;
USE snti_hostel;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  password         VARCHAR(255) NOT NULL,
  phone            VARCHAR(15)  DEFAULT NULL,
  trainee_id       VARCHAR(50)  DEFAULT NULL,
  trainee_type     ENUM('Vocational Trainee','Pre Trainee') DEFAULT NULL,
  hostel_block     VARCHAR(50)  DEFAULT NULL,
  member_type      ENUM('Hostel','Mess Only') NOT NULL DEFAULT 'Hostel',
  role             ENUM('admin','student','external') NOT NULL DEFAULT 'student',
  otp_code         VARCHAR(6)   DEFAULT NULL,
  otp_expires      DATETIME     DEFAULT NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  deactivated_at   DATETIME     DEFAULT NULL,
  pending_deletion TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT NOT NULL,
  mess_type         ENUM('Veg','Non-Veg','Special','Breakfast+Lunch') NOT NULL,
  registration_date DATE NOT NULL DEFAULT (CURDATE()),
  expiry_date       DATE NOT NULL,
  status            ENUM('active','expired') NOT NULL DEFAULT 'active',
  payment_proof     LONGTEXT DEFAULT NULL,
  approval_status   ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_by       BIGINT DEFAULT NULL,
  approved_at       DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. MENUS
-- ============================================================
CREATE TABLE IF NOT EXISTS menus (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  meal_type   ENUM('Breakfast','Lunch','Dinner') NOT NULL,
  item_name   VARCHAR(150) NOT NULL,
  category    ENUM('Veg','Non-Veg','Special') NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. WEEKLY MENU PLAN
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_menu_plan (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  week_start  DATE NOT NULL,
  day_name    ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  meal_type   ENUM('Breakfast','Lunch','Dinner') NOT NULL,
  menu_id     BIGINT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_plan_slot_item (week_start, day_name, meal_type, menu_id),
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. MENU SELECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_selections (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  week_start  DATE NOT NULL,
  day_name    ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  breakfast   VARCHAR(150) DEFAULT NULL,
  lunch       VARCHAR(150) DEFAULT NULL,
  dinner      VARCHAR(150) DEFAULT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_day (user_id, week_start, day_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category    ENUM('Food Quality','Cleanliness','Service','Variety','Other') NOT NULL DEFAULT 'Food Quality',
  comments    TEXT DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_val LONGTEXT DEFAULT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. EMAIL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  status     ENUM('sent','failed') NOT NULL DEFAULT 'sent',
  sent_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. ARCHIVED REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS archived_registrations (
  id                BIGINT NOT NULL,
  user_id           BIGINT NOT NULL,
  mess_type         VARCHAR(50) NOT NULL,
  registration_date DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  status            VARCHAR(20) NOT NULL,
  payment_proof     LONGTEXT DEFAULT NULL,
  approval_status   VARCHAR(20) NOT NULL,
  approved_by       BIGINT DEFAULT NULL,
  approved_at       DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL,
  user_name         VARCHAR(100) NOT NULL,
  user_email        VARCHAR(150) NOT NULL,
  user_phone        VARCHAR(15)  DEFAULT NULL,
  user_trainee_id   VARCHAR(50)  DEFAULT NULL,
  user_trainee_type VARCHAR(50)  DEFAULT NULL,
  user_hostel_block VARCHAR(50)  DEFAULT NULL,
  user_member_type  VARCHAR(20)  DEFAULT NULL,
  user_role         VARCHAR(20)  NOT NULL,
  archive_year      YEAR NOT NULL,
  archived_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_by       BIGINT NOT NULL,
  PRIMARY KEY (id, archive_year),
  INDEX idx_arch_reg_year  (archive_year),
  INDEX idx_arch_reg_user  (user_id),
  INDEX idx_arch_reg_email (user_email)
);

-- ============================================================
-- 10. ARCHIVED FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS archived_feedback (
  id           BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  rating       TINYINT NOT NULL,
  category     VARCHAR(50) NOT NULL,
  comments     TEXT DEFAULT NULL,
  created_at   DATETIME NOT NULL,
  user_name    VARCHAR(100) NOT NULL,
  user_email   VARCHAR(150) NOT NULL,
  archive_year YEAR NOT NULL,
  archived_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_by  BIGINT NOT NULL,
  PRIMARY KEY (id, archive_year),
  INDEX idx_arch_fb_year   (archive_year),
  INDEX idx_arch_fb_user   (user_id),
  INDEX idx_arch_fb_rating (rating)
);

-- ============================================================
-- 11. ARCHIVE LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS archive_log (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  archive_year           YEAR NOT NULL,
  archived_by            BIGINT NOT NULL,
  registrations_archived INT NOT NULL DEFAULT 0,
  feedback_archived      INT NOT NULL DEFAULT 0,
  archived_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. PAYMENT RECORDS (External members only)
-- Tracks every payment made by external mess members.
-- Each verified payment extends expiry_date by 30 days.
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  registration_id BIGINT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_method  ENUM('UPI','Cash','Other') NOT NULL DEFAULT 'UPI',
  transaction_ref VARCHAR(100) DEFAULT NULL,     -- UPI transaction ID or receipt no.
  screenshot      LONGTEXT DEFAULT NULL,          -- base64 image (from member upload or manual)
  status          ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  notes           TEXT DEFAULT NULL,              -- admin notes
  verified_by     BIGINT DEFAULT NULL,
  verified_at     DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  INDEX idx_payment_user   (user_id),
  INDEX idx_payment_reg    (registration_id),
  INDEX idx_payment_status (status)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_reg_approval      ON registrations(approval_status);
CREATE INDEX IF NOT EXISTS idx_menu_sel_week     ON menu_selections(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_feedback_user     ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_week  ON weekly_menu_plan(week_start, day_name, meal_type);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT IGNORE INTO settings (setting_key, setting_val) VALUES
  ('upi_qr_image',     NULL),
  ('upi_id',           NULL),
  ('mess_monthly_fee', NULL);

-- Default admin: admin@snti.com / Admin@1234
INSERT IGNORE INTO users (id, name, email, password, role)
VALUES (
  1, 'Admin', 'admin@snti.com',
  '$2a$12$2yLulTP.JS0IebbV5SOs1upf.SiK5FYiV6cwtX.qmV9XXsl65wJSW',
  'admin'
);

-- Default menu items
INSERT IGNORE INTO menus (meal_type, item_name, category) VALUES
  ('Breakfast', 'Idli Sambar',          'Veg'),
  ('Breakfast', 'Poha',                 'Veg'),
  ('Breakfast', 'Bread Butter',         'Veg'),
  ('Breakfast', 'Upma',                 'Veg'),
  ('Breakfast', 'Egg Bhurji',           'Non-Veg'),
  ('Breakfast', 'Omelette',             'Non-Veg'),
  ('Breakfast', 'Special Thali',        'Special'),
  ('Lunch',     'Dal Rice',             'Veg'),
  ('Lunch',     'Rajma Chawal',         'Veg'),
  ('Lunch',     'Paneer Butter Masala', 'Veg'),
  ('Lunch',     'Mix Veg Curry',        'Veg'),
  ('Lunch',     'Chicken Curry',        'Non-Veg'),
  ('Lunch',     'Fish Curry',           'Non-Veg'),
  ('Lunch',     'Special Biryani',      'Special'),
  ('Dinner',    'Roti Sabzi',           'Veg'),
  ('Dinner',    'Dal Makhani',          'Veg'),
  ('Dinner',    'Aloo Gobi',            'Veg'),
  ('Dinner',    'Chole Bhature',        'Veg'),
  ('Dinner',    'Mutton Curry',         'Non-Veg'),
  ('Dinner',    'Egg Curry',            'Non-Veg'),
  ('Dinner',    'Special Thali',        'Special');



-- ============================================================
-- 12. PAYMENT RECORDS

-- ============================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  registration_id BIGINT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  payment_method  ENUM('UPI','Cash','Screenshot') NOT NULL DEFAULT 'UPI',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  screenshot      LONGTEXT DEFAULT NULL,
  status          ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  verified_by     BIGINT DEFAULT NULL,
  verified_at     DATETIME DEFAULT NULL,
  notes           VARCHAR(255) DEFAULT NULL,
  payment_date    DATE NOT NULL DEFAULT (CURDATE()),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_payment_user   (user_id),
  INDEX idx_payment_reg    (registration_id),
  INDEX idx_payment_status (status),
  INDEX idx_payment_date   (payment_date)
);



-- ============================================================
-- 13. MENU SELECTION ITEMS

-- ============================================================
CREATE TABLE IF NOT EXISTS menu_selection_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  week_start  DATE NOT NULL,
  day_name    ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  meal_type   ENUM('Breakfast','Lunch','Dinner') NOT NULL,
  menu_id     BIGINT NOT NULL,
  item_name   VARCHAR(150) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_selection_item (user_id, week_start, day_name, meal_type, menu_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  INDEX idx_msi_user_week (user_id, week_start),
  INDEX idx_msi_week      (week_start)
);

