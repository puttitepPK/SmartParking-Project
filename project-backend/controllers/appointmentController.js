import mysql from "mysql2/promise";


// กำหนดการเชื่อมต่อฐานข้อมูล
const config = {
  host: "localhost",
  port: 3307,
  user: "adminBeerZA",
  password: "adminBeerZA",
  database: "System_Parking2"
};

const pool = mysql.createPool(config);

// ฟังก์ชันช่วยในการ query
const query = async (sql, params) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error("MySQL Query Error:", error);
    throw error;
  }
};

// ฟังก์ชัน search สำหรับค้นหา visitor ที่มีบัญชีในระบบ
export const searchVisitors = async (req, res) => {
  const { searchTerm } = req.query;
  const memberId = req.user.id;

  if (!searchTerm) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุคำค้นหา (ชื่อผู้ใช้, เบอร์โทร, ชื่อ-นามสกุล)"
    });
  }

  try {
    // ค้นหา visitor จากชื่อผู้ใช้, เบอร์โทร, หรือชื่อ-นามสกุล
    const sql = `
      SELECT user_id, username, first_name, last_name, phone_number, role_id
      FROM users
      WHERE (
        username LIKE ? OR
        phone_number LIKE ? OR
        first_name LIKE ? OR
        last_name LIKE ?
      )
      AND role_id = 2  -- ค้นหาเฉพาะ visitor (role_id = 2)
      AND user_id != ?  -- ไม่รวม member ที่กำลังค้นหา
      LIMIT 10
    `;

    const searchPattern = `%${searchTerm}%`;
    const visitors = await query(sql, [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      memberId
    ]);

    return res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    console.error("Error searching visitors:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้",
      error: error.message
    });
  }
};

// ฟังก์ชันสร้างการนัดหมายใหม่
export const createAppointment = async (req, res) => {
  const memberId = req.user.id;
  const memberRoleId = req.user.roleId;
  
  // ตรวจสอบว่าผู้ใช้เป็น member
  if (memberRoleId !== 1) {
    return res.status(403).json({
      success: false,
      message: "เฉพาะสมาชิกเท่านั้นที่สามารถสร้างการนัดหมายได้"
    });
  }

  const {
    appointment_date,
    appointment_time,
    visitor_id,
    visitor_name,
    visitor_phone,
    area_id,
    reason,
    note
  } = req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!appointment_date || !appointment_time || !area_id) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุวันที่, เวลา และพื้นที่จอดรถ"
    });
  }

  // ตรวจสอบว่ามี visitor_id หรือมีทั้ง visitor_name และ visitor_phone
  if (!visitor_id && (!visitor_name || !visitor_phone)) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุข้อมูลผู้เข้าพบให้ครบถ้วน (รหัสผู้ใช้หรือชื่อและเบอร์โทร)"
    });
  }

  try {
    // ถ้ามี visitor_id ให้ตรวจสอบว่า visitor นี้มีอยู่จริง
    if (visitor_id) {
      const visitorCheckSql = `
        SELECT user_id, role_id FROM users WHERE user_id = ?
      `;
      const visitorCheck = await query(visitorCheckSql, [visitor_id]);
      
      if (visitorCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลผู้เข้าพบในระบบ"
        });
      }

      if (visitorCheck[0].role_id !== 2) {
        return res.status(400).json({
          success: false,
          message: "ผู้ใช้ที่ระบุไม่ใช่ผู้เข้าพบ (Visitor)"
        });
      }
    }

    // ตรวจสอบว่าพื้นที่จอดรถมีอยู่จริง
    const areaCheckSql = `
      SELECT area_id, area_name, available_spaces FROM parking_areas WHERE area_id = ?
    `;
    const areaCheck = await query(areaCheckSql, [area_id]);
    
    if (areaCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลพื้นที่จอดรถ"
      });
    }

    // สร้าง QR code สำหรับการนัดหมาย
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const qrCode = `AP${timestamp}`;

      // สร้างฟังก์ชันช่วยสำหรับ format วันที่และเวลาเป็น MySQL datetime format
  const formatDateTimeForMySQL = (date) => {
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  // ใช้เวลาปัจจุบันเป็นเวลาท้องถิ่น
  const localNow = new Date();
  const formattedCreatedAt = formatDateTimeForMySQL(localNow);

    // เพิ่มข้อมูลการนัดหมายลงในระบบ
    const insertSql = `
      INSERT INTO parking_appointments (
        appointment_date, 
        appointment_time, 
        member_id, 
        visitor_id,
        visitor_name, 
        visitor_phone, 
        area_id, 
        reason, 
        note, 
        qr_code,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    `;

    const insertParams = [
      appointment_date,
      appointment_time,
      memberId,
      visitor_id || null,
      visitor_name || '',
      visitor_phone || '',
      area_id,
      reason || null,
      note || null,
      qrCode,
      formattedCreatedAt  // เพิ่มเวลาสร้างที่เป็นเวลาท้องถิ่น
    ];

    const [result] = await pool.query(insertSql, insertParams);

    if (result.affectedRows > 0) {
      // ดึงข้อมูลการนัดหมายที่เพิ่งสร้าง
      const appointmentDetailSql = `
        SELECT * FROM appointment_details_extended
        WHERE appointment_id = ?
      `;
      const appointmentDetails = await query(appointmentDetailSql, [result.insertId]);

      return res.status(201).json({
        success: true,
        message: "สร้างการนัดหมายเรียบร้อยแล้ว",
        appointment_id: result.insertId,
        qr_code: qrCode,
        data: appointmentDetails[0] || null
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถสร้างการนัดหมายได้"
      });
    }
  } catch (error) {
    console.error("Error creating appointment:", error);
    
    // ตรวจสอบ error จาก trigger ที่ตรวจสอบการนัดหมายซ้ำ
    if (error.message.includes("มีการนัดหมายในช่วงเวลาใกล้เคียงกันแล้ว")) {
      return res.status(409).json({
        success: false,
        message: "มีการนัดหมายในช่วงเวลาใกล้เคียงกันแล้ว กรุณาเลือกเวลาอื่น"
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการสร้างการนัดหมาย",
      error: error.message
    });
  }
};

// ฟังก์ชันดึงการนัดหมายของผู้ใช้ปัจจุบัน (member หรือ visitor)
export const getUserAppointments = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.roleId;
  const { status, date } = req.query;

  try {
    // แทนที่จะใช้วิว appointment_details_extended
    // เราจะใช้ JOIN กับตารางต่างๆ โดยตรง
    let sql = `
      SELECT 
        pa.appointment_id, pa.appointment_date, pa.appointment_time,
        pa.visitor_name, pa.visitor_phone, pa.reason, pa.note,
        pa.qr_code, pa.parking_card_number, pa.check_in_time, pa.check_out_time,
        pa.status, pa.created_at, pa.updated_at,
        m.first_name AS member_first_name, m.last_name AS member_last_name,
        m.phone_number AS member_phone,
        v.first_name AS visitor_first_name, v.last_name AS visitor_last_name,
        v.phone_number AS visitor_phone_db,
        area.area_id, area.area_name, b.building_name, b.building_code,
        l.location_name
      FROM parking_appointments pa
      LEFT JOIN users m ON pa.member_id = m.user_id
      LEFT JOIN users v ON pa.visitor_id = v.user_id
      LEFT JOIN parking_areas area ON pa.area_id = area.area_id
      LEFT JOIN buildings b ON area.building_id = b.building_id
      LEFT JOIN location l ON b.location_id = l.location_id
      WHERE 
    `;
    
    let params = [];

    if (roleId === 1) {
      // สำหรับ member - แสดงการนัดหมายที่สร้าง
      sql += `pa.member_id = ?`;
      params.push(userId);
    } else {
      // สำหรับ visitor - แสดงการนัดหมายที่ถูกนัดหมาย
      sql += `(pa.visitor_id = ? OR pa.visitor_phone = (SELECT phone_number FROM users WHERE user_id = ?))`;
      params.push(userId, userId);
    }

    // เพิ่มเงื่อนไขกรองตามสถานะ (ถ้ามี)
    if (status) {
      sql += ` AND pa.status = ?`;
      params.push(status);
    }

    // เพิ่มเงื่อนไขกรองตามวันที่ (ถ้ามี)
    if (date) {
      sql += ` AND pa.appointment_date = ?`;
      params.push(date);
    }

    // เรียงตามวันที่และเวลา
    sql += ` ORDER BY pa.appointment_date DESC, pa.appointment_time DESC`;

    console.log("SQL Query:", sql);
    console.log("Params:", params);

    const appointments = await query(sql, params);
    console.log("Retrieved appointments count:", appointments.length);

    // แปลงรูปแบบวันที่และเวลาให้เหมาะสมสำหรับการแสดงผล
    const formattedAppointments = appointments.map(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      
      // แปลงวันที่เป็นรูปแบบไทย (เช่น "15 เมษายน 2566")
      const formattedDate = appointmentDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // แปลงเวลา (เช่น "14:30")
      const timeObj = new Date(`2000-01-01T${appointment.appointment_time}`);
      const formattedTime = timeObj.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // สร้างข้อมูลที่จะส่งกลับ
      // ปรับให้มีฟิลด์เดียวกับที่เคยส่งกลับเมื่อใช้วิว appointment_details_extended
      return {
        ...appointment,
        formatted_date: formattedDate,
        formatted_time: formattedTime,
        // ถ้ามี visitor_id ใช้ข้อมูลจากตาราง users
        // ถ้าไม่มี ใช้ visitor_name จากตาราง parking_appointments
        visitor_first_name: appointment.visitor_first_name || appointment.visitor_name || "",
        visitor_last_name: appointment.visitor_last_name || "",
        visitor_phone: appointment.visitor_phone_db || appointment.visitor_phone || ""
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedAppointments.length,
      data: formattedAppointments
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลการนัดหมาย",
      error: error.message
    });
  }
};

// ฟังก์ชันดึงรายละเอียดการนัดหมายตาม ID
// ฟังก์ชันดึงรายละเอียดการนัดหมายตาม ID
export const getAppointmentById = async (req, res) => {
  const userId = req.user.id;
  const { appointmentId } = req.params;

  try {
    // ดึงข้อมูลจากตาราง parking_appointments แทนวิว appointment_details_extended
    const sql = `
      SELECT pa.*, 
             m.first_name AS member_first_name, m.last_name AS member_last_name, 
             m.phone_number AS member_phone,
             ar.area_name, b.building_name, l.location_name
      FROM parking_appointments pa
      LEFT JOIN users m ON pa.member_id = m.user_id
      LEFT JOIN parking_areas ar ON pa.area_id = ar.area_id
      LEFT JOIN buildings b ON ar.building_id = b.building_id
      LEFT JOIN location l ON b.location_id = l.location_id
      WHERE pa.appointment_id = ?
    `;
    
    const appointments = await query(sql, [appointmentId]);

    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการนัดหมาย"
      });
    }

    const appointmentData = appointments[0];
    
    // ตรวจสอบสิทธิ์การเข้าถึง - ผู้ใช้ต้องเป็น member_id หรือ visitor_id ของการนัดหมายนี้
    // หรือ visitor_phone ตรงกับเบอร์โทรศัพท์ของผู้ใช้
    if (
      appointmentData.member_id != userId && 
      appointmentData.visitor_id != userId
    ) {
      // ตรวจสอบเบอร์โทรศัพท์ของผู้ใช้
      const userPhone = await query(`SELECT phone_number FROM users WHERE user_id = ?`, [userId]);
      
      if (userPhone.length === 0 || appointmentData.visitor_phone != userPhone[0].phone_number) {
        return res.status(403).json({
          success: false,
          message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลการนัดหมายนี้"
        });
      }
    }
    
    // ถ้ามี visitor_id ให้ดึงข้อมูล visitor
    let visitorData = {};
    if (appointmentData.visitor_id) {
      const visitorResult = await query(`
        SELECT first_name AS visitor_first_name, last_name AS visitor_last_name, 
               phone_number AS visitor_phone
        FROM users 
        WHERE user_id = ?
      `, [appointmentData.visitor_id]);
      
      if (visitorResult.length > 0) {
        visitorData = visitorResult[0];
      }
    }
    
    // รวมข้อมูลทั้งหมด
    const combinedData = {
      ...appointmentData,
      ...visitorData,
      // กรณีไม่มี visitor_id ให้ใช้ visitor_name และ visitor_phone จากตาราง
      visitor_first_name: visitorData.visitor_first_name || appointmentData.visitor_name || "",
      visitor_last_name: visitorData.visitor_last_name || "",
      visitor_phone: visitorData.visitor_phone || appointmentData.visitor_phone || ""
    };
    
    // แปลงรูปแบบวันที่และเวลา
    const appointmentDate = new Date(combinedData.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeObj = new Date(`2000-01-01T${combinedData.appointment_time}`);
    const formattedTime = timeObj.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const formattedAppointment = {
      ...combinedData,
      formatted_date: formattedDate,
      formatted_time: formattedTime
    };

    return res.status(200).json({
      success: true,
      data: formattedAppointment
    });
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงรายละเอียดการนัดหมาย",
      error: error.message
    });
  }
};

// ฟังก์ชันอัปเดตสถานะการนัดหมาย
export const updateAppointmentStatus = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.roleId;
  const { appointmentId } = req.params;
  const { status } = req.body;

  // ตรวจสอบสถานะที่ถูกต้อง
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "สถานะไม่ถูกต้อง (pending, confirmed, completed, cancelled)"
    });
  }

  try {
    let appointmentCheck;
    
    // ถ้าเป็น Member ตรวจสอบว่าการนัดหมายนี้มีอยู่จริงและเป็นของ member นี้
    if (roleId === 1) {
      const checkSql = `
        SELECT appointment_id FROM parking_appointments
        WHERE appointment_id = ? AND member_id = ?
      `;
      appointmentCheck = await query(checkSql, [appointmentId, userId]);
    } 
    // ถ้าเป็น Visitor ตรวจสอบว่าการนัดหมายนี้มีอยู่จริงและเกี่ยวข้องกับ visitor นี้
    else if (roleId === 2) {
      // อนุญาตให้ Visitor อัพเดทสถานะเป็น completed เท่านั้น
      if (status !== 'completed') {
        return res.status(403).json({
          success: false,
          message: "Visitor สามารถอัพเดทสถานะเป็น completed เท่านั้น"
        });
      }
      
      const checkSql = `
        SELECT appointment_id FROM parking_appointments
        WHERE appointment_id = ? AND (visitor_id = ? OR visitor_phone = (SELECT phone_number FROM users WHERE user_id = ?))
      `;
      appointmentCheck = await query(checkSql, [appointmentId, userId, userId]);
    } else {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการอัพเดทสถานะการนัดหมาย"
      });
    }
    
    if (appointmentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการนัดหมายหรือไม่มีสิทธิ์เข้าถึง"
      });
    }

    // อัปเดตสถานะการนัดหมาย
    const updateSql = `
      UPDATE parking_appointments
      SET status = ?
      WHERE appointment_id = ?
    `;
    
    const [result] = await pool.query(updateSql, [status, appointmentId]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "อัพเดทสถานะการนัดหมายเรียบร้อยแล้ว",
        appointment_id: appointmentId,
        status
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถอัพเดทสถานะการนัดหมายได้"
      });
    }
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัพเดทสถานะการนัดหมาย",
      error: error.message
    });
  }
};

// ฟังก์ชันยกเลิกการนัดหมาย
export const cancelAppointment = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.roleId;
  const { appointmentId } = req.params;

  try {
    // ตรวจสอบว่าการนัดหมายนี้มีอยู่จริง
    let checkSql;
    let checkParams;
    
    if (roleId === 1) {
      // สำหรับ member - ต้องเป็นผู้สร้างการนัดหมาย
      checkSql = `
        SELECT appointment_id, status FROM parking_appointments
        WHERE appointment_id = ? AND member_id = ?
      `;
      checkParams = [appointmentId, userId];
    } else {
      // สำหรับ visitor - ต้องเป็นผู้ถูกนัดหมาย
      checkSql = `
        SELECT appointment_id, status FROM parking_appointments
        WHERE appointment_id = ? 
        AND (
          visitor_id = ? OR 
          visitor_phone = (SELECT phone_number FROM users WHERE user_id = ?)
        )
      `;
      checkParams = [appointmentId, userId, userId];
    }
    
    const appointmentCheck = await query(checkSql, checkParams);
    
    if (appointmentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการนัดหมายหรือไม่มีสิทธิ์เข้าถึง"
      });
    }

    // ตรวจสอบว่าการนัดหมายเสร็จสิ้นหรือถูกยกเลิกไปแล้วหรือไม่
    if (appointmentCheck[0].status === 'completed' || appointmentCheck[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถยกเลิกการนัดหมายที่เสร็จสิ้นหรือถูกยกเลิกไปแล้ว"
      });
    }

    // ยกเลิกการนัดหมาย
    const updateSql = `
      UPDATE parking_appointments
      SET status = 'cancelled'
      WHERE appointment_id = ?
    `;
    
    const [result] = await pool.query(updateSql, [appointmentId]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "ยกเลิกการนัดหมายเรียบร้อยแล้ว",
        appointment_id: appointmentId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถยกเลิกการนัดหมายได้"
      });
    }
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการยกเลิกการนัดหมาย",
      error: error.message
    });
  }
};

// ฟังก์ชันดึงข้อมูลพื้นที่จอดรถที่สามารถนัดหมายได้
export const getAvailableParkingAreas = async (req, res) => {
  try {
    const sql = `
      SELECT 
        pa.area_id,
        pa.area_name,
        pa.total_spaces,
        pa.available_spaces,
        b.building_id,
        b.building_name,
        b.building_code,
        l.location_id,
        l.location_name
      FROM 
        parking_areas pa
      JOIN 
        buildings b ON pa.building_id = b.building_id
      JOIN 
        location l ON b.location_id = l.location_id
      WHERE 
        pa.status = 'open'
      ORDER BY 
        l.location_name, b.building_name, pa.area_name
    `;
    
    const parkingAreas = await query(sql);

    return res.status(200).json({
      success: true,
      count: parkingAreas.length,
      data: parkingAreas
    });
  } catch (error) {
    console.error("Error fetching available parking areas:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลพื้นที่จอดรถ",
      error: error.message
    });
  }
};




export const simulateScanQRCode = async (req, res) => {
  const userId = req.user.id;
  const { appointmentId } = req.params;
  const { vehicleId } = req.body; // รับข้อมูลรถจาก request body
  
  try {
    console.log(`Simulating QR scan for appointment ${appointmentId} by user ${userId} with vehicle ${vehicleId || 'not specified'}`);
    
    // ดึงข้อมูลการนัดหมาย
    const appointmentSql = `
      SELECT * FROM parking_appointments WHERE appointment_id = ?
    `;
    const appointments = await query(appointmentSql, [appointmentId]);
    
    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการนัดหมาย"
      });
    }
    
    const appointment = appointments[0];
    console.log("Appointment data:", JSON.stringify(appointment));
    
    // ถ้ามี vehicleId ที่ส่งมาให้ใช้ค่านั้น ถ้าไม่มีให้ดึงข้อมูลรถของผู้ใช้
    let finalVehicleId = vehicleId;
    
    if (!finalVehicleId) {
      // ดึงข้อมูลยานพาหนะของผู้ใช้
      const vehicleSql = `
        SELECT vehicle_id FROM vehicle_registrations WHERE user_id = ? LIMIT 1
      `;
      const vehicles = await query(vehicleSql, [userId]);
      
      if (vehicles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "ไม่พบข้อมูลยานพาหนะของผู้ใช้"
        });
      }
      
      finalVehicleId = vehicles[0].vehicle_id;
    }
    
    console.log(`Using vehicle ID: ${finalVehicleId}`);
    
    // ใช้เวลาปัจจุบันเป็น entry_time เพื่อหลีกเลี่ยงปัญหารูปแบบวันที่เวลา
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const formattedEntryTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    console.log(`Using entry time: ${formattedEntryTime}`);
    
    // สร้างประวัติการจอดรถ
    const createHistorySql = `
      INSERT INTO parking_history (
        appointment_id,
        user_id, 
        vehicle_id,
        area_id,
        entry_time,
        status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `;
    
    console.log("Inserting parking history with params:", [
      appointmentId, 
      userId,
      finalVehicleId,
      appointment.area_id,
      formattedEntryTime
    ]);
    
    await query(createHistorySql, [
      appointmentId, 
      userId,
      finalVehicleId,
      appointment.area_id,
      formattedEntryTime
    ]);

    // อัพเดทสถานะการนัดหมาย
    const updateSql = `
      UPDATE parking_appointments
      SET status = 'completed', check_in_time = ?
      WHERE appointment_id = ?
    `;
    
    console.log("Updating appointment status with params:", [formattedEntryTime, appointmentId]);
    const result = await query(updateSql, [formattedEntryTime, appointmentId]);

    console.log("Update result:", result);
    
    return res.status(200).json({
      success: true,
      message: "สแกน QR Code สำเร็จ! สถานะการนัดหมายถูกอัพเดท",
      appointment_id: appointmentId,
      status: 'completed'
    });
  } catch (error) {
    console.error("Error simulating QR scan:", error);
    // ส่งข้อมูลข้อผิดพลาดกลับมาเพื่อดีบัก
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการจำลองการสแกน QR Code",
      error: error.message,
      stack: error.stack
    });
  }
};


