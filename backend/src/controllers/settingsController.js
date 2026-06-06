const { pool } = require('../config/db');
const QRCode   = require('qrcode');

const getUPIQR = async () => {
  const [rows] = await pool.query("SELECT setting_key,setting_val FROM settings WHERE setting_key IN ('upi_qr_image','upi_id','mess_monthly_fee')");
  const s = {}; rows.forEach(r => { s[r.setting_key] = r.setting_val; });
  const upiId  = s.upi_id  || process.env.UPI_ID;
  const amount = s.mess_monthly_fee || process.env.UPI_AMOUNT || '1500';
  const name   = process.env.UPI_NAME || 'SNTI Hostel Mess';
  let qr = s.upi_qr_image;
  if (!qr && upiId) {
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=Mess+Monthly+Fee`;
    qr = await QRCode.toDataURL(link, { width: 280, margin: 2, color: { dark: '#15803d', light: '#fff' } });
  }
  return { qr_image: qr, upi_id: upiId, amount, name };
};

const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT setting_key,setting_val FROM settings");
    const s = {}; rows.forEach(r => { s[r.setting_key] = r.setting_val; });
    const upiData = await getUPIQR();
    return res.json({ success: true, data: { ...s, upi_qr: upiData.qr_image, upi_id: upiData.upi_id, mess_monthly_fee: upiData.amount } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateSettings = async (req, res) => {
  const allowed = ['upi_id','mess_monthly_fee','upi_qr_image'];
  try {
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await pool.query('INSERT INTO settings (setting_key,setting_val) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_val=VALUES(setting_val)', [key, req.body[key]]);
      }
    }
    return res.json({ success: true, message: 'Settings saved.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getPublicUPIQR = async (req, res) => {
  try {
    const data = await getUPIQR();
    return res.json({ success: true, data });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getSettings, updateSettings, getPublicUPIQR };
