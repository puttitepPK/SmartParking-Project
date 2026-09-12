//resetpass.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
//import { updatePasswordByPhoneNumber } from '../../../data/users';
import axios from "axios";

import { Modal, Button } from "react-bootstrap";
import logo from "/public/Metthier Master Logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import "./Resetpass.css";
 
import cancel from "/public/Cancel.png"; //ใส่โลโก้ซ้อนลิ้ง Correct
import Correct from "/public/Correct.png";

function Resetpass() {

  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  //const phoneNumber = localStorage.getItem("verifiedPhoneNumber"); // ดึงหมายเลขโทรที่ยืนยันแล้ว
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [canResetPassword, setCanResetPassword] = useState(false);
 
  const [alertMessage, setAlertMessage] = useState(""); // สำหรับข้อความแจ้งเตือน
  const [showModal, setShowModal] = useState(false); // สำหรับการแสดง Modal
  const [isSuccess, setIsSuccess] = useState(false); // สำหรับสถานะของข้อความแจ้งเตือน

  // const handleResetPassword = () => {
  //   if (!newPassword || !confirmPassword) {
  //     //alert("กรุณากรอกข้อมูลให้ครบ");
  //     setAlertMessage("กรุณากรอกข้อมูลให้ครบ");
  //     setIsSuccess(false); // แสดงไอคอน X mark
  //     setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  //     return;
  //   }
  //   if (newPassword !== confirmPassword) {
  //     //alert("รหัสผ่านไม่ตรงกัน");
  //     setAlertMessage("รหัสผ่านไม่ตรงกัน");
  //     setIsSuccess(false); // แสดงไอคอน X mark
  //     setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  //     return;
  //   }
  //   if (phoneNumber) {
  //     const success = updatePasswordByPhoneNumber(phoneNumber, newPassword);
  //     if (success) {
  //       //alert("รีเซ็ตรหัสผ่านสำเร็จ!");
  //       setAlertMessage("รีเซ็ตรหัสผ่านสำเร็จ!");
  //       setIsSuccess(true); // แสดงไอคอน ถูก
  //       setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  //       setTimeout(() => {
  //         localStorage.removeItem("verifiedPhoneNumber"); // ลบข้อมูลเบอร์โทรที่ยืนยันแล้ว
  //         navigate("/login");
  //       }, 3000); // 3000ms = 3 วินาที

  //       // localStorage.removeItem("verifiedPhoneNumber"); // ลบข้อมูลเบอร์โทรออกหลังรีเซ็ต
  //       // navigate("/login");
  //     } else {
  //       //alert("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
  //       setAlertMessage("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน \n ไม่พบหมายเลขโทรศัพท์ในระบบที่ยืนยัน");
  //       setIsSuccess(false); // แสดงไอคอน X mark
  //       setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  //     }
  //   } else {
  //     //alert("ไม่พบหมายเลขโทรศัพท์ที่ยืนยัน");
  //     setAlertMessage("ไม่พบหมายเลขโทรศัพท์ที่ยืนยัน");
  //     setIsSuccess(false); // แสดงไอคอน X mark
  //     setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  //   }
  // };

  // const handleReset = () => {
  //   navigate("/login"); // นำไปยังหน้าสมัครสมาชิก
  // };


  // โหลดข้อมูลที่จำเป็นจาก localStorage
  useEffect(() => {
    const token = localStorage.getItem("resetToken");
    const canReset = localStorage.getItem("canResetPassword") === "true";
    const phoneNumber = localStorage.getItem("verifiedPhoneNumber");
    
    if (!token || !phoneNumber) {
      setAlertMessage("ไม่พบข้อมูลสำหรับการรีเซ็ตรหัสผ่าน กรุณาเริ่มต้นกระบวนการใหม่");
      setIsSuccess(false);
      setShowModal(true);
      
      // รอให้ Modal แสดงข้อความเสร็จก่อนกลับไปหน้าแรก
      setTimeout(() => {
        navigate("/forgot-password");
      }, 3000);
      return;
    }
    
    setResetToken(token);
    setCanResetPassword(canReset);
    
    // ถ้าไม่สามารถรีเซ็ตรหัสผ่านได้ (ไม่พบบัญชีผู้ใช้)
    if (!canReset) {
      setAlertMessage("ไม่พบบัญชีผู้ใช้ที่ตรงกับเบอร์โทรศัพท์นี้ในระบบ");
      setIsSuccess(false);
      setShowModal(true);
    }
  }, [navigate]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setAlertMessage("กรุณากรอกข้อมูลให้ครบ");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setAlertMessage("รหัสผ่านไม่ตรงกัน");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }
    
    if (newPassword.length < 6) {
      setAlertMessage("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }
    
    if (!canResetPassword) {
      setAlertMessage("ไม่พบบัญชีผู้ใช้ที่ตรงกับเบอร์โทรศัพท์นี้ในระบบ");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }
    
    setLoading(true);
    
    try {
      // เรียกใช้ API reset password
      const response = await axios.post('http://localhost:3000/password/reset', {
        resetToken: resetToken,
        password: newPassword,
        confirmPassword: confirmPassword
      });
      
      if (response.data) {
        setAlertMessage("รีเซ็ตรหัสผ่านสำเร็จ!");
        setIsSuccess(true);
        setShowModal(true);
        
        // ลบข้อมูลที่ไม่จำเป็นออกจาก localStorage
        localStorage.removeItem("resetToken");
        localStorage.removeItem("canResetPassword");
        localStorage.removeItem("verifiedPhoneNumber");
        
        // รอให้ Modal แสดงข้อความเสร็จก่อนไปหน้า login
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setAlertMessage(error.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
      setIsSuccess(false);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };


  const closeModal = () => {
    setShowModal(false);
    setAlertMessage("");
  };

  return (
    <div style={{ minHeight: '844px' }}>
      <div className="box1">
      <img src={logo} alt="My Logo1" className="Logo-image" />
      </div>
      <div className="title">
        <p>กู้คืนรหัสผ่าน</p>
      </div>
      <div className="user1">
        <label></label>
        <input
          className="form-control"
          aria-label="default input example"
          type="password"
          placeholder="รหัสผ่านใหม่"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading || !canResetPassword}
        />
      </div>

      <div className="pass1">
        <label></label>
        <input
          className="form-control"
          aria-label="default input example"
          type="password"
          placeholder="ยืนยันรหัสผ่าน"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading || !canResetPassword}
        />
      </div>
      <button
        className="btn custom11-btn"
        onClick={handleResetPassword}
        disabled={loading || !canResetPassword}
      >
        {loading ? 'กำลังดำเนินการ...' : 'รีเซ็ตรหัสผ่านใหม่'}
      </button>

      {/* Bootstrap Modal สำหรับแสดงข้อความแจ้งเตือน */}
      <Modal
        show={showModal}
        onHide={closeModal}
        centered
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="custom-title">การแจ้งเตือน</Modal.Title>
        </Modal.Header>
        <Modal.Body className="custom-body2">
          {/* แสดงไอคอน Checkmark หรือ X mark ตามสถานะ */}
          <img
            src={isSuccess ? Correct :  cancel}
            alt={isSuccess ? "Success" : "Error"}
            style={{ width: "30px", marginRight: "15px", marginTop: "1px", whiteSpace: "pre-line"}}
          />
          {alertMessage}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="btn custom3-btn" onClick={closeModal}>
            ตกลง
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Resetpass;
