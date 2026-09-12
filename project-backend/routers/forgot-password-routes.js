import { Router } from "express";
import crypto from "crypto";
import {
  findUserByPhone,
  createPasswordResetRequest,
  createOTP,
  verifyOTP,
  updateUserPassword
} from "../controllers/passwordController.js";
 
const passwordResetRouter = Router();

/**
 * @route   POST /password/request-reset
 * @desc    Request password reset by phone number
 * @swagger
 * /password/request-reset:
 *   post:
 *     summary: Request password reset by phone number
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone_number:
 *                 type: string
 *                 description: The phone number of the user
 *             required:
 *               - phone_number
 *     responses:
 *       200:
 *         description: Password reset request successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       400:
 *         description: Bad request - missing phone number
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 */
passwordResetRouter.post("/request-reset", async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ message: "กรุณาระบุเบอร์โทรศัพท์" });
  }

  try {
    // ค้นหาผู้ใช้จากเบอร์โทร (อาจจะเจอหรือไม่เจอก็ได้)
    const user = await findUserByPhone(phone_number);
    
    // สร้าง token สำหรับการรีเซ็ตรหัสผ่าน
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // กำหนดเวลาหมดอายุ (15 นาที)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // บันทึกคำขอรีเซ็ตรหัสผ่านลงฐานข้อมูล
    const requestId = await createPasswordResetRequest({
      user_id: user ? user.user_id : null,
      phone_number,
      request_token: resetToken,
      expires_at: expiresAt
    });
    
    if (!requestId) {
      return res.status(500).json({ message: "ไม่สามารถสร้างคำขอรีเซ็ตรหัสผ่านได้" });
    }
    
    // สร้าง OTP 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // บันทึก OTP ลงฐานข้อมูล (หมดอายุใน 5 นาที)
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await createOTP({
      request_id: requestId,
      otp_code: otpCode,
      expires_at: otpExpires
    });
    
    // ในระบบจริงควรส่ง OTP ทาง SMS แต่ในที่นี้จะส่งกลับใน response (สำหรับการทดสอบเท่านั้น)
    // ในระบบจริงควรใช้ return res.status(200).json({ message: "ส่ง OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว", requestId });
    return res.status(200).json({ 
      message: "ส่ง OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว", 
      requestId,
      otpCode, // ไม่ควรส่งกลับในระบบจริง
      userFound: !!user // ไม่ควรส่งกลับในระบบจริง
    });
    
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ", error: error.message });
  }
});


/**
 * @route   POST /password/verify-otp
 * @desc    Verify OTP code
 * @swagger
 * /password/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Request ID
 *               otpCode:
 *                 type: string
 *                 description: OTP code
 *             required:
 *               - requestId
 *               - otpCode
 *     responses:
 *       200:
 *         description: OTP verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: 
 *                   type: string
 *                 resetToken:
 *                   type: string
 *                 canResetPassword:
 *                   type: boolean
 *       400:
 *         description: Bad request - missing request ID or OTP code
 */
passwordResetRouter.post("/verify-otp", async (req, res) => {
  const { requestId, otpCode } = req.body;
  
  if (!requestId || !otpCode) {
    return res.status(400).json({ message: "กรุณาระบุ request ID และ รหัส OTP" });
  }
  
  try {
    const result = await verifyOTP(requestId, otpCode);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    // ส่งคืนข้อมูลสำหรับขั้นตอนถัดไป
    return res.status(200).json({ 
      message: "ยืนยัน OTP สำเร็จ", 
      resetToken: result.resetToken,
      canResetPassword: result.canResetPassword
    });
    
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ", error: error.message });
  }
});


/**
 * @route   POST /password/reset
 * @desc    Reset password with token
 * @swagger
 * /password/reset:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Reset token
 *               password:
 *                 type: string
 *                 description: New password
 *               confirmPassword:
 *                 type: string
 *                 description: Confirm new password
 *             required:
 *               - resetToken
 *               - password
 *               - confirmPassword
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: 
 *                   type: string
 *       400:
 *         description: Bad request - missing reset token, password, or confirm password
 */
passwordResetRouter.post("/reset", async (req, res) => {
  const { resetToken, password, confirmPassword } = req.body;
  
  if (!resetToken || !password || !confirmPassword) {
    return res.status(400).json({ message: "กรุณาระบุข้อมูลให้ครบถ้วน" });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" });
  }
  
  try {
    const result = await updateUserPassword(resetToken, password);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    return res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ", error: error.message });
  }
});

export default passwordResetRouter;