import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Navbar, Nav, Button, Modal, Spinner, Form } from "react-bootstrap";
import { IoHome } from "react-icons/io5";
import { FaSearch, FaUser, FaCamera, FaTrash } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "./EditMember.css";
import { 
  getUserProfile, 
  updateUserProfile, 
  updateUserPassword,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture 
} from "../../../services/apiService";

import logo from "/public/Metthier Master Logo.png";
import defaultProfile from "/Profile1.png";

function EditMember() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for user data and edit mode
  const [userData, setUserData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: ""
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  
  // UI states
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Profile picture state
  const [profilePicture, setProfilePicture] = useState(defaultProfile);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isServerImage, setIsServerImage] = useState(false);
  const fileInputRef = useRef(null);
  
  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If user data was passed from Profile component, use it
        if (location.state?.userData) {
          setUserData(location.state.userData);
        } else {
          // Otherwise fetch from API
          const profileData = await getUserProfile();
          setUserData({
            username: profileData.username || "",
            first_name: profileData.first_name || "",
            last_name: profileData.last_name || "",
            phone_number: profileData.phone_number || "",
            role: profileData.role || ""
          });
        }
        
        // Fetch profile picture from server
        try {
          const pictureData = await getProfilePicture();
          if (pictureData.profile_picture) {
            setProfilePicture(`http://localhost:3000${pictureData.profile_picture}`);
            setIsServerImage(true);
          } else {
            // Check if there's a profile picture in localStorage as fallback
            const storedProfilePic = localStorage.getItem("profilePicture");
            if (storedProfilePic) {
              setProfilePicture(storedProfilePic);
              setIsServerImage(false);
            } else {
              setProfilePicture(defaultProfile);
              setIsServerImage(false);
            }
          }
        } catch (picError) {
          console.error("Error fetching profile picture:", picError);
          // If server request fails, try localStorage
          const storedProfilePic = localStorage.getItem("profilePicture");
          if (storedProfilePic) {
            setProfilePicture(storedProfilePic);
            setIsServerImage(false);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setErrorMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        setShowErrorModal(true);
        setLoading(false);
      }
    };

    fetchData();
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSavingChanges(true);
      
      // Only allow editing username and phone_number
      const updateData = {
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number
      };
      
      const result = await updateUserProfile(updateData);
      
      // Handle profile picture changes
      if (selectedFile) {
        await handleProfilePictureUpload();
      }
      
      setSuccessMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      setShowSuccessModal(true);
      setIsEditing(false);
      setSavingChanges(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage(error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setSavingChanges(false);
    }
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMessage("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      setShowErrorModal(true);
      return;
    }
    
    try {
      setSavingChanges(true);
      
      const result = await updateUserPassword(passwordData);
      
      setSuccessMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      setShowSuccessModal(true);
      setIsChangingPassword(false);
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
      setSavingChanges(false);
    } catch (error) {
      console.error("Error updating password:", error);
      setErrorMessage(error.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setSavingChanges(false);
    }
  };

  const toggleEdit = () => {
    // If we're currently editing, cancel the changes by resetting form
    if (isEditing) {
      // Fetch user data again to reset the form
      getUserProfile().then(profileData => {
        setUserData({
          username: profileData.username || "",
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          phone_number: profileData.phone_number || "",
          role: profileData.role || ""
        });
        
        // Reset the selected file
        setSelectedFile(null);
        
        // Fetch profile picture to reset it
        getProfilePicture().then(pictureData => {
          if (pictureData.profile_picture) {
            setProfilePicture(`http://localhost:3000${pictureData.profile_picture}`);
            setIsServerImage(true);
          } else {
            setProfilePicture(defaultProfile);
            setIsServerImage(false);
          }
        }).catch(error => {
          console.error("Error fetching profile picture:", error);
        });
        
      }).catch(error => {
        console.error("Error fetching user data:", error);
      });
    }
    
    setIsEditing(!isEditing);
    setIsChangingPassword(false);
  };
  
  const togglePasswordChange = () => {
    setIsChangingPassword(!isChangingPassword);
    setIsEditing(false);
  };

  const handleBack = () => {
    navigate("/profile");
  };
  
  // Profile picture handlers
  const handleProfilePictureClick = () => {
    if (isEditing) {
      // If editing, show options modal
      setShowImageModal(true);
    } else if (profilePicture !== defaultProfile) {
      // If not editing but has a custom image, show the image in a modal
      // You could implement an image preview modal here
    }
  };
  
  const handleSelectImage = () => {
    setShowImageModal(false);
    fileInputRef.current.click();
  };
  
  const handleDeleteImage = async () => {
    setShowImageModal(false);
    
    try {
      setUploadingImage(true);
      
      if (isServerImage) {
        // Delete from server
        await deleteProfilePicture();
      }
      
      // Remove from localStorage
      localStorage.removeItem("profilePicture");
      
      // Reset to default
      setProfilePicture(defaultProfile);
      setSelectedFile(null);
      setIsServerImage(false);
      
      setUploadingImage(false);
      setSuccessMessage("ลบรูปโปรไฟล์เรียบร้อยแล้ว");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      setErrorMessage("ไม่สามารถลบรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setUploadingImage(false);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("ขนาดไฟล์ต้องไม่เกิน 5MB");
        setShowErrorModal(true);
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage("โปรดเลือกไฟล์รูปภาพเท่านั้น");
        setShowErrorModal(true);
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setProfilePicture(e.target.result);
        setSelectedFile(file);
        setIsServerImage(false);
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const handleProfilePictureUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploadingImage(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);
      
      // Upload to server using the service function
      const result = await uploadProfilePicture(selectedFile);
      
      if (result && result.file_path) {
        // Important: Update the profile picture with the full URL
        const newProfileUrl = `http://localhost:3000${result.file_path}`;
        setProfilePicture(newProfileUrl);
        
        // Save preview to localStorage as backup
        localStorage.setItem("profilePicture", newProfileUrl);
        
        // Update server image flag
        setIsServerImage(true);
        setSelectedFile(null);
        
        console.log("Profile picture updated successfully:", newProfileUrl);
      } else {
        throw new Error("Invalid response from server");
      }
      
      setUploadingImage(false);
      return result;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setUploadingImage(false);
      throw error;
    }
  };
  
  // Modal handlers
  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
  };
  
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // Navigate back to profile after success
    navigate("/profile");
  };
  
  const handleCloseImageModal = () => {
    setShowImageModal(false);
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
      <div className="box2">
        <img src={logo} alt="My Logo" className="Logo2-image" />
      </div>

      <div className="main-content2">
        <div className="profile-form-container">
          <div className="purple-box">
            <div className="white-box">
              <div className="purple-box-inner">
                <div className="profile-header">
                  <div className="profile-picture-container" onClick={handleProfilePictureClick}>
                    {uploadingImage ? (
                      <div className="spinner-overlay">
                        <Spinner animation="border" role="status" variant="light" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={profilePicture}
                          alt="Profile"
                          className="profile-image"
                        />
                        {isEditing && (
                          <div className="camera-overlay">
                            <FaCamera className="camera-icon" />
                          </div>
                        )}
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      accept="image/*"
                      disabled={!isEditing || uploadingImage}
                    />
                  </div>
                </div>
                
                <h3 style={{ color: "#FFFFFF" }}>{`${userData.first_name} ${userData.last_name}`}</h3>

                {isChangingPassword ? (
                  <div className="profile-form">
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="form-group">
                        <label htmlFor="current_password">รหัสผ่านปัจจุบัน</label>
                        <div className="input-group">
                          <input
                            type="password"
                            id="current_password"
                            name="current_password"
                            value={passwordData.current_password}
                            onChange={handlePasswordChange}
                            className="form-control"
                            placeholder="กรุณากรอกรหัสผ่านปัจจุบัน"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="new_password">รหัสผ่านใหม่</label>
                        <div className="input-group">
                          <input
                            type="password"
                            id="new_password"
                            name="new_password"
                            value={passwordData.new_password}
                            onChange={handlePasswordChange}
                            className="form-control"
                            placeholder="กรุณากรอกรหัสผ่านใหม่"
                            required
                            minLength="6"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</label>
                        <div className="input-group">
                          <input
                            type="password"
                            id="confirm_password"
                            name="confirm_password"
                            value={passwordData.confirm_password}
                            onChange={handlePasswordChange}
                            className="form-control"
                            placeholder="กรุณายืนยันรหัสผ่านใหม่"
                            required
                            minLength="6"
                          />
                        </div>
                      </div>

                      <div className="form-buttons">
                        <button
                          type="button"
                          className="button-cancel"
                          onClick={togglePasswordChange}
                          disabled={savingChanges}
                        >
                          <i className="fa fa-times icon"></i> ยกเลิก
                        </button>
                        
                        <button 
                          type="submit" 
                          className="button-save"
                          disabled={savingChanges}
                        >
                          {savingChanges ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                              <span> กำลังบันทึก...</span>
                            </>
                          ) : (
                            <><i className="fa fa-save icon"></i> บันทึก</>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="profile-form">
                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label htmlFor="username">ชื่อผู้ใช้ (Username)</label>
                        <div className="input-group">
                          <input
                            type="text"
                            id="username"
                            name="username"
                            value={userData.username || ""}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="form-control"
                            placeholder="กรุณากรอกชื่อผู้ใช้"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="first_name">ชื่อจริง</label>
                        <div className="input-group">
                          <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={userData.first_name || ""}
                            onChange={handleInputChange}
                            disabled={true} // First name can't be edited
                            className="form-control"
                            placeholder="ชื่อจริง"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="last_name">นามสกุล</label>
                        <div className="input-group">
                          <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={userData.last_name || ""}
                            onChange={handleInputChange}
                            disabled={true} // Last name can't be edited
                            className="form-control"
                            placeholder="นามสกุล"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="phone_number">เบอร์โทรศัพท์</label>
                        <div className="input-group">
                          <input
                            type="tel"
                            id="phone_number"
                            name="phone_number"
                            value={userData.phone_number || ""}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="form-control"
                            placeholder="กรุณากรอกเบอร์โทรศัพท์"
                            pattern="[0-9]{9,10}"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-buttons">
                        {/* Show back button when not in edit mode */}
                        {!isEditing && (
                          <button
                            type="button"
                            className="ButtonBack"
                            onClick={handleBack}
                            disabled={savingChanges}
                          >
                            <i className="fa fa-arrow-left icon"></i> ย้อนกลับ
                          </button>
                        )}

                        <button
                          type="button"
                          className="button-edit"
                          onClick={toggleEdit}
                          disabled={savingChanges || uploadingImage}
                        >
                          <i className={isEditing ? "fa fa-times icon" : "fa fa-pencil icon"}></i>
                          {isEditing ? "ยกเลิก" : "แก้ไขข้อมูล"}
                        </button>

                        {isEditing && (
                          <button 
                            type="submit" 
                            className="button-save"
                            disabled={savingChanges || uploadingImage}
                          >
                            {savingChanges || uploadingImage ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span> กำลังบันทึก...</span>
                              </>
                            ) : (
                              <><i className="fa fa-save icon"></i> บันทึก</>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Password change button */}
                      {!isEditing && (
                        <div style={{ textAlign: "center", marginTop: "20px" }}>
                          <button
                            type="button"
                            className="button-change-password"
                            onClick={togglePasswordChange}
                            style={{
                              width: "100%",
                              padding: "8px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #6c757d",
                              borderRadius: "5px",
                              color: "#000000",
                              cursor: "pointer"
                            }}
                            disabled={savingChanges}
                          >
                            <i className="fa fa-lock icon"></i> เปลี่ยนรหัสผ่าน
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
                      location.pathname === "/profile/edit-member"
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
      
      {/* Success Modal */}
      <Modal show={showSuccessModal} onHide={handleCloseSuccessModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>สำเร็จ</Modal.Title>
        </Modal.Header>
        <Modal.Body>{successMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleCloseSuccessModal}>
            ตกลง
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Options Modal */}
      <Modal show={showImageModal} onHide={handleCloseImageModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>จัดการรูปโปรไฟล์</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-grid gap-2">
            <Button variant="primary" onClick={handleSelectImage}>
              <FaCamera className="me-2" /> เลือกรูปภาพ
            </Button>
            <Button variant="danger" onClick={handleDeleteImage} disabled={profilePicture === defaultProfile}>
              <FaTrash className="me-2" /> ลบรูปภาพ
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default EditMember;