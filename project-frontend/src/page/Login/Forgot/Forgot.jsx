//forgot.jsx
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Modal, Button } from "react-bootstrap";
import "./Forgot.css";
 
import cancel from "/public/Cancel.png"; //ใส่โลโก้ซ้อนลิ้ง Correct
import Correct from "/public/Correct.png";

function Forgot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [alertMessage, setAlertMessage] = useState(""); // สำหรับข้อความแจ้งเตือน
  const [showModal, setShowModal] = useState(false); // สำหรับการแสดง Modal
  const [isSuccess, setIsSuccess] = useState(false); // สำหรับสถานะของข้อความแจ้งเตือน

  //OTP
  // const sendOtp = (phoneNumber) => {
  //   // สร้างรหัส OTP (เลข 6 หลักแบบสุ่ม)
  //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
  //   // เก็บ OTP ใน localStorage (สำหรับการจำลอง)
  //   localStorage.setItem("otp", otp);
  //   localStorage.setItem("otpPhoneNumber", phoneNumber);
  
  //  // alert(`OTP ของคุณคือ: ${otp} (สำหรับการจำลอง)`); // แจ้ง OTP (ในระบบจริงจะส่งผ่าน SMS)
  //   setAlertMessage(`OTP ของคุณคือ: ${otp}`);
  //   setIsSuccess(true); // แสดงไอคอน X mark
  //   setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
  // };

  // const verifyOtp = (phoneNumber, otpInput) => {
  //   const storedOtp = localStorage.getItem("otp");
  //   const storedPhoneNumber = localStorage.getItem("otpPhoneNumber");
  
  //   if (storedOtp && storedPhoneNumber === phoneNumber && storedOtp === otpInput) {
  //     setAlertMessage("ยืนยัน OTP สำเร็จ!");
  //     setIsSuccess(true);
  //     setShowModal(true);
  //     return true; // ใช้เพื่อตรวจสอบ OTP ว่าถูกต้อง
  //   } else {
  //     setAlertMessage("OTP ไม่ถูกต้อง หรือเบอร์โทรศัพท์ไม่ตรงกัน");
  //     setIsSuccess(false);
  //     setShowModal(true);
  //     return false; // ใช้เพื่อตรวจสอบ OTP ผิด
  //   }
  // };

  // const verifyOtp = (phoneNumber, otpInput) => {
  //   const storedOtp = localStorage.getItem("otp");
  //   const storedPhoneNumber = localStorage.getItem("otpPhoneNumber");
  
  //   if (storedOtp && storedPhoneNumber === phoneNumber && storedOtp === otpInput) {
  //     localStorage.setItem("verifiedPhoneNumber", phoneNumber); // เก็บเบอร์โทรที่ยืนยันแล้ว
  //     setAlertMessage("ยืนยัน OTP สำเร็จ!");
  //     setIsSuccess(true);
  //     setShowModal(true);
  //     return true;
  //   } else {
  //     setAlertMessage("OTP ไม่ถูกต้อง หรือเบอร์โทรศัพท์ไม่ตรงกัน");
  //     setIsSuccess(false);
  //     setShowModal(true);
  //     return false;
  //   }
  // };
  


//   const handleSendOtp = () => {
//     if (!phoneNumber) {
//       //alert("กรุณากรอกเบอร์โทรศัพท์");
//       setAlertMessage("กรุณากรอกเบอร์โทรศัพท์");
//       setIsSuccess(false); // แสดงไอคอน X mark
//       setShowModal(true); // แสดง Modal เมื่อข้อมูลไม่ครบ
//       return;
//     }
//     if (phoneNumber.length < 6) { // ตรวจสอบว่าเบอร์โทรมีอย่างน้อย 6 หลัก
//       setAlertMessage("กรอกเบอร์โทรศัพท์ให้ถูกต้อง");
//       setIsSuccess(false);
//       setShowModal(true);
//       return;
//     }
//     sendOtp(phoneNumber); // เรียกฟังก์ชันจำลองการส่ง OTP
//     setOtpSent(true); 
//   };

// const handleVerifyOtp = () => {
//   if (!otp) {
//     setAlertMessage("กรุณากรอกรหัส OTP");
//     setIsSuccess(false);
//     setShowModal(true);
//     return;
//   }

//   if (verifyOtp(phoneNumber, otp)) {
//     setShowModal(true);
//     setTimeout(() => {
//       setShowModal(false); // ปิด Modal ก่อน
//       navigate("/forgot-password/resetpass");
//     }, 3000); // รอ Modal แสดงข้อความเสร็จ
//   }
// };


const [phoneNumber, setPhoneNumber] = useState('');
const [otp, setOtp] = useState('');
const [otpSent, setOtpSent] = useState(false);
const [requestId, setRequestId] = useState('');

 // ส่งคำขอ OTP ไปยัง API
 const handleSendOtp = async () => {
  if (!phoneNumber) {
    setAlertMessage("กรุณากรอกเบอร์โทรศัพท์");
    setIsSuccess(false);
    setShowModal(true);
    return;
  }
  
  if (phoneNumber.length < 9) {
    setAlertMessage("กรอกเบอร์โทรศัพท์ให้ถูกต้อง");
    setIsSuccess(false);
    setShowModal(true);
    return;
  }
  
  setLoading(true);
  
  try {
    // เรียกใช้ API request-reset
    const response = await axios.post('http://localhost:3000/password/request-reset', {
      phone_number: phoneNumber
    });
    
    // บันทึก requestId สำหรับใช้ยืนยัน OTP
    setRequestId(response.data.requestId);
    
    setAlertMessage("ส่ง OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว");
    setIsSuccess(true);
    setShowModal(true);
    setOtpSent(true);
    
    // สำหรับการทดสอบ - แสดง OTP ที่ได้จาก backend
    if (response.data.otpCode) {
      setAlertMessage(`OTP ของคุณคือ: ${response.data.otpCode}`);
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    setAlertMessage(error.response?.data?.message || "เกิดข้อผิดพลาดในการส่ง OTP");
    setIsSuccess(false);
    setShowModal(true);
  } finally {
    setLoading(false);
  }
};

// ส่ง OTP ไปตรวจสอบที่ API
const handleVerifyOtp = async () => {
  if (!otp) {
    setAlertMessage("กรุณากรอกรหัส OTP");
    setIsSuccess(false);
    setShowModal(true);
    return;
  }
  
  setLoading(true);
  
  try {
    // เรียกใช้ API verify-otp
    const response = await axios.post('http://localhost:3000/password/verify-otp', {
      requestId: requestId,
      otpCode: otp
    });
    
    if (response.data.success !== false) {
      // เก็บ resetToken ไว้ใช้สำหรับรีเซ็ตรหัสผ่าน
      localStorage.setItem("resetToken", response.data.resetToken);
      
      // เก็บสถานะว่าสามารถรีเซ็ตรหัสผ่านได้หรือไม่
      localStorage.setItem("canResetPassword", response.data.canResetPassword);
      
      // เก็บเบอร์โทรที่ยืนยันแล้ว
      localStorage.setItem("verifiedPhoneNumber", phoneNumber);
      
      setAlertMessage("ยืนยัน OTP สำเร็จ!");
      setIsSuccess(true);
      setShowModal(true);
      
      // รอให้ Modal แสดงข้อความเสร็จก่อนไปหน้าถัดไป
      setTimeout(() => {
        setShowModal(false);
        navigate("/forgot-password/resetpass");
      }, 2000);
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    setAlertMessage(error.response?.data?.message || "OTP ไม่ถูกต้อง หรือหมดอายุแล้ว");
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
        <img
          src="./Metthier Master Logo.png"
          alt="My Logo"
          className="Logo-image"
        />
      </div>
      <div className="title">
        <p>กู้คืนรหัสผ่าน</p>
      </div>
      <div className="user1">
        <label></label>
        <input
          className="form-control"
          aria-label="default input example"
          value={phoneNumber}
          placeholder="เบอร์โทรศัพท์"
          type="text"
          inputMode="numeric"
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
          disabled={loading || otpSent}
        />
      </div>
      <div className="otp">
        <button
          className="btn custom33-btn"
          onClick={handleSendOtp}
          disabled={loading}
        >
          {loading ? 'กำลังส่ง...' : 'ส่ง OTP'}
        </button>
      </div>
      {/* //{otpSent && ( */}
      <div className="pass1">
        <label></label>
        <input
          className="form-control"
          aria-label="default input example"
          type="text"
          inputMode="numeric"
          placeholder="OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
          disabled={loading || !otpSent}
        />
      </div>
      {/* )} */}
      <button
        className="btn custom11-btn"
        onClick={handleVerifyOtp}
        disabled={loading || !otpSent}
      >
        {loading ? 'กำลังตรวจสอบ...' : 'ต่อไป'}
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
            src={isSuccess ? Correct : cancel}
            alt={isSuccess ? "Success" : "Error"}
            style={{ width: "30px", marginRight: "10px" , marginTop: "-1px"}}
          />
          {alertMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="btn custom3-btn" onClick={closeModal}>
            ตกลง
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Forgot;
