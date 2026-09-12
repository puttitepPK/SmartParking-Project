import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Button,
  Nav,
  Form,
  InputGroup,
  Spinner,
  Modal,
  ListGroup,
  Alert,
} from "react-bootstrap";
import {
  FaSearch,
  FaHistory,
  FaUser,
  FaCalendarAlt,
  FaCarAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingCircleCheck,
  faAddressCard,
} from "@fortawesome/free-solid-svg-icons";
import { debounce } from "lodash";
import "./Appointment.css";

// Import services
import {
  searchVisitors,
  getAvailableParkingAreas,
  createAppointment,
} from "../../../services/appointmentService";

// Image imports
import logo from "/public/Metthier Master Logo.png";
import Undo from "/Undo.png";
import Send from "/send.png";

function Appointment() {
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    appointment_date: "",
    appointment_time: "",
    visitor_id: "",
    visitor_name: "",
    visitor_phone: "",
    area_id: "",
    reason: "",
    note: "",
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [areas, setAreas] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Fetch available parking areas
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await getAvailableParkingAreas();
        if (response && response.success && response.data) {
          setAreas(response.data);
        }
      } catch (error) {
        console.error("Error fetching parking areas:", error);
      }
    };

    fetchAreas();
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // ถ้ามีการเปลี่ยนแปลงชื่อหรือเบอร์โทร visitor และผู้ใช้เลือก visitor จากการค้นหาไว้แล้ว
    // ให้ล้างข้อมูล visitor_id เพื่อให้ใช้ชื่อและเบอร์โทรใหม่แทน
    if (
      (name === "visitor_name" || name === "visitor_phone") &&
      formData.visitor_id
    ) {
      setFormData((prev) => ({
        ...prev,
        visitor_id: "",
      }));
      setSelectedVisitor(null);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (term.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await searchVisitors(term);
        if (response && response.success && response.data) {
          setSearchResults(response.data);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Handle visitor selection
  const handleSelectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setFormData({
      ...formData,
      visitor_id: visitor.user_id,
      visitor_name: visitor.first_name + " " + visitor.last_name,
      visitor_phone: visitor.phone_number,
    });
    setShowSearchResults(false);
    setSearchTerm(visitor.first_name + " " + visitor.last_name);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.appointment_date ||
      !formData.appointment_time ||
      !formData.area_id
    ) {
      setErrorMessage("กรุณากรอกข้อมูลวันที่ เวลา และพื้นที่จอดรถให้ครบถ้วน");
      setShowError(true);
      return;
    }

    // ตรวจสอบข้อมูล visitor
    if (
      !formData.visitor_id &&
      (!formData.visitor_name || !formData.visitor_phone)
    ) {
      setErrorMessage("กรุณาเลือกหรือกรอกข้อมูลผู้เข้าพบให้ครบถ้วน");
      setShowError(true);
      return;
    }

    setLoading(true);
    try {
      const response = await createAppointment(formData);
      if (response && response.success) {
        setShowSuccess(true);
        // รอ 2 วินาทีแล้วนำทางกลับไปยังหน้า profile
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else {
        throw new Error(response?.message || "เกิดข้อผิดพลาดในการสร้างนัดหมาย");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "เกิดข้อผิดพลาดในการสร้างนัดหมาย"
      );
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div style={{ minHeight: "844px" }}>
      <div className="box2">
        <img src={logo} alt="Metthier Logo" className="Logo2-image" />
      </div>

      <div className="main-content2">
        <div className="appointment-form">
          <div className="headfrom1">📅 นัดหมายการจอด</div>

          <Form onSubmit={handleSubmit}>
            {/* วันที่และเวลา */}
            <div className="form-row">
              <Form.Group className="form-group">
                <Form.Control
                  type="date"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  placeholder="วันที่"
                />
              </Form.Group>
              <Form.Group className="form-group">
                <Form.Control
                  type="time"
                  name="appointment_time"
                  value={formData.appointment_time}
                  onChange={handleInputChange}
                  placeholder="เวลา"
                />
              </Form.Group>
            </div>

            {/* ค้นหาผู้เข้าพบ */}
            <Form.Group className="form-group">
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="ค้นหาผู้เข้าพบ (ชื่อ, เบอร์โทร, ชื่อผู้ใช้)"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchLoading && (
                  <InputGroup.Text>
                    <Spinner animation="border" size="sm" />
                  </InputGroup.Text>
                )}
                {!searchLoading && (
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                )}
              </InputGroup>

              {showSearchResults && searchResults.length > 0 && (
                <ListGroup className="search-results-dropdown">
                  {searchResults.map((visitor) => (
                    <ListGroup.Item
                      key={visitor.user_id}
                      action
                      onClick={() => handleSelectVisitor(visitor)}
                    >
                      <div>
                        <strong>
                          {visitor.first_name} {visitor.last_name}
                        </strong>
                      </div>
                      <div className="text-muted">
                        เบอร์โทร: {visitor.phone_number}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}

              {showSearchResults && searchResults.length === 0 && (
                <Alert variant="warning" className="mt-2">
                  ไม่พบผู้เข้าพบที่มีบัญชีในระบบ กรุณากรอกข้อมูลด้านล่าง
                </Alert>
              )}
            </Form.Group>

            {/* ข้อมูลผู้เข้าพบ (กรณีไม่มีในระบบหรือต้องการกรอกเอง) */}
            <div className="form-row">
              <Form.Group className="form-group">
                <Form.Control
                  type="text"
                  name="visitor_name"
                  value={formData.visitor_name}
                  onChange={handleInputChange}
                  placeholder="ชื่อผู้เข้าพบ"
                  disabled={!!selectedVisitor}
                />
              </Form.Group>
              <Form.Group className="form-group">
                <Form.Control
                  type="tel"
                  name="visitor_phone"
                  value={formData.visitor_phone}
                  onChange={handleInputChange}
                  placeholder="เบอร์โทรผู้เข้าพบ"
                  disabled={!!selectedVisitor}
                />
              </Form.Group>
            </div>

            {/* เลือกพื้นที่จอดรถ */}
            <Form.Group className="form-group">
              <Form.Select
                name="area_id"
                value={formData.area_id}
                onChange={handleInputChange}
              >
                <option value="">🏢 --- เลือกพื้นที่จอดรถ --- </option>
                {areas.map((area) => (
                  <option key={area.area_id} value={area.area_id}>
                    {area.location_name} - {area.building_name} -{" "}
                    {area.area_name} ({area.available_spaces}/
                    {area.total_spaces})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* เหตุผลการนัดหมาย */}
            <Form.Group className="form-group">
              <Form.Control
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="📝 เหตุผลการนัดหมาย (ถ้ามี)"
              />
            </Form.Group>

            {/* หมายเหตุ */}
            <Form.Group className="form-group">
              <Form.Control
                as="textarea"
                rows={4}
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="📝 หมายเหตุเพิ่มเติม (ถ้ามี) "
                className="note-textarea"
                style={{ minHeight: "100px" }} // กำหนดความสูงขั้นต่ำโดยตรง
              />
            </Form.Group>

            {/* ปุ่มดำเนินการ */}
            <div className="form-buttons2">
              <Button className="btn2" onClick={handleBack} disabled={loading}>
                
                ย้อนกลับ
              </Button>
              <Button className="btn3" type="submit" disabled={loading} >
                
                {loading ? <Spinner animation="border" size="sm" /> : <>ส่ง</>}
              </Button>
            </div>
          </Form>
        </div>

        {showSuccess && (
          <div className="success-message">สร้างการนัดหมายเรียบร้อยแล้ว</div>
        )}

        {/* Error Modal */}
        <Modal show={showError} onHide={() => setShowError(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>เกิดข้อผิดพลาด</Modal.Title>
          </Modal.Header>
          <Modal.Body>{errorMessage}</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowError(false)}>
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
                      location.pathname === "/profile/appointment"
                        ? "active"
                        : ""
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

export default Appointment;
