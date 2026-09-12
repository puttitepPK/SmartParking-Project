// appointmentAutomationRouter.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  createParkingHistoryFromAppointment,
  checkMissedAppointments,
  updateParkingArrival,
  updatePaymentStatus,
  completeParkingSession
} from "../controllers/appointmentAutomationController.js";

const appointmentAutomationRouter = Router();
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
 *   name: Appointment Automation
 *   description: จัดการการอัพเดทอัตโนมัติหลังจากการนัดหมาย
 */

/**
 * @swagger
 * /automation/appointments/{appointmentId}/history:
 *   post:
 *     summary: สร้างประวัติการจอดรถจากการนัดหมายที่ยืนยันแล้ว
 *     tags: [Appointment Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     responses:
 *       201:
 *         description: สร้างประวัติการจอดรถสำเร็จ
 *       404:
 *         description: ไม่พบข้อมูลการนัดหมายที่ยืนยันแล้ว
 *       409:
 *         description: มีประวัติการจอดรถสำหรับการนัดหมายนี้แล้ว
 */
appointmentAutomationRouter.post(
  "/appointments/:appointmentId/history",
  jwtTokenMiddleware,
  createParkingHistoryFromAppointment
);

/**
 * @swagger
 * /automation/appointments/missed:
 *   get:
 *     summary: ตรวจสอบการนัดหมายที่เลยเวลาและไม่มาตามนัด
 *     tags: [Appointment Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ตรวจสอบและจัดการการนัดหมายที่เลยเวลาสำเร็จ
 */
appointmentAutomationRouter.get(
  "/appointments/missed",
  jwtTokenMiddleware,
  checkMissedAppointments
);

/**
 * @swagger
 * /automation/appointments/{appointmentId}/arrival:
 *   put:
 *     summary: อัพเดทสถานะประวัติการจอดเมื่อผู้ใช้มาถึง
 *     tags: [Appointment Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
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
 *               license_plate:
 *                 type: string
 *                 description: ทะเบียนรถ
 *               vehicle_brand:
 *                 type: string
 *                 description: ยี่ห้อรถ
 *               vehicle_model:
 *                 type: string
 *                 description: รุ่นรถ
 *               vehicle_color:
 *                 type: string
 *                 description: สีรถ
 *     responses:
 *       200:
 *         description: อัพเดทสถานะการจอดเป็น 'กำลังจอด' เรียบร้อยแล้ว
 *       404:
 *         description: ไม่พบประวัติการจอดรถที่รอเข้าจอดสำหรับการนัดหมายนี้
 */
appointmentAutomationRouter.put(
  "/appointments/:appointmentId/arrival",
  jwtTokenMiddleware,
  updateParkingArrival
);

/**
 * @swagger
 * /automation/history/{historyId}/payment:
 *   put:
 *     summary: อัพเดทสถานะการชำระเงิน
 *     tags: [Appointment Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสประวัติการจอด
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, completed]
 *                 description: สถานะการชำระเงิน
 *               payment_method:
 *                 type: string
 *                 description: วิธีการชำระเงิน
 *               amount:
 *                 type: number
 *                 description: จำนวนเงิน
 *     responses:
 *       200:
 *         description: อัพเดทสถานะการชำระเงินเรียบร้อยแล้ว
 */
appointmentAutomationRouter.put(
  "/history/:historyId/payment",
  jwtTokenMiddleware,
  updatePaymentStatus
);

/**
 * @swagger
 * /automation/appointments/{appointmentId}/complete:
 *   put:
 *     summary: อัพเดทสถานะประวัติการจอดเมื่อเสร็จสิ้น (จำลองการสแกน)
 *     tags: [Appointment Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสการนัดหมาย
 *     responses:
 *       200:
 *         description: สิ้นสุดการจอดเรียบร้อยแล้ว
 *       400:
 *         description: กรุณาชำระเงินก่อนสิ้นสุดการจอด
 *       404:
 *         description: ไม่พบประวัติการจอดรถที่กำลังจอดอยู่สำหรับการนัดหมายนี้
 */
appointmentAutomationRouter.put(
  "/appointments/:appointmentId/complete",
  jwtTokenMiddleware,
  completeParkingSession
);

export default appointmentAutomationRouter;