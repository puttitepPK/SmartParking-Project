import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import axios from "axios"; // เพิ่ม axios เพื่อทำการเรียก API
import "./Signup.css";

import cancel from "/public/Cancel.png";
import Correct from "/public/Correct.png";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    userName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    licensePlate: "", // เพิ่มฟิลด์ทะเบียนรถ
  });

  const [alertMessage, setAlertMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // เพิ่มสถานะ loading

  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงของอินพุต
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // แยกชื่อและนามสกุล
  const splitFullName = (fullName) => {
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return {
        first_name: parts[0],
        last_name: parts.slice(1).join(' ')
      };
    }
    return { first_name: parts[0], last_name: '' };
  };

  // ฟังก์ชันสำหรับส่งฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    // ตรวจสอบว่าทุกฟิลด์มีข้อมูลครบถ้วน (ยกเว้นทะเบียนรถ)
    const requiredFields = ['fullName', 'userName', 'phoneNumber', 'password', 'confirmPassword'];
    for (let key of requiredFields) {
      if (formData[key].trim() === "") {
        setAlertMessage("กรุณากรอกข้อมูลให้ครบ");
        setIsSuccess(false);
        setShowModal(true);
        return;
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      setAlertMessage("รหัสผ่านไม่ตรงกัน");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }

    // แยกชื่อและนามสกุล
    const { first_name, last_name } = splitFullName(formData.fullName);

    try {
      setIsLoading(true);
      // เรียกใช้ API register
      const response = await axios.post("http://localhost:3000/users/register", {
        username: formData.userName,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        first_name,
        last_name,
        phone_number: formData.phoneNumber,
        role_id: 2 // ตั้งค่าเป็น visitor (2) ตามค่าเริ่มต้นของ API
      });

      // เมื่อลงทะเบียนสำเร็จ
      if (response.status === 200) {
        // ตรวจสอบว่ามีการกรอกทะเบียนรถหรือไม่
        if (formData.licensePlate.trim() !== "") {
          try {
            // ทำการล็อกอินเพื่อรับ token
            const loginResponse = await axios.post("http://localhost:3000/users/login", {
              login_id: formData.userName,
              password: formData.password
            });

            if (loginResponse.status === 200 && loginResponse.data.token) {
              // ลงทะเบียนรถโดยใช้ token ที่ได้จากการล็อกอิน
              await axios.post("http://localhost:3000/users/vehicles", 
                {
                  license_plate: formData.licensePlate,
                  is_primary: true
                },
                {
                  headers: {
                    Authorization: `Bearer ${loginResponse.data.token}`
                  }
                }
              );
            }
          } catch (vehicleError) {
            console.error("Vehicle registration error:", vehicleError);
            // แม้ว่าการลงทะเบียนรถจะล้มเหลว เราจะถือว่าการลงทะเบียนผู้ใช้สำเร็จ
          }
        }

        setAlertMessage("การลงทะเบียนเสร็จสิ้น! ยินดีต้อนรับ");
        setIsSuccess(true);
        setShowModal(true);
        
        // รอ 3 วินาทีแล้วนำทางไปหน้า login
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการลงทะเบียน";
      
      if (error.response) {
        // ตรวจสอบสถานะ error จาก Backend
        if (error.response.status === 409) {
          errorMessage = "ชื่อผู้ใช้หรือเบอร์โทรศัพท์นี้มีอยู่ในระบบแล้ว";
        } else if (error.response.status === 400 && error.response.data.message === "Passwords do not match") {
          errorMessage = "รหัสผ่านไม่ตรงกัน";
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }
      
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setAlertMessage("");
    
    // ถ้าเป็นการลงทะเบียนสำเร็จ ให้นำทางไปหน้า login
    if (isSuccess) {
      navigate("/login");
    }
  };

  return (
    <div style={{ minHeight: "844px" }}>
      <div className="box1">
        <img
          src="./Metthier Master Logo.png"
          alt="My Logo"
          className="Logo-image"
        />
      </div>
      <div className="title">
        <p>ลงทะเบียนเข้าใช้งาน</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="user1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="text"
            name="fullName"
            placeholder="ชือ-นามสกุล"
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <div className="user1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="text"
            name="userName"
            placeholder="ชือบัญชีผู้ใช้"
            value={formData.userName}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <div className="user1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="text"
            placeholder="เบอร์โทรศัพท์"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => {
              const value = e.target.value;
              const filteredValue = value.replace(/[^0-9]/g, "");
              if (filteredValue.length <= 10) {
                handleChange({
                  target: { name: "phoneNumber", value: filteredValue },
                });
              }
            }}
            disabled={isLoading}
          />
        </div>
        <div className="user1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="text"
            name="licensePlate"
            placeholder="ทะเบียนรถ (ถ้ามี)"
            value={formData.licensePlate}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <div className="pass1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="password"
            placeholder="รหัสผ่าน"
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <div className="pass1">
          <label></label>
          <input
            className="form-control"
            aria-label="default input example"
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          className={`btn custom11-btn ${isLoading ? 'disabled' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
        </button>
      </form>

      {/* Modal แจ้งเตือน */}
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
          <img
            src={isSuccess ? Correct : cancel}
            alt={isSuccess ? "Success" : "Error"}
            style={{ width: "30px", marginRight: "10px", marginTop: "1px" }}
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

export default Signup;