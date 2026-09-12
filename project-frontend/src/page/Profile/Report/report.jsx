import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Form, Button, Nav } from "react-bootstrap";
import {
  FaArrowLeft,
  FaPaperPlane,
  FaHome,
  FaSearch,
  FaHistory,
  FaUser,
} from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAddressCard } from '@fortawesome/free-solid-svg-icons';
import logo from "/public/Metthier Master Logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import "./report.css";

import Undo from "/Undo.png";
import Send from "/send.png";

function Report() { 
  const location = useLocation();
  const navigate = useNavigate(); // สร้าง navigate สำหรับเปลี่ยนหน้า

  const [showMessage, setShowMessage] = useState(false);

  const handleSubmitReport = () => {
    // Show success message for 2 seconds
    setShowMessage(true);
    setTimeout(() => navigate("/profile"), 2000); // เปลี่ยนหน้าไปยัง /login หลังจาก 5 วินาที
  };

  // ฟังก์ชัน handleProfileClick เพื่อนำกลับไปหน้า Profile
  const handleReportClick = () => {
    if (location.pathname === "/profile/report") {
      navigate("/profile"); // ถ้าอยู่ที่ Payment จะพาไปหน้า Profile
    } else {
      navigate("/profile/report"); // ถ้าไม่ได้อยู่ที่ Payment ให้ไปหน้า Payment
    }
  };



  return (
    <div style={{ minHeight: "844px" }}>
      <div className="box2">
        <img src={logo} alt="My Logo1" className="Logo3-image" />
      </div>

      <div className="main-content">
        <div className="report-content">
          <h2 className="report-title">แจ้งปัญหา</h2>
          <Form>
            <Form.Group controlId="problemType">
              <Form.Label className="custom-label">ปัญหาที่พบ</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="กรอกปัญหาที่พบ"
              />
            </Form.Group>

            <Form.Group controlId="uploadImage">
              <Form.Label className="custom-label">แนบรูปภาพ</Form.Label>
              <Form.Control type="file" />
            </Form.Group>

            <Form.Group controlId="additionalDescription">
              <Form.Label className="custom-label">อธิบายเพิ่มเติม</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="อธิบายเพิ่มเติม"
              />
            </Form.Group>

            <Form.Group controlId="contactPhone">
              <Form.Label className="custom-label">เบอร์โทร</Form.Label>
              <Form.Control type="tel" placeholder="เบอร์โทร" />
            </Form.Group>

            <Form.Group controlId="contactEmail">
              <Form.Label className="custom-label">อีเมล</Form.Label>
              <Form.Control type="email" placeholder="อีเมล" />
            </Form.Group>

            <div className="form-buttons33">

              <Button className="btn2" onClick={() => navigate(-1)}>
                <img src={Undo} alt="Back Icon" className="icon33" />
                ย้อนกลับ
              </Button>
              <Button className="btn3" onClick={handleSubmitReport}>
                <img src={Send} alt="Send Icon" className="icon33" />
                ส่ง
              </Button>
            </div>
          </Form>
        </div>

        {showMessage && <div className="success-message">คุณได้ส่งคำแจ้งปัญหาแล้ว</div>}

        {/* Bottom Navbar */}
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
                    location.pathname === "/profile/report" ? "active" : ""
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

export default Report;
