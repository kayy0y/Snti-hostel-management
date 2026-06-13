const { pool } = require('../config/db');
const { validationResult } = require('express-validator');

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const getMonday = () => {
  const now = new Date(), day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  return mon.toISOString().split('T')[0];
};

// GET /api/menus
const getMenus = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM menus WHERE is_active=1 ORDER BY meal_type,category,item_name");
    const grouped = { Breakfast:[], Lunch:[], Dinner:[] };
    rows.forEach(r => grouped[r.meal_type].push(r));
    return res.json({ success: true, data: grouped });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/menus  (admin)
const addMenuItem = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, message: errs.array()[0].msg });
  const { meal_type, item_name, category } = req.body;
  try {
    const [r] = await pool.query('INSERT INTO menus (meal_type,item_name,category) VALUES (?,?,?)', [meal_type, item_name, category]);
    return res.status(201).json({ success: true, data: { id: r.insertId, meal_type, item_name, category } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/menus/:id  (admin)
const deleteMenuItem = async (req, res) => {
  try {
    await pool.query('UPDATE menus SET is_active=0 WHERE id=?', [req.params.id]);
    return res.json({ success: true, message: 'Item removed.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/weekly-plan?week_start=
const getWeeklyPlan = async (req, res) => {
  try {
    const week_start = req.query.week_start || getMonday();
    const [rows] = await pool.query(
      `SELECT wmp.id AS plan_id, wmp.day_name, wmp.meal_type,
              m.id AS menu_id, m.item_name, m.category
       FROM weekly_menu_plan wmp JOIN menus m ON wmp.menu_id=m.id
       WHERE wmp.week_start=?
       ORDER BY FIELD(wmp.day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
                FIELD(wmp.meal_type,'Breakfast','Lunch','Dinner'), m.item_name`,
      [week_start]
    );
    const plan = {};
    DAYS.forEach(d => { plan[d] = { Breakfast:[], Lunch:[], Dinner:[] }; });
    rows.forEach(r => plan[r.day_name][r.meal_type].push({ plan_id: r.plan_id, menu_id: r.menu_id, item_name: r.item_name, category: r.category }));
    return res.json({ success: true, data: plan, week_start, is_published: rows.length > 0 });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/weekly-plan/add-item  (admin)
const addItemToPlan = async (req, res) => {
  const { week_start, day_name, meal_type, menu_id } = req.body;
  if (!week_start || !day_name || !meal_type || !menu_id)
    return res.status(400).json({ success: false, message: 'All fields required.' });
  try {
    await pool.query(
      'INSERT IGNORE INTO weekly_menu_plan (week_start,day_name,meal_type,menu_id) VALUES (?,?,?,?)',
      [week_start, day_name, meal_type, menu_id]
    );
    return res.status(201).json({ success: true, message: 'Item added to plan.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/weekly-plan/remove-item/:plan_id  (admin)
const removeItemFromPlan = async (req, res) => {
  try {
    await pool.query('DELETE FROM weekly_menu_plan WHERE id=?', [req.params.plan_id]);
    return res.json({ success: true, message: 'Item removed from plan.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/weekly-plan/reset  (admin) body: { week_start }
const resetWeekPlan = async (req, res) => {
  const week_start = req.body.week_start || getMonday();
  try {
    const [p] = await pool.query('DELETE FROM weekly_menu_plan WHERE week_start=?', [week_start]);
    const [s] = await pool.query('DELETE FROM menu_selection_items WHERE week_start=?',[week_start]);
    return res.json({ success: true, message: `Reset done. ${p.affectedRows} plan items, ${s.affectedRows} student selections cleared.` });
  } catch (e) {
  console.error("getMyMenuSelection ERROR:", e);
  return res.status(500).json({
    success: false,
    message: e.message
  });
}
};

// GET /api/weekly-plan/available-weeks  (admin)
const getAvailableWeeks = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT week_start, COUNT(*) AS item_count FROM weekly_menu_plan GROUP BY week_start ORDER BY week_start DESC LIMIT 8'
    );
    return res.json({ success: true, data: rows, current_week: getMonday() });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/menus/select  (student/external)
const selectMenu = async (req, res) => {
  const { week } = req.body;
  const user_id  = req.user.id;
  if (!Array.isArray(week) || week.length === 0)
    return res.status(400).json({ success: false, message: 'Weekly menu data required.' });

  try {
    const week_start  = getMonday();
    const isExternal  = req.user.role === 'external';

    for (const entry of week) {
      const { day, breakfast_menu_ids, lunch_menu_ids, dinner_menu_ids } = entry;
      if (!DAYS.includes(day)) continue;

      // Validate each non-null selection exists in the plan
      const slots = [
  {
    meal: 'Breakfast',
    ids: Array.isArray(breakfast_menu_ids)
      ? breakfast_menu_ids
      : []
  },
  { meal: 'Lunch', ids: Array.isArray(lunch_menu_ids) ? lunch_menu_ids : []},
  ...(isExternal
    ? []
    : [{ meal: 'Dinner', ids: Array.isArray(dinner_menu_ids)? dinner_menu_ids: [] }]
  ),
];

      for (const s of slots) {
  for (const id of s.ids) {

    const [valid] = await pool.query(
      'SELECT id FROM weekly_menu_plan WHERE week_start=? AND day_name=? AND meal_type=? AND menu_id=?',
      [week_start, day, s.meal, id]
    );

    if (!valid.length) {
      return res.status(400).json({
        success: false,
        message: `${s.meal} on ${day}: item not in this week's plan.`
      });
    }
  }
}

   await pool.query(
  'DELETE FROM menu_selection_items WHERE user_id=? AND week_start=? AND day_name=?',
  [user_id, week_start, day]
);

for (const s of slots) {
  for (const id of s.ids) {

    const [menu] = await pool.query(
      'SELECT item_name FROM menus WHERE id=?',
      [id]
    );

    if (!menu.length) continue;

    await pool.query(
      `INSERT INTO menu_selection_items
      (user_id,week_start,day_name,meal_type,menu_id,item_name)
      VALUES (?,?,?,?,?,?)`,
      [
        user_id,
        week_start,
        day,
        s.meal,
        id,
        menu[0].item_name
      ]
    );
  }
} 

    
    }
    return res.json({ success: true, message: 'Weekly menu saved.' });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/menus/my-selection  (student)
const getMyMenuSelection = async (req, res) => {
  try {
    const week_start = getMonday();

    const [rows] = await pool.query(
      `SELECT *
       FROM menu_selection_items
       WHERE user_id=? AND week_start=?
       ORDER BY
       FIELD(day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
       FIELD(meal_type,'Breakfast','Lunch','Dinner')`,
      [req.user.id, week_start]
    );

    if (rows.length) {
      return res.json({
        success: true,
        data: rows,
        week_start,
        is_last_week_default: false,
        has_current_week: true
      });
    }

    // Fall back to last week
    const lastMon = new Date(week_start);
    lastMon.setDate(lastMon.getDate() - 7);

    const [lastRows] = await pool.query(
      `SELECT *
       FROM menu_selection_items
       WHERE user_id=? AND week_start=?
       ORDER BY
       FIELD(day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
       FIELD(meal_type,'Breakfast','Lunch','Dinner')`,
      [req.user.id, lastMon.toISOString().split('T')[0]]
    );

    return res.json({
      success: true,
      data: lastRows,
      week_start,
      is_last_week_default: lastRows.length > 0,
      has_current_week: false
    });

  } catch (e) {
  console.error("getMyMenuSelection ERROR:", e);
  return res.status(500).json({
    success: false,
    message: e.message
  });
}
};

// GET /api/menus/all-selections?week_start=YYYY-MM-DD  (admin)
const getAllMenuSelections = async (req, res) => {
  try {
    const week_start = req.query.week_start || getMonday();

    const [rows] = await pool.query(
      `SELECT
        ms.*,
        u.name,
        u.email,
        u.trainee_id,
        u.hostel_block,
        u.member_type,
        u.role
      FROM menu_selection_items ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.week_start = ?
      ORDER BY
        u.name,
        FIELD(ms.day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
        FIELD(ms.meal_type,'Breakfast','Lunch','Dinner')`,
      [week_start]
    );

    const [weeks] = await pool.query(
      `SELECT
        week_start,
        COUNT(DISTINCT user_id) AS student_count
       FROM menu_selection_items
       GROUP BY week_start
       ORDER BY week_start DESC
       LIMIT 12`
    );

    return res.json({
      success: true,
      data: rows,
      week_start,
      available_weeks: weeks
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};
module.exports = {
  getMenus,
  addMenuItem,
  deleteMenuItem,
  selectMenu,
  getMyMenuSelection,
  getAllMenuSelections,
  getWeeklyPlan,
  addItemToPlan,
  removeItemFromPlan,
  resetWeekPlan,
  getAvailableWeeks
};