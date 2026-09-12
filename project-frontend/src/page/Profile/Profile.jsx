import React, { useEffect, useState } from "react";
import { Navbar, Nav, Button, Modal, Spinner } from "react-bootstrap";
import { FaSearch, FaHistory, FaUser, FaCar, FaPlus } from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./Profile.css";
import {
  getUserProfile,
  getUserVehicles,
  VehicleEditLimitManager,
  getProfilePicture,
} from "../../services/apiService";

// Default profile image
import defaultProfile from "/Profile1.png";

// Add new CSS styles for vehicle display and profile picture
const customStyles = `
.vehicle-list {
  margin-top: 20px;
  max-height: 150px;
  overflow-y: auto;
}

.vehicle-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.vehicle-primary {
  background-color: #e8f4f8;
  border-left: 4px solid #4e73df;
}

.vehicle-info {
  flex-grow: 1;
}

.vehicle-license {
  font-weight: bold;
  font-size: 16px;
}

.vehicle-details {
  font-size: 12px;
  color: #666;
}

.add-vehicle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  color: #4e73df;
  background-color: #f8f9fa;
  border: 1px dashed #4e73df;
  border-radius: 8px;
  padding: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.add-vehicle-btn:hover {
  background-color: #e8f4f8;
}

.add-vehicle-icon {
  margin-right: 8px;
}

/* Profile picture styles */
.profile2 {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
`;

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

function Profile({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [userData, setUserData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "",
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicleEditStatus, setVehicleEditStatus] = useState({
    canEdit: true,
    editsLeft: 3,
    lockUntil: null,
  });
  const [lastUserId, setLastUserId] = useState(null); // เพิ่มสถานะเพื่อติดตามการเปลี่ยนผู้ใช้

  // Profile picture state
  const [profilePicture, setProfilePicture] = useState(defaultProfile);

  // Add a modal for showing error messages
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ฟังก์ชันดึงข้อมูลรูปโปรไฟล์ที่แยกออกมาเพื่อเรียกใช้ซ้ำได้
  const fetchProfilePicture = async () => {
    try {
      // ตั้งค่าเริ่มต้นเป็นรูปดีฟอลต์
      setProfilePicture(defaultProfile);

      // ดึงข้อมูลจากเซิร์ฟเวอร์
      const pictureData = await getProfilePicture();

      if (pictureData.profile_picture) {
        // สร้าง URL เต็มรูปแบบ
        const profileImageUrl = `http://localhost:3000${pictureData.profile_picture}`;
        console.log("[Profile] Setting profile image URL:", profileImageUrl);

        // อ่าน token เพื่อดึง user ID ปัจจุบัน
        const token = localStorage.getItem("userToken");
        if (token) {
          try {
            // แยกส่วน payload (format: header.payload.signature)
            const payload = token.split(".")[1];
            const decoded = JSON.parse(atob(payload));
            const userId = decoded.id;

            // เก็บข้อมูลรูปพร้อม user ID
            localStorage.setItem("profilePicture", profileImageUrl);
            localStorage.setItem("profilePictureOwner", userId.toString());
          } catch (e) {
            console.error("Error decoding token:", e);
          }
        }

        // อัปเดตสถานะ
        setProfilePicture(profileImageUrl);
      } else {
        console.log("[Profile] No profile picture found on server");
        // ลบข้อมูลใน localStorage เพื่อป้องกันการใช้ข้อมูลผู้ใช้เก่า
        localStorage.removeItem("profilePicture");
        localStorage.removeItem("profilePictureOwner");
        setProfilePicture(defaultProfile);
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);

      // ตรวจสอบข้อมูลในแคช
      const token = localStorage.getItem("userToken");
      const storedOwner = localStorage.getItem("profilePictureOwner");
      let currentUserId = null;

      if (token) {
        try {
          const payload = token.split(".")[1];
          const decoded = JSON.parse(atob(payload));
          currentUserId = decoded.id;

          const storedProfilePic = localStorage.getItem("profilePicture");

          // ใช้รูปจากแคชเฉพาะเมื่อเป็นของผู้ใช้ปัจจุบัน
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

      // ใช้รูปดีฟอลต์หากไม่มีข้อมูลในแคชหรือไม่ตรงกับผู้ใช้ปัจจุบัน
      setProfilePicture(defaultProfile);
    }
  };

  useEffect(() => {
    // Get user role from localStorage (set during login)
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setRole(storedRole);
    }

    // ดึง user ID ปัจจุบัน
    const currentUserId = getCurrentUserId();

    // ตรวจสอบว่ามีการเปลี่ยนผู้ใช้หรือไม่
    if (currentUserId !== lastUserId) {
      console.log(
        "[Profile] User changed from",
        lastUserId,
        "to",
        currentUserId
      );
      setLastUserId(currentUserId);

      // ล้างข้อมูลเดิมและโหลดข้อมูลใหม่
      setProfilePicture(defaultProfile);
      setVehicles([]);
      setUserData({
        username: "",
        first_name: "",
        last_name: "",
        phone_number: "",
        role: "",
      });
    }

    // Fetch user profile and vehicles from backend
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Fetch profile data
        const profileData = await getUserProfile();
        setUserData({
          username: profileData.username || "",
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          phone_number: profileData.phone_number || "",
          role: profileData.role || "",
        });

        // Fetch user vehicles
        const vehiclesData = await getUserVehicles();
        setVehicles(vehiclesData);

        // Check vehicle edit limit
        const editStatus = VehicleEditLimitManager.checkEditLimit();
        setVehicleEditStatus(editStatus);

        // ดึงข้อมูลรูปโปรไฟล์
        await fetchProfilePicture();

        setLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data. Please try again later.");
        setLoading(false);

        // Show error modal
        setErrorMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        setShowErrorModal(true);
      }
    };

    // เรียกดึงข้อมูลเฉพาะเมื่อมี token ที่ถูกต้อง
    if (currentUserId) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [location.state, lastUserId]); // เพิ่ม dependency ให้ useEffect ทำงานเมื่อ lastUserId เปลี่ยน

  const handleEditMemberClick = () => {
    navigate("/profile/edit-member", {
      state: {
        userData: userData,
        vehicleEditStatus: vehicleEditStatus,
      },
    });
  };

  const handleManageVehiclesClick = () => {
    navigate("/profile/vehicles", {
      state: {
        vehicles: vehicles,
        vehicleEditStatus: vehicleEditStatus,
      },
    });
  };

  const handleAppointmentClick = () => {
    // ถ้าเป็น Member ให้ไปที่หน้าสร้างนัดหมาย
    if (role === "Member") {
      navigate("/profile/appointment");
    } else {
      // ถ้าเป็น Visitor ให้ไปที่หน้าแสดงรายการนัดหมาย
      navigate("/profile/appointments");
    }
  };

  const handleReportClick = () => {
    navigate("/profile/report");
  };

  const handlePaymentClick = () => {
    navigate("/profile/payment");
  };

  // Get primary vehicle if available
  const primaryVehicle =
    vehicles.find((v) => v.is_primary) ||
    (vehicles.length > 0 ? vehicles[0] : null);

  // Handle modal close
  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
  };

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "844px" }}>
      {/* Add the vehicle list styles */}
      <style>{customStyles}</style>

      <div className="box2">
        <img
          src="./Metthier Master Logo.png"
          alt="My Logo"
          className="Logo2-image"
        />
      </div>

      <div className="main-content2">
        <div className="userprofilehome2">
          <div className="datahomeprofile2">
            <p className="profileinfoname2" style={{ fontWeight: "bold" }}>
              {userData.first_name || ""} {userData.last_name || ""}
            </p>

            <p>
              Status : <span>{userData.role || "Unknown"}</span>
            </p>
            <p>
              Username : <span>{userData.username || "No Username"}</span>
            </p>
            <p>
              Phone : <span>{userData.phone_number || "No Phone"}</span>
            </p>

            {/* Display primary vehicle or first vehicle */}
            <p>
              ทะเบียนรถ :{" "}
              <span>
                {primaryVehicle
                  ? primaryVehicle.license_plate
                  : "ไม่พบข้อมูลรถ"}
              </span>
              {vehicles.length > 1 && (
                <small> (+{vehicles.length - 1} คันอื่นๆ)</small>
              )}
            </p>

            <div className="photohomeprofile2">
              <img
                src={profilePicture}
                alt="Profile"
                className="profile2"
                onError={(e) => {
                  console.log("Image failed to load:", profilePicture);
                  e.target.onerror = null;
                  e.target.src = defaultProfile;
                  console.log("Fallback to default image");
                }}
              />
            </div>
          </div>
        </div>

        {/* Vehicle List Section */}
        <div className="vehicle-list-section">
          <h5 style={{ marginTop: "20px", textAlign: "center" }}>
            ข้อมูลยานพาหนะ ({vehicles.length}/3)
          </h5>

          <div className="vehicle-list">
            {vehicles.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666" }}>
                ยังไม่มีข้อมูลยานพาหนะ
              </p>
            ) : (
              vehicles.map((vehicle) => (
                <div
                  key={vehicle.vehicle_id}
                  className={`vehicle-item ${
                    vehicle.is_primary ? "vehicle-primary" : ""
                  }`}
                >
                  <div className="vehicle-info">
                    <div className="vehicle-license">
                      {vehicle.license_plate}
                    </div>
                    <div className="vehicle-details">
                      {vehicle.vehicle_brand} {vehicle.vehicle_model}{" "}
                      {vehicle.vehicle_color
                        ? `สี${vehicle.vehicle_color}`
                        : ""}
                      {vehicle.is_primary && (
                        <span style={{ color: "#4e73df", marginLeft: "5px" }}>
                          (คันหลัก)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {vehicles.length < 3 && (
            <div
              className="add-vehicle-btn"
              onClick={handleManageVehiclesClick}
            >
              <FaPlus className="add-vehicle-icon" />
              เพิ่มยานพาหนะ
            </div>
          )}

          {/* Vehicle edit limit notification */}
          {!vehicleEditStatus.canEdit && (
            <div
              style={{
                fontSize: "12px",
                color: "#d9534f",
                textAlign: "center",
                marginTop: "5px",
              }}
            >
              คุณแก้ไขข้อมูลยานพาหนะครบ 3 ครั้งแล้ว
              จะสามารถแก้ไขได้อีกครั้งในวันถัดไป
            </div>
          )}
        </div>

        {/* Button content */}
        <div className="button-container-center">
          <div className="content-buttons">
            <Button
              variant="light"
              className="content-edit"
              style={{
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
              onClick={handleEditMemberClick}
            >
              แก้ไขข้อมูลส่วนตัว
            </Button>

            <Button
              variant="light"
              className="content-vehicles"
              style={{
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
              onClick={handleManageVehiclesClick}
            >
              จัดการยานพาหนะ
              {!vehicleEditStatus.canEdit && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#d9534f",
                    marginLeft: "5px",
                  }}
                >
                  (ล็อก)
                </span>
              )}
            </Button>

            {role === "Visitor" && (
              <Button
                variant="light"
                className="content-Payment"
                style={{
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onClick={handlePaymentClick}
              >
                ชำระเงิน
              </Button>
            )}

            {role === "Member" && (
              <Button
                variant="light"
                className="content-Appointment"
                style={{
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onClick={handleAppointmentClick}
              >
                นัดหมายการจอด
              </Button>
            )}

            {role === "Visitor" && (
              <Button
                variant="light"
                className="content-Appointment"
                style={{
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onClick={handleAppointmentClick}
              >
                การนัดหมายของฉัน
              </Button>
            )}

            {/* <Button
              variant="light"
              className="content-Report"
              style={{
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
              onClick={handleReportClick}
            >
              แจ้งปัญหา
            </Button> */}
          </div>
        </div>

        <Button variant="light" className="content-Logout1" onClick={onLogout}>
          ออกจากระบบ
        </Button>

        {/* Bottom navbar */}
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

      {/* Error Modal */}
      <Modal show={showErrorModal} onHide={handleCloseErrorModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>เกิดข้อผิดพลาด</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseErrorModal}>
            ปิด
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Profile;
