//Promptpay.jsx
import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas"; // นำเข้า html2canvas สำหรับการจับภาพ
import { Nav, Button, Spinner, Modal } from "react-bootstrap";
import { FaSearch, FaHistory, FaUser, FaDownload, FaCheckCircle } from "react-icons/fa"; // นำเข้าไอคอนที่ต้องการ
import { useLocation, useNavigate, Link } from "react-router-dom";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import logo from "/public/Metthier Master Logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import promptpay from "/public/prompt-pay-logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import qrprompt from "/public/Qrprompt.png"; //ใส่โลโก้ซ้อนลิ้ง

import Undo from "/Undo.png";
import "./Promptpay.css";

// นำเข้าฟังก์ชันสำหรับการชำระเงิน
import { createPayment, updatePaymentStatus } from "../../../../services/paymentService";

function Promptpay() {
  const location = useLocation(); // ใช้ location เพื่อตรวจสอบเส้นทางปัจจุบัน
  const navigate = useNavigate(); // สร้าง navigate สำหรับเปลี่ยนหน้า
  
  // สถานะสำหรับข้อมูลการชำระเงิน
  const [paymentInfo, setPaymentInfo] = useState(() => {
    // ดึงข้อมูลจาก location.state หรือ sessionStorage
    const stateData = location.state || {};
    
    if (stateData.total && stateData.historyId) {
      return {
        total: stateData.total,
        historyId: stateData.historyId,
        isFromParkingExit: stateData.isFromParkingExit,
        parkingData: stateData.parkingData
      };
    }
    
    // ถ้าไม่มีข้อมูลใน location.state ให้ดึงจาก sessionStorage
    const savedData = sessionStorage.getItem("promptpayPaymentData");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      return {
        total: parsedData.amount,
        historyId: parsedData.historyId,
        isFromParkingExit: parsedData.isFromParkingExit,
        parkingData: {
          buildingName: parsedData.buildingName,
          areaName: parsedData.areaName,
          licensePlate: parsedData.licensePlate,
          entryDate: parsedData.entryDate,
          entryTime: parsedData.entryTime,
          duration: parsedData.duration
        }
      };
    }
    
    // ค่าเริ่มต้นถ้าไม่มีข้อมูล
    return {
      total: 20,
      historyId: null,
      isFromParkingExit: false,
      parkingData: null
    };
  });
  
  // สถานะสำหรับการแสดงผลและการทำงาน
  const [countdown, setCountdown] = useState(60); // ตั้งค่าเริ่มต้นเป็น 60 วินาที
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ฟังก์ชัน handleProfileClick เพื่อนำกลับไปหน้า Profile
  const handleProfileClick = () => {
    if (location.pathname === "/profile/payment/promptpay") {
      navigate("/profile"); // ถ้าอยู่ที่ Payment จะพาไปหน้า Profile
    } else {
      navigate("/profile/payment/promptpay"); // ถ้าไม่ได้อยู่ที่ Payment ให้ไปหน้า Payment
    }
  };

  // ฟังก์ชันสำหรับจับภาพและบันทึกเป็นไฟล์รูปภาพ
  const handleSaveImage = () => {
    html2canvas(document.querySelector(".savebilprompt")).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png"); //กำหนด href ของลิงก์เป็นภาพในรูปแบบข้อมูล URL ที่ได้จาก canvas.toDataURL("image/png") ซึ่งแปลง canvas เป็นรูปแบบ PNG
      link.download = "promptpay-receipt.png"; //ตั้งชื่อไฟล์
      link.click(); //คลิกบนลิงก์ที่สร้างเพื่อให้เบราว์เซอร์ดาวน์โหลดภาพ
    });
  };
  
  // ฟังก์ชันสำหรับการชำระเงิน
  const handlePayment = async () => {
    setLoading(true);
    setError("");
    
    try {
      // ถ้ามี historyId ให้ดำเนินการชำระเงิน
      if (paymentInfo.historyId) {
        console.log("Creating PromptPay payment for history ID:", paymentInfo.historyId);
        
        // 1. สร้างรายการชำระเงินใหม่
        const createResponse = await createPayment(paymentInfo.historyId, 'promptpay');
        
        if (createResponse.success) {
          console.log("Payment created:", createResponse);
          
          // เก็บ payment_id สำหรับการอัพเดทสถานะ
          const paymentId = createResponse.data.payment_id;
          
          // 2. จำลองการประมวลผลการชำระเงิน (ในระบบจริงจะเป็นการเชื่อมต่อกับ payment gateway)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 3. อัพเดทสถานะการชำระเงินเป็น completed
          const transactionRef = `PP${Date.now()}`;
          const updateResponse = await updatePaymentStatus(paymentId, 'completed', transactionRef);
          
          console.log("Payment status updated:", updateResponse);
          
          if (!updateResponse.success) {
            throw new Error(updateResponse.message || "ไม่สามารถอัพเดทสถานะการชำระเงินได้");
          }
          
          // 4. ตั้งค่าสถานะการชำระเงินเป็น true ใน sessionStorage
          sessionStorage.setItem("paymentCompleted", "true");
          
          // 5. บันทึกข้อมูลการชำระเงินลงใน sessionStorage
          const paymentRecord = {
            paymentId: paymentId,
            historyId: paymentInfo.historyId,
            method: 'promptpay',
            amount: paymentInfo.total,
            timestamp: new Date().toISOString(),
            status: 'completed',
            transactionRef: transactionRef
          };
          sessionStorage.setItem("lastPayment", JSON.stringify(paymentRecord));
          
          // 6. แสดง Modal สำเร็จ
          setShowSuccessModal(true);
          
          // 7. หยุดการนับถอยหลัง
          setCountdown(null);
        } else {
          // กรณีมีข้อผิดพลาดในการสร้างรายการชำระเงิน
          throw new Error(createResponse.message || "ไม่สามารถสร้างรายการชำระเงินได้");
        }
      } else {
        // กรณีไม่มี historyId (ทดสอบหรือการชำระเงินทั่วไป)
        console.log("Processing general payment (no history ID)");
        
        // จำลองการประมวลผลการชำระเงิน
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // จำลองการชำระเงินสำเร็จ
        const mockPaymentRecord = {
          method: 'promptpay',
          amount: paymentInfo.total,
          timestamp: new Date().toISOString(),
          status: 'completed',
          transactionRef: `PP${Date.now()}`
        };
        
        // บันทึกข้อมูลการชำระเงินลงใน sessionStorage
        sessionStorage.setItem("paymentCompleted", "true");
        sessionStorage.setItem("lastPayment", JSON.stringify(mockPaymentRecord));
        
        // แสดง Modal สำเร็จ
        setShowSuccessModal(true);
        
        // หยุดการนับถอยหลัง
        setCountdown(null);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError(error.response?.data?.message || error.message || "เกิดข้อผิดพลาดในการชำระเงิน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };
  
  // ฟังก์ชันสำหรับการปิด Modal และนำทางไปยังหน้าจำลองใบเสร็จ
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // คำนวณราคาเพิ่มอีก 20 บาท
    const originalAmount = paymentInfo.total;
    const increasedAmount = typeof originalAmount === 'number' 
      ? originalAmount + 20 
      : parseFloat(originalAmount || 0) + 20;
    
    console.log(`Increasing amount from ${originalAmount} to ${increasedAmount} baht`);
    
    // บันทึกข้อมูลการชำระเงินสำหรับแสดงในหน้าใบเสร็จ
    const receiptData = {
      paymentMethod: 'promptpay',
      amount: increasedAmount,
      service_fee: 20, // เพิ่มค่าบริการ 20 บาท
      timestamp: new Date().toISOString(),
      reference: `PP${Date.now()}`,
      transactionId: `T${Math.floor(Math.random() * 1000000)}`,
      buildingName: paymentInfo.parkingData?.buildingName || 'ลานจอดรถ',
      areaName: paymentInfo.parkingData?.areaName || '',
      licensePlate: paymentInfo.parkingData?.licensePlate || '',
      entryDate: paymentInfo.parkingData?.entryDate || '',
      entryTime: paymentInfo.parkingData?.entryTime || '',
      exitDate: new Date().toLocaleDateString('th-TH'),
      exitTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      historyId: paymentInfo.historyId || '',
      status: 'completed',
      paymentDate: new Date().toLocaleDateString('th-TH'),
      paymentTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    
    // เก็บข้อมูลใบเสร็จใน sessionStorage
    sessionStorage.setItem("receiptData", JSON.stringify(receiptData));
    
    // นำทางไปยังหน้าจำลองใบเสร็จ (หน้าประวัติการจอด)
    navigate("/profile/payment/receipt");
   };
 

  // เริ่มนับเวลาถอยหลัง
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000); // ลด 1 และ ลดเวลาทุก 1 วินาที
      return () => clearTimeout(timer); // เคลียร์ timer เมื่อ component ถูกทำลาย
    } else if (countdown === 0) {
      console.log("Payment time expired, redirecting to unsuccessful page");
      
      // เก็บข้อมูลการชำระเงินที่ไม่สำเร็จใน sessionStorage
      sessionStorage.setItem("paymentExpired", "true");
      
      // นำทางไปยังหน้าชำระเงินไม่สำเร็จ
      navigate("/profile/payment/promptpay/unsuccessful1"); 
    }
  }, [countdown, navigate]);

  return (
    <div style={{ minHeight: "100%" }}>
      <div>
        <div className="box3">
          <img src={logo} alt="My Logo1" className="Logo3-image" />
        </div>
      </div>

      <div className="main-content">
        {/* แสดงข้อความแจ้งเตือน */}
        {error && (
          <div className="alert alert-danger mx-3 mb-3" role="alert">
            {error}
          </div>
        )}
        
        {/*ใบเสร็จ */}
        <div className="receipt-container">
          <div className="payment-methods">
            <h2>วิธีการชำระเงิน</h2>
            <button className="payment-btn promptpay">
              <img src={promptpay} alt="Logo1" className="btn-logo" /> PromptPay
            </button>

            <div className="savebilprompt">
              <div className="qrprompt">
                <img src={promptpay} alt="Logo1" className="logoprompt" />{" "}
                <br />
                <img src={qrprompt} alt="Logo1" className="logoqrprompt" />
              </div>
              <div className="totalprompt">
                <p>
                  ชื่อ : <span>ลานจอดรถ</span>
                </p>
                <p>
                  บัญชี : <span>xxx-x-x3000-x</span>
                </p>
                <p>
                  เลขที่อ้าง : <span>123444047957</span>
                </p>
                <p>
                  จำนวนเงิน : <span>฿ {paymentInfo.total}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ปุ่มบันทึกภาพ */}
          <button onClick={handleSaveImage} className="save-image-btn">
            <FaDownload size={28} /> <div>บันทึกรูป</div>
          </button>

          {/* แสดงเวลาถอยหลัง */}
          <div className="countdown-timer">
            <p>
              กรุณาดำเนินการภายใน: <span>{countdown} วินาที</span>
            </p>
          </div>

          {/* ปุ่มชำระเงิน */}
          <button 
            className="promptpay-btn operation8" 
            style={{ backgroundColor: "#ff5733" }}
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                กำลังประมวลผล...
              </>
            ) : (
              ""
            )}
          </button>
        </div>

        <div className="form-buttonsP">
          <Button className="btn2" onClick={() => navigate(-1)}>
            <img src={Undo} alt="Back Icon" className="icon33" />
            ย้อนกลับ
          </Button>
        </div>

        {/* Modal แสดงการชำระเงินสำเร็จ */}
        <Modal show={showSuccessModal} onHide={handleCloseSuccessModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>ชำระเงินสำเร็จ</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4">
            <FaCheckCircle className="text-success mb-3" size={60} />
            <h4>ชำระเงินเรียบร้อยแล้ว</h4>
            <p className="mb-0">ขอบคุณที่ใช้บริการ</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleCloseSuccessModal}>
              ตกลง
            </Button>
          </Modal.Footer>
        </Modal>

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
                      location.pathname === "/profile/payment/promptpay" ? "active" : ""
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

export default Promptpay;
