//Home.jsx
import React, { useState } from "react";
import { Navbar, Nav } from "react-bootstrap";

import { House, Search, CardChecklist, Person } from "react-bootstrap-icons"; // ใช้ไอคอนจาก Bootstrap Icons
import { FaSearch, FaHistory, FaUser } from "react-icons/fa"; // นำเข้าไอคอนที่ต้องการ
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { PiClockCounterClockwiseBold } from "react-icons/pi";
import { IoHome } from "react-icons/io5";
import { FaAngleUp, FaAngleDown } from "react-icons/fa";

import DatePicker from "react-datepicker"; // ติดตั้งผ่าน npm install react-datepicker
import "react-datepicker/dist/react-datepicker.css";
import { useLocation, Link } from "react-router-dom";
import "./Record.css";
import recordData from "../../data/RecordData";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function Record({}) {
  const location = useLocation(); // ใช้ location เพื่อตรวจสอบเส้นทางปัจจุบัน

  const [selectedLast, setSelectedLast] = useState(null); // เก็บค่าที่เลือกจาก Dropdown
  const [selectedDate, setSelectedDate] = useState(""); // เก็บวันที่ที่เลือก
  const [expandedId, setExpandedId] = useState(null); // เก็บสถานะการขยายรายละเอียด

  function formatDateToThai(dateString) {
    const monthsThai = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];

    const date = new Date(dateString); // แปลงวันที่เป็น Date object
    const day = date.getDate(); // วันที่
    const month = monthsThai[date.getMonth()]; // เดือนภาษาไทย
    const year = date.getFullYear() + 543; // ปีพุทธศักราช

    return `${day} ${month} ${year}`;
  }

  // ฟังก์ชันกรองข้อมูล
  const filteredData = recordData.filter((record) => {
    const recordDate = new Date(record.date); // แปลงวันที่ของ record เป็น Date object

    // ถ้ามีการเลือกวันที่เฉพาะ
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate);
      return (
        recordDate.getFullYear() === selectedDateObj.getFullYear() &&
        recordDate.getMonth() === selectedDateObj.getMonth() &&
        recordDate.getDate() === selectedDateObj.getDate()
      );
    }

    // ถ้าเลือก "สัปดาห์นี้"
    if (selectedLast === "สัปดาห์นี้") {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // วันเริ่มต้นของสัปดาห์
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // วันสิ้นสุดของสัปดาห์
      return recordDate >= startOfWeek && recordDate <= endOfWeek;
    }

    // ถ้าเลือก "เดือนนี้"
    if (selectedLast === "เดือนนี้") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // วันแรกของเดือน
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // วันสุดท้ายของเดือน
      return recordDate >= startOfMonth && recordDate <= endOfMonth;
    }

    return true; // แสดงข้อมูลทั้งหมดถ้าไม่มีการเลือก
  });

  return (
    <div style={{ minHeight: "844px" }}>
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
        <h2 className="text-center">
          ประวัติการจอด{" "}
          <PiClockCounterClockwiseBold className="iconClock" size={43} />
        </h2>

        <div className="boxrecord">
          <div className="dropdownrecord">
            <div className="record-section1">
              <input
                type="date"
                className="form-control custom-date-picker1"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedLast(null); // รีเซ็ต Dropdown
                }}
              />
            </div>
            <button
              className="btn btn-light dropdown-toggle "
              type="button"
              id="dropdownMenuButton"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                marginLeft: "4px",
                width: "90px",
                float: "right",
                marginTop: "-35px",
                marginRight: "15px",
              }}
            >
              {selectedLast || "ล่าสุด"}
            </button>
            <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedLast(null);
                    setSelectedDate(""); // รีเซ็ตวันที่
                  }}
                >
                  ล่าสุด
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedLast("สัปดาห์นี้");
                    setSelectedDate(""); // รีเซ็ตวันที่
                  }}
                >
                  สัปดาห์นี้
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedLast("เดือนนี้");
                    setSelectedDate(""); // รีเซ็ตวันที่
                  }}
                >
                  เดือนนี้
                </button>
              </li>
            </ul>
          </div>

          <div className="record-list">
            {filteredData.length > 0 ? (
              filteredData.map((record) => (
                <div
                  key={record.id}
                  className={`record-item ${
                    expandedId === record.id ? "expanded" : ""
                  }`}
                >
                  {/* รูปภาพ */}
                  <div className="record-image-container">
                    <img
                      src={record.image}
                      alt="car"
                      className="record-car-image"
                    />
                  </div>

                  {/* ข้อมูลย่อ (ซ่อนเมื่อกดแสดงรายละเอียดเพิ่มเติม) */}
                  <div
                    className={`record-summary ${
                      expandedId === record.id ? "hidden" : ""
                    }`}
                  >
                    <div className="record-details">
                      <p className="record-date">
                        {formatDateToThai(record.date)}
                      </p>
                      <p className="record-building">{record.building}</p>
                      <p className="record-floor">{record.floor}</p>
                      <p className="record-time">เวลา : {record.time}</p>
                    </div>
                    <button
                      className="content-detalis1"
                      onClick={() =>
                        setExpandedId(
                          expandedId === record.id ? null : record.id
                        )
                      }
                    >
                      <span>รายละเอียดเพิ่มเติม</span>{" "}
                      <FaAngleDown
                        className="icon"
                        size={20}
                        style={{ marginTop: "-22px", marginLeft: "110px" }}
                      />
                    </button>
                  </div>

                  {/* รายละเอียดเพิ่มเติม (แสดงเมื่อกด) */}
                  {expandedId === record.id && (
                    <div className="record-expanded">
                      <div className="daterecord">
                        <p className="record-date2">
                          {formatDateToThai(record.carDetails.date)}
                        </p>
                      </div>
                      <div className="record-detail-item">
                        <span>สถานที่จอดรถ : </span>
                        <span>{record.carDetails.parklot}</span>
                      </div>
                      <div className="record-detail-item">
                        <span>เลขที่บัตร : </span>
                        <span>{record.carDetails.plate}</span>
                      </div>
                      <div className="record-detail-item">
                        <span>ทะเบียนรถ : </span>
                        <span style={{ textAlign: "right" }}>
                          {" "}
                          {record.carDetails.carNumber.map((line, index) => (
                            <React.Fragment key={index}>
                              {line}
                              <br />
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                      <div className="record-detail-item">
                        <span>วันที่-เวลาเข้า/ออก :</span>
                        <span>{record.carDetails.insuranceDate}</span>
                      </div>
                      <div className="record-detail-item">
                        <span>ยี่ห้อรถ :</span>
                        <span> {record.carDetails.model}</span>
                      </div>
                      <div className="record-detail-item">
                        <span>ระยะเวลา : </span>
                        <span>{record.carDetails.duration}</span>
                      </div>
                      <button
                        className="content-shorten"
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
            ) : (
              <p>ไม่พบข้อมูล</p>
            )}
          </div>
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
