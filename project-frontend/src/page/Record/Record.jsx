import React, { useState, useEffect } from "react";
import { Navbar, Nav, Button, Spinner, Modal, Alert } from "react-bootstrap";
import axios from "axios";

import { House, Search, CardChecklist, Person } from "react-bootstrap-icons";
import { FaSearch, FaHistory, FaUser, FaAngleUp, FaAngleDown, FaCheckCircle, FaPrint, FaDownload } from "react-icons/fa";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { PiClockCounterClockwiseBold } from "react-icons/pi";
import { IoHome } from "react-icons/io5";

import { useLocation, Link } from "react-router-dom";
import "./Record.css";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// นำเข้าฟังก์ชัน getAllParkingHistory และ getParkingHistoryDetail จาก parkingHistoryService
import { getAllParkingHistory, getParkingHistoryDetail } from "../../services/parkingHistoryService";

function Record() {
  const location = useLocation();

  // สถานะสำหรับจัดการข้อมูล
  const [parkingHistory, setParkingHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedLast, setSelectedLast] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [historyDetail, setHistoryDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // จำนวนรายการต่อหน้า
  const [vehicleImages, setVehicleImages] = useState({});
  
  // สถานะสำหรับแสดงการแจ้งเตือนการชำระเงินสำเร็จ
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  // เพิ่ม state สำหรับควบคุมการแสดง/ซ่อนเมนู
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // เพิ่ม effect สำหรับจัดการคลิกนอกเมนู
  useEffect(() => {
    function handleClickOutside(e) {
      if (showFilterMenu && !e.target.closest(".record-filter-wrapper")) {
        setShowFilterMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterMenu]);

  // ดึงรูปภาพยานพาหนะ
  const fetchVehicleImages = async (parkingHistoryList) => {
    try {
      const token = localStorage.getItem("userToken");
      const imagesMap = {};

      // ดึงรูปภาพสำหรับยานพาหนะในประวัติการจอดแต่ละรายการ
      await Promise.all(
        parkingHistoryList.map(async (history) => {
          // ตรวจสอบว่ามีข้อมูลทะเบียนรถ
          if (!history.license_plate) {
            console.warn("Missing license plate in history record:", history);
            return;
          }

          try {
            // สร้างคีย์เฉพาะสำหรับยานพาหนะนี้
            const uniqueKey = `${history.license_plate}_${history.vehicle_brand}_${history.vehicle_model}`;

            // ถ้ายังไม่เคยดึงรูปภาพสำหรับยานพาหนะนี้
            if (!imagesMap[uniqueKey]) {
              // แทนที่จะใช้ vehicle_id ให้ใช้การค้นหาจากทะเบียนรถ
              const vehiclesResponse = await axios.get(
                `http://localhost:3000/users/vehicles`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              // ค้นหายานพาหนะที่มีทะเบียนรถตรงกับในประวัติ
              const matchingVehicles = vehiclesResponse.data.filter(
                (vehicle) =>
                  vehicle.license_plate === history.license_plate &&
                  vehicle.vehicle_brand === history.vehicle_brand &&
                  vehicle.vehicle_model === history.vehicle_model
              );

              // หากพบยานพาหนะที่ตรงกัน
              for (const matchingVehicle of matchingVehicles) {
                try {
                  const imageResponse = await axios.get(
                    `http://localhost:3000/users/vehicles/${matchingVehicle.vehicle_id}/image`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );

                  if (imageResponse.data.vehicle_image) {
                    imagesMap[
                      uniqueKey
                    ] = `http://localhost:3000${imageResponse.data.vehicle_image}`;
                    break; // หยุดการค้นหาหลังจากพบรูปภาพ
                  }
                } catch (imageError) {
                  console.error(
                    `Error fetching image for vehicle ${matchingVehicle.vehicle_id}:`,
                    imageError
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              `Error fetching vehicles for license plate ${history.license_plate}:`,
              error
            );
          }
        })
      );

      setVehicleImages((prevImages) => ({
        ...prevImages,
        ...imagesMap,
      }));
    } catch (error) {
      console.error("Error fetching vehicle images:", error);
    }
  };

  // ดึงข้อมูลประวัติการจอดรถโดยใช้ฟังก์ชันจาก parkingHistoryService
  const fetchParkingHistory = async (page = 1, timeFilter = null) => {
    setIsLoading(true);
    setError(null);

    try {
      // ใช้ฟังก์ชัน getAllParkingHistory แทนการเรียก API โดยตรง
      const response = await getAllParkingHistory(page, limit);

      // อัพเดทข้อมูลประวัติการจอดรถและข้อมูลการแบ่งหน้า
      if (response.success) {
        setParkingHistory(response.data);

        // เรียกเพื่อดึงรูปภาพยานพาหนะ
        await fetchVehicleImages(response.data);

        setTotalPages(response.pagination.totalPages);
        setCurrentPage(response.pagination.currentPage);
      } else {
        throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    } catch (err) {
      console.error("Error fetching parking history:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "เกิดข้อผิดพลาดในการดึงข้อมูล"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ดึงรายละเอียดประวัติการจอดรถตาม ID โดยใช้ฟังก์ชันจาก parkingHistoryService
  const fetchHistoryDetail = async (historyId) => {
    try {
      // ใช้ฟังก์ชัน getParkingHistoryDetail แทนการเรียก API โดยตรง
      const response = await getParkingHistoryDetail(historyId);

      if (response.success) {
        setHistoryDetail(response.data);
      } else {
        throw new Error("เกิดข้อผิดพลาดในการดึงรายละเอียด");
      }
    } catch (err) {
      console.error("Error fetching history detail:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "เกิดข้อผิดพลาดในการดึงรายละเอียด"
      );
    }
  };

  // ฟังก์ชันสำหรับเปลี่ยนหน้า
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchParkingHistory(
        newPage,
        selectedLast ? mapThaiToApiFilter(selectedLast) : null
      );
    }
  };

  // ฟังก์ชันแปลงตัวกรองภาษาไทยเป็นรูปแบบที่ API เข้าใจ
  const mapThaiToApiFilter = (thaiFilter) => {
    switch (thaiFilter) {
      case "สัปดาห์นี้":
        return "thisWeek";
      case "เดือนนี้":
        return "thisMonth";
      default:
        return null;
    }
  };

  // ฟังก์ชันจัดการการกดดูรายละเอียด
  const toggleExpandedItem = async (historyId) => {
    if (expandedId === historyId) {
      // ถ้ากดที่เดิมซ้ำ ให้ปิดรายละเอียด
      setExpandedId(null);
      setHistoryDetail(null);
    } else {
      // ถ้ากดที่ใหม่ ให้ดึงรายละเอียดและเปิดแสดง
      setExpandedId(historyId);
      await fetchHistoryDetail(historyId);
    }
  };

  // ฟังก์ชันจัดการตัวกรองเวลา
  const handleTimeFilterChange = (filter) => {
    setSelectedLast(filter);
    setSelectedDate("");

    // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
    localStorage.removeItem('parking_history');
    
    // ดึงข้อมูลทั้งหมดจาก API ก่อน แล้วค่อยกรองทางฝั่ง frontend
    // เนื่องจาก API อาจไม่รองรับการกรองตามสัปดาห์หรือเดือนที่ต้องการ
    fetchParkingHistory(1);
    
    // ถ้าเลือกตัวกรอง "สัปดาห์นี้" หรือ "เดือนนี้" ให้ใช้ฟังก์ชันกรองที่เกี่ยวข้อง
    if (filter === "สัปดาห์นี้" || filter === "เดือนนี้") {
      console.log(`กำลังกรองข้อมูลตาม ${filter}`);
    }
  };

  // แปลงวันที่เป็นรูปแบบที่ API เข้าใจ (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    return date ? new Date(date).toISOString().split("T")[0] : null;
  };

  // ฟังก์ชันแปลงเดือนไทยเป็นตัวเลข
  const thaiMonthToNumber = (thaiMonth) => {
    const monthMap = {
      มกราคม: 0,
      กุมภาพันธ์: 1,
      มีนาคม: 2,
      เมษายน: 3,
      พฤษภาคม: 4,
      มิถุนายน: 5,
      กรกฎาคม: 6,
      สิงหาคม: 7,
      กันยายน: 8,
      ตุลาคม: 9,
      พฤศจิกายน: 10,
      ธันวาคม: 11,
    };
    return monthMap[thaiMonth] || 0;
  };

  // แปลงวันที่ไทย (วัน เดือน ปี) เป็น Date object
  const parseThaiBuddhistDate = (thaiDateStr) => {
    if (!thaiDateStr) return null;

    try {
      // แยกส่วนวันที่ เดือน ปี
      const parts = thaiDateStr.split(" ");
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const monthThai = parts[1];
      const yearBuddhist = parseInt(parts[2], 10);

      // แปลงปีพุทธศักราชเป็นคริสต์ศักราช
      const yearGregorian = yearBuddhist - 543;

      // แปลงเดือนไทยเป็นตัวเลข (0-11)
      const month = thaiMonthToNumber(monthThai);

      return new Date(yearGregorian, month, day);
    } catch (e) {
      console.error("Error parsing Thai date:", e);
      return null;
    }
  };

  // ฟังก์ชันจัดการการเลือกวันที่
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedLast(null);

    // ดึงข้อมูลทั้งหมดแล้วกรองทางฝั่ง frontend เพราะ API ไม่รองรับพารามิเตอร์วันที่
    fetchParkingHistory(1);
  };

  // เพิ่มฟังก์ชัน refresh ข้อมูล
  const refreshData = () => {
    // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
    localStorage.removeItem('parking_history');
    
    // ดึงข้อมูลล่าสุดจากฐานข้อมูล
    fetchParkingHistory(currentPage, selectedLast ? mapThaiToApiFilter(selectedLast) : null);
  };

  // ตรวจสอบข้อมูลการชำระเงินจาก sessionStorage
  useEffect(() => {
    try {
      const savedReceiptData = sessionStorage.getItem("receiptData");
      if (savedReceiptData) {
        const parsedData = JSON.parse(savedReceiptData);
        setPaymentData(parsedData);
        setShowPaymentSuccess(true);
        
        // ล้างข้อมูลใบเสร็จหลังจากแสดงการแจ้งเตือน
        setTimeout(() => {
          sessionStorage.removeItem("receiptData");
        }, 1000);
      }
    } catch (error) {
      console.error("Error loading receipt data:", error);
    }
  }, []);

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
    localStorage.removeItem('parking_history');
    
    // ดึงข้อมูลล่าสุดจากฐานข้อมูล
    fetchParkingHistory(1);
    
    // ตั้ง interval เพื่อรีเฟรชข้อมูลทุก 15 วินาที
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 15000);
    
    // เคลียร์ interval เมื่อ component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // เมื่อมีการเปลี่ยนแปลงตัวกรอง ให้ console.log เพื่อตรวจสอบ
  useEffect(() => {
    if (selectedLast) {
      console.log(`ตัวกรองที่เลือก: ${selectedLast}`);
      if (selectedLast === "สัปดาห์นี้") {
        console.log(`จำนวนข้อมูลหลังกรอง: ${parkingHistory.filter(filterThisWeek).length} จากทั้งหมด ${parkingHistory.length}`);
      } else if (selectedLast === "เดือนนี้") {
        console.log(`จำนวนข้อมูลหลังกรอง: ${parkingHistory.filter(filterThisMonth).length} จากทั้งหมด ${parkingHistory.length}`);
      }
    }
  }, [selectedLast, parkingHistory]);

  // ฟังก์ชันกรองข้อมูลสำหรับสัปดาห์นี้
  const filterThisWeek = (item) => {
    try {
      // แปลงวันที่ไทยเป็น Date object
      const itemDate = parseThaiBuddhistDate(item.entry_date);
      if (!itemDate) return false;

      // สร้างวันที่ปัจจุบัน
      const today = new Date();
      
      // คำนวณวันแรกของสัปดาห์ (วันอาทิตย์)
      const firstDayOfWeek = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = วันอาทิตย์, 1 = วันจันทร์, ...
      firstDayOfWeek.setDate(today.getDate() - dayOfWeek);
      firstDayOfWeek.setHours(0, 0, 0, 0);
      
      // คำนวณวันสุดท้ายของสัปดาห์ (วันเสาร์)
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);
      
      // ตรวจสอบว่าวันที่อยู่ในช่วงสัปดาห์นี้หรือไม่
      return itemDate >= firstDayOfWeek && itemDate <= lastDayOfWeek;
    } catch (e) {
      console.error("Week filtering error:", e, item.entry_date);
      return false;
    }
  };

  const filterThisMonth = (item) => {
    try {
      // แปลงวันที่ไทยเป็น Date object
      const itemDate = parseThaiBuddhistDate(item.entry_date);
      if (!itemDate) return false;

      // สร้างวันที่ปัจจุบัน
      const today = new Date();
      
      // ตรวจสอบว่าเป็นปีและเดือนปัจจุบันหรือไม่ - ต้องเป็นปีและเดือนปัจจุบันเท่านั้น
      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth()
      );
    } catch (e) {
      console.error("Month filtering error:", e, item.entry_date);
      return false;
    }
  };

  // กรองข้อมูลตามวันที่ที่เลือก
  const filteredHistory = selectedDate
    ? parkingHistory.filter((item) => {
        try {
          // แปลงวันที่ที่เลือกเป็น Date object
          const filterDate = new Date(selectedDate);

          // แปลงวันที่ไทยเป็น Date object
          const itemDate = parseThaiBuddhistDate(item.entry_date);
          if (!itemDate) return false;

          // เปรียบเทียบเฉพาะ ปี เดือน วัน
          return (
            itemDate.getFullYear() === filterDate.getFullYear() &&
            itemDate.getMonth() === filterDate.getMonth() &&
            itemDate.getDate() === filterDate.getDate()
          );
        } catch (e) {
          console.error("Date filtering error:", e, item.entry_date);
          return false;
        }
      })
    : selectedLast === "สัปดาห์นี้"
    ? parkingHistory.filter(filterThisWeek)
    : selectedLast === "เดือนนี้"
    ? parkingHistory.filter(filterThisMonth)
    : parkingHistory;
    
  // แสดงข้อมูลการกรองในคอนโซล (สำหรับการตรวจสอบ)
  useEffect(() => {
    if (filteredHistory.length !== parkingHistory.length) {
      console.log(`กรองข้อมูลแล้ว: ${filteredHistory.length} รายการ จากทั้งหมด ${parkingHistory.length} รายการ`);
    }
  }, [filteredHistory, parkingHistory]);

  return (
    <div style={{ minHeight: "844px" }}>
      {/* Modal แสดงการชำระเงินสำเร็จ */}
      <Modal 
        show={showPaymentSuccess} 
        onHide={() => setShowPaymentSuccess(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCheckCircle className="text-success me-2" />
            ชำระเงินสำเร็จ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* <Alert variant="success">
            <p className="mb-2">การชำระเงินของคุณเสร็จสมบูรณ์แล้ว</p>
            {paymentData && (
              <div className="payment-details mt-3">
                <p><strong>จำนวนเงิน:</strong> {paymentData.amount} บาท</p>
                <p><strong>วิธีการชำระเงิน:</strong> {paymentData.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : paymentData.paymentMethod}</p>
                {paymentData.buildingName && (
                  <p><strong>สถานที่:</strong> {paymentData.buildingName} {paymentData.areaName || ''}</p>
                )}
                {paymentData.licensePlate && (
                  <p><strong>ทะเบียนรถ:</strong> {paymentData.licensePlate}</p>
                )}
              </div>
            )}
            <p className="mt-3">ขณะนี้คุณอยู่ในหน้าประวัติการจอด สามารถดูรายละเอียดการชำระเงินได้ที่นี่</p>
          </Alert> */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentSuccess(false)}>
            ปิด
          </Button>
          <Button variant="primary" onClick={() => {
            setShowPaymentSuccess(false);
            // ถ้ามีข้อมูลประวัติการจอดล่าสุด ให้ขยายรายละเอียด
            if (parkingHistory.length > 0) {
              toggleExpandedItem(parkingHistory[0].history_id);
            }
          }}>
            ดูรายละเอียด
          </Button>
        </Modal.Footer>
      </Modal>

      <div>
        <div className="box2">
          <img
            src="./Metthier Master Logo.png"
            alt="My Logo"
            className="Logo2-image"
          />
        </div>
      </div>

      <div className="main-content3">
        <h2 className="record-heading">
          ประวัติการจอด{" "}
          <PiClockCounterClockwiseBold className="iconClock" size={43} />
        </h2>

        <div className="record-container">
          <div className="record-filter-container">
            <div className="record-date-section">
              <input
                type="date"
                className="record-date-picker"
                value={selectedDate}
                onChange={handleDateChange}
              />

              {/* แทนที่ปุ่มดรอปดาวน์และเมนูเดิมด้วยส่วนนี้ */}
              <div className="record-filter-wrapper">
                <button
                  className="record-filter-dropdown"
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                >
                  {selectedLast || "ล่าสุด"}
                </button>

                {showFilterMenu && (
                  <div className="record-filter-menu">
                    <button
                      className="record-filter-item"
                      onClick={() => {
                        handleTimeFilterChange(null);
                        setShowFilterMenu(false);
                      }}
                    >
                      ล่าสุด
                    </button>
                    <button
                      className="record-filter-item"
                      onClick={() => {
                        handleTimeFilterChange("สัปดาห์นี้");
                        setShowFilterMenu(false);
                      }}
                    >
                      สัปดาห์นี้
                    </button>
                    <button
                      className="record-filter-item"
                      onClick={() => {
                        handleTimeFilterChange("เดือนนี้");
                        setShowFilterMenu(false);
                      }}
                    >
                      เดือนนี้
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* ปุ่มรีเฟรชข้อมูล */}
            <Button 
              variant="primary" 
              className="record-refresh-btn"
              onClick={refreshData}
              disabled={isLoading}
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
            >
              {isLoading ? 
                <Spinner animation="border" size="sm" /> : 
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
              }
            </Button>
          </div>

          {/* แสดงข้อความโหลดหรือข้อผิดพลาด */}
          {isLoading && (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mx-3" role="alert">
              {error}
            </div>
          )}

          {/* รายการประวัติการจอดรถ */}
          <div className="record-list">
            {!isLoading && filteredHistory.length > 0
              ? filteredHistory.map((record) => (
                  <div
                    key={record.history_id}
                    className={`record-entry ${
                      expandedId === record.history_id ? "record-expanded" : ""
                    }`}
                  >
                    {/* รูปภาพ */}
                    <div className="record-image-wrapper">
                      <img
                        src={
                          // สร้าง unique key เดียวกับตอนเก็บรูปภาพ
                          vehicleImages[
                            `${record.license_plate}_${record.vehicle_brand}_${record.vehicle_model}`
                          ] || "./Parking1.png"
                        }
                        alt="ยานพาหนะ"
                        className="record-vehicle-image"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "./Parking1.png";
                        }}
                      />
                    </div>

                    {/* ข้อมูลย่อ (ซ่อนเมื่อกดแสดงรายละเอียดเพิ่มเติม) */}
                    <div
                      className={`record-brief ${
                        expandedId === record.history_id ? "record-hidden" : ""
                      }`}
                    >
                      <div className="record-brief-info">
                        <p className="record-entry-date">{record.entry_date}</p>
                        <p className="record-building-name">
                          {record.building_name}
                        </p>
                        <p className="record-area-name">{record.area_name}</p>
                        <p className="record-time-info">
                          เวลา : {record.entry_time}
                        </p>
                      </div>
                      <button
                        className="record-details-btn"
                        onClick={() => toggleExpandedItem(record.history_id)}
                      >
                        <span>รายละเอียดเพิ่มเติม</span>{" "}
                        <FaAngleDown
                          className="icon"
                          size={20}
                          style={{ marginLeft: "110px" }}
                        />
                      </button>
                    </div>

                    {/* รายละเอียดเพิ่มเติม (แสดงเมื่อกด) */}
                    {expandedId === record.history_id && historyDetail && (
                      <div className="record-expanded-details">
                        <div className="record-expanded-date">
                          <p>{historyDetail.entry_date}</p>
                        </div>
                        <div className="record-detail-row">
                          <span>สถานที่จอดรถ : </span>
                          <span>{historyDetail.location_name || historyDetail.building_name}</span>
                        </div>
                        <div className="record-detail-row">
                          <span>เลขที่บัตร : </span>
                          <span>
                            {historyDetail.parking_card_number || "-"}
                          </span>
                        </div>
                        <div className="record-detail-row">
                          <span>ทะเบียนรถ : </span>
                          <span style={{ textAlign: "right" }}>
                            {historyDetail.license_plate}
                          </span>
                        </div>
                        <div className="record-detail-row">
                          <span>เวลาเข้า/ออก :</span>
                          <span>
                            {historyDetail.entry_time} -{" "}
                            {historyDetail.exit_time}
                          </span>
                        </div>
                        <div className="record-detail-row">
                          <span>ยี่ห้อรถ :</span>
                          <span>
                            {" "}
                            {historyDetail.vehicle_brand}{" "}
                            {historyDetail.vehicle_model}
                          </span>
                        </div>
                        <div className="record-detail-row">
                          <span>สีรถ :</span>
                          <span> {historyDetail.vehicle_color || "-"}</span>
                        </div>
                        <div className="record-detail-row">
                          <span>ระยะเวลา : </span>
                          <span>{historyDetail.duration}</span>
                        </div>
                        {historyDetail.parking_fee && parseFloat(historyDetail.parking_fee) > 0 && (
                          <div className="record-detail-row">
                            <span>ค่าบริการ : </span>
                            <span>
                              {typeof historyDetail.parking_fee === 'number' 
                                ? historyDetail.parking_fee.toFixed(2) 
                                : parseFloat(historyDetail.parking_fee).toFixed(2)} บาท
                            </span>
                          </div>
                        )}
                        <div className="record-detail-row">
                          <span>สถานะ : </span>
                          <span>{historyDetail.status_text}</span>
                        </div>
                        <div className="record-detail-row">
                          <span>การชำระเงิน : </span>
                          <span>{historyDetail.payment_status_text}</span>
                        </div>
                        <button
                          className="record-collapse-btn"
                          onClick={() => setExpandedId(null)}
                        >
                          <span>ย่อหน้า</span>{" "}
                          <FaAngleUp
                            className="icon"
                            size={20}
                            style={{ marginTop: "-22px", marginLeft: "50px" }}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              : !isLoading && (
                  <p className="record-empty-message">
                    ไม่พบข้อมูลประวัติการจอดรถ
                  </p>
                )}
          </div>

          {/* ปุ่มนำทางหน้า (หากมีมากกว่า 1 หน้า) */}
          {totalPages > 1 && (
            <div className="pagination-container d-flex justify-content-center my-3">
              <ul className="pagination">
                <li
                  className={`record-page-item ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  <button
                    className="record-page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &laquo;
                  </button>
                </li>

                {/* สร้างปุ่มสำหรับแต่ละหน้า (แสดงไม่เกิน 5 หน้า) */}
                {[...Array(Math.min(5, totalPages)).keys()].map((i) => {
                  // คำนวณว่าควรเริ่มแสดงจากหน้าไหน
                  let start = Math.max(1, currentPage - 2);
                  if (start + 4 > totalPages)
                    start = Math.max(1, totalPages - 4);
                  const pageNumber = start + i;

                  if (pageNumber <= totalPages) {
                    return (
                      <li
                        key={pageNumber}
                        className={`record-page-item ${
                          currentPage === pageNumber ? "active" : ""
                        }`}
                      >
                        <button
                          className="record-page-link"
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    );
                  }
                  return null;
                })}

                <li
                  className={`record-page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="record-page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
            </div>
          )}
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
                    location.pathname === "/profile" ? "active" : ""
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

export default Record;
