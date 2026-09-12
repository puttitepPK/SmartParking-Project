//Home.jsx
import React, { useState, useEffect } from "react";
import { Nav } from "react-bootstrap";
import { FaSearch, FaHistory, FaUser, FaDownload } from "react-icons/fa"; // นำเข้าไอคอนที่ต้องการ
import { useLocation, useNavigate, Link } from "react-router-dom";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";

import logo from "/public/Metthier Master Logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import greencorrect from "/Correct.png"; //ใส่โลโก้ซ้อนลิ้ง

import "./Finishedp1.css";

function Finishedp1({}) {
  const location = useLocation(); // ใช้ location เพื่อตรวจสอบเส้นทางปัจจุบัน
  const navigate = useNavigate(); // สร้าง navigate สำหรับเปลี่ยนหน้า

  // สถานะเวลาถอยหลัง
  const [countdown, setCountdown] = useState(10); // ตั้งค่าเริ่มต้นเป็น 10 วินาที

  // ฟังก์ชัน handleProfileClick เพื่อนำกลับไปหน้า Profile
  const handleProfileClick = () => {
    if (location.pathname === "/profile/payment/promptpay/finished") {
      navigate("/profile"); // ถ้าอยู่ที่ Payment จะพาไปหน้า Profile
    } else {
      navigate("/profile/payment/promptpay/finished"); // ถ้าไม่ได้อยู่ที่ Payment ให้ไปหน้า Payment
    }
  };

  // เริ่มนับเวลาถอยหลังและตรวจสอบสถานะการชำระเงิน
  useEffect(() => {
    // ตรวจสอบว่ามีการชำระเงินสำเร็จหรือไม่
    const paymentCompleted = sessionStorage.getItem("paymentCompleted");
    const lastPayment = sessionStorage.getItem("lastPayment");
    
    if (paymentCompleted === "true" && lastPayment) {
      console.log("Payment was completed successfully:", JSON.parse(lastPayment));
    } else {
      console.warn("No payment record found or payment not completed");
    }
    
    // ลบข้อมูลการชำระเงินที่ไม่จำเป็นแล้ว
    sessionStorage.removeItem("paymentData");
    sessionStorage.removeItem("promptpayPaymentData");
    
    // นับเวลาถอยหลัง
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // เมื่อนับถอยหลังเสร็จ ให้นำทางไปยังหน้าหลัก
      navigate("/home");
    }
  }, [countdown, navigate]);

  return (
    <div style={{ minHeight: "100%" }}>
      <div>
        <div className="box3">
          <img src={logo} alt="My Logo1" className="Logo3-image" />
        </div>
      </div>

      <div className="main-content2">
        <div className="receipt-container">
          <div className="payment-methods">
            <h2>การชำระเงิน</h2>
            <div className="savebilprompt">
              <img
                src={greencorrect}
                alt="Logo1"
                className="logogreencorrect"
              />
            </div>
            <div className="finish">
              <h4>การชำระเงินเสร็จสิ้น</h4>
              <p>ขอบคุณที่ใช้บริการ</p>
              <p className="mt-3">ระบบได้บันทึกข้อมูลการชำระเงินเรียบร้อยแล้ว</p>
            </div>
          </div>
          <div className="button-group">
            <Link to="/record" className="link-no-underline mb-2">
              <button className="promptpay-btn operation-secondary">ดูประวัติการจอด</button>
            </Link>
            <Link to="/home" className="link-no-underline">
              <button className="promptpay-btn operation">กลับหน้าหลัก</button>
            </Link>
          </div>
        </div>

        <div className="boxnav1">
          <div className="boxnav">
            <div className="bottom-navbar">
              <Nav className="justify-content-around">
                <Nav.Item>
                  <Link
                    to="/home"
                    className={`nav-item home-link ${
                      location.pathname === "/home/ScanQRCode" ? "active" : ""
                    }`}
                  >
                    <IoHome className="icon" size={31} />
                    <span> หน้าแรก</span>
                  </Link>
                </Nav.Item>
                <Nav.Item>
                  <Link
                    to="/findparking"
                    className={`nav-item findparking-link ${
                      location.pathname === "/findparking" ? "active" : ""
                    }`}
                  >
                    <FaSearch className="icon" size={31} />
                    <span> ค้นหาลานจอด</span>
                  </Link>
                </Nav.Item>
                <Nav.Item>
                  <Link
                    to="/record"
                    className={`nav-item record-link ${
                      location.pathname === "/record" ? "active" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faBuildingCircleCheck}
                      className="icon"
                      style={{ fontSize: "31px" }}
                    />
                    <span> ประวัติการจอด</span>
                  </Link>
                </Nav.Item>
                <Nav.Item>
                  <Link
                    to="/profile"
                    className={`nav-item profile-link ${
                      location.pathname === "/profile/payment/promptpay/finished" ? "active" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faAddressCard}
                      className="icon"
                      style={{ fontSize: "31px" }}
                    />
                    <span> ข้อมูลส่วนตัว</span>
                  </Link>
                </Nav.Item>
              </Nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Finishedp1;
