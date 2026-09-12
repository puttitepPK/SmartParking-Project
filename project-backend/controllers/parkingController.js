import mysql from "mysql2/promise";
import db from './database.js';

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

// ฟังก์ชันแปลงเวลาเป็นช่วงเวลา morning, daytime, evening
// ฟังก์ชันแปลงเวลาเป็นช่วงเวลา morning, daytime, evening
const getTimePeriod = (timeStr) => {
  const hour = parseInt(timeStr.split(':')[0]);
  if (hour >= 7 && hour < 11) {
    return 'morning';
  } else if (hour >= 11 && hour < 19) {
    return 'daytime';
  } else {
    return 'evening';
  }
};

/**
 * ค้นหาลานจอดรถตามวันที่และเวลา
 */
export const findParking = async (req, res) => {
  const { date, time, building } = req.query;
  
  if (!date || !time) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุวันที่และเวลา"
    });
  }
  
  try {
    // ตรวจสอบว่าวันที่อยู่ในช่วง 7 วันข้างหน้าหรือไม่
    const selectedDate = new Date(date);
    // รีเซ็ตเวลาเป็น 00:00:00.000 เพื่อเปรียบเทียบเฉพาะวันที่
    selectedDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date();
    // รีเซ็ตเวลาเป็น 00:00:00.000 เพื่อเปรียบเทียบเฉพาะวันที่
    currentDate.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(currentDate);
    maxDate.setDate(currentDate.getDate() + 7);
    
    // ตรวจสอบว่าวันที่ต้องอยู่ในช่วงวันปัจจุบันถึง 7 วันข้างหน้า
    const isWithinRange = 
      selectedDate.getTime() >= currentDate.getTime() && 
      selectedDate.getTime() <= maxDate.getTime();
    
    if (!isWithinRange) {
      return res.status(400).json({
        success: false,
        message: "วันที่ต้องอยู่ในช่วง 7 วันข้างหน้าเท่านั้น"
      });
    }
    
    // หาช่วงเวลา (morning, daytime, evening) จากเวลาที่ระบุ
    const timePeriod = getTimePeriod(time);
    
    // ตรวจสอบว่าเป็นวันปัจจุบันหรือวันในอนาคต
    // ใช้ getTime() เพื่อเปรียบเทียบที่แม่นยำกว่า
    const isCurrentDay = selectedDate.getTime() === currentDate.getTime();
    
    let parkingData = [];
    
    if (isCurrentDay) {
      // ถ้าเป็นวันปัจจุบัน ใช้ข้อมูลจาก parking_status และเสริมด้วยการคาดการณ์
      // ดึงข้อมูลสถานะลานจอดรถทั้งหมดจาก view parking_status
      const statusSql = `SELECT * FROM parking_status`;
      const parkingStatus = await query(statusSql);
      
      // กรองตามอาคาร (ถ้ามีการระบุ)
      let filteredStatus = parkingStatus;
      if (building) {
        filteredStatus = parkingStatus.filter(area => area['รหัสอาคาร'] === building);
      }
      
      // ข้อมูลที่จะส่งกลับ
      parkingData = await Promise.all(filteredStatus.map(async (area) => {
        // ดึงข้อมูลการคาดการณ์จากตาราง parking_predictions
        const predictionSql = `
          SELECT * FROM parking_predictions
          WHERE area_id = ? 
          AND prediction_date = ?
          AND time_period = ?
        `;
        
        const predictions = await query(predictionSql, [area['รหัสลาน'], date, timePeriod]);
        let vacancyProbability = area['เปอร์เซ็นต์ที่ว่าง']; // ใช้ค่าปัจจุบันเป็นค่าเริ่มต้น
        
        // ถ้ามีข้อมูลการคาดการณ์ ใช้ค่าจากการคาดการณ์
        if (predictions.length > 0) {
          vacancyProbability = predictions[0].vacancy_probability;
        }
        
        // แปลงสถานะความว่างเป็นข้อความที่เข้าใจง่าย
        let status = "ไม่ว่าง";
        if (vacancyProbability > 0) {
          if (vacancyProbability < 20) {
            status = "มีโอกาสไม่ว่างสูง";
          } else if (vacancyProbability < 50) {
            status = "มีโอกาสว่างน้อย";
          } else if (vacancyProbability < 80) {
            status = "มีโอกาสว่าง";
          } else {
            status = "มีโอกาสว่างสูง";
          }
        }
        
        // ดึงข้อมูลลานจอดรถเพิ่มเติม
        const parkingAreaSql = `
          SELECT pa.*, b.building_code, b.building_name
          FROM parking_areas pa
          JOIN buildings b ON pa.building_id = b.building_id
          WHERE pa.area_id = ?
        `;
        
        const parkingAreaInfo = await query(parkingAreaSql, [area['รหัสลาน']]);
        
        // หาช่วงเวลาเปิด-ปิด
        let operatingHours = "00:00-24:00";
        if (parkingAreaInfo.length > 0) {
          if (parkingAreaInfo[0].is_24hours) {
            operatingHours = "00:00-24:00";
          } else if (parkingAreaInfo[0].opening_time && parkingAreaInfo[0].closing_time) {
            operatingHours = `${parkingAreaInfo[0].opening_time.substring(0, 5)}-${parkingAreaInfo[0].closing_time.substring(0, 5)}`;
          }
        }
        
        // แปลงช่วงเวลาเป็นรูปแบบที่เข้าใจง่าย
        let displayTimePeriod = "";
        if (timePeriod === 'morning') {
          displayTimePeriod = "07:00-11:00";
        } else if (timePeriod === 'daytime') {
          displayTimePeriod = "11:00-19:00";
        } else {
          displayTimePeriod = "19:00-23:00";
        }
        
        // ใช้รูปภาพ default หากไม่มีรูปในฐานข้อมูล
        const imageUrl = area['image_url'] || null;

          // แก้ไขตรงนี้: คำนวณจำนวนที่จอดที่คาดการณ์จากความน่าจะเป็น แทนการใช้ค่าจริงจากฐานข้อมูล
        const predictedAvailableSpaces = Math.round((vacancyProbability / 100) * area['จำนวนที่ทั้งหมด']);
        
        return {
          id: area['รหัสลาน'],
          building: area['รหัสอาคาร'],
          building_name: area['ชื่ออาคาร'],
          floor: area['ชื่อลาน'],
          time: operatingHours,
          time_period: displayTimePeriod,
          // slots: `${area['จำนวนที่ว่าง']}/${area['จำนวนที่ทั้งหมด']}`,
          // เปลี่ยนจากใช้ค่าจริง เป็นใช้ค่าทำนาย
          slots: `${predictedAvailableSpaces}/${area['จำนวนที่ทั้งหมด']}`,
          availability_chance: parseFloat(vacancyProbability).toFixed(1),
          status: status,
          parking_status: area['สถานะลาน'],
          location_name: area['ชื่อสถานที่'],
          image_url: imageUrl
        };
      }));
      
    } else {
      // ถ้าเป็นวันในอนาคต ใช้ข้อมูลการคาดการณ์ทั้งหมด
      // ดึงข้อมูลการคาดการณ์ทั้งหมดจากตาราง parking_predictions สำหรับวันที่เลือก
      let predictionSql = `
        SELECT pp.*, pa.area_name, pa.total_spaces, pa.is_24hours, pa.opening_time, pa.closing_time, pa.status,
               b.building_code, b.building_name, l.location_name
        FROM parking_predictions pp
        JOIN parking_areas pa ON pp.area_id = pa.area_id
        JOIN buildings b ON pa.building_id = b.building_id
        JOIN location l ON b.location_id = l.location_id
        WHERE pp.prediction_date = ?
        AND pp.time_period = ?
      `;
      
      // เพิ่มเงื่อนไขสำหรับการกรองตามอาคาร (ถ้ามี)
      if (building) {
        predictionSql += ` AND b.building_code = ?`;
      }
      
      // ตัวแปรสำหรับเก็บพารามิเตอร์ของคำสั่ง SQL
      const params = building ? [date, timePeriod, building] : [date, timePeriod];
      
      // ดึงข้อมูลการคาดการณ์
      const predictions = await query(predictionSql, params);
      
      // ตรวจสอบว่ามีข้อมูลการคาดการณ์หรือไม่
      if (predictions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลการคาดการณ์สำหรับวันและเวลาที่เลือก"
        });
      }
      
      // แปลงข้อมูลการคาดการณ์เป็นรูปแบบเดียวกับข้อมูลปัจจุบัน
      parkingData = predictions.map(prediction => {
        // คำนวณช่องจอดที่ว่างโดยประมาณจากค่าความน่าจะเป็น
        const availableSpaces = Math.round((prediction.vacancy_probability / 100) * prediction.total_spaces);
        
        // สร้างสถานะความว่างตามค่าความน่าจะเป็น
        let status = "ไม่ว่าง";
        if (prediction.vacancy_probability > 0) {
          if (prediction.vacancy_probability < 20) {
            status = "มีโอกาสไม่ว่างสูง";
          } else if (prediction.vacancy_probability < 50) {
            status = "มีโอกาสว่างน้อย";
          } else if (prediction.vacancy_probability < 80) {
            status = "มีโอกาสว่าง";
          } else {
            status = "มีโอกาสว่างสูง";
          }
        }
        
        // หาช่วงเวลาเปิด-ปิด
        let operatingHours = "00:00-24:00";
        if (prediction.is_24hours) {
          operatingHours = "00:00-24:00";
        } else if (prediction.opening_time && prediction.closing_time) {
          operatingHours = `${prediction.opening_time.substring(0, 5)}-${prediction.closing_time.substring(0, 5)}`;
        }
        
        // แปลงช่วงเวลาเป็นรูปแบบที่เข้าใจง่าย
        let displayTimePeriod = "";
        if (timePeriod === 'morning') {
          displayTimePeriod = "07:00-11:00";
        } else if (timePeriod === 'daytime') {
          displayTimePeriod = "11:00-19:00";
        } else {
          displayTimePeriod = "19:00-23:00";
        }
        
        // ใช้รูปภาพ default หากไม่มีรูปในฐานข้อมูล
        const imageUrl = prediction.image_url || null;
        
        return {
          id: prediction.area_id,
          building: prediction.building_code,
          building_name: prediction.building_name,
          floor: prediction.area_name,
          time: operatingHours,
          time_period: displayTimePeriod,
          //slots: `${availableSpaces}/${prediction.total_spaces}`, แสดง 20/50(สมมุติ)ของวันในอนาคต
          slots: `-/${prediction.total_spaces}`, //แสดงเป็น -/50(สมมุติ)ของวันในอนาคต
          availability_chance: parseFloat(prediction.vacancy_probability).toFixed(1),
          status: status,
          parking_status: prediction.status,
          location_name: prediction.location_name,
          image_url: imageUrl
        };
      });
    }
    
    return res.status(200).json({
      success: true,
      date,
      time,
      time_period: timePeriod,
      data: parkingData
    });
  } catch (error) {
    console.error("Error finding parking:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการค้นหาลานจอดรถ",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลอาคารทั้งหมด
 */
export const getBuildings = async (req, res) => {
  try {
    // ดึงข้อมูลอาคารจากตาราง buildings
    const sql = `
      SELECT 
        building_id as id,
        building_name as name,
        building_code as code,
        description,
        location_id
      FROM 
        buildings
      ORDER BY 
        building_code
    `;
    
    const buildings = await query(sql);
    
    return res.status(200).json({
      success: true,
      data: buildings
    });
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลอาคาร",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลลานจอดรถตามอาคาร
 */
export const getFloorsByBuilding = async (req, res) => {
  const { building } = req.params;
  
  try {
    // ดึงข้อมูลลานจอดรถจากตาราง parking_areas
    const sql = `
      SELECT 
        pa.area_id as id,
        pa.area_name as name,
        pa.total_spaces,
        pa.available_spaces,
        pa.hourly_rate,
        pa.status,
        pa.opening_time,
        pa.closing_time,
        pa.is_24hours
      FROM 
        parking_areas pa
      JOIN 
        buildings b ON pa.building_id = b.building_id
      WHERE 
        b.building_code = ?
      ORDER BY 
        pa.area_name
    `;
    
    const floors = await query(sql, [building]);
    
    if (floors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลลานจอดรถในอาคารที่ระบุ"
      });
    }
    
    // แปลงข้อมูลเวลาให้อยู่ในรูปแบบที่อ่านง่าย
    const formattedFloors = floors.map(floor => {
      return {
        ...floor,
        time: floor.is_24hours ? "00:00-24:00" : 
              `${floor.opening_time ? floor.opening_time.substring(0, 5) : "N/A"}-${floor.closing_time ? floor.closing_time.substring(0, 5) : "N/A"}`,
        availability: `${floor.available_spaces}/${floor.total_spaces}`,
        availability_percentage: Math.round((floor.available_spaces / floor.total_spaces) * 100)
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedFloors
    });
  } catch (error) {
    console.error("Error fetching floors:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลลานจอดรถ",
      error: error.message
    });
  }
};

/**
 * แสดงการคาดการณ์การจอดรถ
 */
export const getParkingPredictions = async (req, res) => {
  const { building_code } = req.query;
  
  if (!building_code) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุรหัสอาคาร"
    });
  }
  
  try {
    // ใช้ stored procedure show_parking_predictions
    const predictions = await callProcedure("show_parking_predictions(?)", [building_code]);
    
    return res.status(200).json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error("Error fetching parking predictions:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลการคาดการณ์การจอดรถ",
      error: error.message
    });
  }
};

/**
 * แสดงสถานะการจอดรถปัจจุบัน
 */
export const getCurrentParkingStatus = async (req, res) => {
  try {
    // ใช้ stored procedure show_parking_status
    const status = await callProcedure("show_parking_status()", []);
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Error fetching current parking status:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลสถานะการจอดรถปัจจุบัน",
      error: error.message
    });
  }
};


/**
 * อัพเดทการคาดการณ์ที่จอดรถอัตโนมัติ
 */
export const updateParkingPredictions = async () => {
  try {
    console.log("Updating parking predictions...");
    
    // ตรวจสอบว่ามี Stored Procedure นี้หรือไม่
    const checkProcedureSql = `
      SELECT COUNT(*) as count
      FROM information_schema.routines
      WHERE routine_schema = 'System_Parking2'
      AND routine_name = 'calculate_parking_predictions'
      AND routine_type = 'PROCEDURE'
    `;
    
    const [procedureCheck] = await pool.query(checkProcedureSql);
    
    if (procedureCheck[0].count > 0) {
      // มี Procedure นี้อยู่ เรียกใช้งานตามปกติ
      await callProcedure("calculate_parking_predictions", []);
      console.log("Parking predictions updated successfully.");
      return true;
    } else {
      // ไม่มี Procedure นี้ ให้ข้ามการอัพเดตและแจ้งเตือน
      console.log("Warning: Stored procedure 'calculate_parking_predictions' not found. Skipping prediction update.");
      return false;
    }
  } catch (error) {
    console.error("Error updating parking predictions:", error);
    return false;
  }
};

/**
 * API endpoint เพื่ออัพเดทการคาดการณ์
 */
export const runDailyPredictionUpdate = async (req, res) => {
  try {
    const success = await updateParkingPredictions();
    
    return res.status(200).json({
      success: true,
      message: "อัพเดทการคาดการณ์ที่จอดรถเรียบร้อย"
    });
  } catch (error) {
    console.error("Error updating parking predictions:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัพเดทการคาดการณ์ที่จอดรถ",
      error: error.message
    });
  }
};

// เพิ่ม
export const getParkingHistory = async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  try {
    let query = `
      SELECT 
        ph.*, 
        pa.area_name, 
        b.building_code, 
        b.building_name
      FROM parking_history ph
      JOIN parking_areas pa ON ph.area_id = pa.area_id
      JOIN buildings b ON pa.building_id = b.building_id
      WHERE ph.user_id = ?
    `;

    const params = [userId];

    if (startDate && endDate) {
      query += ' AND ph.check_in_time BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY ph.check_in_time DESC';

    const parkingHistory = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: parkingHistory[0]
    });
  } catch (error) {
    console.error("Error fetching parking history:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงประวัติการจอดรถ"
    });
  }
};

export const getParkingStatistics = async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT 
        COUNT(*) as total_parkings,
        AVG(TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time)) as avg_parking_duration,
        COUNT(DISTINCT area_id) as unique_parking_areas
      FROM parking_history
      WHERE user_id = ?
    `;

    const [statistics] = await db.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: statistics[0]
    });
  } catch (error) {
    console.error("Error fetching parking statistics:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงสถิติการจอดรถ"
    });
  }
};
