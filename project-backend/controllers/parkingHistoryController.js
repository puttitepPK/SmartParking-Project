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

// ฟังก์ชันช่วยในการ call stored procedure
const callProcedure = async (procedure, params) => {
  try {
    const [rows] = await pool.query(`CALL ${procedure}`, params);
    return rows[0]; // Stored procedure จะส่งกลับข้อมูลใน array แรก
  } catch (error) {
    console.error("MySQL Procedure Error:", error);
    throw error;
  }
};

// ฟังก์ชันคำนวณค่าจอดรถตามระยะเวลา
const calculateParkingFee = (durationMinutes) => {
  // ตัวอย่างการคำนวณค่าจอดรถ
  // - ฟรีสำหรับ 60 นาทีแรก
  // - 20 บาทสำหรับ 1-2 ชั่วโมง
  // - 40 บาทสำหรับ 2-3 ชั่วโมง
  // - 60 บาทสำหรับ 3 ชั่วโมงขึ้นไป
  
  // let fee = 0;
  
  // if (durationMinutes > 180) { // มากกว่า 3 ชั่วโมง
  //   fee = 20;
  // } else if (durationMinutes > 120) { // 2-3 ชั่วโมง
  //   fee = 20;
  // } else if (durationMinutes > 60) { // 1-2 ชั่วโมง
  //   fee = 20;
  // }
  
  return 20;
};

/**
 * ดึงประวัติการจอดรถของผู้ใช้
 * สามารถกรองด้วย: วันนี้, สัปดาห์ที่ผ่านมา, เดือนนี้
 */
export const getUserParkingHistory = async (req, res) => {
  const userId = req.user.id;
  const { 
    timeFilter, // 'today', 'lastWeek', 'thisMonth'
    page = 1,  // หน้าปัจจุบัน (pagination)
    limit = 10 // จำนวนรายการต่อหน้า
  } = req.query;
  
  try {
    // Use direct SQL queries instead of stored procedures
    let historyResults;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Base query that always filters by user_id
    const baseQuery = `
      SELECT * FROM parking_history_details
      WHERE user_id = ?
      ORDER BY entry_time DESC
    `;
    
    if (timeFilter === 'today') {
      const todayDate = currentDate.toISOString().split('T')[0];
      const sql = `
        SELECT * FROM parking_history_details
        WHERE user_id = ? AND DATE(entry_time) = ?
        ORDER BY entry_time DESC
      `;
      historyResults = await query(sql, [userId, todayDate]);
    } else if (timeFilter === 'thisWeek') {
      const firstDay = new Date(currentDate);
      firstDay.setDate(currentDate.getDate() - currentDate.getDay());
      
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      lastDay.setHours(23, 59, 59, 999);
      
      const sql = `
        SELECT * FROM parking_history_details
        WHERE user_id = ? AND entry_time BETWEEN ? AND ?
        ORDER BY entry_time DESC
      `;
      historyResults = await query(sql, [userId, firstDay.toISOString(), lastDay.toISOString()]);
    } else if (timeFilter === 'thisMonth') {
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      
      const sql = `
        SELECT * FROM parking_history_details
        WHERE user_id = ? AND entry_time BETWEEN ? AND ?
        ORDER BY entry_time DESC
      `;
      historyResults = await query(sql, [userId, firstDayOfMonth.toISOString(), lastDayOfMonth.toISOString()]);
    } else {
      // ดึงข้อมูลทั้งหมดของผู้ใช้นี้ เรียงตามวันที่ล่าสุด
      historyResults = await query(baseQuery, [userId]);
    }
    
    // ประยุกต์ pagination กับผลลัพธ์
    const offset = (page - 1) * limit;
    const totalItems = historyResults.length;
    const totalPages = Math.ceil(totalItems / limit);
    
    // ตัดเฉพาะส่วนที่ต้องการตาม pagination
    const paginatedResults = historyResults.slice(offset, offset + parseInt(limit));
    
    // แปลงรูปแบบเวลาและวันที่ให้แสดงผลสวยงาม
    const formattedResults = paginatedResults.map(history => {
      // หากไม่มีข้อมูล exit_time ให้แทนด้วย "ยังไม่ออก"
      const entryTime = new Date(history.entry_time);
      const exitTime = history.exit_time ? new Date(history.exit_time) : null;
      
      return {
        history_id: history.history_id,
        building_code: history.building_code,
        building_name: history.building_name,
        area_name: history.area_name,
        license_plate: history.license_plate,
        vehicle_brand: history.vehicle_brand,
        vehicle_model: history.vehicle_model,
        vehicle_color: history.vehicle_color,
        entry_date: entryTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        entry_time: entryTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        exit_date: exitTime ? exitTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'ยังไม่ออก',
        exit_time: exitTime ? exitTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        duration: `${Math.floor(history.duration_minutes / 60)} ชั่วโมง ${history.duration_minutes % 60} นาที`,
        status_text: history.parking_status === 'active' ? 'กำลังจอด' : 'เสร็จสิ้น',
        payment_status: history.payment_status,
        payment_status_text: history.payment_status === 'completed' ? 'ชำระแล้ว' : 'รอชำระ',
        parking_fee: history.parking_fee || 0
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedResults,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error("Error fetching parking history:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงประวัติการจอดรถ",
      error: error.message
    });
  }
};

/**
 * ดึงรายละเอียดประวัติการจอดรถตาม ID
 */
export const getParkingHistoryDetail = async (req, res) => {
  const userId = req.user.id;
  const { historyId } = req.params;
  
  try {
    // ใช้ view parking_history_details ที่มีในฐานข้อมูลแล้ว
    const sql = `
      SELECT * FROM parking_history_details
      WHERE history_id = ? AND user_id = ?
    `;
    
    const result = await query(sql, [historyId, userId]);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลประวัติการจอดรถ"
      });
    }
    
    // รายละเอียดประวัติการจอดรถ
    const detail = result[0];
    
    // แปลงรูปแบบวันที่และเวลาให้อ่านง่ายขึ้น
    const entryTime = new Date(detail.entry_time);
    const exitTime = detail.exit_time ? new Date(detail.exit_time) : null;
    
    // สร้างข้อมูลที่จะส่งกลับ
    const formattedDetail = {
      history_id: detail.history_id,
      user_id: detail.user_id,
      first_name: detail.first_name,
      last_name: detail.last_name,
      user_role: detail.user_role,
      parking_card_number: detail.parking_card_number,
      license_plate: detail.license_plate,
      vehicle_brand: detail.vehicle_brand,
      vehicle_model: detail.vehicle_model,
      vehicle_color: detail.vehicle_color,
      location_name: detail.location_name,
      building_code: detail.building_code,
      building_name: detail.building_name,
      area_name: detail.area_name,
      entry_date: entryTime.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      entry_time: entryTime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      exit_date: exitTime ? exitTime.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'ยังไม่ออก',
      exit_time: exitTime ? exitTime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
      duration: `${Math.floor(detail.duration_minutes / 60)} ชั่วโมง ${detail.duration_minutes % 60} นาที`,
      status_text: detail.parking_status === 'active' ? 'กำลังจอด' : 'เสร็จสิ้น',
      payment_status_text: detail.payment_status === 'completed' ? 'ชำระแล้ว' : 'รอชำระ',
      parking_fee: detail.parking_fee || 0,
      total_amount: detail.total_amount || 0,
      service_fee: detail.service_fee || 0,
      fine_fee: detail.fine_fee || 0,
      discount: detail.discount || 0,
      transaction_ref: detail.transaction_ref
    };
    
    return res.status(200).json({
      success: true,
      data: formattedDetail
    });
    
  } catch (error) {
    console.error("Error fetching parking history detail:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงรายละเอียดประวัติการจอดรถ",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลสรุปสถิติประวัติการจอดรถของผู้ใช้
 */
export const getParkingSummary = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // สรุปจำนวนการจอดรถทั้งหมด
    const summarySql = `
      SELECT
        COUNT(*) as total_parkings,
        SUM(CASE WHEN parking_status = 'active' THEN 1 ELSE 0 END) as active_parkings,
        SUM(CASE WHEN parking_status = 'completed' THEN 1 ELSE 0 END) as completed_parkings,
        SUM(COALESCE(parking_fee, 0)) as total_fee
      FROM
        parking_history_details
      WHERE
        user_id = ?
    `;
    
    const summary = await query(summarySql, [userId]);
    
    // จำนวนการจอดรถในเดือนนี้
    const thisMonthSql = `
      SELECT
        COUNT(*) as count_this_month,
        SUM(COALESCE(parking_fee, 0)) as fee_this_month
      FROM
        parking_history_details
      WHERE
        user_id = ?
        AND MONTH(entry_time) = MONTH(CURDATE())
        AND YEAR(entry_time) = YEAR(CURDATE())
    `;
    
    const thisMonth = await query(thisMonthSql, [userId]);
    
    // อาคารที่จอดบ่อยที่สุด
    const topBuildingsSql = `
      SELECT
        building_name,
        COUNT(*) as count
      FROM
        parking_history_details
      WHERE
        user_id = ?
      GROUP BY
        building_name
      ORDER BY
        count DESC
      LIMIT 3
    `;
    
    const topBuildings = await query(topBuildingsSql, [userId]);
    
    // รถที่ใช้บ่อยที่สุด
    const topVehiclesSql = `
      SELECT
        license_plate,
        vehicle_brand,
        vehicle_model,
        COUNT(*) as count
      FROM
        parking_history_details
      WHERE
        user_id = ?
      GROUP BY
        license_plate, vehicle_brand, vehicle_model
      ORDER BY
        count DESC
      LIMIT 3
    `;
    
    const topVehicles = await query(topVehiclesSql, [userId]);
    
    return res.status(200).json({
      success: true,
      summary: {
        total: summary[0].total_parkings || 0,
        active: summary[0].active_parkings || 0,
        completed: summary[0].completed_parkings || 0,
        totalFee: summary[0].total_fee || 0,
        thisMonth: {
          count: thisMonth[0].count_this_month || 0,
          fee: thisMonth[0].fee_this_month || 0
        },
        topBuildings,
        topVehicles
      }
    });
    
  } catch (error) {
    console.error("Error fetching parking summary:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุปการจอดรถ",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลการจอดรถปัจจุบันที่กำลังใช้งานอยู่
 */
export const getActiveParking = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const sql = `
      SELECT * FROM parking_history_details
      WHERE user_id = ? AND parking_status = 'active'
      ORDER BY entry_time DESC
      LIMIT 1
    `;
    
    const activeParking = await query(sql, [userId]);
    
    if (activeParking.length === 0) {
      return res.status(200).json({
        success: true,
        hasActiveParking: false,
        message: "ไม่พบการจอดรถที่กำลังใช้งานอยู่",
        data: null
      });
    }
    
    // แปลงรูปแบบวันที่และเวลาให้อ่านง่ายขึ้น
    const parking = activeParking[0];
    const entryTime = new Date(parking.entry_time);
    
    // คำนวณระยะเวลาจอด
    const durationMinutes = parking.duration_minutes || 
                            Math.floor((new Date() - entryTime) / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    // คำนวณค่าจอด (ถ้ามี)
    const currentFee = parking.parking_fee || 0;
    
    // สร้างข้อมูลที่จะส่งกลับ
    const formattedParking = {
      history_id: parking.history_id,
      location_name: parking.location_name,
      building_code: parking.building_code,
      building_name: parking.building_name,
      area_name: parking.area_name,
      license_plate: parking.license_plate,
      vehicle_brand: parking.vehicle_brand,
      vehicle_model: parking.vehicle_model,
      vehicle_color: parking.vehicle_color,
      entry_date: entryTime.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      entry_time: entryTime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      duration: `${hours} ชั่วโมง ${minutes} นาที`,
      current_fee: currentFee,
      parking_card_number: parking.parking_card_number
    };
    
    return res.status(200).json({
      success: true,
      hasActiveParking: true,
      data: formattedParking
    });
    
  } catch (error) {
    console.error("Error fetching active parking:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลการจอดรถปัจจุบัน",
      error: error.message
    });
  }
};

/**
 * สำหรับผู้ดูแลระบบ (Admin/Member): ค้นหาประวัติการจอดรถตามทะเบียนรถ
 */
export const searchParkingByLicensePlate = async (req, res) => {
  // ตรวจสอบว่าผู้ใช้เป็น member (role_id = 1) หรือไม่
  if (req.user.roleId !== 1) {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
    });
  }
  
  const { license_plate } = req.query;
  
  if (!license_plate) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุทะเบียนรถที่ต้องการค้นหา"
    });
  }
  
  try {
    // ใช้ SQL query แทน stored procedure ที่ไม่มีอยู่
    const sql = `
      SELECT * FROM parking_history_details
      WHERE license_plate LIKE ?
      ORDER BY entry_time DESC
    `;
    
    // ใช้ LIKE เพื่อให้ค้นหาแบบยืดหยุ่น
    const results = await query(sql, [`%${license_plate}%`]);
    
    // แปลงรูปแบบวันที่และเวลาให้อ่านง่ายขึ้น
    const formattedResults = results.map(record => {
      const entryTime = new Date(record.entry_time);
      const exitTime = record.exit_time ? new Date(record.exit_time) : null;
      
      // คำนวณระยะเวลาจอด
      const durationMinutes = record.duration_minutes;
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return {
        history_id: record.history_id,
        username: record.username || '', // อาจไม่มีในวิว
        first_name: record.first_name,
        last_name: record.last_name,
        phone_number: record.phone_number || '', // อาจไม่มีในวิว
        building_code: record.building_code,
        building_name: record.building_name,
        area_name: record.area_name,
        license_plate: record.license_plate,
        vehicle_brand: record.vehicle_brand,
        vehicle_model: record.vehicle_model,
        entry_date: entryTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        entry_time: entryTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        exit_date: exitTime ? exitTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'ยังไม่ออก',
        exit_time: exitTime ? exitTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        duration: `${hours} ชั่วโมง ${minutes} นาที`,
        status_text: record.parking_status === 'active' ? 'กำลังจอด' : 'เสร็จสิ้น',
        payment_status: record.payment_status,
        payment_status_text: record.payment_status === 'completed' ? 'ชำระแล้ว' : 'รอชำระ',
        parking_fee: record.parking_fee || 0
      };
    });
    
    return res.status(200).json({
      success: true,
      count: formattedResults.length,
      data: formattedResults
    });
    
  } catch (error) {
    console.error("Error searching parking by license plate:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการค้นหาประวัติการจอดรถ",
      error: error.message
    });
  }
};
// export const searchParkingByLicensePlate = async (req, res) => {
//   // ตรวจสอบว่าผู้ใช้เป็น member (role_id = 1) หรือไม่
//   if (req.user.roleId !== 1) {
//     return res.status(403).json({
//       success: false,
//       message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
//     });
//   }
  
//   const { license_plate } = req.query;
  
//   if (!license_plate) {
//     return res.status(400).json({
//       success: false,
//       message: "กรุณาระบุทะเบียนรถที่ต้องการค้นหา"
//     });
//   }
  
//   try {
//     // ใช้ stored procedure search_parking_history_by_license_plate
//     // กำหนดวันที่เริ่มต้นเป็น null เพื่อค้นหาทั้งหมด
//     const results = await callProcedure("search_parking_history_by_license_plate(?, NULL, NULL)", [license_plate]);
    
//     // แปลงรูปแบบวันที่และเวลาให้อ่านง่ายขึ้น
//     const formattedResults = results.map(record => {
//       const entryTime = new Date(record.entry_time);
//       const exitTime = record.exit_time ? new Date(record.exit_time) : null;
      
//       // คำนวณระยะเวลาจอด
//       const durationMinutes = record.duration_minutes;
//       const hours = Math.floor(durationMinutes / 60);
//       const minutes = durationMinutes % 60;
      
//       return {
//         history_id: record.history_id,
//         username: record.username,
//         first_name: record.first_name,
//         last_name: record.last_name,
//         phone_number: record.phone_number,
//         building_code: record.building_code,
//         building_name: record.building_name,
//         area_name: record.area_name,
//         license_plate: record.license_plate,
//         vehicle_brand: record.vehicle_brand,
//         vehicle_model: record.vehicle_model,
//         entry_date: entryTime.toLocaleDateString('th-TH', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric'
//         }),
//         entry_time: entryTime.toLocaleTimeString('th-TH', {
//           hour: '2-digit',
//           minute: '2-digit'
//         }),
//         exit_date: exitTime ? exitTime.toLocaleDateString('th-TH', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric'
//         }) : 'ยังไม่ออก',
//         exit_time: exitTime ? exitTime.toLocaleTimeString('th-TH', {
//           hour: '2-digit',
//           minute: '2-digit'
//         }) : '-',
//         duration: `${hours} ชั่วโมง ${minutes} นาที`,
//         status_text: record.parking_status === 'active' ? 'กำลังจอด' : 'เสร็จสิ้น',
//         payment_status: record.payment_status,
//         payment_status_text: record.payment_status === 'completed' ? 'ชำระแล้ว' : 'รอชำระ',
//         parking_fee: record.parking_fee || 0
//       };
//     });
    
//     return res.status(200).json({
//       success: true,
//       count: formattedResults.length,
//       data: formattedResults
//     });
    
//   } catch (error) {
//     console.error("Error searching parking by license plate:", error);
//     return res.status(500).json({
//       success: false,
//       message: "เกิดข้อผิดพลาดในการค้นหาประวัติการจอดรถ",
//       error: error.message
//     });
//   }
// };


// parkingHistoryController.js (เพิ่มเติม)
// เพิ่มฟังก์ชันใหม่สำหรับบันทึกข้อมูลการเข้าจอดรถ
export const createParkingEntry = async (req, res) => {
  const userId = req.user.id;
  const { area_id, vehicle_id, entry_time } = req.body;
  
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!area_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุพื้นที่จอดรถและยานพาหนะ"
      });
    }
    
    // ตรวจสอบว่ามีการจอดที่กำลังใช้งานอยู่หรือไม่
    const activeParking = await query(`
      SELECT * FROM parking_history
      WHERE user_id = ? AND status = 'active'
      LIMIT 1
    `, [userId]);
    
    if (activeParking.length > 0) {
      return res.status(400).json({
        success: false,
        message: "คุณมีการจอดที่กำลังใช้งานอยู่แล้ว กรุณาบันทึกการออกจากที่จอดก่อน"
      });
    }
    
    // ตรวจสอบว่าพื้นที่จอดยังว่างอยู่
    const areaInfo = await query(`
      SELECT area_id, building_id, total_spaces, available_spaces
      FROM parking_areas
      WHERE area_id = ?
    `, [area_id]);
    
    if (areaInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลลานจอดรถ"
      });
    }
    
    if (areaInfo[0].available_spaces <= 0) {
      return res.status(400).json({
        success: false,
        message: "ลานจอดรถเต็มแล้ว"
      });
    }
    
    // ดึงข้อมูลยานพาหนะ
    const vehicleInfo = await query(`
      SELECT license_plate, vehicle_brand, vehicle_model, vehicle_color
      FROM vehicles
      WHERE vehicle_id = ? AND user_id = ?
    `, [vehicle_id, userId]);
    
    if (vehicleInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลยานพาหนะ"
      });
    }
    
    // กำหนดเวลาเข้า
    const entryDateTime = entry_time 
      ? new Date(`${new Date().toISOString().split('T')[0]}T${entry_time}:00`) 
      : new Date();
    
    // บันทึกข้อมูลการเข้าจอด
    const result = await query(`
      INSERT INTO parking_history (
        user_id,
        vehicle_id,
        area_id,
        entry_time,
        status,
        payment_status
      ) VALUES (?, ?, ?, ?, 'active', 'pending')
    `, [
      userId,
      vehicle_id,
      area_id,
      entryDateTime
    ]);
    
    // อัพเดทจำนวนที่จอดที่เหลือ
    await query(`
      UPDATE parking_areas
      SET available_spaces = available_spaces - 1
      WHERE area_id = ?
    `, [area_id]);
    
    const [buildingInfo] = await query(`
      SELECT b.building_name, pa.area_name
      FROM parking_areas pa
      JOIN buildings b ON pa.building_id = b.building_id
      WHERE pa.area_id = ?
    `, [area_id]);
    
    return res.status(201).json({
      success: true,
      message: "บันทึกข้อมูลการเข้าจอดสำเร็จ",
      data: {
        history_id: result.insertId,
        building_name: buildingInfo?.building_name || "อาคาร",
        area_name: buildingInfo?.area_name || "ลานจอด",
        license_plate: vehicleInfo[0].license_plate,
        vehicle_brand: vehicleInfo[0].vehicle_brand,
        vehicle_model: vehicleInfo[0].vehicle_model,
        entry_time: entryDateTime.toTimeString().substring(0, 5)
      }
    });
    
  } catch (error) {
    console.error("Error creating parking entry:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลการเข้าจอด",
      error: error.message
    });
  }
};

// เพิ่มฟังก์ชันใหม่สำหรับบันทึกข้อมูลการออกจากที่จอดรถ
export const createParkingExit = async (req, res) => {
  // เพิ่มการ log เพื่อตรวจสอบข้อมูล
  console.log('Request Body:', req.body);
  console.log('Request User:', req.user);
  console.log('Request Params:', req.params);

  // ตรวจสอบ userId ด้วย optional chaining
  const userId = req.user?.id;
  const { historyId } = req.params;
  const { exit_time, payment_status } = req.body;

  try {
    // ตรวจสอบ userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่"
      });
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!historyId || !exit_time) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลให้ครบถ้วน"
      });
    }

    // แปลงค่าเป็นตัวเลข
    const parsedHistoryId = parseInt(historyId);

    // เรียกฟังก์ชันบันทึกการออกจากที่จอด
    const result = await query(`
      SELECT 
        ph.*, 
        pa.area_id, 
        pa.area_name,
        b.building_name
      FROM 
        parking_history ph
        JOIN parking_areas pa ON ph.area_id = pa.area_id
        JOIN buildings b ON pa.building_id = b.building_id
      WHERE 
        ph.history_id = ? 
        AND ph.user_id = ? 
        AND ph.status = 'active'
    `, [parsedHistoryId, userId]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบประวัติการจอดที่กำลังใช้งาน หรือไม่ใช่ของผู้ใช้นี้"
      });
    }

    const parkingInfo = result[0];

    // กำหนดเวลาออก
    const exitDateTime = exit_time 
      ? new Date(`${new Date().toISOString().split('T')[0]}T${exit_time}:00`) 
      : new Date();
    
    // คำนวณระยะเวลาและค่าบริการ
    const entryTime = new Date(parkingInfo.entry_time);
    const durationMinutes = Math.floor((exitDateTime - entryTime) / (1000 * 60));
    const parkingFee = calculateParkingFee(durationMinutes);

    // ใช้ transaction เพื่อแก้ปัญหา trigger conflict
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // อัพเดทข้อมูลการออกจากที่จอด
      await connection.query(`
        UPDATE parking_history
        SET 
          exit_time = ?,
          duration_minutes = ?,
          parking_fee = ?,
          status = 'completed',
          payment_status = 'completed'
        WHERE history_id = ?
      `, [exitDateTime, durationMinutes, parkingFee, parsedHistoryId]);
      
      // อัพเดทจำนวนที่จอดที่เหลือ
      await connection.query(`
        UPDATE parking_areas
        SET available_spaces = available_spaces + 1
        WHERE area_id = ?
      `, [parkingInfo.area_id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
    // คำนวณเวลาเป็นชั่วโมงและนาที
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const durationText = `${hours} ชั่วโมง ${minutes} นาที`;
    
    return res.status(200).json({
      success: true,
      message: "บันทึกข้อมูลการออกจากที่จอดสำเร็จ",
      data: {
        history_id: parsedHistoryId,
        entry_time: entryTime.toTimeString().substring(0, 5),
        exit_time: exitDateTime.toTimeString().substring(0, 5),
        duration_minutes: durationMinutes,
        duration: durationText,
        parking_fee: parkingFee,
        building_name: parkingInfo.building_name,
        area_name: parkingInfo.area_name,
        status: 'completed',
        payment_status: 'completed'
      }
    });
    
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลการออกจากที่จอด:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลการออกจากที่จอด",
      รายละเอียดข้อผิดพลาด: error.message
    });
  }
};



///เพิ่ม

// ฟังก์ชันสร้างรายการจอดรถ
const createParkingEntryInternal = async ({ userId, area_id, vehicle_id, entry_time }) => {
  try {
    // ตรวจสอบว่าพื้นที่จอดรถมีที่ว่างหรือไม่
    const areaResult = await query(`
      SELECT 
        pa.area_id, 
        pa.area_name, 
        pa.total_spaces, 
        pa.available_spaces,
        b.building_id,
        b.building_name,
        b.building_code
      FROM 
        parking_areas pa
        JOIN buildings b ON pa.building_id = b.building_id
      WHERE 
        pa.area_id = ?
    `, [area_id]);

    if (areaResult.length === 0) {
      throw new Error("ไม่พบข้อมูลพื้นที่จอดรถ");
    }

    const parkingArea = areaResult[0];
    
    if (parkingArea.available_spaces <= 0) {
      throw new Error("พื้นที่จอดรถเต็มแล้ว");
    }

    // ตรวจสอบข้อมูลยานพาหนะ
    const vehicleResult = await query(`
      SELECT * FROM vehicle_registrations WHERE vehicle_id = ? AND user_id = ?
    `, [vehicle_id, userId]);

    if (vehicleResult.length === 0) {
      throw new Error("ไม่พบข้อมูลยานพาหนะ หรือไม่ใช่ยานพาหนะของผู้ใช้นี้");
    }

    const vehicle = vehicleResult[0];

    // ตรวจสอบว่าผู้ใช้มีการจอดที่กำลังใช้งานอยู่หรือไม่
    const activeResult = await query(`
      SELECT * FROM parking_history 
      WHERE user_id = ? AND status = 'active'
    `, [userId]);

    if (activeResult.length > 0) {
      throw new Error("คุณมีการจอดที่กำลังใช้งานอยู่แล้ว");
    }

    // กำหนดเวลาเข้า
    const entryDateTime = entry_time 
      ? new Date(`${new Date().toISOString().split('T')[0]}T${entry_time}:00`) 
      : new Date();

    // บันทึกข้อมูลการจอด
    const insertResult = await query(`
      INSERT INTO parking_history (
        user_id, 
        area_id, 
        vehicle_id, 
        entry_time, 
        status, 
        payment_status
      ) VALUES (?, ?, ?, ?, 'active', 'pending')
    `, [userId, area_id, vehicle_id, entryDateTime]);

    const historyId = insertResult.insertId;

    // อัพเดทจำนวนที่จอดที่เหลือ
    await query(`
      UPDATE parking_areas
      SET available_spaces = available_spaces - 1
      WHERE area_id = ?
    `, [area_id]);

    return {
      success: true,
      message: "บันทึกข้อมูลการเข้าจอดสำเร็จ",
      data: {
        history_id: historyId,
        user_id: userId,
        area_id: area_id,
        vehicle_id: vehicle_id,
        entry_time: entryDateTime.toTimeString().substring(0, 5),
        building_name: parkingArea.building_name,
        building_code: parkingArea.building_code,
        area_name: parkingArea.area_name,
        license_plate: vehicle.license_plate,
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
        vehicle_color: vehicle.color
      }
    };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างรายการจอดรถ:", error);
    throw error;
  }
};

export const createEntryAPI = async (req, res) => {
  // บันทึกข้อมูลที่ได้รับ
  console.log('ข้อมูลที่ได้รับ:', req.body);
  console.log('ข้อมูลผู้ใช้:', req.user);

  // ดึง ID ผู้ใช้
  const userId = req.user?.id;
  const { area_id, vehicle_id, entry_time } = req.body;

  try {
    // ตรวจสอบ ID ผู้ใช้
    if (!userId) {
      console.error("ไม่พบข้อมูลผู้ใช้ในคำขอ:", req.user);
      return res.status(401).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่"
      });
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!area_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลให้ครบถ้วน"
      });
    }

    // แปลงค่าเป็นตัวเลข
    const parsedAreaId = parseInt(area_id);
    const parsedVehicleId = parseInt(vehicle_id);

    console.log("กำลังสร้างรายการจอดรถด้วยข้อมูล:", {
      userId, 
      area_id: parsedAreaId,
      vehicle_id: parsedVehicleId,
      entry_time
    });

    // เรียกฟังก์ชันสร้างรายการจอดรถ
    const result = await createParkingEntryInternal({ 
      userId, 
      area_id: parsedAreaId,
      vehicle_id: parsedVehicleId,
      entry_time 
    });
    
    console.log("สร้างรายการจอดรถสำเร็จ:", result);
    
    return res.status(201).json(result);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างรายการจอดรถ:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลการเข้าจอด",
      รายละเอียดข้อผิดพลาด: error.message
    });
  }
};


// ฟังก์ชันภายในสำหรับบันทึกการออกจากที่จอด
const processParkingExit = async ({ userId, history_id, exit_time }) => {
  try {
    console.log(`กำลังบันทึกการออกจากที่จอด: ผู้ใช้ ID ${userId}, ประวัติ ID ${history_id}, เวลาออก ${exit_time}`);
    
    // ตรวจสอบว่ามีประวัติการจอดรถนี้หรือไม่
    const historyResult = await query(`
      SELECT 
        ph.history_id, 
        ph.user_id, 
        ph.area_id, 
        ph.vehicle_id, 
        ph.entry_time, 
        ph.status,
        pa.area_name,
        b.building_name
      FROM 
        parking_history ph
        JOIN parking_areas pa ON ph.area_id = pa.area_id
        JOIN buildings b ON pa.building_id = b.building_id
      WHERE 
        ph.history_id = ? AND ph.user_id = ? AND ph.status = 'active'
    `, [history_id, userId]);

    if (historyResult.length === 0) {
      throw new Error("ไม่พบข้อมูลการจอดรถที่กำลังใช้งานอยู่");
    }

    const parkingInfo = historyResult[0];

    // คำนวณระยะเวลาจอด
    const entryTime = new Date(parkingInfo.entry_time);
    const exitDateTime = exit_time 
      ? new Date(`${new Date().toISOString().split('T')[0]}T${exit_time}:00`) 
      : new Date();

    // คำนวณระยะเวลาจอดเป็นนาที
    const durationMinutes = Math.round((exitDateTime - entryTime) / (1000 * 60));
    
    // คำนวณระยะเวลาจอดเป็นข้อความ
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const durationText = `${hours} ชั่วโมง ${minutes} นาที`;

    // คำนวณค่าจอดรถ
    const parkingFee = calculateParkingFee(durationMinutes);

    console.log('ข้อมูลการคำนวณ:', {
      entryTime,
      exitDateTime,
      durationMinutes,
      durationText,
      parkingFee
    });

    // ใช้ transaction เพื่อแก้ปัญหา trigger conflict
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // อัพเดทข้อมูลการจอดรถ
      await connection.query(`
        UPDATE parking_history
        SET 
          exit_time = ?,
          duration_minutes = ?,
          parking_fee = ?,
          status = 'completed',
          payment_status = 'completed'
        WHERE history_id = ?
      `, [exitDateTime, durationMinutes, parkingFee, history_id]);
  
      // อัพเดทจำนวนที่จอดที่เหลือ
      await connection.query(`
        UPDATE parking_areas
        SET available_spaces = available_spaces + 1
        WHERE area_id = ?
      `, [parkingInfo.area_id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      success: true,
      message: "บันทึกข้อมูลการออกจากที่จอดสำเร็จ",
      data: {
        history_id,
        entry_time: entryTime.toTimeString().substring(0, 5),
        exit_time: exitDateTime.toTimeString().substring(0, 5),
        duration_minutes: durationMinutes,
        duration: durationText,
        parking_fee: parkingFee,
        building_name: parkingInfo.building_name,
        area_name: parkingInfo.area_name,
        status: 'completed',
        payment_status: 'completed'
      }
    };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึกการออกจากที่จอด:", error);
    throw error;
  }
};

// إصلاح دالة createExitAPI في ملف parkingHistoryService.js
export const createExitAPI = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { exit_time, exit_date, payment_status } = req.body; // รับ exit_date เพิ่ม
    const userId = req.user.id;

    console.log('ข้อมูลที่ได้รับ:', req.body);
    console.log('ข้อมูลผู้ใช้:', req.user);
    console.log('พารามิเตอร์:', req.params);

    if (!historyId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสประวัติการจอดรถ'
      });
    }
    
    if (!exit_time) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเวลาออกจากที่จอด'
      });
    }

    // สร้างวันที่และเวลาออก
    let exitDateTime;
    
    if (exit_date) {
      // ถ้ามีการส่ง exit_date มา ให้ใช้วันที่ที่ส่งมา
      exitDateTime = new Date(exit_date);
      const [hours, minutes] = exit_time.split(':');
      exitDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // ถ้าไม่มี exit_date ให้ใช้วันที่ปัจจุบัน
      exitDateTime = new Date();
      if (exit_time) {
        const [hours, minutes] = exit_time.split(':');
        exitDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
    }
    
    // แก้ไขตรงนี้: ใช้ format ที่ไม่แปลงเป็น UTC แต่เก็บเวลาท้องถิ่น
    // เดิม: const formattedExitTime = exitDateTime.toISOString().slice(0, 19).replace('T', ' ');
    
    // วิธีที่ 1: ใช้ฟังก์ชัน format เวลาท้องถิ่นแทน
    const pad = (num) => String(num).padStart(2, '0');
    const formattedExitTime = `${exitDateTime.getFullYear()}-${pad(exitDateTime.getMonth() + 1)}-${pad(exitDateTime.getDate())} ${pad(exitDateTime.getHours())}:${pad(exitDateTime.getMinutes())}:${pad(exitDateTime.getSeconds())}`;
    
    console.log('Exit Date Time:', exitDateTime);
    console.log('Formatted Exit Time:', formattedExitTime);
    
    // ดึงข้อมูลประวัติการจอดรถ
    const [historyRows] = await pool.query(
      `SELECT h.*, a.hourly_rate FROM parking_history h
       JOIN parking_areas a ON h.area_id = a.area_id
       WHERE h.history_id = ?`,
      [historyId]
    );

    if (historyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลประวัติการจอดรถ'
      });
    }

    const history = historyRows[0];
    const entryTime = new Date(history.entry_time);
    
    // คำนวณระยะเวลาและค่าบริการ
    const durationMinutes = Math.floor((exitDateTime - entryTime) / (1000 * 60));
    const parkingFee = 20
    
    // ทำการอัปเดตข้อมูลในคำสั่งเดียว
    const [updateResult] = await pool.query(
      `UPDATE parking_history
       SET exit_time = ?,
           duration_minutes = ?,
           parking_fee = ?,
           status = 'completed',
           payment_status = ?
       WHERE history_id = ?`,
      [formattedExitTime, durationMinutes, parkingFee, payment_status || 'completed', historyId]
    );
    
    // อัปเดตที่จอดว่าง
    await pool.query(
      `UPDATE parking_areas
       SET available_spaces = available_spaces + 1
       WHERE area_id = ?`,
      [history.area_id]
    );

    // คำนวณข้อความแสดงระยะเวลา
    const hoursDisplay = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationText = `${hoursDisplay} ชั่วโมง ${mins} นาที`;

    res.status(200).json({
      success: true,
      message: 'บันทึกข้อมูลการออกจากที่จอดสำเร็จ',
      data: {
        history_id: parseInt(historyId),
        exit_time: formattedExitTime,
        exit_date: exitDateTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        exit_time_formatted: exitDateTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        duration: durationText,
        duration_minutes: durationMinutes,
        parking_fee: parkingFee
      }
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการออกจากที่จอด:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการออกจากที่จอด',
      รายละเอียดข้อผิดพลาด: error.message
    });
  }
};
/**
 * ดึงรายการประวัติการจอดรถทั้งหมดของผู้ใช้
 * GET /parking/history/all
 */
export const getAllParkingHistoryAPI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // คำนวณ offset สำหรับการทำ pagination
    const offset = (page - 1) * limit;
    
    // ดึงข้อมูลประวัติการจอดรถทั้งหมดของผู้ใช้
    const sqlCount = `
      SELECT COUNT(*) as total
      FROM parking_history_details
      WHERE user_id = ?
    `;
    
    const sqlData = `
      SELECT *
      FROM parking_history_details
      WHERE user_id = ?
      ORDER BY entry_time DESC
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await pool.query(sqlCount, [userId]);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);
    
    const [rows] = await pool.query(sqlData, [userId, parseInt(limit), offset]);
    
    // แปลงรูปแบบของข้อมูลให้เป็นรูปแบบที่ frontend ต้องการ
    const formattedData = rows.map(item => {
      const entryTime = new Date(item.entry_time);
      const exitTime = item.exit_time ? new Date(item.exit_time) : null;
      
      return {
        history_id: item.history_id,
        building_name: item.building_name,
        area_name: item.area_name,
        license_plate: item.license_plate,
        vehicle_brand: item.vehicle_brand,
        vehicle_model: item.vehicle_model,
        entry_date: entryTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        entry_time: entryTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        exit_date: exitTime ? exitTime.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'ยังไม่ออก',
        exit_time: exitTime ? exitTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        duration: `${Math.floor(item.duration_minutes / 60)} ชั่วโมง ${item.duration_minutes % 60} นาที`,
        parking_fee: item.parking_fee || 0,
        status_text: item.parking_status === 'active' ? 'กำลังจอด' : 'เสร็จสิ้น',
        payment_status_text: item.payment_status === 'completed' ? 'ชำระแล้ว' : 'รอชำระ'
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching all parking history:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงประวัติการจอดรถทั้งหมด",
      error: error.message
    });
  }
};
