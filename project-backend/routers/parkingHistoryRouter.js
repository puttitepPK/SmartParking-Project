import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  getUserParkingHistory,
  getParkingHistoryDetail,
  getParkingSummary,
  getActiveParking,
  searchParkingByLicensePlate,
  createEntryAPI,           // เพิ่มฟังก์ชันนี้
  createExitAPI,
  getAllParkingHistoryAPI   // เพิ่มฟังก์ชันนี้
} from "../controllers/parkingHistoryController.js";

const parkingHistoryRouter = Router();
const JWT_SECRET = "secret"; // ใช้ค่าเดียวกับที่ใช้ใน usersRouter.js

// Middleware: ตรวจสอบ JWT token
const jwtTokenMiddleware = (req, res, next) => {
  console.log('Headers:', req.headers);
  const token = req.headers.authorization?.split(" ")[1];
  console.log('Token:', token);

  if (!token) {
    return res.status(403).json({ 
      success: false,
      message: "ไม่พบ Token กรุณาล็อกอินใหม่" 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('ข้อมูล Token ที่ถอดรหัสแล้ว:', decoded); 

    // ตรวจสอบว่ามี ID ผู้ใช้หรือไม่
    if (!decoded.id) {
      console.error('Token ไม่มีข้อมูล ID ผู้ใช้:', decoded);
      return res.status(401).json({
        success: false,
        message: "Token ไม่ถูกต้อง ขาดข้อมูลผู้ใช้"
      });
    }

    // กำหนดข้อมูลผู้ใช้ให้กับ request
    req.user = { 
      id: decoded.id,
      roleId: decoded.role_id 
    };
    
    console.log('ข้อมูลผู้ใช้ที่กำหนดให้กับ request:', req.user);
    
    next();
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ Token:', err);
    return res.status(401).json({ 
      success: false,
      message: "Token ไม่ถูกต้อง กรุณาล็อกอินใหม่",
      error: err.message 
    });
  }
};
/**
 * @swagger
 * tags:
 *   name: Parking History
 *   description: การจัดการข้อมูลประวัติการจอดรถ
 */

/**
 * @swagger
 * /parking/history:
 *   get:
 *     summary: ดึงประวัติการจอดรถของผู้ใช้ พร้อมตัวกรองตามช่วงเวลา
 *     tags: [Parking History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeFilter
 *         schema:
 *           type: string
 *           enum: [today, lastWeek, thisMonth]
 *         description: ตัวกรองตามช่วงเวลา (วันนี้, สัปดาห์ที่ผ่านมา, เดือนนี้)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: หน้าปัจจุบัน (pagination)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: จำนวนรายการต่อหน้า
 *     responses:
 *       200:
 *         description: ดึงประวัติการจอดรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       history_id:
 *                         type: integer
 *                       building_code:
 *                         type: string
 *                       building_name:
 *                         type: string
 *                       area_name:
 *                         type: string
 *                       license_plate:
 *                         type: string
 *                       vehicle_brand:
 *                         type: string
 *                       vehicle_model:
 *                         type: string
 *                       entry_date:
 *                         type: string
 *                       entry_time:
 *                         type: string
 *                       exit_date:
 *                         type: string
 *                       exit_time:
 *                         type: string
 *                       duration:
 *                         type: string
 *                       status_text:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 */
parkingHistoryRouter.get("/history", jwtTokenMiddleware, getUserParkingHistory);

/**
 * @swagger
 * /parking/history/{historyId}:
 *   get:
 *     summary: ดึงรายละเอียดประวัติการจอดรถตาม ID
 *     tags: [Parking History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสประวัติการจอดรถ
 *     responses:
 *       200:
 *         description: ดึงรายละเอียดประวัติการจอดรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     history_id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     user_role:
 *                       type: string
 *                     parking_card_number:
 *                       type: string
 *                     license_plate:
 *                       type: string
 *                     vehicle_brand:
 *                       type: string
 *                     vehicle_model:
 *                       type: string
 *                     vehicle_color:
 *                       type: string
 *                     location_name:
 *                       type: string
 *                     building_code:
 *                       type: string
 *                     building_name:
 *                       type: string
 *                     area_name:
 *                       type: string
 *                     entry_date:
 *                       type: string
 *                     entry_time:
 *                       type: string
 *                     exit_date:
 *                       type: string
 *                     exit_time:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     status_text:
 *                       type: string
 *                     payment_status_text:
 *                       type: string
 *                     parking_fee:
 *                       type: number
 *                     total_amount:
 *                       type: number
 *                     service_fee:
 *                       type: number
 *                     fine_fee:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     transaction_ref:
 *                       type: string
 *       404:
 *         description: ไม่พบข้อมูลประวัติการจอดรถ
 */
parkingHistoryRouter.get("/history/:historyId", jwtTokenMiddleware, getParkingHistoryDetail);

/**
 * @swagger
 * /parking/summary:
 *   get:
 *     summary: ดึงข้อมูลสรุปสถิติประวัติการจอดรถของผู้ใช้
 *     tags: [Parking History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสรุปสถิติสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     totalFee:
 *                       type: number
 *                     thisMonth:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         fee:
 *                           type: number
 *                     topBuildings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           building_name:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     topVehicles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           license_plate:
 *                             type: string
 *                           vehicle_brand:
 *                             type: string
 *                           vehicle_model:
 *                             type: string
 *                           count:
 *                             type: integer
 */
parkingHistoryRouter.get("/summary", jwtTokenMiddleware, getParkingSummary);

/**
 * @swagger
 * /parking/active:
 *   get:
 *     summary: ดึงข้อมูลการจอดรถปัจจุบันที่กำลังใช้งานอยู่
 *     tags: [Parking History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลการจอดรถปัจจุบันสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 hasActiveParking:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     history_id:
 *                       type: integer
 *                     location_name:
 *                       type: string
 *                     building_code:
 *                       type: string
 *                     building_name:
 *                       type: string
 *                     area_name:
 *                       type: string
 *                     license_plate:
 *                       type: string
 *                     vehicle_brand:
 *                       type: string
 *                     vehicle_model:
 *                       type: string
 *                     vehicle_color:
 *                       type: string
 *                     entry_date:
 *                       type: string
 *                     entry_time:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     current_fee:
 *                       type: number
 *                     parking_card_number:
 *                       type: string
 */
parkingHistoryRouter.get("/active", jwtTokenMiddleware, getActiveParking);

/**
 * @swagger
 * /parking/search:
 *   get:
 *     summary: สำหรับผู้ดูแลระบบ (Admin/Member) - ค้นหาประวัติการจอดรถตามทะเบียนรถ
 *     tags: [Parking History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: license_plate
 *         required: true
 *         schema:
 *           type: string
 *         description: ทะเบียนรถที่ต้องการค้นหา
 *     responses:
 *       200:
 *         description: ค้นหาประวัติการจอดรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       history_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       phone_number:
 *                         type: string
 *                       building_code:
 *                         type: string
 *                       building_name:
 *                         type: string
 *                       area_name:
 *                         type: string
 *                       license_plate:
 *                         type: string
 *                       vehicle_brand:
 *                         type: string
 *                       vehicle_model:
 *                         type: string
 *                       entry_date:
 *                         type: string
 *                       entry_time:
 *                         type: string
 *                       exit_date:
 *                         type: string
 *                       exit_time:
 *                         type: string
 *                       duration:
 *                         type: string
 *                       status_text:
 *                         type: string
 *                       payment_status:
 *                         type: string
 *                       payment_status_text:
 *                         type: string
 *                       parking_fee:
 *                         type: number
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึงข้อมูลนี้
 *       400:
 *         description: กรุณาระบุทะเบียนรถที่ต้องการค้นหา
 */
parkingHistoryRouter.get("/search", jwtTokenMiddleware, searchParkingByLicensePlate);

/**
 * Routes เพิ่มเติมสำหรับ frontend ใหม่
 * 
 * POST /parking/entry - บันทึกการเข้าจอดรถ
 * PUT /parking/exit/:historyId - บันทึกการออกจากที่จอดรถ
 * GET /parking/history/all - ดึงประวัติการจอดรถทั้งหมด
 */
parkingHistoryRouter.post("/entry", jwtTokenMiddleware, createEntryAPI);
parkingHistoryRouter.put("/exit/:historyId", jwtTokenMiddleware, createExitAPI);
parkingHistoryRouter.get("/history/all", jwtTokenMiddleware, getAllParkingHistoryAPI);

export default parkingHistoryRouter;