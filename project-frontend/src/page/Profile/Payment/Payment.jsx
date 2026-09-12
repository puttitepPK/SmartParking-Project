//payment.jsx
import React, { useState, useEffect } from "react";
import { Nav, Button, Alert, Spinner, Modal } from "react-bootstrap";
import { FaSearch, FaHistory, FaUser, FaCheckCircle } from "react-icons/fa"; // นำเข้าไอคอนที่ต้องการ
import { useLocation, useNavigate, Link } from "react-router-dom";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";

import logo from "/public/Metthier Master Logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import promptpay from "/public/prompt-pay-logo.png"; //ใส่โลโก้ซ้อนลิ้ง
import true1 from "/public/true.png"; //ใส่โลโก้ซ้อนลิ้ง
import cash from "/public/Cash-PNG-Photo.png"; //ใส่โลโก้ซ้อนลิ้ง
 
import Undo from "/Undo.png";
import "./Payment.css";

// นำเข้าฟังก์ชันสำหรับการชำระเงิน
import { createPayment, updatePaymentStatus } from "../../../services/paymentService";

function Payment({}) {
  const location = useLocation(); // ใช้ location เพื่อตรวจสอบเส้นทางปัจจุบัน
  const navigate = useNavigate(); // สร้าง navigate สำหรับเปลี่ยนหน้า

  // State สำหรับข้อมูลการชำระเงิน
  const [serviceFee, setServiceFee] = useState(0);
  const [penaltyFee, setPenaltyFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(() => {
    // ตรวจสอบว่าเคยมี total เก็บใน sessionStorage หรือยัง
    const savedTotal = sessionStorage.getItem("total");
    return savedTotal ? parseInt(savedTotal, 10) : 0;
  });
  
  // State สำหรับการแสดงผลและการทำงาน
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // State สำหรับข้อมูลการจอด
  const [parkingData, setParkingData] = useState(null);
  const [isFromParkingExit, setIsFromParkingExit] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);

  useEffect(() => {
    const savedData = sessionStorage.getItem("paymentData");

    if (savedData) {
      // หากมีข้อมูลใน sessionStorage ให้โหลดค่ามาใช้งาน
      const parsedData = JSON.parse(savedData);
      
      // ตรวจสอบว่ามาจากหน้าออกจากที่จอดหรือไม่
      if (parsedData.fromParkingExit) {
        setIsFromParkingExit(true);
        setHistoryId(parsedData.historyId);
        setParkingData(parsedData);
        
        // ตั้งค่าข้อมูลการชำระเงินจากข้อมูลที่ส่งมา
        setPenaltyFee(parsedData.penaltyFee || 0);
        setServiceFee(parsedData.serviceFee || 20); // ค่าบริการคงที่ 20 บาท
        setDiscount(parsedData.discount || 0);
        setTotal(parsedData.total || 20); // ยอดรวมคงที่ 20 บาท
      } else {
        // กรณีปกติที่ไม่ได้มาจากหน้าออกจากที่จอด
        const {
          penaltyFee,
          serviceFee,
          discount,
          total: savedTotal,
        } = parsedData;
        setPenaltyFee(penaltyFee);
        setServiceFee(serviceFee);
        setDiscount(discount);
        setTotal(savedTotal);
      }
    } else {
      // หากไม่มีข้อมูลใน sessionStorage ให้สุ่มค่าใหม่
      const minPenalty = 10;
      const maxPenalty = 20;
      const minServiceFee = 40;
      const maxServiceFee = 60;
      const maxTotal = 80;

      const randomPenaltyFee =
        minPenalty + Math.floor(Math.random() * (maxPenalty - minPenalty + 1));
      const randomServiceFee =
        minServiceFee +
        Math.floor(Math.random() * (maxServiceFee - minServiceFee + 1));
      const randomDiscount = Math.max(
        0,
        Math.min(
          maxTotal - (randomPenaltyFee + randomServiceFee),
          Math.floor(Math.random() * 81)
        )
      );

      const calculatedTotal =
        randomPenaltyFee + randomServiceFee - randomDiscount;

      // อัปเดต state
      setPenaltyFee(randomPenaltyFee);
      setServiceFee(randomServiceFee);
      setDiscount(randomDiscount);
      setTotal(calculatedTotal);

      // บันทึกข้อมูลใหม่ใน sessionStorage
      const paymentData = {
        penaltyFee: randomPenaltyFee,
        serviceFee: randomServiceFee,
        discount: randomDiscount,
        total: calculatedTotal,
      };
      sessionStorage.setItem("paymentData", JSON.stringify(paymentData));
    }
  }, []);

  // ฟังก์ชันสำหรับการชำระเงิน
  const handlePayment = async (method) => {
    setLoading(true);
    setError("");
    setPaymentMethod(method);
    
    try {
      // ถ้ามาจากหน้าออกจากที่จอดและมี historyId
      if (isFromParkingExit && historyId) {
        console.log("Creating payment for parking exit with history ID:", historyId);
        
        // สร้างรายการชำระเงินใหม่
        const createResponse = await createPayment(historyId, method);
        
        if (createResponse.success) {
          console.log("Payment created:", createResponse);
          
          // เก็บ payment_id สำหรับการอัพเดทสถานะ
          const newPaymentId = createResponse.data.payment_id;
          setPaymentId(newPaymentId);
          
          // จำลองการประมวลผลการชำระเงิน (ในระบบจริงจะเป็นการเชื่อมต่อกับ payment gateway)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // อัพเดทสถานะการชำระเงินเป็น completed
          const transactionRef = `TXN${Date.now()}`;
          const updateResponse = await updatePaymentStatus(newPaymentId, 'completed', transactionRef);
          
          console.log("Payment status updated:", updateResponse);
          
          // ตั้งค่าสถานะการชำระเงินเป็น true ใน sessionStorage
          sessionStorage.setItem("paymentCompleted", "true");
          
          // คำนวณราคาเพิ่มอีก 20 บาท
          const increasedAmount = typeof total === 'number' ? total + 20 : parseFloat(total || 0) + 20;
          console.log(`Increasing amount from ${total} to ${increasedAmount} baht`);
          
          // บันทึกข้อมูลการชำระเงินลงใน sessionStorage
          const paymentRecord = {
            paymentId: newPaymentId,
            historyId: historyId,
            method: method,
            amount: increasedAmount,
            service_fee: 20, // เพิ่มค่าบริการ 20 บาท
            timestamp: new Date().toISOString(),
            status: 'completed',
            transactionRef: transactionRef
          };
          sessionStorage.setItem("lastPayment", JSON.stringify(paymentRecord));
          
          // แสดง Modal สำเร็จ
          setShowSuccessModal(true);
        } else {
          // กรณีมีข้อผิดพลาดในการสร้างรายการชำระเงิน
          setError(createResponse.message || "ไม่สามารถสร้างรายการชำระเงินได้");
        }
      } else {
        console.log("Processing regular payment (not from parking exit)");
        
        // กรณีปกติที่ไม่ได้มาจากหน้าออกจากที่จอด
        // จำลองการประมวลผลการชำระเงิน
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // คำนวณราคาเพิ่มอีก 20 บาท
        const increasedAmount = typeof total === 'number' ? total + 20 : parseFloat(total || 0) + 20;
        console.log(`Increasing amount from ${total} to ${increasedAmount} baht`);
        
        // จำลองการบันทึกข้อมูลการชำระเงิน
        const paymentRecord = {
          method: method,
          amount: increasedAmount,
          service_fee: 20, // เพิ่มค่าบริการ 20 บาท
          timestamp: new Date().toISOString(),
          status: 'completed'
        };
        sessionStorage.setItem("lastPayment", JSON.stringify(paymentRecord));
        
        // แสดง Modal สำเร็จ
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError(error.response?.data?.message || error.message || "เกิดข้อผิดพลาดในการชำระเงิน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };
  
  // ฟังก์ชันสำหรับการปิด Modal และนำทางกลับ
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // ถ้ามาจากหน้าออกจากที่จอด ให้กลับไปที่หน้านั้น
    if (isFromParkingExit) {
      navigate("/home");
    } else {
      navigate(-1); // กลับไปหน้าก่อนหน้า
    }
  };

  // ฟังก์ชัน handleProfileClick เพื่อนำกลับไปหน้า Profile
  const handleProfileClick = () => {
    if (location.pathname === "/profile/payment") {
      navigate("/profile"); // ถ้าอยู่ที่ Payment จะพาไปหน้า Profile
    } else {
      navigate("/profile/payment"); // ถ้าไม่ได้อยู่ที่ Payment ให้ไปหน้า Payment
    }
  };

  return (
    <div style={{ minHeight: "100%" }}>
      <div>
        <div className="box3">
          <img src={logo} alt="My Logo1" className="Logo3-image" />
        </div>
      </div>

      <div className="main-content">
        {/* แสดงข้อความแจ้งเตือน */}
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        {success && <Alert variant="success" className="mb-3">{success}</Alert>}
        
        {/* ใบเสร็จ */}
        <div className="receipt-container">
          <div className="receipt-header">
            <p>
              อาคารที่เข้าจอด : <span>{parkingData?.buildingName || "อาคาร A ลาน 1"}</span>
            </p>
          </div>

          <div className="receipt-details">
            <p className="headpay">ใบเสร็จชำระเงิน</p>
            {parkingData?.parkingFee > 0 && (
              <p>
                ค่าจอดรถ : <span>{typeof parkingData.parkingFee === 'number' ? parkingData.parkingFee.toFixed(2) : parseFloat(parkingData.parkingFee).toFixed(2)} บาท</span>
              </p>
            )}
            <p>
              ค่าบริการ : <span>{typeof serviceFee === 'number' ? serviceFee.toFixed(2) : parseFloat(serviceFee).toFixed(2)} บาท</span>
            </p>
            {penaltyFee > 0 && (
              <p>
                ค่าปรับ : <span>{typeof penaltyFee === 'number' ? penaltyFee.toFixed(2) : parseFloat(penaltyFee).toFixed(2)} บาท</span>
              </p>
            )}
            {discount > 0 && (
              <p>
                ค่าส่วนลด : <span>{typeof discount === 'number' ? discount.toFixed(2) : parseFloat(discount).toFixed(2)} บาท</span>
              </p>
            )}

            <div className="boxtotal">
              <p className="total">
                ยอดชำระทั้งหมด : <span>{typeof total === 'number' ? total.toFixed(2) : parseFloat(total).toFixed(2)} บาท</span>
              </p>
            </div>

            {/* แสดงข้อมูลการจอดเพิ่มเติมถ้ามาจากหน้าออกจากที่จอด */}
            {isFromParkingExit && parkingData ? (
              <>
                <p>
                  สถานที่จอดรถ : <span>{parkingData.buildingName} {parkingData.areaName}</span>
                </p>
                <p>
                  ทะเบียนรถ : <span>{parkingData.licensePlate}</span>
                </p>
                <p>
                  วันที่/เวลาเข้า : <span>{parkingData.entryDate} {parkingData.entryTime}</span>
                </p>
                <p>
                  ระยะเวลาจอด : <span>{parkingData.duration}</span>
                </p>
              </>
            ) : (
              <>
                <p>
                  สถานที่จอดรถ : <span>อาคาร A ลาน 1 </span>
                </p>
                <p>
                  เลขที่บัตร : <span>79456</span>
                </p>
                <p>
                  วันที่/เวลาเข้า : <span>26/11/2024</span>
                </p>
                <p>
                  วันที่/เวลาปัจจุบัน : <span>26/11/2024</span>
                </p>
                <p>
                  จำนวนชั่วโมง : <span>ตลอดวัน</span>
                </p>
              </>
            )}
          </div>

          <div className="payment-methods">
            <h2>วิธีการชำระเงิน</h2>
            {/* ปุ่มชำระเงินด้วย PromptPay - นำทางไปยังหน้า PromptPay */}
            <button 
              className="payment-btn promptpay" 
              onClick={() => {
                // เก็บข้อมูลการชำระเงินใน sessionStorage
                const paymentData = {
                  method: 'promptpay',
                  amount: total,
                  historyId: historyId,
                  isFromParkingExit: isFromParkingExit,
                  buildingName: parkingData?.buildingName || "อาคาร A ลาน 1",
                  areaName: parkingData?.areaName || "",
                  licensePlate: parkingData?.licensePlate || "",
                  entryDate: parkingData?.entryDate || "26/11/2024",
                  entryTime: parkingData?.entryTime || "",
                  duration: parkingData?.duration || "ตลอดวัน"
                };
                sessionStorage.setItem("promptpayPaymentData", JSON.stringify(paymentData));
                
                // นำทางไปยังหน้า PromptPay พร้อมส่งข้อมูลผ่าน state
                navigate('/profile/payment/promptpay', { 
                  state: { 
                    total: total,
                    historyId: historyId,
                    isFromParkingExit: isFromParkingExit,
                    parkingData: parkingData
                  } 
                });
              }}
              disabled={loading}
            >
              {loading && paymentMethod === 'promptpay' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <img src={promptpay} alt="PromptPay" className="btn-logo" /> PromptPay
                </>
              )}
            </button>
            
            {/* ปุ่มชำระเงินด้วย TrueMoney
            <button 
              className="payment-btn truemoney" 
              onClick={() => handlePayment('truemoney')}
              disabled={loading}
            >
              {loading && paymentMethod === 'truemoney' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <img src={true1} alt="TrueMoney" className="btn-logo" /> TrueMoney
                </>
              )}
            </button> */}
            
            {/* ปุ่มชำระเงินด้วยเงินสด
            <button 
              className="payment-btn cash" 
              onClick={() => handlePayment('cash')}
              disabled={loading}
            >
              {loading && paymentMethod === 'cash' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <img src={cash} alt="Cash" className="btn-logo" style={{ maxHeight: "30px" }} /> เงินสด
                </>
              )}
            </button> */}
          </div>
        </div>

        <div className="form-buttonsP">
          <Button 
            className="btn2" 
            onClick={() => navigate(-1)}
            disabled={loading}
          >
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
                      location.pathname === "/profile/payment" ? "active" : ""
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

export default Payment;
