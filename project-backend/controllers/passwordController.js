import mysql from "mysql2/promise";
import crypto from "crypto";

const config = {
  host: "localhost",
  port: 3307,
  user: "adminBeerZA",
  password: "adminBeerZA",
  database: "System_Parking2"
};

const pool = mysql.createPool(config);

// ฟังก์ชัน query สำหรับดึงข้อมูลจาก MySQL
const query = async (sql, params) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error("MySQL Query Error:", error);
    throw error;
  }
};

// ค้นหาผู้ใช้จากเบอร์โทรศัพท์
export const findUserByPhone = async (phone_number) => {
  const sql = "SELECT user_id, username, phone_number FROM users WHERE phone_number = ?";
  const params = [phone_number];
  
  try {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error finding user by phone:", error);
    throw error;
  }
};

// สร้างคำขอรีเซ็ตรหัสผ่าน
export const createPasswordResetRequest = async ({ user_id, phone_number, request_token, expires_at }) => {
  const sql = `
    INSERT INTO password_reset_requests 
    (user_id, phone_number, request_token, expires_at) 
    VALUES (?, ?, ?, ?)
  `;
  const params = [user_id, phone_number, request_token, expires_at];
  
  try {
    const result = await pool.execute(sql, params);
    return result[0].insertId;
  } catch (error) {
    console.error("Error creating password reset request:", error);
    throw error;
  }
};

// สร้าง OTP
export const createOTP = async ({ request_id, otp_code, expires_at }) => {
  const sql = `
    INSERT INTO otp_verification 
    (request_id, otp_code, expires_at) 
    VALUES (?, ?, ?)
  `;
  const params = [request_id, otp_code, expires_at];
  
  try {
    const result = await pool.execute(sql, params);
    return result[0].insertId;
  } catch (error) {
    console.error("Error creating OTP:", error);
    throw error;
  }
};

// ตรวจสอบ OTP
export const verifyOTP = async (requestId, otpCode) => {
  // ตรวจสอบว่า OTP ยังไม่หมดอายุ
  const checkOTPSql = `
    SELECT otp.*, req.request_token, req.user_id, req.status as request_status
    FROM otp_verification otp
    JOIN password_reset_requests req ON otp.request_id = req.request_id
    WHERE otp.request_id = ? AND otp.otp_code = ? AND otp.expires_at > NOW() AND req.expires_at > NOW()
  `;
  
  try {
    const results = await query(checkOTPSql, [requestId, otpCode]);
    
    if (results.length === 0) {
      return {
        success: false,
        message: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว"
      };
    }
    
    const otpInfo = results[0];
    
    // ตรวจสอบจำนวนครั้งที่พยายามยืนยัน
    if (otpInfo.verification_attempts >= 3) {
      return {
        success: false,
        message: "คุณได้พยายามยืนยัน OTP เกินจำนวนครั้งที่กำหนด"
      };
    }
    
    // เพิ่มจำนวนครั้งที่พยายาม
    const updateAttemptSql = `
      UPDATE otp_verification
      SET verification_attempts = verification_attempts + 1
      WHERE otp_id = ?
    `;
    await pool.execute(updateAttemptSql, [otpInfo.otp_id]);
    
    // ทำเครื่องหมายว่า OTP ได้รับการยืนยันแล้ว
    const updateVerifiedSql = `
      UPDATE otp_verification
      SET is_verified = TRUE, verified_at = NOW()
      WHERE otp_id = ?
    `;
    await pool.execute(updateVerifiedSql, [otpInfo.otp_id]);
    
    // ตรวจสอบว่ามี user_id หรือไม่
    const canResetPassword = !!otpInfo.user_id;
    
    return {
      success: true,
      resetToken: otpInfo.request_token,
      canResetPassword: canResetPassword
    };
    
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
};

// อัพเดทรหัสผ่านของผู้ใช้
export const updateUserPassword = async (resetToken, newPassword) => {
  // ตรวจสอบ token และหาผู้ใช้ที่ต้องการเปลี่ยนรหัสผ่าน
  const checkTokenSql = `
    SELECT user_id FROM password_reset_requests
    WHERE request_token = ? AND expires_at > NOW() AND status = 'completed'
  `;
  
  try {
    const results = await query(checkTokenSql, [resetToken]);
    
    if (results.length === 0) {
      return {
        success: false,
        message: "Token ไม่ถูกต้องหรือหมดอายุแล้ว"
      };
    }
    
    const userId = results[0].user_id;
    
    if (!userId) {
      return {
        success: false,
        message: "ไม่พบผู้ใช้ที่เกี่ยวข้องกับเบอร์โทรศัพท์นี้"
      };
    }
    
    // เข้ารหัสรหัสผ่านใหม่ด้วย SHA-256
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    // อัพเดทรหัสผ่าน
    const updatePasswordSql = `
      UPDATE users
      SET password = ?
      WHERE user_id = ?
    `;
    await pool.execute(updatePasswordSql, [hashedPassword, userId]);
    
    // อัพเดทสถานะของคำขอรีเซ็ตรหัสผ่าน
    const updateRequestSql = `
      UPDATE password_reset_requests
      SET status = 'expired'
      WHERE request_token = ?
    `;
    await pool.execute(updateRequestSql, [resetToken]);
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};
