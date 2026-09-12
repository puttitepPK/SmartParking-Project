import mysql from "mysql2/promise";
import crypto from "crypto";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const config = {
  host: "localhost",
  port: 3307,
  user: "adminBeerZA",
  password: "adminBeerZA",
  database: "System_Parking2"
};

const pool = mysql.createPool(config);

// Get the current directory using ES module approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ฟังก์ชัน query สำหรับดึงข้อมูลจาก MySQL
const query = async (sql, params) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error(" MySQL Query Error:", error);
    throw error;
  }
};

// ตรวจสอบว่า row ว่างหรือไม่
const emptyOrRows = (rows) => rows && rows.length > 0 ? rows : [];

// 📝 เพิ่มผู้ใช้ใหม่
export const addNewUser = async ({ username, password, first_name, last_name, phone_number, role_id }) => {
  const sql = "INSERT INTO users (username, password, first_name, last_name, phone_number, role_id) VALUES (?, ?, ?, ?, ?, ?)";
  const params = [username, password, first_name || "", last_name || "", phone_number || "", role_id];

  try {
    const [result] = await pool.execute(sql, params);

    if (result.affectedRows > 0) {
      const [newUser] = await pool.execute("SELECT * FROM users WHERE user_id = ?", [result.insertId]);
      return {
        id: newUser[0].user_id,
        username: newUser[0].username,
        password: newUser[0].password,
        role_id: newUser[0].role_id
      };
    }

    return null;
  } catch (error) {
    console.error(" Error inserting user:", error);
    throw error;
  }
};

// 📝 เพิ่มสมาชิก (member) ใหม่โดยตรง (สำหรับแอดมินเท่านั้น)
export const addMemberUser = async ({ username, password, first_name, last_name, phone_number }) => {
  // ใช้ stored procedure ที่มีอยู่แล้วในฐานข้อมูล
  const sql = "CALL add_member_user(?, ?, ?, ?, ?)";
  const params = [username, password, first_name, last_name, phone_number];

  try {
    // เรียกใช้ stored procedure
    const [result] = await pool.execute(sql, params);
    
    // ดึงข้อมูล user ที่เพิ่งสร้าง
    const newUserSql = "SELECT user_id as id, username, role_id FROM users WHERE username = ?";
    const [newUser] = await pool.execute(newUserSql, [username]);
    
    if (newUser.length > 0) {
      return {
        id: newUser[0].id,
        username: newUser[0].username,
        role_id: newUser[0].role_id
      };
    }

    return null;
  } catch (error) {
    console.error("Error adding member user:", error);
    throw error;
  }
};

// 📝 ค้นหาผู้ใช้จาก username
export const getUserByUsername = async ({ username }) => {
  const sql = "SELECT user_id as id, username, password, role_id FROM users WHERE username = ?";
  const params = [username];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error(" Error fetching user:", error);
    throw error;
  }
};

// 📝 ค้นหาผู้ใช้จากเบอร์โทรศัพท์
export const getUserByPhoneNumber = async ({ phone_number }) => {
  const sql = "SELECT user_id as id, username, password, role_id FROM users WHERE phone_number = ?";
  const params = [phone_number];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error(" Error fetching user by phone:", error);
    throw error;
  }
};

// ✅ ดึงข้อมูลผู้ใช้พร้อม Role ตาม ID
export const getUserWithRoleById = async (userData) => {
  const id = userData?.id?.id || userData?.id || userData;

  if (!id || isNaN(Number(id))) {
    console.error(" Invalid ID received:", userData);
    throw new Error("Invalid user ID");
  }

  const sql = `
    SELECT users.user_id AS userId, users.username, roles.role_name AS roleName 
    FROM users 
    INNER JOIN roles ON users.role_id = roles.role_id 
    WHERE users.user_id = ?
  `;
  const params = [Number(id)];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error(" Error fetching user with role:", error);
    throw error;
  }
};

// ✅ ดึงรายชื่อผู้ใช้ตามสิทธิ์และจัดเรียงตาม ID
export const getAllUsers = async (roleId) => {
  let sql = "";
  let params = [];

  // ปรับให้เข้ากับระบบ role ของ parking_system1
  // role_id 1 = member, role_id 2 = visitor
  if (roleId === 1) {  // Assuming role_id 1 is highest privilege
    sql = `
      SELECT users.user_id AS id, roles.role_name AS role, users.username
      FROM users
      INNER JOIN roles ON users.role_id = roles.role_id
      ORDER BY users.user_id ASC
    `;
  } else {
    sql = `
      SELECT users.user_id AS id, roles.role_name AS role, users.username
      FROM users
      INNER JOIN roles ON users.role_id = roles.role_id
      WHERE users.role_id = ?
      ORDER BY users.user_id ASC
    `;
    params = [roleId];
  }

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error(" Error fetching users list:", error);
    throw error;
  }
};

// ดึงข้อมูลผู้ใช้โดย ID สำหรับแสดงข้อมูลส่วนตัว
export const getUserDetailById = async (userId) => {
  const sql = `
    SELECT users.username, users.first_name, users.last_name, users.phone_number, roles.role_name 
    FROM users
    INNER JOIN roles ON users.role_id = roles.role_id
    WHERE users.user_id = ?
  `;
  const params = [userId];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
};


// 🆕 อัพเดทข้อมูลโปรไฟล์ของผู้ใช้
export const updateUserProfile = async (userId, { username, first_name, last_name, phone_number }) => {
  // ตรวจสอบว่ามี username หรือ phone_number ซ้ำกับผู้ใช้อื่นหรือไม่
  const checkDuplicateSql = `
    SELECT user_id, username, phone_number FROM users 
    WHERE (username = ? OR phone_number = ?) AND user_id != ?
  `;
  const checkParams = [username, phone_number, userId];
  
  try {
    const duplicateEntries = await query(checkDuplicateSql, checkParams);
    
    // ตรวจสอบว่ามี username ซ้ำหรือไม่
    const duplicateUsername = duplicateEntries.find(entry => entry.username === username);
    if (duplicateUsername) {
      return {
        success: false,
        message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น"
      };
    }
    
    // ตรวจสอบว่ามีเบอร์โทรศัพท์ซ้ำหรือไม่
    const duplicatePhone = duplicateEntries.find(entry => entry.phone_number === phone_number);
    if (duplicatePhone) {
      return {
        success: false,
        message: "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว กรุณาใช้เบอร์อื่น"
      };
    }
    
    // อัพเดทข้อมูลผู้ใช้
    const updateSql = `
      UPDATE users
      SET username = ?, first_name = ?, last_name = ?, phone_number = ?
      WHERE user_id = ?
    `;
    const updateParams = [username, first_name, last_name, phone_number, userId];
    
    const [result] = await pool.execute(updateSql, updateParams);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "อัพเดทข้อมูลโปรไฟล์สำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่พบผู้ใช้หรือไม่มีการเปลี่ยนแปลงข้อมูล"
      };
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// 🆕 เปลี่ยนรหัสผ่านของผู้ใช้
export const updateUserPasswordById = async (userId, { current_password, new_password }) => {
  try {
    // ตรวจสอบรหัสผ่านปัจจุบัน
    const checkPasswordSql = "SELECT password FROM users WHERE user_id = ?";
    const users = await query(checkPasswordSql, [userId]);
    
    if (users.length === 0) {
      return {
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้"
      };
    }
    
    // เข้ารหัสรหัสผ่านปัจจุบันด้วย SHA-256 เพื่อเปรียบเทียบ
    const storedPassword = users[0].password;
    const hashedCurrentPassword = crypto.createHash('sha256').update(current_password).digest('hex');
    
    // ตรวจสอบว่ารหัสผ่านปัจจุบันถูกต้องหรือไม่
    if (storedPassword !== hashedCurrentPassword) {
      return {
        success: false,
        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง"
      };
    }
    
    // เข้ารหัสรหัสผ่านใหม่ด้วย SHA-256
    const hashedNewPassword = crypto.createHash('sha256').update(new_password).digest('hex');
    
    // อัพเดทรหัสผ่านใหม่
    const updatePasswordSql = "UPDATE users SET password = ? WHERE user_id = ?";
    const [result] = await pool.execute(updatePasswordSql, [hashedNewPassword, userId]);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "เปลี่ยนรหัสผ่านสำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่สามารถเปลี่ยนรหัสผ่านได้"
      };
    }
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

// ฟังก์ชันดึงข้อมูลรถทั้งหมดของผู้ใช้
export const getUserVehicles = async (userId) => {
  const sql = `
    SELECT vehicle_id, user_id, license_plate, vehicle_type, vehicle_brand, 
           vehicle_model, vehicle_color, is_primary, created_at
    FROM vehicle_registrations
    WHERE user_id = ?
    ORDER BY is_primary DESC, created_at DESC
  `;
  const params = [userId];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error("Error fetching user vehicles:", error);
    throw error;
  }
};

// ฟังก์ชันดึงข้อมูลรถตาม ID
export const getVehicleById = async (vehicleId, userId) => {
  const sql = `
    SELECT vehicle_id, user_id, license_plate, vehicle_type, vehicle_brand, 
           vehicle_model, vehicle_color, is_primary, created_at
    FROM vehicle_registrations
    WHERE vehicle_id = ? AND user_id = ?
  `;
  const params = [vehicleId, userId];

  try {
    return emptyOrRows(await query(sql, params));
  } catch (error) {
    console.error("Error fetching vehicle by ID:", error);
    throw error;
  }
};

// ฟังก์ชันเพิ่มทะเบียนรถใหม่
export const addVehicle = async (userId, vehicleData) => {
  // ตรวจสอบว่ามีทะเบียนรถซ้ำกับผู้ใช้หรือไม่
  const checkDuplicateSql = `
    SELECT vehicle_id FROM vehicle_registrations 
    WHERE user_id = ? AND license_plate = ?
  `;
  const checkParams = [userId, vehicleData.license_plate];
  
  try {
    const duplicates = await query(checkDuplicateSql, checkParams);
    
    if (duplicates.length > 0) {
      return {
        success: false,
        message: "ทะเบียนรถนี้ถูกลงทะเบียนไว้แล้ว"
      };
    }
    
    // ถ้าตั้งเป็นรถคันหลัก ยกเลิกรถคันหลักคันอื่น
    if (vehicleData.is_primary) {
      const resetPrimarySql = `
        UPDATE vehicle_registrations
        SET is_primary = FALSE
        WHERE user_id = ? AND is_primary = TRUE
      `;
      await pool.execute(resetPrimarySql, [userId]);
    }
    
    // เพิ่มข้อมูลรถใหม่
    const insertSql = `
      INSERT INTO vehicle_registrations
      (user_id, license_plate, vehicle_type, vehicle_brand, vehicle_model, vehicle_color, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
      userId,
      vehicleData.license_plate,
      vehicleData.vehicle_type || null,
      vehicleData.vehicle_brand || null,
      vehicleData.vehicle_model || null,
      vehicleData.vehicle_color || null,
      vehicleData.is_primary || false
    ];
    
    const [result] = await pool.execute(insertSql, insertParams);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "เพิ่มทะเบียนรถสำเร็จ",
        vehicleId: result.insertId
      };
    } else {
      return {
        success: false,
        message: "ไม่สามารถเพิ่มทะเบียนรถได้"
      };
    }
  } catch (error) {
    console.error("Error adding vehicle:", error);
    throw error;
  }
};

// ฟังก์ชันแก้ไขข้อมูลทะเบียนรถ
export const updateVehicle = async (vehicleId, userId, vehicleData) => {
  try {
    // ตรวจสอบว่ารถคันนี้เป็นของผู้ใช้หรือไม่
    const checkOwnerSql = `
      SELECT vehicle_id FROM vehicle_registrations
      WHERE vehicle_id = ? AND user_id = ?
    `;
    const checkParams = [vehicleId, userId];
    
    const vehicles = await query(checkOwnerSql, checkParams);
    
    if (vehicles.length === 0) {
      return {
        success: false,
        message: "ไม่พบทะเบียนรถหรือไม่มีสิทธิ์ในการแก้ไข"
      };
    }
    
    // ตรวจสอบว่าทะเบียนรถซ้ำกับรถคันอื่นของผู้ใช้หรือไม่
    if (vehicleData.license_plate) {
      const checkDuplicateSql = `
        SELECT vehicle_id FROM vehicle_registrations 
        WHERE user_id = ? AND license_plate = ? AND vehicle_id != ?
      `;
      const checkDupParams = [userId, vehicleData.license_plate, vehicleId];
      
      const duplicates = await query(checkDuplicateSql, checkDupParams);
      
      if (duplicates.length > 0) {
        return {
          success: false,
          message: "ทะเบียนรถนี้ถูกลงทะเบียนไว้แล้ว"
        };
      }
    }
    
    // ถ้าตั้งเป็นรถคันหลัก ยกเลิกรถคันหลักคันอื่น
    if (vehicleData.is_primary) {
      const resetPrimarySql = `
        UPDATE vehicle_registrations
        SET is_primary = FALSE
        WHERE user_id = ? AND is_primary = TRUE AND vehicle_id != ?
      `;
      await pool.execute(resetPrimarySql, [userId, vehicleId]);
    }
    
    // แก้ไขข้อมูลรถ
    const updateSql = `
      UPDATE vehicle_registrations
      SET license_plate = ?,
          vehicle_type = ?,
          vehicle_brand = ?,
          vehicle_model = ?,
          vehicle_color = ?,
          is_primary = ?
      WHERE vehicle_id = ? AND user_id = ?
    `;
    const updateParams = [
      vehicleData.license_plate,
      vehicleData.vehicle_type || null,
      vehicleData.vehicle_brand || null,
      vehicleData.vehicle_model || null,
      vehicleData.vehicle_color || null,
      vehicleData.is_primary || false,
      vehicleId,
      userId
    ];
    
    const [result] = await pool.execute(updateSql, updateParams);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "แก้ไขข้อมูลทะเบียนรถสำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่พบทะเบียนรถหรือไม่มีการเปลี่ยนแปลงข้อมูล"
      };
    }
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

// ฟังก์ชันลบทะเบียนรถ
export const deleteVehicle = async (vehicleId, userId) => {
  try {
    // ตรวจสอบว่ามีการใช้งานรถคันนี้ในประวัติการจอดหรือไม่
    const checkHistorySql = `
      SELECT COUNT(*) as count FROM parking_history
      WHERE vehicle_id = ? AND status = 'active'
    `;
    const checkResult = await query(checkHistorySql, [vehicleId]);
    
    if (checkResult[0].count > 0) {
      return {
        success: false,
        message: "ไม่สามารถลบทะเบียนรถได้เนื่องจากอยู่ระหว่างการใช้งาน"
      };
    }
    
    // ลบทะเบียนรถ
    const deleteSql = `
      DELETE FROM vehicle_registrations
      WHERE vehicle_id = ? AND user_id = ?
    `;
    const deleteParams = [vehicleId, userId];
    
    const [result] = await pool.execute(deleteSql, deleteParams);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "ลบทะเบียนรถสำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่พบทะเบียนรถหรือไม่มีสิทธิ์ในการลบ"
      };
    }
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    throw error;
  }
};


// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/profile_pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Update user profile picture in database
export const updateUserProfilePicture = async (userId, fileName) => {
  try {
    // First check if the user already has a profile picture
    const checkSql = "SELECT profile_picture FROM users WHERE user_id = ?";
    const existingData = await query(checkSql, [userId]);
    
    // If user has an existing profile picture, delete the file
    if (existingData.length > 0 && existingData[0].profile_picture) {
      const oldFileName = existingData[0].profile_picture;
      const oldFilePath = path.join(uploadDir, oldFileName);
      // Delete the file if it exists
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Update the user's profile picture in the database
    const updateSql = "UPDATE users SET profile_picture = ? WHERE user_id = ?";
    const [result] = await pool.execute(updateSql, [fileName, userId]);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "อัพเดทรูปโปรไฟล์สำเร็จ",
        fileName
      };
    } else {
      return {
        success: false,
        message: "ไม่พบผู้ใช้หรือไม่มีการเปลี่ยนแปลง"
      };
    }
  } catch (error) {
    console.error("Error updating profile picture:", error);
    throw error;
  }
};

// Get user profile picture
export const getUserProfilePicture = async (userId) => {
  try {
    const sql = "SELECT profile_picture FROM users WHERE user_id = ?";
    const result = await query(sql, [userId]);
    
    if (result.length > 0) {
      return {
        success: true,
        profile_picture: result[0].profile_picture
      };
    } else {
      return {
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้"
      };
    }
  } catch (error) {
    console.error("Error getting profile picture:", error);
    throw error;
  }
};

// Delete user profile picture
export const deleteUserProfilePicture = async (userId) => {
  try {
    // First get the current profile picture
    const checkSql = "SELECT profile_picture FROM users WHERE user_id = ?";
    const existingData = await query(checkSql, [userId]);
    
    if (existingData.length === 0 || !existingData[0].profile_picture) {
      return {
        success: false,
        message: "ไม่พบรูปโปรไฟล์"
      };
    }
    
    // Delete the file
    const fileName = existingData[0].profile_picture;
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update the database to remove the profile picture reference
    const updateSql = "UPDATE users SET profile_picture = NULL WHERE user_id = ?";
    const [result] = await pool.execute(updateSql, [userId]);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "ลบรูปโปรไฟล์สำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่พบผู้ใช้หรือไม่มีการเปลี่ยนแปลง"
      };
    }
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    throw error;
  }
};


// เพิ่มฟังก์ชันและค่าคงที่ที่จำเป็นสำหรับการจัดการรูปภาพรถ

// กำหนดโฟลเดอร์สำหรับเก็บรูปภาพรถ
export const vehicleUploadDir = path.join(__dirname, '../uploads/vehicle_images');

// สร้างโฟลเดอร์ถ้ายังไม่มี
if (!fs.existsSync(vehicleUploadDir)) {
  fs.mkdirSync(vehicleUploadDir, { recursive: true });
}

// อัปเดตรูปภาพรถยนต์
export const updateVehicleImage = async (vehicleId, userId, fileName) => {
  try {
    // ตรวจสอบว่ารถคันนี้เป็นของผู้ใช้หรือไม่
    const checkOwnerSql = `
      SELECT vehicle_id FROM vehicle_registrations
      WHERE vehicle_id = ? AND user_id = ?
    `;
    const checkParams = [vehicleId, userId];
    
    const vehicles = await query(checkOwnerSql, checkParams);
    
    if (vehicles.length === 0) {
      return {
        success: false,
        message: "ไม่พบทะเบียนรถหรือไม่มีสิทธิ์ในการแก้ไข"
      };
    }
    
    // ตรวจสอบรูปภาพปัจจุบัน (ถ้ามี)
    const checkCurrentImageSql = "SELECT image_url FROM vehicle_registrations WHERE vehicle_id = ?";
    const currentImageData = await query(checkCurrentImageSql, [vehicleId]);
    
    // ถ้ารถคันนี้มีรูปอยู่แล้ว ให้ลบไฟล์เก่า
    if (currentImageData.length > 0 && currentImageData[0].image_url) {
      const oldFileName = currentImageData[0].image_url;
      const oldFilePath = path.join(vehicleUploadDir, oldFileName);
      // ลบไฟล์เก่าถ้ามีอยู่จริง
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // อัปเดตชื่อไฟล์รูปภาพในฐานข้อมูล
    const updateSql = "UPDATE vehicle_registrations SET image_url = ? WHERE vehicle_id = ? AND user_id = ?";
    const [result] = await pool.execute(updateSql, [fileName, vehicleId, userId]);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "อัปเดตรูปภาพยานพาหนะสำเร็จ",
        fileName
      };
    } else {
      return {
        success: false,
        message: "ไม่พบทะเบียนรถหรือไม่มีการเปลี่ยนแปลง"
      };
    }
  } catch (error) {
    console.error("Error updating vehicle image:", error);
    throw error;
  }
};

// ดึงข้อมูลรูปภาพรถ
export const getVehicleImage = async (vehicleId, userId) => {
  try {
    const sql = "SELECT image_url FROM vehicle_registrations WHERE vehicle_id = ? AND user_id = ?";
    const result = await query(sql, [vehicleId, userId]);
    
    if (result.length > 0) {
      return {
        success: true,
        image_url: result[0].image_url
      };
    } else {
      return {
        success: false,
        message: "ไม่พบข้อมูลยานพาหนะ"
      };
    }
  } catch (error) {
    console.error("Error getting vehicle image:", error);
    throw error;
  }
};

// ลบรูปภาพรถ
export const deleteVehicleImage = async (vehicleId, userId) => {
  try {
    // ตรวจสอบรูปภาพปัจจุบัน
    const checkSql = "SELECT image_url FROM vehicle_registrations WHERE vehicle_id = ? AND user_id = ?";
    const existingData = await query(checkSql, [vehicleId, userId]);
    
    if (existingData.length === 0 || !existingData[0].image_url) {
      return {
        success: false,
        message: "ไม่พบรูปภาพยานพาหนะ"
      };
    }
    
    // ลบไฟล์
    const fileName = existingData[0].image_url;
    const filePath = path.join(vehicleUploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // อัปเดตฐานข้อมูลเพื่อลบการอ้างอิงถึงรูปภาพ
    const updateSql = "UPDATE vehicle_registrations SET image_url = NULL WHERE vehicle_id = ? AND user_id = ?";
    const [result] = await pool.execute(updateSql, [vehicleId, userId]);
    
    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "ลบรูปภาพยานพาหนะสำเร็จ"
      };
    } else {
      return {
        success: false,
        message: "ไม่พบยานพาหนะหรือไม่มีการเปลี่ยนแปลง"
      };
    }
  } catch (error) {
    console.error("Error deleting vehicle image:", error);
    throw error;
  }
};
