import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  addNewUser,
  getUserByUsername,
  getUserByPhoneNumber,
  getUserWithRoleById,
  getAllUsers,
  addMemberUser, 
  getUserDetailById,
  updateUserProfile,
  updateUserPasswordById,
  // เพิ่ม import สำหรับฟังก์ชันทะเบียนรถ
  getUserVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  updateUserProfilePicture, 
  getUserProfilePicture,
  deleteUserProfilePicture,
    // เพิ่ม import สำหรับฟังก์ชันรูปภาพยานพาหนะ
  updateVehicleImage,
  getVehicleImage,
  deleteVehicleImage
} from "../controllers/userController.js";

const usersRouter = Router();
const JWT_SECRET = "secret";

/**
 * Middleware: Extract Bearer Token and convert to user ID
 */
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
    console.log("Verified User ID:", userId);

    req.user = { id: userId, roleId: payload.role_id };

    next(); // Move to the next middleware or route handler
  });
};

/**
 * @swagger 
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:  
 *                 type: string
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string 
 *               phone_number:
 *                 type: string
 *               role_id:
 *                 type: integer
 *             example:
 *               username: "user123"
 *               password: "password123"
 *               confirm_password: "password123"
 *               first_name: "John"
 *               last_name: "Doe"
 *               phone_number: "1234567890"
 *               role_id: 2
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 role_id:
 *                   type: integer  
 * @route   POST /users/register
 * @desc    Register a new user
 */
usersRouter.post("/register", async (req, res) => {
  const { 
    username, 
    password,
    confirm_password, // Add password confirmation field
    first_name, 
    last_name, 
    phone_number, 
    role_id = 2 // Default to visitor role (role_id=2)
  } = req.body;

  try {
    // Validate password confirmation
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    
    // Check if username already exists
    const existingUser = await getUserByUsername({ username });
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }
    
    // Check if phone number already exists
    if (phone_number) {
      const existingPhone = await getUserByPhoneNumber({ phone_number });
      if (existingPhone.length > 0) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }
    
    // ใช้ SHA-256 แทน bcrypt เพื่อให้เหมือนกับ login
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    const newUser = await addNewUser({
      username,
      password: hashedPassword,
      first_name,
      last_name,
      phone_number,
      role_id,
    });

    if (!newUser) {
      return res.status(400).json({ message: "Registration failed" });
    }

    return res.status(200).json({
      id: newUser.id,
      username: newUser.username,
      role_id: newUser.role_id,
    });
  } catch (error) {
    console.error(" Database Error:", error);
    return res
      .status(500)
      .json({ message: "Database error", error: error.message });
  }
});

/**
 * @swagger 
 * /users/add-member:
 *   post:
 *     summary: เพิ่มผู้ใช้สมาชิกใหม่ (เฉพาะผู้ดูแลระบบหรือ Member)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: เพิ่มผู้ใช้สมาชิกสําเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 * 
 * @route   POST /users/add-member
 * @desc    เพิ่มผู้ใช้สมาชิกใหม่ (เฉพาะผู้ดูแลระบบ)
 * @access  ส่วนตัว (เฉพาะผู้ดูแลระบบ/สมาชิก)
 */
usersRouter.post("/add-member", jwtTokenMiddleware, async (req, res) => {
  try {
    // เฉพาะผู้ดูแลระบบหรือสมาชิกที่มีสิทธิ์ (role_id = 1)
    if (req.user.roleId !== 1) {
      return res.status(403).json({ 
        message: "Access denied. Only members can add new members." 
      });
    }

    const { 
      username, 
      password,
      confirm_password,
      first_name, 
      last_name, 
      phone_number
    } = req.body;

    // ตรวจสอบช่องที่ต้องกรอก
    if (!username || !password || !confirm_password || !first_name || !last_name || !phone_number) {
      return res.status(400).json({ 
        message: "All fields are required" 
      });
    }

    // ตรวจสอบการยืนยันรหัสผ่าน
    if (password !== confirm_password) {
      return res.status(400).json({ 
        message: "Passwords do not match" 
      });
    }
    
    // ตรวจสอบว่าชื่อผู้ใช้มีอยู่แล้วหรือไม่
    const existingUser = await getUserByUsername({ username });
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }
    
    // ตรวจสอบว่าหมายเลขโทรศัพท์มีอยู่แล้วหรือไม่
    const existingPhone = await getUserByPhoneNumber({ phone_number });
    if (existingPhone.length > 0) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    // สร้างสมาชิกใหม่โดยตรงด้วย role_id = 1
    // ใช้ฟังก์ชัน addMemberUser ที่เราจะสร้างใน userController.js
    const newMember = await addMemberUser({
      username,
      password,
      first_name,
      last_name,
      phone_number
    });

    if (!newMember) {
      return res.status(400).json({ message: "Failed to add member" });
    }

    return res.status(201).json({
      message: "Member added successfully",
      id: newMember.id,
      username: newMember.username,
      role_id: newMember.role_id
    });
  } catch (error) {
    console.error("Add Member Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   POST /users/login
 * @desc    Authenticate user & get token
 * @swagger
 * /users/login:
 *   post:
 *     summary: Authenticate user & get token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login_id:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
usersRouter.post("/login", async (req, res) => {
  const { login_id, password } = req.body;  // เปลี่ยนจาก username เป็น login_id เพื่อรองรับทั้ง username และเบอร์โทรศัพท์

  if (!login_id || !password) {
    return res.status(400).json({ message: "Login ID and password are required" });
  }

  try {
    // ตรวจสอบว่า login_id เป็น username หรือเบอร์โทรศัพท์
    let result;
    
    // ถ้า login_id เป็นตัวเลข (มีโอกาสเป็นเบอร์โทรศัพท์)
    if (/^\d+$/.test(login_id)) {
      // ค้นหาผู้ใช้จากเบอร์โทรศัพท์
      result = await getUserByPhoneNumber({ phone_number: login_id });
      
      // ถ้าไม่พบผู้ใช้จากเบอร์โทร ให้ลองค้นหาจาก username อีกครั้ง (กรณีที่ username เป็นตัวเลขล้วน)
      if (result.length === 0) {
        result = await getUserByUsername({ username: login_id });
      }
    } else {
      // กรณีที่ login_id ไม่ได้เป็นตัวเลขล้วน ให้ค้นหาจาก username
      result = await getUserByUsername({ username: login_id });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result[0];
    
    // สร้าง hash SHA2 ของรหัสผ่านที่ผู้ใช้กรอกเพื่อเปรียบเทียบกับที่เก็บในฐานข้อมูล
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // เปรียบเทียบ hash SHA2
    const matched = (hashedPassword === user.password);
    
    if (!matched) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id, role_id: user.role_id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      phone_number: user.phone_number,
      token,
    });
  } catch (error) {
    console.error(" Login Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   GET /users/me
 * @desc    Get current user information
 * @swagger
 * /users/me:
 *   get:
 *     summary: แสดงข้อมูลผู้ใช้ปัจจุบันในหน้า Home
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 phone_number:
 *                   type: string
 *                 role:
 *                   type: string
 */
usersRouter.get("/me", jwtTokenMiddleware, async (req, res) => {
  try {
    // Import the query function from userController
    // Use the getUserDetailById function instead of direct SQL query
    const userDetails = await getUserDetailById(req.user.id);
    
    if (userDetails.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // ส่งข้อมูลกลับไปให้ frontend
    return res.status(200).json({
      username: userDetails[0].username,
      first_name: userDetails[0].first_name,
      last_name: userDetails[0].last_name,
      phone_number: userDetails[0].phone_number,
      role: userDetails[0].role_name
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /users/verify
 * @desc    Verify user token (POST)
 * @swagger
 * /users/verify:
 *   post:
 *     summary: ตรวจสอบ token ของผู้ใช้ ว่า Role ไหน ID ยืนยันว่ามีตัวตน
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 roleId:
 *                   type: number
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง (token ไม่ถูกต้องหรือหมดอายุ)
 *       403:
 *         description: ไม่มี token ในการเข้าถึงข้อมูล
 */
usersRouter.post("/verify", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token is required" });       //ต้อง login เพื่อรับ token ก่อน
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(200).json({
      message: "User verified",
      userId: decoded.id,
      roleId: decoded.role_id,
    });
  });
});

/**
 * @route   GET /users/verify
 * @desc    Verify user token (GET)
 * @swagger
 * /users/verify:
 *   get:
 *     summary: ตรวจสอบ token ของผู้ใช้ ว่า Role ไหน ID ยืนยันว่ามีตัวตน
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง (token ไม่ถูกต้องหรือหมดอายุ)
 *       403:
 *         description: ไม่มี token ในการเข้าถึงข้อมูล
 *       404:
 *         description: ไม่พบข้อมูลผู้ใช้
 */
usersRouter.get("/verify", jwtTokenMiddleware, async (req, res) => {
  try {
    console.log("User ID:", req.user.id);

    // ✅ ดึงข้อมูล User จากฐานข้อมูล โดยใช้ ID จริง
    const result = await getUserWithRoleById(req.user.id);

    // ✅ ตรวจสอบว่ามีข้อมูล User หรือไม่
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result[0];

    // ✅ แสดง Role ที่ถูกต้องจากฐานข้อมูล
    return res.status(200).json({
      message: "User verified",
      role: user.roleName, // ใช้ roleName ตามที่ query มา (member/visitor)
    });
  } catch (error) {
    console.error(" Database Error:", error);
    return res.status(409).json({ message: "Conflict" });
  }
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: กรุณาใส่ token JWT โดยไม่ต้องใส่คำว่า "Bearer " (ระบบจะเติมให้อัตโนมัติ)
 */

/**
 * @swagger
* /users/list:
 *   get:
 *     summary: ดูรายชื่อผู้ใช้ทั้งหมด (เฉพาะ member เท่านั้น)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: รายชื่อผู้ใช้ทั้งหมด
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   phone_number:
 *                     type: string
 *                   role_name:
 *                     type: string
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง (token ไม่ถูกต้องหรือหมดอายุ)
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึงข้อมูล (เฉพาะ member เท่านั้น)
 * 
 * @route   GET /users/list
 * @desc    Get user list based on role permissions
 */
usersRouter.get("/list", jwtTokenMiddleware, async (req, res) => {       //ต้อง login เพื่อรับ token ก่อนถึงจะดู list ได้
  try {
    const { roleId } = req.user;

    // ปรับเงื่อนไขการเข้าถึงให้เข้ากับระบบ role ของ parking_system1
    // ในที่นี้ member (role_id=1) สามารถดูข้อมูลผู้ใช้ทั้งหมดได้
    // visitor (role_id=2) ไม่มีสิทธิ์ดูข้อมูลผู้ใช้อื่น
    if (roleId !== 1) {
      return res.status(403).json({ message: "Access denied" });   // ไม่ใช่ member ไม่มีสิทธิ์
    }

    const users = await getAllUsers(roleId);

    return res.status(200).json(users);
  } catch (error) {
    console.error(" Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * @route   PUT /users/profile
 * @desc    อัพเดทข้อมูลโปรไฟล์ผู้ใช้
 * @swagger
 * /users/profile:
 *   put:
 *     summary: อัพเดทข้อมูลโปรไฟล์ผู้ใช้
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: ชื่อผู้ใช้ใหม่
 *               first_name:
 *                 type: string
 *                 description: ชื่อจริงใหม่
 *               last_name:
 *                 type: string
 *                 description: นามสกุลใหม่
 *               phone_number:
 *                 type: string
 *                 description: เบอร์โทรศัพท์ใหม่
 *             required:
 *               - username
 *               - first_name
 *               - last_name
 *               - phone_number
 *     responses:
 *       200:
 *         description: อัพเดทข้อมูลโปรไฟล์สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.put("/profile", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, first_name, last_name, phone_number } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
    if (!username || !first_name || !last_name || !phone_number) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    
    // ตรวจสอบรูปแบบเบอร์โทรศัพท์
    const phoneRegex = /^[0-9]{9,10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ message: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" });
    }
    
    // เรียกใช้ฟังก์ชันอัพเดทโปรไฟล์
    const result = await updateUserProfile(userId, {
      username,
      first_name,
      last_name,
      phone_number
    });
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   PUT /users/password
 * @desc    เปลี่ยนรหัสผ่านผู้ใช้
 * @swagger
 * /users/password:
 *   put:
 *     summary: เปลี่ยนรหัสผ่านผู้ใช้
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: รหัสผ่านปัจจุบัน
 *               new_password:
 *                 type: string
 *                 description: รหัสผ่านใหม่
 *               confirm_password:
 *                 type: string
 *                 description: ยืนยันรหัสผ่านใหม่
 *             required:
 *               - current_password
 *               - new_password
 *               - confirm_password
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.put("/password", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    
    // ตรวจสอบว่ารหัสผ่านใหม่และยืนยันรหัสผ่านตรงกันหรือไม่
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน" });
    }
    
    // ตรวจสอบความยาวรหัสผ่าน
    if (new_password.length < 6) {
      return res.status(400).json({ message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
    }
    
    // เรียกใช้ฟังก์ชันเปลี่ยนรหัสผ่าน
    const result = await updateUserPasswordById(userId, {
      current_password,
      new_password
    });
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   GET /users/vehicles
 * @desc    ดึงข้อมูลทะเบียนรถทั้งหมดของผู้ใช้
 * @swagger
 * /users/vehicles:
 *   get:
 *     summary: ดึงข้อมูลทะเบียนรถทั้งหมดของผู้ใช้
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลทะเบียนรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   vehicle_id:
 *                     type: integer
 *                   license_plate:
 *                     type: string
 *                   vehicle_type:
 *                     type: string
 *                   vehicle_brand:
 *                     type: string
 *                   vehicle_model:
 *                     type: string
 *                   vehicle_color:
 *                     type: string
 *                   is_primary:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.get("/vehicles", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vehicles = await getUserVehicles(userId);
    
    return res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   GET /users/vehicles/:id
 * @desc    ดึงข้อมูลทะเบียนรถตาม ID
 * @swagger
 * /users/vehicles/{id}:
 *   get:
 *     summary: ดึงข้อมูลทะเบียนรถตาม ID
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
 *     responses:
 *       200:
 *         description: ดึงข้อมูลทะเบียนรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle_id:
 *                   type: integer
 *                 license_plate:
 *                   type: string
 *                 vehicle_type:
 *                   type: string
 *                 vehicle_brand:
 *                   type: string
 *                 vehicle_model:
 *                   type: string
 *                 vehicle_color:
 *                   type: string
 *                 is_primary:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       404:
 *         description: ไม่พบข้อมูลทะเบียนรถ
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.get("/vehicles/:id", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    
    const vehicles = await getVehicleById(vehicleId, userId);
    
    if (vehicles.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลทะเบียนรถ" });
    }
    
    return res.status(200).json(vehicles[0]);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   POST /users/vehicles
 * @desc    เพิ่มทะเบียนรถใหม่
 * @swagger
 * /users/vehicles:
 *   post:
 *     summary: เพิ่มทะเบียนรถใหม่
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
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
 *               vehicle_type:
 *                 type: string
 *                 description: ประเภทรถ
 *               vehicle_brand:
 *                 type: string
 *                 description: ยี่ห้อรถ
 *               vehicle_model:
 *                 type: string
 *                 description: รุ่นรถ
 *               vehicle_color:
 *                 type: string
 *                 description: สีรถ
 *               is_primary:
 *                 type: boolean
 *                 description: เป็นรถคันหลักหรือไม่
 *             required:
 *               - license_plate
 *     responses:
 *       201:
 *         description: เพิ่มทะเบียนรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 vehicleId:
 *                   type: integer
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.post("/vehicles", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { license_plate, vehicle_type, vehicle_brand, vehicle_model, vehicle_color, is_primary } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
    if (!license_plate) {
      return res.status(400).json({ message: "กรุณาระบุทะเบียนรถ" });
    }
    
    // เรียกใช้ฟังก์ชันเพิ่มทะเบียนรถ
    const result = await addVehicle(userId, {
      license_plate,
      vehicle_type,
      vehicle_brand,
      vehicle_model,
      vehicle_color,
      is_primary: is_primary || false
    });
    
    if (result.success) {
      return res.status(201).json({ 
        message: result.message,
        vehicleId: result.vehicleId 
      });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error adding vehicle:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   PUT /users/vehicles/:id
 * @desc    แก้ไขข้อมูลทะเบียนรถ
 * @swagger
 * /users/vehicles/{id}:
 *   put:
 *     summary: แก้ไขข้อมูลทะเบียนรถ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
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
 *               vehicle_type:
 *                 type: string
 *                 description: ประเภทรถ
 *               vehicle_brand:
 *                 type: string
 *                 description: ยี่ห้อรถ
 *               vehicle_model:
 *                 type: string
 *                 description: รุ่นรถ
 *               vehicle_color:
 *                 type: string
 *                 description: สีรถ
 *               is_primary:
 *                 type: boolean
 *                 description: เป็นรถคันหลักหรือไม่
 *             required:
 *               - license_plate
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูลทะเบียนรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       404:
 *         description: ไม่พบข้อมูลทะเบียนรถ
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.put("/vehicles/:id", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { license_plate, vehicle_type, vehicle_brand, vehicle_model, vehicle_color, is_primary } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
    if (!license_plate) {
      return res.status(400).json({ message: "กรุณาระบุทะเบียนรถ" });
    }
    
    // เรียกใช้ฟังก์ชันแก้ไขทะเบียนรถ
    const result = await updateVehicle(vehicleId, userId, {
      license_plate,
      vehicle_type,
      vehicle_brand,
      vehicle_model,
      vehicle_color,
      is_primary: is_primary || false
    });
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});

/**
 * @route   DELETE /users/vehicles/:id
 * @desc    ลบทะเบียนรถ
 * @swagger
 * /users/vehicles/{id}:
 *   delete:
 *     summary: ลบทะเบียนรถ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
 *     responses:
 *       200:
 *         description: ลบทะเบียนรถสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ไม่สามารถลบทะเบียนรถได้
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       404:
 *         description: ไม่พบข้อมูลทะเบียนรถ
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.delete("/vehicles/:id", jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    
    // เรียกใช้ฟังก์ชันลบทะเบียนรถ
    const result = await deleteVehicle(vehicleId, userId);
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์", error: error.message });
  }
});


// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads/profile_pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with userId and timestamp
    const userId = req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `user_${userId}_${Date.now()}${fileExtension}`;
    cb(null, fileName);
  }
});

// Define file filter to accept only images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('โปรดอัพโหลดไฟล์รูปภาพเท่านั้น'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit to 5MB
  },
  fileFilter: fileFilter
});

// ---- Edit Profile picture ----

/**
 * @route   POST /users/profile-picture
 * @desc    Upload user profile picture
 * @swagger
 * /users/profile-picture:
 *   post:
 *     summary: อัพโหลดรูปโปรไฟล์
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_picture:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์รูปโปรไฟล์
 *     responses:
 *       200:
 *         description: อัพโหลดรูปโปรไฟล์สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file_path:
 *                   type: string
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.post('/profile-picture', jwtTokenMiddleware, upload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัพโหลดไฟล์รูปภาพ' });
    }
    
    const userId = req.user.id;
    const fileName = req.file.filename;
    
    // Update the user's profile picture in the database
    const result = await updateUserProfilePicture(userId, fileName);
    
    if (result.success) {
      return res.status(200).json({ 
        message: result.message,
        file_path: `/uploads/profile_pictures/${fileName}`
      });
    } else {
      // If update failed, delete the uploaded file
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    // If error occurred, delete the uploaded file if it exists
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ', error: error.message });
  }
});

/**
 * @route   GET /users/profile-picture
 * @desc    Get user profile picture
 * @swagger
 * /users/profile-picture:
 *   get:
 *     summary: ดึงข้อมูลรูปโปรไฟล์
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรูปโปรไฟล์สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile_picture:
 *                   type: string
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       404:
 *         description: ไม่พบรูปโปรไฟล์
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.get('/profile-picture', jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await getUserProfilePicture(userId);
    
    if (result.success && result.profile_picture) {
      return res.status(200).json({ 
        profile_picture: `/uploads/profile_pictures/${result.profile_picture}` 
      });
    } else {
      return res.status(404).json({ message: 'ไม่พบรูปโปรไฟล์' });
    }
  } catch (error) {
    console.error('Error getting profile picture:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรูปโปรไฟล์', error: error.message });
  }
});

/**
 * @route   DELETE /users/profile-picture
 * @desc    Delete user profile picture
 * @swagger
 * /users/profile-picture:
 *   delete:
 *     summary: ลบรูปโปรไฟล์
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ลบรูปโปรไฟล์สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: ไม่ได้รับอนุญาตให้เข้าถึง
 *       404:
 *         description: ไม่พบรูปโปรไฟล์
 *       500:
 *         description: เกิดข้อผิดพลาดบนเซิร์ฟเวอร์
 */
usersRouter.delete('/profile-picture', jwtTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await deleteUserProfilePicture(userId);
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรูปโปรไฟล์', error: error.message });
  }
});

// เพิ่มหลังจากการกำหนดค่า multer สำหรับรูปโปรไฟล์

// กำหนดค่า multer สำหรับการอัปโหลดรูปภาพรถ
const vehicleUploadDir = path.join(__dirname, '../uploads/vehicle_images');
if (!fs.existsSync(vehicleUploadDir)) {
  fs.mkdirSync(vehicleUploadDir, { recursive: true });
}

// กำหนดค่าที่เก็บไฟล์สำหรับรูปภาพรถ
const vehicleStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vehicleUploadDir);
  },
  filename: function (req, file, cb) {
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกันด้วย vehicleId และ timestamp
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `vehicle_${vehicleId}_user_${userId}_${Date.now()}${fileExtension}`;
    cb(null, fileName);
  }
});

// กำหนด filter เพื่อรับเฉพาะไฟล์รูปภาพ
const vehicleFileFilter = (req, file, cb) => {
  // รับเฉพาะไฟล์รูปภาพเท่านั้น
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('โปรดอัพโหลดไฟล์รูปภาพเท่านั้น'), false);
  }
};

const uploadVehicleImage = multer({ 
  storage: vehicleStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // จำกัดขนาด 5MB
  },
  fileFilter: vehicleFileFilter
});

// เพิ่ม Routes สำหรับจัดการรูปภาพรถ

/**
 * @swagger
 * /users/vehicles/{id}/image:
 *   post:
 *     summary: อัปโหลดรูปภาพยานพาหนะ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_image:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์รูปภาพยานพาหนะ
 *     responses:
 *       200:
 *         description: อัปโหลดรูปภาพยานพาหนะสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file_path:
 *                   type: string
 */
usersRouter.post('/vehicles/:id/image', jwtTokenMiddleware, uploadVehicleImage.single('vehicle_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์รูปภาพ' });
    }
    
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const fileName = req.file.filename;
    
    // อัปเดตรูปภาพยานพาหนะในฐานข้อมูล
    const result = await updateVehicleImage(vehicleId, userId, fileName);
    
    if (result.success) {
      return res.status(200).json({ 
        message: result.message,
        file_path: `/uploads/vehicle_images/${fileName}`
      });
    } else {
      // หากอัปเดตไม่สำเร็จ ให้ลบไฟล์ที่อัปโหลด
      const filePath = path.join(vehicleUploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error uploading vehicle image:', error);
    // หากเกิดข้อผิดพลาด ให้ลบไฟล์ที่อัปโหลด (หากมี)
    if (req.file) {
      const filePath = path.join(vehicleUploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', error: error.message });
  }
});

/**
 * @swagger
 * /users/vehicles/{id}/image:
 *   get:
 *     summary: ดึงข้อมูลรูปภาพยานพาหนะ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรูปภาพยานพาหนะสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle_image:
 *                   type: string
 */
usersRouter.get('/vehicles/:id/image', jwtTokenMiddleware, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    
    const result = await getVehicleImage(vehicleId, userId);
    
    if (result.success && result.image_url) {
      return res.status(200).json({ 
        vehicle_image: `/uploads/vehicle_images/${result.image_url}` 
      });
    } else {
      return res.status(404).json({ message: 'ไม่พบรูปภาพยานพาหนะ' });
    }
  } catch (error) {
    console.error('Error getting vehicle image:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรูปภาพยานพาหนะ', error: error.message });
  }
});

/**
 * @swagger
 * /users/vehicles/{id}/image:
 *   delete:
 *     summary: ลบรูปภาพยานพาหนะ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสทะเบียนรถ
 *     responses:
 *       200:
 *         description: ลบรูปภาพยานพาหนะสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
usersRouter.delete('/vehicles/:id/image', jwtTokenMiddleware, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    
    const result = await deleteVehicleImage(vehicleId, userId);
    
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error deleting vehicle image:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรูปภาพยานพาหนะ', error: error.message });
  }
});

// Also add this to serve static files from the uploads directory
// Add this near the top of your server.js file or where you set up your Express app
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

export default usersRouter;