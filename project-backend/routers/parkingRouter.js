import { Router } from "express";
import {
  findParking,
  getBuildings,
  getFloorsByBuilding,
  getParkingPredictions,
  getCurrentParkingStatus,
  updateParkingPredictions,
  runDailyPredictionUpdate
} from "../controllers/parkingController.js";
import jwt from "jsonwebtoken";




const parkingRouter = Router();
const JWT_SECRET = "secret"; // ใช้ค่าเดียวกับที่ใช้ใน usersRouter.js

// Middleware: ตรวจสอบ JWT token
const jwtTokenMiddleware = (req, res, next) => {
  // Extract token
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
 *   name: Parking
 *   description: การจัดการข้อมูลลานจอดรถ
 */

/**
 * @swagger
 * /parking/find:
 *   get:
 *     summary: ค้นหาลานจอดรถตามวันที่และเวลา พร้อมแสดงโอกาสที่จะว่าง
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่ (YYYY-MM-DD)
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: string
 *           format: time
 *         description: เวลา (HH:MM)
 *       - in: query
 *         name: building
 *         schema:
 *           type: string
 *         description: รหัสอาคาร (เช่น A, B, C)
 *     responses:
 *       200:
 *         description: ค้นหาลานจอดรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 date:
 *                   type: string
 *                   format: date
 *                 time:
 *                   type: string
 *                   format: time
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       building:
 *                         type: string
 *                       building_name:
 *                         type: string
 *                       floor:
 *                         type: string
 *                       time:
 *                         type: string
 *                       slots:
 *                         type: string
 *                         example: "25/100"
 *                       availability_chance:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: string
 *                       parking_status:
 *                         type: string
 *                       location_name:
 *                         type: string
 */
parkingRouter.get("/find", jwtTokenMiddleware, findParking);

/**
 * @swagger
 * /parking/buildings:
 *   get:
 *     summary: ดึงข้อมูลอาคารทั้งหมด
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลอาคารสำเร็จ
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
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       description:
 *                         type: string
 *                       location_id:
 *                         type: integer
 */
parkingRouter.get("/buildings", jwtTokenMiddleware, getBuildings);

/**
 * @swagger
 * /parking/buildings/{building}/floors:
 *   get:
 *     summary: ดึงข้อมูลลานจอดรถตามอาคาร
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: building
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสอาคาร (เช่น A, B, C)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลลานจอดรถสำเร็จ
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
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       total_spaces:
 *                         type: integer
 *                       available_spaces:
 *                         type: integer
 *                       hourly_rate:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: string
 *                       time:
 *                         type: string
 *                       availability:
 *                         type: string
 *                       availability_percentage:
 *                         type: integer
 */
parkingRouter.get("/buildings/:building/floors", jwtTokenMiddleware, getFloorsByBuilding);

/**
 * @swagger
 * /parking/predictions:
 *   get:
 *     summary: แสดงการคาดการณ์การจอดรถ
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: building_code
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสอาคาร (เช่น A, B, C)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลการคาดการณ์สำเร็จ
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
 */
parkingRouter.get("/predictions", jwtTokenMiddleware, getParkingPredictions);

/**
 * @swagger
 * /parking/status:
 *   get:
 *     summary: แสดงสถานะการจอดรถปัจจุบัน
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสถานะการจอดรถปัจจุบันสำเร็จ
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
 */
parkingRouter.get("/status", jwtTokenMiddleware, getCurrentParkingStatus);


/**
 * @swagger
 * /parking/update-predictions:
 *   post:
 *     summary: อัพเดทการคาดการณ์ที่จอดรถอัตโนมัติ
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: อัพเดทการคาดการณ์สำเร็จ
 */
parkingRouter.post("/update-predictions", jwtTokenMiddleware, runDailyPredictionUpdate);

export default parkingRouter;