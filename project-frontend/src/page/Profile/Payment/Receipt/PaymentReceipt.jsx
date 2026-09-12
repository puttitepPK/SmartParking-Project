// PaymentReceipt.jsx
import React, { useState, useEffect } from "react";
import { Nav, Button, Spinner, Modal } from "react-bootstrap";
import { FaSearch, FaHistory, FaUser, FaDownload, FaCheckCircle, FaPrint } from "react-icons/fa";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import logo from "/public/Metthier Master Logo.png";
import html2canvas from "html2canvas";
import "./PaymentReceipt.css";

// นำเข้าฟังก์ชันสำหรับดึงข้อมูลใบเสร็จ
import { getReceipt } from "../../../../services/paymentService";

function PaymentReceipt() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // สถานะสำหรับข้อมูลใบเสร็จ
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30); // 30 วินาทีก่อนกลับไปหน้าประวัติการจอด
  
  // ดึงข้อมูลใบเสร็จจาก API หรือ sessionStorage และเพิ่มราคาอีก 20 บาท
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        // ตรวจสอบว่ามีข้อมูลการชำระเงินล่าสุดใน sessionStorage หรือไม่
        const lastPayment = sessionStorage.getItem("lastPayment");
        
        if (lastPayment) {
          const paymentData = JSON.parse(lastPayment);
          
          // ถ้ามี paymentId ให้ดึงข้อมูลใบเสร็จจาก API
          if (paymentData.paymentId) {
            try {
              console.log("Fetching receipt for payment ID:", paymentData.paymentId);
              const response = await getReceipt(paymentData.paymentId);
              
              if (response.success) {
                console.log("Receipt data from API:", response.data);
                
                // เพิ่มราคาอีก 20 บาท
                const modifiedData = { ...response.data };
                
                // เพิ่มค่าบริการอีก 20 บาท
                if (typeof modifiedData.amount === 'number') {
                  modifiedData.amount += 20;
                } else if (modifiedData.amount) {
                  modifiedData.amount = parseFloat(modifiedData.amount) + 20;
                } else {
                  modifiedData.amount = 20;
                }
                
                // เพิ่มค่าบริการในส่วนของ service_fee
                if (typeof modifiedData.service_fee === 'number') {
                  modifiedData.service_fee += 20;
                } else if (modifiedData.service_fee) {
                  modifiedData.service_fee = parseFloat(modifiedData.service_fee) + 20;
                } else {
                  modifiedData.service_fee = 20;
                }
                
                console.log("Modified receipt data (added 20 baht):", modifiedData);
                setReceiptData(modifiedData);
              } else {
                throw new Error(response.message || "ไม่สามารถดึงข้อมูลใบเสร็จได้");
              }
            } catch (apiError) {
              console.error("API Error:", apiError);
              
              // ถ้าไม่สามารถดึงข้อมูลจาก API ได้ ให้ใช้ข้อมูลจาก sessionStorage แทน
              console.log("Using receipt data from sessionStorage as fallback");
              const savedData = sessionStorage.getItem("receiptData");
              
              if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // เพิ่มราคาอีก 20 บาท
                if (typeof parsedData.amount === 'number') {
                  parsedData.amount += 20;
                } else if (parsedData.amount) {
                  parsedData.amount = parseFloat(parsedData.amount) + 20;
                } else {
                  parsedData.amount = 20;
                }
                
                // เพิ่มค่าบริการในส่วนของ service_fee
                if (typeof parsedData.service_fee === 'number') {
                  parsedData.service_fee += 20;
                } else if (parsedData.service_fee) {
                  parsedData.service_fee = parseFloat(parsedData.service_fee) + 20;
                } else {
                  parsedData.service_fee = 20;
                }
                
                setReceiptData(parsedData);
              } else {
                setError("ไม่พบข้อมูลใบเสร็จ");
              }
            }
          } else {
            // ถ้าไม่มี paymentId ให้ใช้ข้อมูลจาก sessionStorage
            const savedData = sessionStorage.getItem("receiptData");
            
            if (savedData) {
              const parsedData = JSON.parse(savedData);
              
              // เพิ่มราคาอีก 20 บาท
              if (typeof parsedData.amount === 'number') {
                parsedData.amount += 20;
              } else if (parsedData.amount) {
                parsedData.amount = parseFloat(parsedData.amount) + 20;
              } else {
                parsedData.amount = 20;
              }
              
              // เพิ่มค่าบริการในส่วนของ service_fee
              if (typeof parsedData.service_fee === 'number') {
                parsedData.service_fee += 20;
              } else if (parsedData.service_fee) {
                parsedData.service_fee = parseFloat(parsedData.service_fee) + 20;
              } else {
                parsedData.service_fee = 20;
              }
              
              setReceiptData(parsedData);
            } else {
              setError("ไม่พบข้อมูลใบเสร็จ");
            }
          }
        } else {
          // ถ้าไม่มีข้อมูลการชำระเงินล่าสุด ให้ใช้ข้อมูลจาก sessionStorage
          const savedData = sessionStorage.getItem("receiptData");
          
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // เพิ่มราคาอีก 20 บาท
            if (typeof parsedData.amount === 'number') {
              parsedData.amount += 20;
            } else if (parsedData.amount) {
              parsedData.amount = parseFloat(parsedData.amount) + 20;
            } else {
              parsedData.amount = 20;
            }
            
            // เพิ่มค่าบริการในส่วนของ service_fee
            if (typeof parsedData.service_fee === 'number') {
              parsedData.service_fee += 20;
            } else if (parsedData.service_fee) {
              parsedData.service_fee = parseFloat(parsedData.service_fee) + 20;
            } else {
              parsedData.service_fee = 20;
            }
            
            setReceiptData(parsedData);
          } else {
            setError("ไม่พบข้อมูลใบเสร็จ");
          }
        }
      } catch (error) {
        console.error("Error loading receipt data:", error);
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูลใบเสร็จ");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceiptData();
  }, []);
  
  // ฟังก์ชันสำหรับพิมพ์ใบเสร็จ
  const handlePrintReceipt = () => {
    html2canvas(document.querySelector(".receipt-container")).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบเสร็จการชำระเงิน</title>
              <style>
                body { 
                  font-family: 'Kanit', sans-serif;
                  display: flex;
                  justify-content: center;
                  padding: 20px;
                }
                img { max-width: 100%; }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="ใบเสร็จการชำระเงิน" />
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // รอให้รูปภาพโหลดเสร็จก่อนพิมพ์
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        alert("กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัพเพื่อพิมพ์ใบเสร็จ");
      }
    });
  };
  
  // ฟังก์ชันสำหรับบันทึกใบเสร็จเป็นรูปภาพ
  const handleSaveReceipt = () => {
    html2canvas(document.querySelector(".receipt-container")).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `receipt-${new Date().getTime()}.png`;
      link.click();
    });
  };
  
  // ฟังก์ชันสำหรับกลับไปหน้าประวัติการจอด
  const handleGoToHistory = () => {
    navigate("/record");
  };
  
  // ฟังก์ชันสำหรับกลับไปหน้าหลัก
  const handleGoHome = () => {
    navigate("/home");
  };
  
  // นับถอยหลังเพื่อกลับไปหน้าประวัติการจอดโดยอัตโนมัติ
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate("/record");
    }
  }, [countdown, navigate]);
  
  // ฟอร์แมตวันที่และเวลาให้อยู่ในรูปแบบไทย
  const formatThaiDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "-";
    
    try {
      const date = new Date(dateTimeStr);
      
      // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
      if (isNaN(date.getTime())) return dateTimeStr;
      
      // แปลงเป็นรูปแบบไทย
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      // แปลงปีคริสต์ศักราชเป็นพุทธศักราช
      let thaiDate = date.toLocaleDateString('th-TH', options);
      
      return thaiDate;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateTimeStr;
    }
  };

  return (
    <div className="payment-receipt-page">
      <div className="box3">
        <img src={logo} alt="Logo" className="Logo3-image" />
      </div>
      
      <div className="main-content">
        {loading ? (
          <div className="loading-container">
            <Spinner animation="border" variant="primary" />
            <p>กำลังโหลดข้อมูลใบเสร็จ...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <Button variant="primary" onClick={handleGoToHistory}>
              กลับไปหน้าประวัติการจอด
            </Button>
          </div>
        ) : (
          <>
            <div className="receipt-header">
              <h2>ใบเสร็จการชำระเงิน</h2>
              <p className="receipt-subtitle">ชำระเงินเรียบร้อยแล้ว</p>
              <div className="countdown-info">
                <p>จะกลับไปยังหน้าประวัติการจอดใน <span className="countdown-number">{countdown}</span> วินาที</p>
              </div>
            </div>
            
            <div className="receipt-container">
              <div className="receipt-logo">
                <img src={logo} alt="Logo" className="receipt-logo-img" />
              </div>
              
              <div className="receipt-title">
                <h3>ใบเสร็จรับเงิน</h3>
                <p>เลขที่อ้างอิง: {receiptData?.reference || "-"}</p>
                <p>วันที่: {formatThaiDateTime(receiptData?.timestamp) || "-"}</p>
              </div>
              
              <div className="receipt-details">
                <div className="receipt-section">
                  <h4>ข้อมูลการจอด</h4>
                  <div className="receipt-row">
                    <span>สถานที่:</span>
                    <span>{receiptData?.buildingName || "-"} {receiptData?.areaName || ""}</span>
                  </div>
                  {receiptData?.licensePlate && (
                    <div className="receipt-row">
                      <span>ทะเบียนรถ:</span>
                      <span>{receiptData.licensePlate}</span>
                    </div>
                  )}
                  {receiptData?.entryDate && (
                    <div className="receipt-row">
                      <span>วันที่เข้า:</span>
                      <span>{receiptData.entryDate}</span>
                    </div>
                  )}
                  {receiptData?.entryTime && (
                    <div className="receipt-row">
                      <span>เวลาเข้า:</span>
                      <span>{receiptData.entryTime}</span>
                    </div>
                  )}
                  {receiptData?.exitDate && (
                    <div className="receipt-row">
                      <span>วันที่ออก:</span>
                      <span>{receiptData.exitDate}</span>
                    </div>
                  )}
                  {receiptData?.exitTime && (
                    <div className="receipt-row">
                      <span>เวลาออก:</span>
                      <span>{receiptData.exitTime}</span>
                    </div>
                  )}
                </div>
                
                <div className="receipt-section">
                  <h4>ข้อมูลการชำระเงิน</h4>
                  <div className="receipt-row">
                    <span>วิธีการชำระเงิน:</span>
                    <span>{receiptData?.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : receiptData?.paymentMethod || "-"}</span>
                  </div>
                  <div className="receipt-row">
                    <span>จำนวนเงิน:</span>
                    <span className="receipt-amount">
                      {typeof receiptData?.amount === 'number' 
                        ? receiptData.amount.toFixed(2) 
                        : parseFloat(receiptData?.amount || 0).toFixed(2)} บาท
                    </span>
                  </div>
                  {receiptData?.service_fee > 0 && (
                    <div className="receipt-row">
                      <span>ค่าบริการ:</span>
                      <span>
                        {typeof receiptData?.service_fee === 'number' 
                          ? receiptData.service_fee.toFixed(2) 
                          : parseFloat(receiptData?.service_fee || 0).toFixed(2)} บาท
                      </span>
                    </div>
                  )}
                  {receiptData?.fine_fee > 0 && (
                    <div className="receipt-row">
                      <span>ค่าปรับ:</span>
                      <span>
                        {typeof receiptData?.fine_fee === 'number' 
                          ? receiptData.fine_fee.toFixed(2) 
                          : parseFloat(receiptData?.fine_fee || 0).toFixed(2)} บาท
                      </span>
                    </div>
                  )}
                  {receiptData?.discount > 0 && (
                    <div className="receipt-row">
                      <span>ส่วนลด:</span>
                      <span>
                        {typeof receiptData?.discount === 'number' 
                          ? receiptData.discount.toFixed(2) 
                          : parseFloat(receiptData?.discount || 0).toFixed(2)} บาท
                      </span>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span>สถานะ:</span>
                    <span className="receipt-status">ชำระเงินเรียบร้อยแล้ว</span>
                  </div>
                </div>
                
                <div className="receipt-footer">
                  <p>ขอบคุณที่ใช้บริการ</p>
                </div>
              </div>
            </div>
            
            <div className="receipt-actions">
              <Button 
                variant="outline-primary" 
                className="receipt-action-btn"
                onClick={handlePrintReceipt}
              >
                <FaPrint className="btn-icon" /> พิมพ์ใบเสร็จ
              </Button>
              
              <Button 
                variant="outline-success" 
                className="receipt-action-btn"
                onClick={handleSaveReceipt}
              >
                <FaDownload className="btn-icon" /> บันทึกใบเสร็จ
              </Button>
              
              <Button 
                variant="primary" 
                className="receipt-action-btn"
                onClick={handleGoToHistory}
              >
                <FaHistory className="btn-icon" /> ดูประวัติการจอด
              </Button>
              
              <Button 
                variant="secondary" 
                className="receipt-action-btn"
                onClick={handleGoHome}
              >
                <IoHome className="btn-icon" /> กลับหน้าหลัก
              </Button>
            </div>
          </>
        )}
      </div>
      
      <div className="boxnav1">
        <div className="boxnav">
          <div className="bottom-navbar">
            <Nav className="justify-content-around">
              <Nav.Item>
                <Link
                  to="/home"
                  className={`nav-item home-link ${
                    location.pathname === "/home" ? "active" : ""
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
                    location.pathname.includes("/profile") ? "active" : ""
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
  );
}

export default PaymentReceipt;
