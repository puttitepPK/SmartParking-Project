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
 * สร้างรายการชำระเงิน
 */
export const createPayment = async (req, res) => {
  const userId = req.user.id;
  const { history_id, payment_method } = req.body;
  
  if (!history_id || !payment_method) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุข้อมูลให้ครบถ้วน"
    });
  }
  
  try {
    // 1. ตรวจสอบว่าเป็นข้อมูลประวัติการจอดรถของ Visitor นี้หรือไม่
    const historyCheck = await query(`
      SELECT h.*, a.area_name, b.building_name, b.building_code
      FROM parking_history h
      JOIN parking_areas a ON h.area_id = a.area_id
      JOIN buildings b ON a.building_id = b.building_id
      WHERE h.history_id = ? AND h.user_id = ? AND h.status = 'active'
    `, [history_id, userId]);
    
    if (historyCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการจอดรถที่กำลังใช้งานอยู่"
      });
    }
    
    const parkingInfo = historyCheck[0];
    
    // 2. คำนวณค่าบริการ - สำหรับตัวอย่างนี้ตั้งค่าคงที่เป็น 20 บาท
    const serviceFee = 20.00;
    const totalAmount = serviceFee;
    
    // 3. ตรวจสอบว่ามีรายการชำระเงินสำหรับประวัติการจอดนี้อยู่แล้วหรือไม่
    const paymentCheck = await query(`
      SELECT payment_id FROM payments
      WHERE history_id = ? AND status != 'failed'
    `, [history_id]);
    
    if (paymentCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: "มีรายการชำระเงินสำหรับประวัติการจอดนี้อยู่แล้ว",
        payment_id: paymentCheck[0].payment_id
      });
    }
    
    // 4. สร้างรายการชำระเงินใหม่
    const paymentData = {
      history_id,
      user_id: userId,
      amount: serviceFee,
      service_fee: serviceFee,
      total_amount: totalAmount,
      payment_method,
      status: 'pending',
      transaction_ref: `PAY${Date.now()}`
    };
    
    const result = await query(`
        INSERT INTO payments (
          history_id, user_id, amount, service_fee, 
          fine_fee, discount, payment_method, status, transaction_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentData.history_id,
        paymentData.user_id,
        paymentData.amount,
        paymentData.service_fee,
        paymentData.fine_fee || 0,  // ถ้าไม่มีค่าให้ใช้ 0
        paymentData.discount || 0,  // ถ้าไม่มีค่าให้ใช้ 0
        paymentData.payment_method,
        paymentData.status,
        paymentData.transaction_ref
      ]);
    
    const paymentId = result.insertId;
    
    // 5. สร้างข้อมูลสำหรับการแสดงผลบนหน้า payment
    const responseData = {
      payment_id: paymentId,
      history_id,
      amount: serviceFee,
      total_amount: totalAmount,
      payment_method,
      transaction_ref: paymentData.transaction_ref,
      status: 'pending',
      building_name: parkingInfo.building_name,
      building_code: parkingInfo.building_code,
      area_name: parkingInfo.area_name,
      entry_time: new Date(parkingInfo.entry_time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      entry_date: new Date(parkingInfo.entry_time).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      payment_data: {
        // ข้อมูลสำหรับแสดงผลบนหน้า UI การชำระเงิน
        fromParkingExit: true,
        historyId: history_id,
        amount: totalAmount,
        buildingName: parkingInfo.building_name,
        areaName: parkingInfo.area_name,
        entryDate: new Date(parkingInfo.entry_time).toLocaleDateString('th-TH'),
        entryTime: new Date(parkingInfo.entry_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    };
    
    return res.status(201).json({
      success: true,
      message: "สร้างรายการชำระเงินสำเร็จ",
      data: responseData
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน",
      error: error.message
    });
  }
};

/**
 * ดึงรายละเอียดของรายการชำระเงิน
 */
export const getPaymentDetails = async (req, res) => {
  const userId = req.user.id;
  const { paymentId } = req.params;
  
  try {
    const paymentDetails = await query(`
      SELECT p.*, h.entry_time, h.area_id,
             a.area_name, b.building_name, b.building_code
      FROM payments p
      JOIN parking_history h ON p.history_id = h.history_id
      JOIN parking_areas a ON h.area_id = a.area_id
      JOIN buildings b ON a.building_id = b.building_id
      WHERE p.payment_id = ? AND p.user_id = ?
    `, [paymentId, userId]);
    
    if (paymentDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลรายการชำระเงิน"
      });
    }
    
    const payment = paymentDetails[0];
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    const responseData = {
      payment_id: payment.payment_id,
      history_id: payment.history_id,
      amount: payment.amount,
      service_fee: payment.service_fee,
      fine_fee: payment.fine_fee || 0,
      discount: payment.discount || 0,
      total_amount: payment.total_amount,
      payment_method: payment.payment_method,
      status: payment.status,
      transaction_ref: payment.transaction_ref,
      payment_time: payment.payment_time ? new Date(payment.payment_time).toLocaleString('th-TH') : null,
      building_name: payment.building_name,
      building_code: payment.building_code,
      area_name: payment.area_name,
      entry_time: new Date(payment.entry_time).toLocaleString('th-TH')
    };
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error getting payment details:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงรายละเอียดรายการชำระเงิน",
      error: error.message
    });
  }
};

/**
 * อัพเดทสถานะการชำระเงิน
 */
export const updatePaymentStatus = async (req, res) => {
  const userId = req.user.id;
  const { paymentId } = req.params;
  const { status, transaction_ref } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: "กรุณาระบุสถานะการชำระเงิน"
    });
  }
  
  try {
    // ตรวจสอบว่ามีรายการชำระเงินนี้หรือไม่
    const paymentCheck = await query(`
      SELECT p.*, h.history_id
      FROM payments p
      JOIN parking_history h ON p.history_id = h.history_id
      WHERE p.payment_id = ? AND p.user_id = ?
    `, [paymentId, userId]);
    
    if (paymentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลรายการชำระเงิน"
      });
    }
    
    const payment = paymentCheck[0];
    const historyId = payment.history_id;
    
    // อัพเดทสถานะการชำระเงิน
    await query(`
      UPDATE payments
      SET status = ?, 
          transaction_ref = ?,
          payment_time = NOW()
      WHERE payment_id = ?
    `, [status, transaction_ref || payment.transaction_ref, paymentId]);
    
    // ถ้าสถานะเป็น completed ให้อัพเดทสถานะการชำระเงินในประวัติการจอดด้วย
    if (status === 'completed') {
      await query(`
        UPDATE parking_history
        SET payment_status = 'completed',
            parking_fee = ?
        WHERE history_id = ?
      `, [payment.amount, historyId]);
    }
    
    return res.status(200).json({
      success: true,
      message: "อัพเดทสถานะการชำระเงินสำเร็จ",
      data: {
        payment_id: paymentId,
        history_id: historyId,
        status,
        transaction_ref: transaction_ref || payment.transaction_ref,
        payment_time: new Date().toLocaleString('th-TH')
      }
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
 * สร้างใบเสร็จรับเงิน
 */
export const generateReceipt = async (req, res) => {
  const userId = req.user.id;
  const { paymentId } = req.params;
  
  try {
    // ดึงข้อมูลรายการชำระเงิน
    const paymentDetails = await query(`
      SELECT p.*, h.entry_time, h.exit_time, h.duration_minutes,
             u.first_name, u.last_name, u.phone_number,
             v.license_plate, v.vehicle_brand, v.vehicle_model, v.vehicle_color,
             a.area_name, b.building_name, b.building_code, l.location_name
      FROM payments p
      JOIN parking_history h ON p.history_id = h.history_id
      JOIN users u ON h.user_id = u.user_id
      JOIN vehicle_registrations v ON h.vehicle_id = v.vehicle_id
      JOIN parking_areas a ON h.area_id = a.area_id
      JOIN buildings b ON a.building_id = b.building_id
      JOIN location l ON b.location_id = l.location_id
      WHERE p.payment_id = ? AND p.user_id = ? AND p.status = 'completed'
    `, [paymentId, userId]);
    
    if (paymentDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลใบเสร็จรับเงิน หรือยังไม่ได้ชำระเงิน"
      });
    }
    
    const payment = paymentDetails[0];
    
    // สร้างข้อมูลใบเสร็จรับเงิน
    const receiptData = {
      receipt_id: `R${payment.payment_id}${Date.now().toString().substring(0, 4)}`,
      payment_id: payment.payment_id,
      transaction_ref: payment.transaction_ref,
      payment_date: payment.payment_time ? new Date(payment.payment_time).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      payment_time: payment.payment_time ? new Date(payment.payment_time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }) : new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      payment_method: payment.payment_method === 'promptpay' ? 'พร้อมเพย์' : 'ทรูมันนี่',
      history_id: payment.history_id,
      
      user_info: {
        name: `${payment.first_name} ${payment.last_name}`,
        phone: payment.phone_number
      },
      
      vehicle_info: {
        license_plate: payment.license_plate,
        brand: payment.vehicle_brand,
        model: payment.vehicle_model,
        color: payment.vehicle_color
      },
      
      parking_info: {
        location: payment.location_name,
        building: payment.building_name,
        area: payment.area_name,
        entry_date: new Date(payment.entry_time).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        entry_time: new Date(payment.entry_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        exit_date: payment.exit_time ? new Date(payment.exit_time).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : '-',
        exit_time: payment.exit_time ? new Date(payment.exit_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        duration: payment.duration_minutes ? `${Math.floor(payment.duration_minutes / 60)} ชั่วโมง ${payment.duration_minutes % 60} นาที` : '-'
      },
      
      payment_info: {
        amount: payment.amount,
        service_fee: payment.service_fee,
        fine_fee: payment.fine_fee || 0,
        discount: payment.discount || 0,
        total_amount: payment.total_amount
      },
      
      timestamp: new Date().toISOString()
    };
    
    return res.status(200).json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการสร้างใบเสร็จรับเงิน",
      error: error.message
    });
  }
};

/**
 * ดึงประวัติการชำระเงินของผู้ใช้
 */
export const getUserPaymentHistory = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const paymentHistory = await query(`
      SELECT p.*, h.entry_time, h.exit_time, h.duration_minutes,
             a.area_name, b.building_name
      FROM payments p
      JOIN parking_history h ON p.history_id = h.history_id
      JOIN parking_areas a ON h.area_id = a.area_id
      JOIN buildings b ON a.building_id = b.building_id
      WHERE p.user_id = ?
      ORDER BY p.payment_time DESC
    `, [userId]);
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    const formattedHistory = paymentHistory.map(payment => {
      return {
        payment_id: payment.payment_id,
        history_id: payment.history_id,
        amount: payment.amount,
        service_fee: payment.service_fee,
        fine_fee: payment.fine_fee || 0,
        discount: payment.discount || 0,
        total_amount: payment.total_amount,
        payment_method: payment.payment_method,
        status: payment.status,
        status_text: payment.status === 'completed' ? 'ชำระแล้ว' : 
                     payment.status === 'pending' ? 'รอชำระ' : 'ล้มเหลว',
        transaction_ref: payment.transaction_ref,
        payment_date: payment.payment_time ? new Date(payment.payment_time).toLocaleDateString('th-TH') : null,
        payment_time: payment.payment_time ? new Date(payment.payment_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }) : null,
        building_name: payment.building_name,
        area_name: payment.area_name,
        entry_time: new Date(payment.entry_time).toLocaleString('th-TH'),
        exit_time: payment.exit_time ? new Date(payment.exit_time).toLocaleString('th-TH') : null,
        duration: payment.duration_minutes ? `${Math.floor(payment.duration_minutes / 60)} ชั่วโมง ${payment.duration_minutes % 60} นาที` : null
      };
    });
    
    return res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory
    });
  } catch (error) {
    console.error("Error getting payment history:", error);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน",
      error: error.message
    });
  }
};
