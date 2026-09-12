// appointmentAutomationController.js
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

/**
 * สร้างประวัติการจอดรถเมื่อการนัดหมายได้รับการยืนยัน
 */
export const createParkingHistoryFromAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  
  try {
    // ดึงข้อมูลการนัดหมาย
    const appointmentSql = `
      SELECT 
        a.*, 
        area.area_name, area.building_id,
        b.building_name, b.building_code,
        l.location_name,
        m.first_name AS member_first_name, m.last_name AS member_last_name,
        v.first_name AS visitor_first_name, v.last_name AS visitor_last_name,
        v.phone_number AS visitor_phone
      FROM 
        parking_appointments a
      LEFT JOIN 
        parking_areas area ON a.area_id = area.area_id
      LEFT JOIN 
        buildings b ON area.building_id = b.building_id
      LEFT JOIN 
        location l ON b.location_id = l.location_id
      LEFT JOIN 
        users m ON a.member_id = m.user_id
      LEFT JOIN 
        users v ON a.visitor_id = v.user_id
      WHERE 
        a.appointment_id = ? AND a.status = 'confirmed'
    `;
    
    const appointments = await query(appointmentSql, [appointmentId]);
    
    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการนัดหมายที่ยืนยันแล้ว"
      });
    }
    
    const appointment = appointments[0];
    
    // ตรวจสอบว่ามีประวัติการจอดรถสำหรับการนัดหมายนี้แล้วหรือไม่
    const checkHistorySql = `
      SELECT history_id FROM parking_history 
      WHERE appointment_id = ?
    `;
    
    const existingHistory = await query(checkHistorySql, [appointmentId]);
    
    if (existingHistory.length > 0) {
      return res.status(409).json({
        success: false,
        message: "มีประวัติการจอดรถสำหรับการนัดหมายนี้แล้ว",
        history_id: existingHistory[0].history_id
      });
    }
    
    // สร้างประวัติการจอดรถใหม่
    const insertHistorySql = `
      INSERT INTO parking_history (
        user_id, 
        visitor_id,
        appointment_id,
        area_id,
        entry_time, 
        parking_status, 
        payment_status,
        license_plate,
        vehicle_brand,
        vehicle_model,
        vehicle_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const entryTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    
    const insertParams = [
      appointment.visitor_id || null, // user_id (ใช้ visitor_id ถ้ามี)
      appointment.visitor_id || null, // visitor_id
      appointmentId,
      appointment.area_id,
      entryTime,
      'pending', // สถานะเริ่มต้นเป็น pending (รอเข้าจอด)
      'pending', // สถานะการชำระเงินเริ่มต้นเป็น pending
      '', // license_plate (จะอัพเดทเมื่อมาถึง)
      '', // vehicle_brand
      '', // vehicle_model
      ''  // vehicle_color
    ];
    
    const [result] = await pool.query(insertHistorySql, insertParams);
    
    if (result.affectedRows === 0) {
      throw new Error("ไม่สามารถสร้างประวัติการจอดรถได้");
    }
    
    // อัพเดทสถานะลานจอด (ลดจำนวนที่ว่างลง)
    const updateAreaSql = `
      UPDATE parking_areas
      SET available_spaces = GREATEST(0, available_spaces - 1)
      WHERE area_id = ?
    `;
    
    await query(updateAreaSql, [appointment.area_id]);
    
    return res.status(201).json({
      success: true,
      message: "สร้างประวัติการจอดรถสำเร็จ",
      history_id: result.insertId,
      appointment: {
        appointment_id: appointmentId,
        visitor_name: appointment.visitor_id ? 
          `${appointment.visitor_first_name} ${appointment.visitor_last_name}` : 
          appointment.visitor_name,
        visitor_phone: appointment.visitor_id ? 
          appointment.visitor_phone : 
          appointment.visitor_phone,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        location: appointment.location_name,
        building: appointment.building_name,
        area: appointment.area_name
      }
    });
  } catch (error) {
    console.error("Error creating parking history from appointment:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการสร้างประวัติการจอดรถ",
      error: error.message
    });
  }
};

/**
 * ตรวจสอบการนัดหมายที่เลยเวลาและไม่มาตามนัด
 */
export const checkMissedAppointments = async (req, res) => {
  try {
    // ดึงการนัดหมายที่ยืนยันแล้วแต่เลยเวลานัดเกิน 5 นาทีและยังไม่ได้เริ่มจอด
    const missedAppointmentsSql = `
      SELECT 
        a.*, 
        area.area_id,
        h.history_id
      FROM 
        parking_appointments a
      JOIN 
        parking_areas area ON a.area_id = area.area_id
      LEFT JOIN 
        parking_history h ON a.appointment_id = h.appointment_id
      WHERE 
        a.status = 'confirmed'
        AND CONCAT(a.appointment_date, ' ', a.appointment_time) < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        AND (h.history_id IS NULL OR h.parking_status = 'pending')
    `;
    
    const missedAppointments = await query(missedAppointmentsSql);
    
    // จัดการกับแต่ละการนัดหมายที่เลยเวลา
    const processedAppointments = [];
    
    for (const appointment of missedAppointments) {
      try {
        // 1. ยกเลิกการนัดหมาย
        const updateAppointmentSql = `
          UPDATE parking_appointments
          SET status = 'cancelled'
          WHERE appointment_id = ?
        `;
        
        await query(updateAppointmentSql, [appointment.appointment_id]);
        
        // 2. ลบหรืออัพเดทประวัติการจอด (ถ้ามี)
        if (appointment.history_id) {
          const updateHistorySql = `
            UPDATE parking_history
            SET parking_status = 'cancelled'
            WHERE history_id = ?
          `;
          
          await query(updateHistorySql, [appointment.history_id]);
        }
        
        // 3. อัพเดทสถานะลานจอด (เพิ่มจำนวนที่ว่าง)
        const updateAreaSql = `
          UPDATE parking_areas
          SET available_spaces = LEAST(total_spaces, available_spaces + 1)
          WHERE area_id = ?
        `;
        
        await query(updateAreaSql, [appointment.area_id]);
        
        processedAppointments.push({
          appointment_id: appointment.appointment_id,
          area_id: appointment.area_id,
          status: 'cancelled',
          message: 'ยกเลิกการนัดหมายที่เลยเวลาแล้ว'
        });
      } catch (error) {
        console.error(`Error processing missed appointment ${appointment.appointment_id}:`, error);
      }
    }
    
    return res.status(200).json({
      success: true,
      count: processedAppointments.length,
      data: processedAppointments
    });
  } catch (error) {
    console.error("Error checking missed appointments:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบการนัดหมายที่เลยเวลา",
      error: error.message
    });
  }
};

/**
 * อัพเดทสถานะประวัติการจอดเมื่อผู้ใช้มาถึง
 */
export const updateParkingArrival = async (req, res) => {
  const { appointmentId } = req.params;
  const { license_plate, vehicle_brand, vehicle_model, vehicle_color } = req.body;
  
  if (!license_plate) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุทะเบียนรถ"
    });
  }
  
  try {
    // ตรวจสอบประวัติการจอดที่เกี่ยวข้องกับการนัดหมาย
    const checkHistorySql = `
      SELECT h.*, a.area_id 
      FROM parking_history h
      JOIN parking_appointments a ON h.appointment_id = a.appointment_id
      WHERE h.appointment_id = ? AND h.parking_status = 'pending'
    `;
    
    const historyRecords = await query(checkHistorySql, [appointmentId]);
    
    if (historyRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบประวัติการจอดรถที่รอเข้าจอดสำหรับการนัดหมายนี้"
      });
    }
    
    const historyRecord = historyRecords[0];
    
    // อัพเดทข้อมูลประวัติการจอด
    const updateHistorySql = `
      UPDATE parking_history
      SET 
        parking_status = 'active',
        license_plate = ?,
        vehicle_brand = ?,
        vehicle_model = ?,
        vehicle_color = ?
      WHERE history_id = ?
    `;
    
    await query(updateHistorySql, [
      license_plate,
      vehicle_brand || '',
      vehicle_model || '',
      vehicle_color || '',
      historyRecord.history_id
    ]);
    
    return res.status(200).json({
      success: true,
      message: "อัพเดทสถานะการจอดเป็น 'กำลังจอด' เรียบร้อยแล้ว",
      history_id: historyRecord.history_id,
      area_id: historyRecord.area_id
    });
  } catch (error) {
    console.error("Error updating parking arrival:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัพเดทสถานะการจอด",
      error: error.message
    });
  }
};

/**
 * อัพเดทสถานะการชำระเงิน
 */
export const updatePaymentStatus = async (req, res) => {
  const { historyId } = req.params;
  const { payment_status, payment_method, amount } = req.body;
  
  if (!payment_status) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุสถานะการชำระเงิน"
    });
  }
  
  try {
    // อัพเดทสถานะการชำระเงิน
    const updatePaymentSql = `
      UPDATE parking_history
      SET 
        payment_status = ?,
        payment_method = ?,
        parking_fee = ?
      WHERE history_id = ?
    `;
    
    await query(updatePaymentSql, [
      payment_status,
      payment_method || null,
      amount || 0,
      historyId
    ]);
    
    return res.status(200).json({
      success: true,
      message: "อัพเดทสถานะการชำระเงินเรียบร้อยแล้ว",
      history_id: historyId,
      payment_status: payment_status
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัพเดทสถานะการชำระเงิน",
      error: error.message
    });
  }
};

/**
 * อัพเดทสถานะประวัติการจอดเมื่อเสร็จสิ้น (เมื่อจำลองการสแกน)
 */
export const completeParkingSession = async (req, res) => {
  const { appointmentId } = req.params;
  
  try {
    // ตรวจสอบประวัติการจอดที่เกี่ยวข้องกับการนัดหมาย
    const checkHistorySql = `
      SELECT h.*, a.area_id, a.status as appointment_status
      FROM parking_history h
      JOIN parking_appointments a ON h.appointment_id = a.appointment_id
      WHERE h.appointment_id = ? AND h.parking_status = 'active'
    `;
    
    const historyRecords = await query(checkHistorySql, [appointmentId]);
    
    if (historyRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบประวัติการจอดรถที่กำลังจอดอยู่สำหรับการนัดหมายนี้"
      });
    }
    
    const historyRecord = historyRecords[0];
    
    // ตรวจสอบว่าชำระเงินแล้วหรือไม่
    if (historyRecord.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: "กรุณาชำระเงินก่อนสิ้นสุดการจอด"
      });
    }
    
    // 1. อัพเดทสถานะการนัดหมายเป็นเสร็จสิ้น (ถ้ายังไม่เสร็จสิ้น)
    if (historyRecord.appointment_status !== 'completed') {
      const updateAppointmentSql = `
        UPDATE parking_appointments
        SET status = 'completed'
        WHERE appointment_id = ?
      `;
      
      await query(updateAppointmentSql, [appointmentId]);
    }
    
    // 2. อัพเดทประวัติการจอดเป็นเสร็จสิ้น
    const updateHistorySql = `
      UPDATE parking_history
      SET 
        parking_status = 'completed',
        exit_time = NOW()
      WHERE history_id = ?
    `;
    
    await query(updateHistorySql, [historyRecord.history_id]);
    
    // 3. อัพเดทสถานะลานจอด (เพิ่มจำนวนที่ว่าง)
    const updateAreaSql = `
      UPDATE parking_areas
      SET available_spaces = LEAST(total_spaces, available_spaces + 1)
      WHERE area_id = ?
    `;
    
    await query(updateAreaSql, [historyRecord.area_id]);
    
    // 4. คำนวณระยะเวลาการจอด
    const getDetailsSql = `
      SELECT 
        entry_time, 
        exit_time,
        TIMESTAMPDIFF(MINUTE, entry_time, exit_time) AS duration_minutes
      FROM parking_history
      WHERE history_id = ?
    `;
    
    const details = await query(getDetailsSql, [historyRecord.history_id]);
    
    return res.status(200).json({
      success: true,
      message: "สิ้นสุดการจอดเรียบร้อยแล้ว",
      history_id: historyRecord.history_id,
      area_id: historyRecord.area_id,
      duration_minutes: details[0].duration_minutes,
      entry_time: details[0].entry_time,
      exit_time: details[0].exit_time
    });
  } catch (error) {
    console.error("Error completing parking session:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการสิ้นสุดการจอด",
      error: error.message
    });
  }
};
