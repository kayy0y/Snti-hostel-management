DROP DATABASE IF EXISTS snti_hostel;
CREATE DATABASE snti_hostel;
USE snti_hostel;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15) DEFAULT NULL,
  trainee_id VARCHAR(50) DEFAULT NULL,
  trainee_type ENUM('Vocational Trainee','Pre Trainee') DEFAULT NULL,
  hostel_block VARCHAR(50) DEFAULT NULL,
  member_type ENUM('Hostel','Mess Only') NOT NULL DEFAULT 'Hostel',
  role ENUM('admin','student','external') NOT NULL DEFAULT 'student',
  otp_code VARCHAR(6) DEFAULT NULL,
  otp_expires DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE registrations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  mess_type ENUM('Veg','Non-Veg','Special','Breakfast+Lunch') NOT NULL,
  registration_date DATE NOT NULL DEFAULT (CURDATE()),
  expiry_date DATE NOT NULL,
  status ENUM('active','expired') NOT NULL DEFAULT 'active',
  payment_proof LONGTEXT DEFAULT NULL,
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  approved_by BIGINT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE menus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  meal_type ENUM('Breakfast','Lunch','Dinner') NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  category ENUM('Veg','Non-Veg','Special') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weekly_menu_plan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  week_start DATE NOT NULL,
  day_name ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  meal_type ENUM('Breakfast','Lunch','Dinner') NOT NULL,
  menu_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_plan_slot_item (week_start, day_name, meal_type, menu_id),
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

CREATE TABLE menu_selections (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  day_name ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  breakfast VARCHAR(150) DEFAULT NULL,
  lunch VARCHAR(150) DEFAULT NULL,
  dinner VARCHAR(150) DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_day (user_id, week_start, day_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  category ENUM('Food Quality','Cleanliness','Service','Variety','Other')
    NOT NULL DEFAULT 'Food Quality',
  comments TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_val LONGTEXT DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE email_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  status ENUM('sent','failed') NOT NULL DEFAULT 'sent',
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO settings (setting_key, setting_val) VALUES
('upi_qr_image', NULL),
('upi_id', NULL),
('mess_monthly_fee', NULL);

-- Replace HASH_HERE with your generated bcrypt hash
INSERT INTO users (name,email,password,role)
VALUES (
  'Admin',
  'admin@snti.com',
  '$2a$12$tvuJPrTaMOJKopCFgGWcteDIU1GOGTD5KR9RQ38AUe9.mO34x8i/S',
  'admin'
);

INSERT INTO menus (meal_type,item_name,category) VALUES
('Breakfast','Idli Sambar','Veg'),
('Breakfast','Poha','Veg'),
('Breakfast','Bread Butter','Veg'),
('Breakfast','Upma','Veg'),
('Breakfast','Egg Bhurji','Non-Veg'),
('Breakfast','Omelette','Non-Veg'),
('Breakfast','Special Thali','Special'),

('Lunch','Dal Rice','Veg'),
('Lunch','Rajma Chawal','Veg'),
('Lunch','Paneer Butter Masala','Veg'),
('Lunch','Mix Veg Curry','Veg'),
('Lunch','Chicken Curry','Non-Veg'),
('Lunch','Fish Curry','Non-Veg'),
('Lunch','Special Biryani','Special'),

('Dinner','Roti Sabzi','Veg'),
('Dinner','Dal Makhani','Veg'),
('Dinner','Aloo Gobi','Veg'),
('Dinner','Chole Bhature','Veg'),
('Dinner','Mutton Curry','Non-Veg'),
('Dinner','Egg Curry','Non-Veg'),
('Dinner','Special Thali','Special');