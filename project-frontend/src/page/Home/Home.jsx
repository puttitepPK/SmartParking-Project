import React, { useEffect, useState } from "react";
import { Navbar, Nav, Spinner, Button, Modal, Alert } from "react-bootstrap";
import axios from "axios";

import { faAddressCard, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { House, Search, CardChecklist, Person } from "react-bootstrap-icons";
import { FaSearch, FaHistory, FaUser, FaQrcode, FaCar } from "react-icons/fa";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IoHome } from "react-icons/io5";

import { useLocation, Link, useNavigate } from "react-router-dom";
import "./Home.css";
import GraphComponent from "./Graph/graph";

import { getProfilePicture } from "../../services/apiService";
import {
  getUserAppointments,
  simulateScanQRCode,
} from "../../services/appointmentService";
import { getActiveParking } from "../../services/parkingHistoryService";
import defaultProfile from "/Profile1.png";
import { color } from "chart.js/helpers";

// ส่วนที่ต้องเพิ่มใน import
import { getUserVehicles } from "../../services/apiService";
import { Form } from "react-bootstrap";

// Define profile styles
const profileStyles = `
.profile1 {
  width: 85px;
  height: 85px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.appointment-card {
  background-color: #fff;
  border-radius: 15px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  padding: 15px;
  margin-bottom: 20px;
  position: relative;
}

.appointment-title {
  color: #4e73df;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.appointment-details {
  margin-bottom: 5px;
}

.appointment-details strong {
  color: #4a5568;
}

.appointment-qr {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.appointment-qr img {
  max-width: 100%;
  height: auto;
}

.appointment-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 30px;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}

.status-confirmed {
  background-color: #48bb78;
  color: #fff;
}

.status-pending {
  background-color: #f6e05e;
  color: #744210;
}

.status-completed {
  background-color: #9ae6b4;
  color: #22543d;
}

.status-cancelled {
  background-color: #fc8181;
  color: #742a2a;
}

.appointment-details-btn {
  text-align: center;
  margin-top: 10px;
}

.no-appointment {
  text-align: center;
  margin: 20px;
  color: #718096;
  font-style: italic;
}
`;

///เพิ่มเช็คดูวันที่และเวลา

///เพิ่มเช็คดูวันที่และเวลา

// ฟังก์ชันช่วยดึง user ID จาก token
const getCurrentUserId = () => {
  const token = localStorage.getItem("userToken");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id;
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
};

function Home({}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [profilePicture, setProfilePicture] = useState(defaultProfile);
  const [lastUserId, setLastUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeParking, setActiveParking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // ฟังก์ชันดึงรูปโปรไฟล์
  const fetchProfilePicture = async () => {
    try {
      setProfilePicture(defaultProfile);

      const pictureData = await getProfilePicture();
      if (pictureData.profile_picture) {
        const profileImageUrl = `http://localhost:3000${pictureData.profile_picture}`;
        console.log(
          "Setting profile picture URL from server:",
          profileImageUrl
        );

        const token = localStorage.getItem("userToken");
        if (token) {
          try {
            const payload = token.split(".")[1];
            const decoded = JSON.parse(atob(payload));
            const userId = decoded.id;

            localStorage.setItem("profilePicture", profileImageUrl);
            localStorage.setItem("profilePictureOwner", userId.toString());
          } catch (e) {
            console.error("Error decoding token:", e);
          }
        }

        setProfilePicture(profileImageUrl);
      } else {
        console.log("No profile picture found on server");
        localStorage.removeItem("profilePicture");
        localStorage.removeItem("profilePictureOwner");
        setProfilePicture(defaultProfile);
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);

      const token = localStorage.getItem("userToken");
      const storedOwner = localStorage.getItem("profilePictureOwner");
      let currentUserId = null;

      if (token) {
        try {
          const payload = token.split(".")[1];
          const decoded = JSON.parse(atob(payload));
          currentUserId = decoded.id;

          const storedProfilePic = localStorage.getItem("profilePicture");

          if (
            storedProfilePic &&
            storedOwner &&
            storedOwner === currentUserId.toString()
          ) {
            console.log("Using cached profile picture");
            setProfilePicture(storedProfilePic);
            return;
          }
        } catch (e) {
          console.error("Error checking cached profile:", e);
        }
      }

      localStorage.removeItem("profilePicture");
      localStorage.removeItem("profilePictureOwner");
      setProfilePicture(defaultProfile);
    }
  };

  // ฟังก์ชันดึงข้อมูลการนัดหมาย
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // ดึงเฉพาะนัดหมายที่มีสถานะ confirmed และวันที่ปัจจุบันขึ้นไป
      const today = new Date().toISOString().split("T")[0];
      const response = await getUserAppointments({
        status: "confirmed",
        date: today,
      });

      if (response.success && response.data) {
        // เรียงตามวันที่และเวลา
        const sortedAppointments = response.data.sort((a, b) => {
          const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return dateA - dateB;
        });

        setAppointments(sortedAppointments);

        // หานัดหมายปัจจุบันที่ใกล้จะถึงที่สุด (วันนี้)
        const now = new Date();
        const todayAppointments = sortedAppointments.filter((app) => {
          const appDate = new Date(app.appointment_date);
          return appDate.toDateString() === now.toDateString();
        });

        if (todayAppointments.length > 0) {
          setCurrentAppointment(todayAppointments[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลการจอดรถที่กำลังใช้งานอยู่
  const fetchActiveParking = async () => {
    try {
      const response = await getActiveParking();
      console.log("Active parking data:", response);

      if (response.success && response.hasActiveParking) {
        setActiveParking(response.data);
      } else {
        setActiveParking(null);
      }
    } catch (error) {
      console.error("Error fetching active parking:", error);
      setActiveParking(null);
    }
  };

  // ฟังก์ชันแสดง QR Code
  const handleShowQR = (appointment) => {
    if (role === "Visitor") {
      // เก็บข้อมูลการนัดหมายและรถที่เลือกไว้ใน localStorage เพื่อให้หน้า ScanQR ใช้ได้
      if (appointment) {
        localStorage.setItem('selectedAppointment', JSON.stringify(appointment));
      }
      
      // เด้งไปหน้าสแกน QR
      navigate('/home/ScanQRCode');
    } else {
      // สำหรับ Member ยังคงเปิด modal แสดง QR Code
      setSelectedAppointment(appointment);
      setShowQrModal(true);
      setSuccessMessage(""); // รีเซ็ตข้อความเมื่อเปิด Modal
      setErrorMessage(""); // รีเซ็ตข้อความเมื่อเปิด Modal
    }
  };





  // ฟังก์ชันจำลองการสแกน QR Code
  const handleSimulateScan = async (appointment) => {
    try {
      // ตรวจสอบว่าได้เลือกรถหรือไม่
      if (role === "Visitor" && !selectedVehicleId) {
        setErrorMessage("กรุณาเลือกรถก่อนทำการสแกน");
        return;
      }

      // เรียกใช้ API พร้อมส่งข้อมูลรถ (ถ้าเป็น Visitor)
      const response = await simulateScanQRCode(
        appointment.appointment_id,
        role === "Visitor" ? selectedVehicleId : null
      );

      if (response.success) {
        // อัพเดทสถานะในรายการนัดหมาย
        const updatedAppointments = appointments.map((app) => {
          if (app.appointment_id === appointment.appointment_id) {
            return { ...app, status: "completed" };
          }
          return app;
        });
        setAppointments(updatedAppointments);

        // อัพเดทสถานะของการนัดหมายที่กำลังแสดง QR Code
        if (
          selectedAppointment &&
          selectedAppointment.appointment_id === appointment.appointment_id
        ) {
          setSelectedAppointment({
            ...selectedAppointment,
            status: "completed",
          });
        }

        // อัพเดทสถานะของการนัดหมายปัจจุบัน (ถ้ามี)
        if (
          currentAppointment &&
          currentAppointment.appointment_id === appointment.appointment_id
        ) {
          setCurrentAppointment({ ...currentAppointment, status: "completed" });
        }

        // แสดงข้อความสำเร็จ
        setSuccessMessage(
          'สแกน QR Code สำเร็จ! สถานะการนัดหมายถูกอัพเดทเป็น "เสร็จสิ้น"'
        );

        // ปิด modal หลังจาก 2 วินาที
        setTimeout(() => {
          setShowQrModal(false);
          setSuccessMessage("");
          // โหลดข้อมูลใหม่
          fetchAppointments();
          fetchActiveParking();
        }, 2000);
      } else {
        setErrorMessage(
          response.message || "ไม่สามารถอัพเดทสถานะการนัดหมายได้"
        );
      }
    } catch (error) {
      console.error("Error simulating QR scan:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "เกิดข้อผิดพลาดในการจำลองการสแกน QR Code"
      );
    }
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    const storedName = localStorage.getItem("userName");
    const storedPhone = localStorage.getItem("userPhone");
    const token = localStorage.getItem("userToken");

    if (storedRole) {
      setRole(storedRole);
      setName(storedName || "");
      setPhone(storedPhone || "");
    }

    // Fetch user details if needed
    if (token && !storedPhone) {
      const fetchUserDetails = async () => {
        try {
          const response = await axios.get("http://localhost:3000/users/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.status === 200) {
            setPhone(response.data.phone_number);
            localStorage.setItem("userPhone", response.data.phone_number);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      };

      fetchUserDetails();
    }

    // ดึง user ID ปัจจุบัน
    const currentUserId = getCurrentUserId();

    // ตรวจสอบว่ามีการเปลี่ยนผู้ใช้หรือไม่
    if (currentUserId !== lastUserId) {
      console.log("User changed or first load, fetching profile picture");
      setLastUserId(currentUserId);

      // ล้างและโหลดข้อมูลใหม่
      setProfilePicture(defaultProfile);
      fetchProfilePicture();
      fetchAppointments();
      fetchActiveParking();
    }

    // Save user data to localStorage
    if (storedName || storedPhone || storedRole) {
      const currentUser = {
        id: currentUserId,
        name: storedName || "",
        phone: storedPhone || "",
        status: storedRole || "",
      };
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    // ถ้าเป็น Visitor ให้ดึงข้อมูลรถด้วย
    if (storedRole === "Visitor") {
      fetchUserVehicles();
    }
  }, [lastUserId]);

  // ดึงข้อมูลการจอดรถที่กำลังใช้งานอยู่ทุก 30 วินาที
  useEffect(() => {
    // ดึงข้อมูลครั้งแรก
    fetchActiveParking();

    // ตั้งเวลาดึงข้อมูลทุก 30 วินาที
    const interval = setInterval(() => {
      fetchActiveParking();
    }, 30000);

    // ล้าง interval เมื่อ component unmount
    return () => clearInterval(interval);
  }, []);

  // สถานะแสดงสีตามสถานะนัดหมาย
  const getStatusClass = (status) => {
    switch (status) {
      case "confirmed":
        return "status-confirmed";
      case "pending":
        return "status-pending";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  // สถานะแสดงข้อความตามสถานะนัดหมาย
  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว";
      case "pending":
        return "รอยืนยัน";
      case "completed":
        return "เสร็จสิ้น";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status;
    }
  };

  // เพิ่มฟังก์ชันสำหรับดึงข้อมูลรถของ Visitor
  const fetchUserVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const vehiclesData = await getUserVehicles();
      if (Array.isArray(vehiclesData) && vehiclesData.length > 0) {
        setVehicles(vehiclesData);
        // เลือกรถคันหลักหรือคันแรกเป็นค่าเริ่มต้น
        const primaryVehicle =
          vehiclesData.find((v) => v.is_primary) || vehiclesData[0];
        setSelectedVehicleId(primaryVehicle.vehicle_id);
      }
    } catch (error) {
      console.error("Error fetching user vehicles:", error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  return (
    <div style={{ minHeight: "900px" }}>
      {/* Include the CSS styles inside the component */}
      <style>{profileStyles}</style>

      <div>
        <div className="box2">
          <img
            src="./Metthier Master Logo.png"
            alt="My Logo"
            className="Logo2-image"
          />
        </div>
      </div>

      <div className="main-content">
        {/* Profile Member */}
        {role === "Member" && (
          <div className="userprofilehome">
            <div className="datahomeprofile">
              <p className="profileinfoname">{name}</p>
              <p>
                Status : <span>Member</span>
              </p>
              <p>
                Phone : <span>{phone}</span>
              </p>
              {activeParking && (
                <p>
                  Parking :{" "}
                  <span className="active-parking-status">กำลังจอดอยู่</span>
                </p>
              )}
              <div className="photohomeprofile">
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="profile1"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultProfile;
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Profile Visitor */}
        {role === "Visitor" && (
          <div className="userprofilehome">
            <div className="datahomeprofile">
              <p className="profileinfoname">{name}</p>
              <p>
                Status : <span>Visitor</span>
              </p>
              <p>
                Phone : <span>{phone}</span>
              </p>
              {currentAppointment && (
                <p>
                  Appointment : <span style={{ color: "#48bb78" }}>วันนี้</span>
                </p>
              )}
              <div className="photohomeprofile">
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="profile1"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultProfile;
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* แสดงสถานะ Member */}
        {role === "Member" && (
          <div className="buildingLot">
            {activeParking ? (
              <div className="lot1">
                <div className="parkingphoto1">
                  <FaCar size={40} color="#FD6E2B" />
                </div>
                <p className="titlelot">อาคารลานจอด</p>
                <p>
                  {activeParking.building_name} {activeParking.area_name}
                </p>
                <p>
                  เวลา : <span>{activeParking.entry_time} - ตอนนี้</span>
                </p>
                <p>
                  ระยะเวลา : <span>{activeParking.duration}</span>
                </p>
                <p>
                  สถานะ :{" "}
                  <span className="active-parking-status">กำลังจอดอยู่</span>
                </p>
              </div>
            ) : (
              <div className="lot1">
                <div className="parkingphoto1">
                  <FaCar size={40} color="#cccccc" />
                </div>
                <p className="titlelot">อาคารลานจอด</p>
                <p>ไม่มีการจอดรถที่กำลังใช้งานอยู่</p>
                <p>
                  <Link to="/findparking" className="find-parking-link">
                    ค้นหาลานจอดรถ
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* แสดงสถานะ Visitor - นัดหมายปัจจุบัน */}
        {role === "Visitor" && currentAppointment && (
          <div className="buildingLot2">
            <div className="lot2">
              <p className="titlelot2">การนัดหมายวันนี้</p>
              <div className="appointment-details2">
                <p>
                  ชื่อผู้ทำการนัด: {currentAppointment.member_first_name}{" "}
                  {currentAppointment.member_last_name}
                </p>
                <p>เบอร์โทร: {currentAppointment.member_phone}</p>
                <p>วันที่: {currentAppointment.formatted_date}</p>
                <p>เวลา: {currentAppointment.formatted_time}</p>
              </div>
              <div className="appointment-details-btn">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleShowQR(currentAppointment)}
                >
                  <FaQrcode className="mr-1" /> สแกนเข้าจอด
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* แสดงข้อความเมื่อไม่มีนัดหมาย (สำหรับ Visitor) */}
        {role === "Visitor" && !currentAppointment && !loading && (
          <div className="buildingLot2">
            <div className="lot2">
              {/* <div className="parkingphoto2">
                <img src="./Parking1.png" alt="My Logo" className="parking1" />
              </div> */}
              <p className="titlelot2">การนัดหมาย</p>
              <p
                className="text-center"
                style={{
                  color: "black",
                  marginTop: "2rem",
                  marginLeft: "2rem",
                }}
              >
                ไม่มีการนัดหมายในวันนี้
              </p>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="QRCodescan">
          <Link to="/home/ScanQRCode" className="link-no-underline">
            <p className="bottomscan">กดเพื่อสแกน</p>
            <div className="BoxQRCode">
              <img src="./scanQRcode.png" alt="My Logo" className="QRCode" />
            </div>
          </Link>
        </div>

        {/* graph */}
        <div className="boxgraph">
          <div className="graphbox1">
            <GraphComponent />
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {role === "Visitor" ? "สแกนเข้าจอด" : "QR Code นัดหมาย"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedAppointment && (
            <>
              <div className="appointment-qr">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedAppointment.qr_code}`}
                  alt="QR Code"
                />
              </div>
              <div
                className="mb-3"
                style={{ color: "black", marginTop: "30px" }}
              >
                <p>
                  <strong>รหัส:</strong> {selectedAppointment.qr_code}
                </p>
                <p>
                  <strong>วันที่:</strong> {selectedAppointment.formatted_date}
                </p>
                <p>
                  <strong>เวลา:</strong> {selectedAppointment.formatted_time}
                </p>
                <p>
                  <strong>สถานที่:</strong> {selectedAppointment.building_name}{" "}
                  - {selectedAppointment.area_name}
                </p>
              </div>
              <div
                className={`appointment-status ${getStatusClass(
                  selectedAppointment.status
                )}`}
              >
                {getStatusText(selectedAppointment.status)}
              </div>

              {/* แสดงเลือกรถสำหรับ Visitor */}
              {role === "Visitor" &&
                selectedAppointment.status === "confirmed" && (
                  <div className="vehicle-selection mt-3">
                    <Form.Group>
                      <Form.Label>เลือกรถที่ต้องการใช้จอด</Form.Label>
                      <Form.Select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        disabled={loadingVehicles}
                      >
                        <option value="">-- กรุณาเลือกรถ --</option>
                        {vehicles.map((vehicle) => (
                          <option
                            key={vehicle.vehicle_id}
                            value={vehicle.vehicle_id}
                          >
                            {vehicle.license_plate} - {vehicle.vehicle_brand}{" "}
                            {vehicle.vehicle_model}
                            {vehicle.is_primary ? " (คันหลัก)" : ""}
                          </option>
                        ))}
                      </Form.Select>
                      {loadingVehicles && (
                        <Spinner
                          animation="border"
                          size="sm"
                          className="ml-2"
                        />
                      )}
                      {vehicles.length === 0 && (
                        <div className="text-muted mt-2">
                          <small>
                            ไม่พบข้อมูลยานพาหนะ{" "}
                            <Link to="/profile/vehicles">เพิ่มทะเบียนรถ</Link>
                          </small>
                        </div>
                      )}
                    </Form.Group>
                  </div>
                )}

              {/* เพิ่มปุ่มจำลองการสแกนสำหรับ Visitor */}
              <div className="mt-3">
                {role === "Visitor" &&
                  selectedAppointment.status === "confirmed" && (
                    <Button
                      variant="success"
                      className="mt-3"
                      onClick={() => handleSimulateScan(selectedAppointment)}
                      disabled={!selectedVehicleId}
                    >
                      <FontAwesomeIcon icon={faQrcode} className="me-2" />
                      สแกนเข้าจอด
                    </Button>
                  )}
                {/* ปุ่มจำลองการสแกนสำหรับ Member (คงเดิม) */}
                {role === "Member" &&
                  selectedAppointment.status === "confirmed" && (
                    <Button
                      variant="success"
                      className="mt-3"
                      onClick={() => handleSimulateScan(selectedAppointment)}
                    >
                      <FontAwesomeIcon icon={faQrcode} className="me-2" />
                      จำลองการสแกน QR Code
                    </Button>
                  )}
              </div>

              {/* เพิ่มส่วนแสดงข้อความแจ้งเตือน */}
              {successMessage && (
                <Alert variant="success" className="mt-3">
                  {successMessage}
                </Alert>
              )}
              {errorMessage && (
                <Alert variant="danger" className="mt-3">
                  {errorMessage}
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            ปิด
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Navbar */}
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

export default Home;
