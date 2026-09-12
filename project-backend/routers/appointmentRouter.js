import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  searchVisitors,
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableParkingAreas,
  simulateScanQRCode
} from "../controllers/appointmentController.js";

const appointmentRouter = Router();
const JWT_SECRET = "secret"; // ใช้ค่าเดียวกับ router อื่นๆ



// Middleware: ตรวจสอบ JWT token
const jwtTokenMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }

    const userId = payload.id;
    req.user = { id: userId, roleId: payload.role_id };
    next();
  });
};

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: การจัดการการนัดหมายจอดรถ
 */

/**
 * @swagger
 * /appointments/visitors/search:
 *   get:
 *     summary: ค้นหาผู้เข้าพบ (Visitor) สำหรับสร้างการนัดหมาย
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: คำค้นหา (ชื่อผู้ใช้, เบอร์โทร, ชื่อ-นามสกุล)
 *     responses:
 *       200:
 *         description: ค้นหาผู้เข้าพบสำเร็จ
 */
appointmentRouter.get("/visitors/search", jwtTokenMiddleware, searchVisitors);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: สร้างการนัดหมายจอดรถใหม่
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_time:
 *                 type: string
 *                 format: time
 *               visitor_id:
 *                 type: integer
 *               visitor_name:
 *                 type: string
 *               visitor_phone:
 *                 type: string
 *               area_id:
 *                 type: integer
 *               reason:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: สร้างการนัดหมายสำเร็จ
 */
appointmentRouter.post("/", jwtTokenMiddleware, createAppointment);

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: ดึงข้อมูลการนัดหมายของผู้ใช้ปัจจุบัน
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: กรองตามสถานะการนัดหมาย
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: กรองตามวันที่นัดหมาย (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลการนัดหมายสำเร็จ
 */
appointmentRouter.get("/", jwtTokenMiddleware, getUserAppointments);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: ดึงรายละเอียดการนัดหมายตาม ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     responses:
 *       200:
 *         description: ดึงรายละเอียดการนัดหมายสำเร็จ
 */
appointmentRouter.get("/:appointmentId", jwtTokenMiddleware, getAppointmentById);

/**
 * @swagger
 * /appointments/{id}/status:
 *   put:
 *     summary: อัพเดทสถานะการนัดหมาย (Member สามารถอัพเดทได้ทุกสถานะ, Visitor สามารถอัพเดทเป็น completed เท่านั้น)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, completed, cancelled]
 *                 description: Member สามารถใช้ได้ทุกสถานะ, Visitor สามารถใช้ได้เฉพาะ completed
 *     responses:
 *       200:
 *         description: อัพเดทสถานะการนัดหมายสำเร็จ
 *       403:
 *         description: ไม่มีสิทธิ์ในการอัพเดทสถานะนี้
 */
appointmentRouter.put("/:appointmentId/status", jwtTokenMiddleware, updateAppointmentStatus);

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   put:
 *     summary: ยกเลิกการนัดหมาย
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     responses:
 *       200:
 *         description: ยกเลิกการนัดหมายสำเร็จ
 */
appointmentRouter.put("/:appointmentId/cancel", jwtTokenMiddleware, cancelAppointment);

/**
 * @swagger
 * /appointments/areas/available:
 *   get:
 *     summary: ดึงข้อมูลพื้นที่จอดรถที่สามารถนัดหมายได้
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลพื้นที่จอดรถสำเร็จ
 */
appointmentRouter.get("/areas/available", jwtTokenMiddleware, getAvailableParkingAreas);


/**
 * @swagger
 * /appointments/{id}/simulate-scan:
 *   put:
 *     summary: จำลองการสแกน QR Code (ใช้ได้ทั้ง Member และ Visitor)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     responses:
 *       200:
 *         description: สแกน QR Code สำเร็จ
 *       404:
 *         description: ไม่พบข้อมูลการนัดหมายหรือไม่มีสิทธิ์เข้าถึง
 */
appointmentRouter.put("/:appointmentId/simulate-scan", jwtTokenMiddleware, simulateScanQRCode);

export default appointmentRouter;