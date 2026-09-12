import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  createPayment,
  getPaymentDetails,
  updatePaymentStatus,
  generateReceipt,
  getUserPaymentHistory
} from "../controllers/paymentController.js";

const paymentRouter = Router();
const JWT_SECRET = "secret"; // ใช้ค่าเดียวกับ router อื่นๆ

// Middleware: ตรวจสอบ JWT token
const jwtTokenMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ 
      success: false,
      message: "Token is required" 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({
        success: false, 
        message: "Unauthorized: Invalid or expired token"
      });
    }

    const userId = payload.id;
    req.user = { id: userId, roleId: payload.role_id };
    
    // ตรวจสอบว่าเป็น Visitor หรือไม่ (role_id = 2)
    if (req.user.roleId !== 2) {
      return res.status(403).json({
        success: false,
        message: "เฉพาะ Visitor เท่านั้นที่สามารถชำระเงินได้"
      });
    }
    
    next();
  });
};

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: การจัดการระบบชำระเงิน
 */

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: สร้างรายการชำระเงิน
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               history_id:
 *                 type: integer
 *                 description: ID ของประวัติการจอดรถ
 *               payment_method:
 *                 type: string
 *                 enum: [promptpay, truemoney]
 *                 description: วิธีการชำระเงิน
 *     responses:
 *       201:
 *         description: สร้างรายการชำระเงินสำเร็จ
 */
paymentRouter.post("/create", jwtTokenMiddleware, createPayment);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: ดึงรายละเอียดของรายการชำระเงิน
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ของรายการชำระเงิน
 *     responses:
 *       200:
 *         description: ดึงรายละเอียดรายการชำระเงินสำเร็จ
 */
paymentRouter.get("/:paymentId", jwtTokenMiddleware, getPaymentDetails);

/**
 * @swagger
 * /payments/{id}/status:
 *   put:
 *     summary: อัพเดทสถานะการชำระเงิน
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ของรายการชำระเงิน
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 description: สถานะการชำระเงิน
 *               transaction_ref:
 *                 type: string
 *                 description: รหัสอ้างอิงการทำรายการ
 *     responses:
 *       200:
 *         description: อัพเดทสถานะการชำระเงินสำเร็จ
 */
paymentRouter.put("/:paymentId/status", jwtTokenMiddleware, updatePaymentStatus);

/**
 * @swagger
 * /payments/{id}/receipt:
 *   get:
 *     summary: ดึงข้อมูลใบเสร็จรับเงิน
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ของรายการชำระเงิน
 *     responses:
 *       200:
 *         description: ดึงข้อมูลใบเสร็จรับเงินสำเร็จ
 */
paymentRouter.get("/:paymentId/receipt", jwtTokenMiddleware, generateReceipt);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: ดึงประวัติการชำระเงินของผู้ใช้
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงประวัติการชำระเงินสำเร็จ
 */
paymentRouter.get("/history", jwtTokenMiddleware, getUserPaymentHistory);

export default paymentRouter;