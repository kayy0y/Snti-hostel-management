const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');


const getAllStudents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id,name,email,phone,trainee_id,trainee_type,hostel_block,member_type,role,is_active,created_at FROM users WHERE role IN ('student','external') ORDER BY created_at DESC"
    );

    return res.json({ success:true, data:rows });

  } catch(e){
    return res.status(500).json({success:false,message:'Server error.'});
  }
};


const addStudent = async(req,res)=>{
  const {
    name,email,password,
    trainee_id,
    trainee_type,
    hostel_block,
    member_type
  } = req.body;

  if(!name || !email || !password){
    return res.status(400).json({
      success:false,
      message:'Name, email, password required.'
    });
  }

  try{

    const [ex] = await pool.query(
      'SELECT id FROM users WHERE email=?',
      [email]
    );

    if(ex.length){
      return res.status(409).json({
        success:false,
        message:'Email already exists.'
      });
    }


    const hash = await bcrypt.hash(password,12);

    const role =
      member_type === 'Mess Only'
      ? 'external'
      : 'student';


    const [r] = await pool.query(
      `INSERT INTO users
      (name,email,password,trainee_id,trainee_type,hostel_block,member_type,role)
      VALUES(?,?,?,?,?,?,?,?)`,
      [
        name,
        email,
        hash,
        trainee_id || null,
        trainee_type || null,
        hostel_block || null,
        member_type || 'Hostel',
        role
      ]
    );


    return res.status(201).json({
      success:true,
      data:{
        id:r.insertId,
        name,
        email,
        role
      }
    });


  }catch(e){

    return res.status(500).json({
      success:false,
      message:'Server error.'
    });

  }
};



const deleteStudent = async(req,res)=>{

try{

const [rows]=await pool.query(
"SELECT id,name FROM users WHERE id=? AND role IN ('student','external') AND is_active=1",
[req.params.id]
);


if(!rows.length){
return res.status(404).json({
success:false,
message:'Student not found.'
});
}



await pool.query(
"UPDATE users SET is_active=0,pending_deletion=1,deactivated_at=NOW() WHERE id=?",
[req.params.id]
);



return res.json({
success:true,
message:`${rows[0].name} deactivated.`
});


}catch(e){

return res.status(500).json({
success:false,
message:'Server error.'
});

}

};

// FIXED FUNCTION
const deleteStudentNow = async(req,res)=>{

const archive = req.body?.archive === true;

const conn = await pool.getConnection();


try{


const [rows]=await conn.query(
"SELECT id,name FROM users WHERE id=? AND role IN ('student','external')",
[req.params.id]
);

if(!rows.length){

return res.status(404).json({
success:false,
message:'Student not found.'
});

}

await conn.beginTransaction();



if(archive){


await conn.query(
`
INSERT IGNORE INTO archived_registrations
(
id,user_id,mess_type,registration_date,
expiry_date,status,
user_name,user_email,
archive_year,archived_by
)

SELECT
r.id,
r.user_id,
r.mess_type,
r.registration_date,
r.expiry_date,
r.status,
u.name,
u.email,
YEAR(NOW()),
?

FROM registrations r

JOIN users u
ON r.user_id=u.id

WHERE r.user_id=?
`,
[
req.user.id,
req.params.id
]
);



await conn.query(
`
INSERT IGNORE INTO archived_feedback
(
id,user_id,rating,category,
comments,created_at,
user_name,user_email,
archive_year,archived_by
)

SELECT
f.id,
f.user_id,
f.rating,
f.category,
f.comments,
f.created_at,
u.name,
u.email,
YEAR(NOW()),
?

FROM feedback f

JOIN users u
ON f.user_id=u.id

WHERE f.user_id=?
`,
[
req.user.id,
req.params.id
]
);
}

await conn.query(
"DELETE FROM users WHERE id=?",
[req.params.id]
);

await conn.commit();

return res.json({

success:true,

message:
`${rows[0].name} permanently deleted.${archive?' Data archived.':''}`

});



}catch(e){

try{
await conn.rollback();
}catch(_){}


console.error('deleteStudentNow error:',e);

return res.status(500).json({

success:false,

message:'Delete failed.'

});


}finally{

conn.release();

}

};

const deleteSelf = async(req,res)=>{

const {email}=req.body;


if(!email)
return res.status(400).json({
success:false,
message:'Email confirmation required.'
});


if(email.toLowerCase()!==req.user.email.toLowerCase()){

return res.status(400).json({
success:false,
message:'Email does not match.'
});

}



const conn=await pool.getConnection();


try{


await conn.beginTransaction();



await conn.query(
"DELETE FROM users WHERE id=?",
[req.user.id]
);



await conn.commit();



return res.json({
success:true,
message:'Account deleted.'
});


}catch(e){


await conn.rollback();


return res.status(500).json({
success:false,
message:'Server error.'
});


}finally{

conn.release();

}

};




// keep your existing functions here:
// resetBatch
// deleteExpiredUsers
// getDashboardStats
// getQuickAnalytics
// exportReport
// exportPDF
// createAdmin
// getAdminList
// getAnalytics



module.exports = {

getAllStudents,
addStudent,
deleteStudent,
deleteStudentNow,
deleteSelf,

// keep these only if they exist above
resetBatch,
deleteExpiredUsers,
getDashboardStats,
getQuickAnalytics,
exportReport,
exportPDF,
createAdmin,
getAdminList,
getAnalytics

};