import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Tabs,
  Tab,
  Badge,
  Modal,
  Spinner,
  Alert,
  Form,
  Nav,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faQrcode,
  faCalendarAlt,
  faMapMarkerAlt,
  faClock,
  faUser,
  faPhone,
  faInfoCircle,
  faTimes,
  faBuildingCircleCheck,
  faAddressCard,
} from "@fortawesome/free-solid-svg-icons";
import { FaSearch, FaHistory, FaUser } from "react-icons/fa";
import { IoHome } from "react-icons/io5";

import {
  getUserAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  simulateScanQRCode,
} from "../../../services/appointmentService";

import logo from "/public/Metthier Master Logo.png";
import "./AppointmentList.css";

import { getUserVehicles } from "../../../services/apiService";

function AppointmentList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // เพิ่ม state สำหรับข้อมูลรถ
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    // ดึงข้อมูล role จาก localStorage
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setRole(storedRole);
    }

    // ดึงข้อมูลการนัดหมาย
    fetchAppointments();
  }, []);

  useEffect(() => {
    // กรองข้อมูลเมื่อ tab เปลี่ยน หรือมีการเปลี่ยนแปลงข้อมูล appointments
    filterAppointmentsByTab();
  }, [activeTab, appointments, filterDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // ดึงข้อมูลนัดหมายทั้งหมด
      const response = await getUserAppointments();
      if (response.success) {
        // เรียงลำดับตามวันที่นัดหมาย (ล่าสุดก่อน)
        const sortedAppointments = response.data.sort((a, b) => {
          const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return dateB - dateA;
        });
        setAppointments(sortedAppointments);
      } else {
        setErrorMessage("ไม่สามารถดึงข้อมูลการนัดหมายได้");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการดึงข้อมูลการนัดหมาย");
    } finally {
      setLoading(false);
    }
  };

  const filterAppointmentsByTab = () => {
    console.log("เริ่มกรองข้อมูล");
    console.log("วันที่กรอง:", filterDate);
    console.log("จำนวนข้อมูลทั้งหมด:", appointments.length);

    // คัดลอกข้อมูลจาก state
    let filtered = [...appointments];

    // กรองตามสถานะ (tab ที่เลือก)
    if (activeTab !== "all") {
      filtered = filtered.filter((app) => app.status === activeTab);
      console.log(
        `หลังกรองตามสถานะ ${activeTab}: เหลือ ${filtered.length} รายการ`
      );
    }

    // กรองตามวันที่ (ถ้ามีการกรอกวันที่)
    if (filterDate) {
      filtered = filtered.filter((app) => {
        // แปลงวันที่จาก ISO string (UTC) เป็นวันที่ในเขตเวลาท้องถิ่น
        const appDateObj = new Date(app.appointment_date);

        // รับค่าวันที่ในรูปแบบ YYYY-MM-DD โดยใช้เวลาท้องถิ่น
        const localDateString = appDateObj.toLocaleDateString("en-CA"); // 'en-CA' ให้ผลลัพธ์เป็น YYYY-MM-DD

        const isMatch = localDateString === filterDate;
        console.log(
          `ID: ${app.appointment_id}, วันที่: ${app.appointment_date}, วันที่ท้องถิ่น: ${localDateString}, ตรงกับ ${filterDate}? ${isMatch}`
        );

        return isMatch;
      });

      console.log(
        `หลังกรองตามวันที่ ${filterDate}: เหลือ ${filtered.length} รายการ`
      );
    }

    console.log(
      "รายการที่ผ่านการกรอง:",
      filtered.map(
        (a) =>
          `ID: ${a.appointment_id}, วันที่: ${a.appointment_date}, สถานะ: ${a.status}`
      )
    );

    setFilteredAppointments(filtered);
  };

  const handleTabSelect = (key) => {
    setActiveTab(key);
  };

  const handleBack = () => {
    navigate("/profile");
  };

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


  const handleShowDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleShowCancelModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await cancelAppointment(
        selectedAppointment.appointment_id
      );
      if (response.success) {
        // อัพเดตสถานะในรายการนัดหมาย
        const updatedAppointments = appointments.map((app) => {
          if (app.appointment_id === selectedAppointment.appointment_id) {
            return { ...app, status: "cancelled" };
          }
          return app;
        });
        setAppointments(updatedAppointments);
        setSuccessMessage("ยกเลิกการนัดหมายเรียบร้อยแล้ว");

        // ปิด modal หลังจาก 1.5 วินาที
        setTimeout(() => {
          setShowCancelModal(false);
          setSuccessMessage("");
        }, 1500);
      } else {
        setErrorMessage(response.message || "ไม่สามารถยกเลิกการนัดหมายได้");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      setErrorMessage(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการยกเลิกการนัดหมาย"
      );
    }
  };

  const handleDateFilterChange = (e) => {
    const selectedDate = e.target.value;
    console.log("เลือกวันที่:", selectedDate);

    // เรียกดูข้อมูลการนัดหมายที่มีทั้งหมดเพื่อตรวจสอบ
    console.log(
      "ข้อมูลการนัดหมายทั้งหมด:",
      appointments.map((app) => ({
        id: app.appointment_id,
        วันที่: app.appointment_date,
        วันที่แสดงผล: app.formatted_date,
        สถานะ: app.status,
      }))
    );

    setFilterDate(selectedDate);
  };

  const clearDateFilter = () => {
    setFilterDate("");
  };

  // แสดงสถานะการนัดหมาย
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge bg="warning">รอยืนยัน</Badge>;
      case "confirmed":
        return <Badge bg="success">ยืนยันแล้ว</Badge>;
      case "completed":
        return <Badge bg="info">เสร็จสิ้น</Badge>;
      case "cancelled":
        return <Badge bg="danger">ยกเลิก</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };
  // ฟังก์ชันเรียกใช้ API จำลองการสแกน
  const simulateScanQRCode = async (appointmentId) => {
    try {
      const token = localStorage.getItem("userToken");
      const response = await axios.put(
        `http://localhost:3000/appointments/${appointmentId}/simulate-scan`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error simulating QR scan:", error);
      throw error;
    }
  };

  // เพิ่มฟังก์ชันจำลองการสแกน QR Code
  const handleSimulateScan = async (appointment) => {
    try {
      setSuccessMessage(""); // เคลียร์ข้อความเดิม
      setErrorMessage(""); // เคลียร์ข้อความเดิม

      // ตรวจสอบว่าได้เลือกรถหรือไม่ (สำหรับ Visitor)
      if (role === "Visitor" && !selectedVehicleId) {
        setErrorMessage("กรุณาเลือกรถก่อนทำการสแกน");
        return;
      }

      // เรียกใช้ฟังก์ชัน simulateScanQRCode ที่เราแก้ไข พร้อมส่งข้อมูลรถ (ถ้าเป็น Visitor)
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

        // แสดงข้อความสำเร็จ
        setSuccessMessage(
          'สแกน QR Code สำเร็จ! สถานะการนัดหมายถูกอัพเดทเป็น "เสร็จสิ้น"'
        );

        // ปิด modal หลังจาก 2 วินาที
        setTimeout(() => {
          setShowQrModal(false);
          setSuccessMessage("");
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

  // เพิ่มฟังก์ชันดึงข้อมูลรถ
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

  // เพิ่มเรียกใช้ฟังก์ชันใน useEffect
  useEffect(() => {
    // ดึงข้อมูล role จาก localStorage
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setRole(storedRole);

      // ถ้าเป็น Visitor ให้ดึงข้อมูลรถด้วย
      if (storedRole === "Visitor") {
        fetchUserVehicles();
      }
    }

    // ดึงข้อมูลการนัดหมาย
    fetchAppointments();
  }, []);

  return (
    <div className="appointment-list-page">
      <div className="box2">
        <img src={logo} alt="Metthier Logo" className="Logo2-image" />
      </div>

      <Container className="appointment-container">
        <div className="page-header">
          <h4 className="page-title">
            <Button
              variant="light"
              className="back-button"
              onClick={handleBack}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
            การนัดหมายของฉัน
          </h4>

          {/* Date Filter */}
          <div className="date-filter">
            <Form.Group>
              <Form.Label>กรองตามวันที่</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={handleDateFilterChange}
                  className="me-2"
                />
                {filterDate && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearDateFilter}
                    className="align-self-end"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </Button>
                )}
              </div>
            </Form.Group>
          </div>
        </div>

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">กำลังโหลด...</span>
            </Spinner>
          </div>
        ) : errorMessage ? (
          <Alert variant="danger">{errorMessage}</Alert>
        ) : (
          <>
            <Tabs
              activeKey={activeTab}
              onSelect={handleTabSelect}
              className="mb-3 appointment-tabs"
            >
              <Tab eventKey="all" title="ทั้งหมด" />
              <Tab eventKey="confirmed" title="ยืนยันแล้ว" />
              <Tab eventKey="pending" title="รอยืนยัน" />
              <Tab eventKey="completed" title="เสร็จสิ้น" />
              <Tab eventKey="cancelled" title="ยกเลิก" />
            </Tabs>

            {filteredAppointments.length === 0 ? (
              <div className="text-center text-muted my-5">
                <FontAwesomeIcon
                  icon={faCalendarAlt}
                  size="2x"
                  className="mb-3"
                />
                <p>ไม่พบข้อมูลการนัดหมาย</p>
              </div>
            ) : (
              <div className="appointment-cards">
                {filteredAppointments.map((appointment) => (
                  <Card
                    key={appointment.appointment_id}
                    className="appointment-card"
                  >
                    <Card.Body>
                      <div className="d-flex justify-content-between">
                        <div>
                          <div className="appointment-date">
                            <FontAwesomeIcon
                              icon={faCalendarAlt}
                              className="me-2"
                            />
                            {appointment.formatted_date}
                          </div>
                          <div className="appointment-time">
                            <FontAwesomeIcon icon={faClock} className="me-2" />
                            {appointment.formatted_time}
                          </div>
                        </div>
                        <div className="text-end">
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>

                      <hr />

                      <div className="appointment-details">
                        <div className="location">
                          <FontAwesomeIcon
                            icon={faMapMarkerAlt}
                            className="me-2"
                          />
                          {appointment.building_name} - {appointment.area_name}
                        </div>

                        {role === "Member" ? (
                          <div className="visitor">
                            <FontAwesomeIcon icon={faUser} className="me-2" />
                            ผู้เข้าพบ: {appointment.visitor_first_name}{" "}
                            {appointment.visitor_last_name}
                          </div>
                        ) : (
                          <div className="member">
                            <FontAwesomeIcon icon={faUser} className="me-2" />
                            ผู้นัดหมาย: {appointment.member_first_name}{" "}
                            {appointment.member_last_name}
                          </div>
                        )}
                      </div>

                      <div className="appointment-actions mt-3">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleShowDetails(appointment)}
                        >
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="me-1"
                          />
                          รายละเอียด
                        </Button>

                        {appointment.status === "confirmed" && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleShowQR(appointment)}
                          >
                            <FontAwesomeIcon icon={faQrcode} className="me-1" />
                            {role === "Visitor"
                              ? "สแกนเข้าจอด"
                              : "แสดง QR Code"}
                          </Button>
                        )}

                        {(appointment.status === "confirmed" ||
                          appointment.status === "pending") && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleShowCancelModal(appointment)}
                          >
                            <FontAwesomeIcon icon={faTimes} className="me-1" />
                            ยกเลิก
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Container>

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
              <div className="qr-code">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedAppointment.qr_code}`}
                  alt="QR Code"
                  className="img-fluid"
                />
              </div>
              <div
                className="qr-info mt-5"
                style={{ color: "black", textAlign: "center" }}
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

              {/* ปุ่มสแกนสำหรับ Visitor */}
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

              {/* ปุ่มจำลองการสแกนสำหรับ Member */}
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

              {/* เพิ่มส่วนแสดงข้อความสำเร็จ */}
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

      {/* รายละเอียดการนัดหมาย Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>รายละเอียดการนัดหมาย</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div className="appointment-full-details">
              <div className="detail-item">
                <strong>วันที่:</strong> {selectedAppointment.formatted_date}
              </div>
              <div className="detail-item">
                <strong>เวลา:</strong> {selectedAppointment.formatted_time}
              </div>
              <div className="detail-item">
                <strong>สถานะ:</strong>{" "}
                {getStatusBadge(selectedAppointment.status)}
              </div>
              <div className="detail-item">
                <strong>สถานที่:</strong> {selectedAppointment.location_name}
              </div>
              <div className="detail-item">
                <strong>อาคาร:</strong> {selectedAppointment.building_name} (
                {selectedAppointment.building_code})
              </div>
              <div className="detail-item">
                <strong>ลาน:</strong> {selectedAppointment.area_name}
              </div>

              <hr />

              <div className="detail-item">
                <strong>ผู้ทำการนัด:</strong>{" "}
                {selectedAppointment.member_first_name}{" "}
                {selectedAppointment.member_last_name}
              </div>
              <div className="detail-item">
                <strong>เบอร์โทรติดต่อ:</strong>{" "}
                {selectedAppointment.member_phone}
              </div>
              <div className="detail-item">
                <strong>ผู้เข้าพบ:</strong>{" "}
                {selectedAppointment.visitor_first_name}{" "}
                {selectedAppointment.visitor_last_name}
              </div>
              <div className="detail-item">
                <strong>เบอร์โทรติดต่อ:</strong>{" "}
                {selectedAppointment.visitor_phone}
              </div>

              {selectedAppointment.reason && (
                <div className="detail-item">
                  <strong>เหตุผลการนัดหมาย:</strong>{" "}
                  {selectedAppointment.reason}
                </div>
              )}

              {selectedAppointment.note && (
                <div className="detail-item">
                  <strong>หมายเหตุ:</strong> {selectedAppointment.note}
                </div>
              )}

              <div className="detail-item">
                <strong>สร้างเมื่อ:</strong>{" "}
                {selectedAppointment &&
                  (() => {
                    // แปลงสตริงวันที่เป็น Date object
                    const createdDate = new Date(
                      selectedAppointment.created_at
                    );
                    // ใช้ toLocaleString เพื่อแสดงวันที่และเวลาในรูปแบบไทย
                    return createdDate.toLocaleString("th-TH", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    });
                  })()}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            ปิด
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ยืนยันการยกเลิก Modal */}
      <Modal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>ยืนยันการยกเลิก</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {successMessage ? (
            <Alert variant="success">{successMessage}</Alert>
          ) : errorMessage ? (
            <Alert variant="danger">{errorMessage}</Alert>
          ) : (
            <p>
              คุณต้องการยกเลิกการนัดหมายนี้ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
          )}
        </Modal.Body>

        <Modal.Footer>
          {!successMessage && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowCancelModal(false)}
              >
                ปิด
              </Button>
              <Button variant="danger" onClick={handleCancel}>
                ยืนยันการยกเลิก
              </Button>
            </>
          )}
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

export default AppointmentList;
