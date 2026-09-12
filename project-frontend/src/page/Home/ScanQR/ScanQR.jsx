import React, { useState, useEffect } from "react";
import { Navbar, Nav, Modal, Form, Button, Spinner, Alert, Card } from "react-bootstrap";
import QrScanner from "react-qr-scanner";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { House, Search, CardChecklist, Person } from "react-bootstrap-icons";
import { FaSearch, FaHistory, FaUser } from "react-icons/fa";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IoHome } from "react-icons/io5";

import { useLocation, Link, useNavigate } from "react-router-dom";
import logo from "/public/Metthier Master Logo.png";
import "./ScanQR.css";

// Import services
import { findParking } from "../../../services/parkingService";
import { getUserVehicles } from "../../../services/apiService";
import {
  createParkingEntry,
  createParkingExit,
  getActiveParking,
} from "../../../services/parkingHistoryService";

import { getUserAppointments, updateAppointmentStatus } from "../../../services/appointmentService";

function ScanQR() {
  const location = useLocation();
  const navigate = useNavigate();

  // State variables
  const [scanResult, setScanResult] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [parkingAreas, setParkingAreas] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [activeParking, setActiveParking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [appointmentFromStorage, setAppointmentFromStorage] = useState(null);

  // เพิ่ม state สำหรับตรวจสอบการนัดหมาย
  const [hasAppointmentToday, setHasAppointmentToday] = useState(false);
  const [visitorAppointments, setVisitorAppointments] = useState([]);
  const [role, setRole] = useState("");

  // Form data for parking entry
  const [entryFormData, setEntryFormData] = useState({
    area_id: "",
    vehicle_id: "",
    entry_time: new Date().toTimeString().substring(0, 5),
  });

  // Form data for parking exit
  const [exitFormData, setExitFormData] = useState({
    history_id: "",
    exit_time: new Date().toTimeString().substring(0, 5),
  });

  // ดึงอาคารที่ไม่ซ้ำกันจากลานจอด
  const buildings = [...new Set(parkingAreas.map(area => area.building))];
  
  // กรองลานจอดตามอาคารที่เลือก
  const filteredAreas = selectedBuilding 
    ? parkingAreas.filter(area => area.building === selectedBuilding)
    : parkingAreas;

  // สร้างฟังก์ชัน handleOpenEntryModal แทนการเปิด Modal โดยตรง
  const handleOpenEntryModal = () => {
    // ตรวจสอบเงื่อนไขว่า Visitor มีการนัดหมายหรือไม่
    if (role === "Visitor" && !hasAppointmentToday && !appointmentFromStorage) {
      setError("คุณไม่มีการนัดหมายสำหรับวันนี้ ไม่สามารถเข้าจอดได้");
      return;
    }
    
    // รีเซ็ตฟอร์มเป็นค่าเริ่มต้น
    let updatedFormData = {
      ...entryFormData,
      entry_time: new Date().toTimeString().substring(0, 5)
    };
    
    // ถ้าเป็น Visitor ให้ตั้งค่า area_id จากการนัดหมาย
    if (role === "Visitor") {
      if (appointmentFromStorage && appointmentFromStorage.area_id) {
        console.log("Setting area_id in handleOpenEntryModal from storage:", appointmentFromStorage.area_id);
        updatedFormData.area_id = appointmentFromStorage.area_id;
      } else if (hasAppointmentToday && visitorAppointments.length > 0 && visitorAppointments[0].area_id) {
        console.log("Setting area_id in handleOpenEntryModal from today's appointment:", visitorAppointments[0].area_id);
        updatedFormData.area_id = visitorAppointments[0].area_id;
      }
      
      // ตั้งค่าเวลาจากการนัดหมาย
      if (appointmentFromStorage && appointmentFromStorage.start_time) {
        updatedFormData.entry_time = appointmentFromStorage.start_time;
      } else if (hasAppointmentToday && visitorAppointments.length > 0 && visitorAppointments[0].start_time) {
        updatedFormData.entry_time = visitorAppointments[0].start_time;
      }
      
      // ตั้งค่ายานพาหนะจากการนัดหมาย
      if (appointmentFromStorage && appointmentFromStorage.vehicle_id) {
        updatedFormData.vehicle_id = appointmentFromStorage.vehicle_id;
      } else if (hasAppointmentToday && visitorAppointments.length > 0 && visitorAppointments[0].vehicle_id) {
        updatedFormData.vehicle_id = visitorAppointments[0].vehicle_id;
      }
    }
    
    // อัพเดทฟอร์ม
    setEntryFormData(updatedFormData);
    console.log("Updated form data in handleOpenEntryModal:", updatedFormData);
    
    setShowEntryModal(true);
    setError(""); 
    setSuccess("");
  };

  // เพิ่มฟังก์ชันตรวจสอบข้อมูลจาก localStorage
  const checkStoredAppointment = () => {
    const storedAppointment = localStorage.getItem('selectedAppointment');
    if (storedAppointment) {
      try {
        const parsedAppointment = JSON.parse(storedAppointment);
        setAppointmentFromStorage(parsedAppointment);
        
        console.log("Found appointment from storage:", parsedAppointment);
        
        // อัพเดตฟิลด์ area_id ในฟอร์มเข้าจอด
        if (parsedAppointment.area_id) {
          console.log("Setting area_id from stored appointment:", parsedAppointment.area_id);
          setEntryFormData(prev => ({
            ...prev,
            area_id: parsedAppointment.area_id
          }));
          
          // ตรวจสอบว่า area_id ถูกตั้งค่าหรือไม่
          setTimeout(() => {
            console.log("Current entryFormData after setting area_id from storage:", entryFormData);
          }, 100);
        } else {
          console.error("No area_id found in stored appointment:", parsedAppointment);
        }
        
        // หาอาคารจากการนัดหมาย
        if (parsedAppointment.building_name) {
          setSelectedBuilding(parsedAppointment.building_name);
        }
        
        // เปิด Modal จำลองการเข้าจอดอัตโนมัติเมื่อต้องการ
        const storedRole = localStorage.getItem("userRole");
        if (storedRole === "Visitor") {
          // ถ้ามีการนัดหมายจาก localStorage ให้ถือว่ามีการนัดหมายในวันนี้
          setHasAppointmentToday(true);
          
          // เปิด Modal ทันที
          setShowEntryModal(true);
        }
      } catch (error) {
        console.error("Error parsing stored appointment:", error);
      }
      
      // ลบข้อมูลจาก localStorage เพื่อป้องกันการเปิด Modal ซ้ำ
      localStorage.removeItem('selectedAppointment');
    }
  };

  // เพิ่มฟังก์ชันตรวจสอบการนัดหมายของ Visitor
  const checkVisitorAppointments = async () => {
    try {
      const storedRole = localStorage.getItem("userRole");
      setRole(storedRole);
      
      // ตรวจสอบว่าเป็น Visitor หรือไม่
      if (storedRole !== "Visitor") {
        return;
      }
      
      // ดึงการนัดหมายที่ยืนยันแล้วสำหรับวันนี้
      const today = new Date().toISOString().split('T')[0];
      const response = await getUserAppointments({
        status: "confirmed",
        date: today,
      });

      if (response.success && response.data && response.data.length > 0) {
        setHasAppointmentToday(true);
        setVisitorAppointments(response.data);
        
        // ใช้ข้อมูลการนัดหมายแรกเพื่อตั้งค่าฟอร์ม
        const appointment = response.data[0];
        console.log("Found today's appointment:", appointment);
        
        // อัพเดตฟิลด์ area_id ในฟอร์มเข้าจอด
        if (appointment.area_id) {
          console.log("Setting area_id from appointment:", appointment.area_id);
          setEntryFormData(prev => ({
            ...prev,
            area_id: appointment.area_id
          }));
          
          // ตรวจสอบว่า area_id ถูกตั้งค่าหรือไม่
          setTimeout(() => {
            console.log("Current entryFormData after setting area_id:", entryFormData);
          }, 100);
        } else {
          console.error("No area_id found in appointment:", appointment);
        }
        
        // หาอาคารจากการนัดหมาย
        if (appointment.building_name) {
          setSelectedBuilding(appointment.building_name);
        }
        
        // ตั้งค่าวันที่และเวลาตามการนัดหมาย
        if (appointment.appointment_date) {
          setDate(appointment.appointment_date);
        }
        
        if (appointment.start_time) {
          setEntryFormData(prev => ({
            ...prev,
            entry_time: appointment.start_time
          }));
        }
        
        // ถ้ามีการระบุยานพาหนะในการนัดหมาย
        if (appointment.vehicle_id) {
          setEntryFormData(prev => ({
            ...prev,
            vehicle_id: appointment.vehicle_id
          }));
        }
      } else {
        setHasAppointmentToday(false);
        setVisitorAppointments([]);
      }
    } catch (error) {
      console.error("Error checking visitor appointments:", error);
      setHasAppointmentToday(false);
    }
  };

  // ฟังก์ชันรีเฟรชข้อมูลทั้งหมด
  const refreshAllData = async () => {
    try {
      setLoading(true); // เริ่มสถานะโหลด
      
      // ดึงข้อมูลยานพาหนะ
      const vehiclesData = await getUserVehicles();
      if (Array.isArray(vehiclesData)) {
        setVehicles(vehiclesData); // อัปเดตรายการยานพาหนะ
        
        // เลือกยานพาหนะหลักหรือยานพาหนะแรก
        if (vehiclesData.length > 0) {
          const primaryVehicle = vehiclesData.find(v => v.is_primary) || vehiclesData[0];
          setEntryFormData(prev => ({
            ...prev,
            vehicle_id: primaryVehicle.vehicle_id
          }));
        }
      }

      // ดึงข้อมูลการจอดที่กำลังใช้งาน
      const activeResponse = await getActiveParking();
      if (activeResponse.success && activeResponse.hasActiveParking) {
        setActiveParking(activeResponse.data);
        
        // ตั้งค่า history_id สำหรับฟอร์มออกจากที่จอด
        setExitFormData(prev => ({
          ...prev,
          history_id: activeResponse.data.history_id
        }));
      } else {
        setActiveParking(null); // รีเซ็ตสถานะการจอดถ้าไม่มีการจอดที่กำลังใช้งาน
        
        // ถ้าไม่มีการจอดที่กำลังใช้งานและเป็น Visitor ให้ตรวจสอบว่ามีการนัดหมายหรือไม่
        if (role === "Visitor" && hasAppointmentToday && visitorAppointments.length > 0) {
          // ตรวจสอบว่าการนัดหมายมีสถานะเป็น completed หรือไม่
          const appointment = visitorAppointments[0];
          if (appointment.status === "completed") {
            // ถ้าการนัดหมายเสร็จสิ้นแล้ว ให้รีเซ็ตข้อมูลการนัดหมาย
            setHasAppointmentToday(false);
            setVisitorAppointments([]);
            console.log("Appointment is completed, resetting appointment data");
          }
        }
      }
      
      // ดึงข้อมูลลานจอดรถ
      await fetchParkingAreas();
      
      // รีเฟรชข้อมูลการนัดหมาย (ถ้าเป็น Visitor และไม่มีการจอดที่กำลังใช้งาน)
      if (role === "Visitor" && !activeParking) {
        await checkVisitorAppointments();
      }
      
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("ไม่สามารถรีเฟรชข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false); // จบสถานะโหลด
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      await fetchInitialData();
      // ตรวจสอบการนัดหมายของ Visitor
      await checkVisitorAppointments();
      // ตรวจสอบการนัดหมายที่ถูกส่งมาจาก localStorage หลังจากตรวจสอบการนัดหมายแล้ว
      checkStoredAppointment();
    };
    
    initializeData();
  }, []);

  // ดึงข้อมูลลานจอดเมื่อวันที่หรือเวลาเปลี่ยน
  useEffect(() => {
    fetchParkingAreas();
  }, [date, time, selectedBuilding]);

  // ดึงข้อมูลเริ่มต้น
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูล role
      const storedRole = localStorage.getItem("userRole");
      setRole(storedRole);
      
      // ดึงข้อมูลยานพาหนะ
      const vehiclesData = await getUserVehicles();
      if (Array.isArray(vehiclesData)) {
        setVehicles(vehiclesData);
        
        // ตั้งค่าเริ่มต้นเป็นรถคันหลักหรือคันแรก
        if (vehiclesData.length > 0) {
          const primaryVehicle = vehiclesData.find(v => v.is_primary) || vehiclesData[0];
          setEntryFormData(prev => ({
            ...prev,
            vehicle_id: primaryVehicle.vehicle_id
          }));
        }
      }

      // ดึงข้อมูลการจอดที่กำลังใช้งานอยู่
      const activeResponse = await getActiveParking();
      if (activeResponse.success && activeResponse.hasActiveParking) {
        setActiveParking(activeResponse.data);
        
        // ตั้งค่า history_id สำหรับฟอร์มออกจากที่จอด
        setExitFormData(prev => ({
          ...prev,
          history_id: activeResponse.data.history_id
        }));
      }
      
      // ดึงข้อมูลลานจอดรถ
      await fetchParkingAreas();
      
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลลานจอดรถ
  const fetchParkingAreas = async () => {
    try {
      if (!date || !time) return;
      
      setLoading(true);
      const response = await findParking(date, time, selectedBuilding);
      if (response.success) {
        setParkingAreas(response.data);
      }
    } catch (error) {
      console.error("Error fetching parking areas:", error);
      setError("ไม่สามารถดึงข้อมูลลานจอดรถได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Handle QR scanning
  const handleScan = (data) => {
    if (data) {
      setScanResult(data.text);
      
      try {
        // ตรวจสอบว่าเป็น Visitor และไม่มีการนัดหมายหรือไม่
        if (role === "Visitor" && !hasAppointmentToday && !appointmentFromStorage) {
          setError("คุณไม่มีการนัดหมายสำหรับวันนี้ ไม่สามารถเข้าจอดได้");
          return;
        }
        
        // ตรวจสอบว่า URL ถูกต้องหรือไม่
        new URL(data.text);
        
        // ถ้าเป็น URL ที่ถูกต้อง ให้เปิดใน window ปัจจุบัน
        window.location.href = data.text;
      } catch (e) {
        // ถ้าไม่ใช่ URL ที่ถูกต้อง ให้แสดงข้อความ
        console.log("สแกนพบข้อความ (ไม่ใช่ URL):", data.text);
      }
    }
  };

  const handleError = (error) => {
    console.error("Error scanning QR Code:", error);
    setCameraError(true);
  };

  // Handle form input change for entry form
  const handleEntryFormChange = (e) => {
    const { name, value } = e.target;
    setEntryFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form input change for exit form
  const handleExitFormChange = (e) => {
    const { name, value } = e.target;
    setExitFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission for parking entry
  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // ตรวจสอบว่าเป็น Visitor และไม่มีการนัดหมายหรือไม่
      if (role === "Visitor" && !hasAppointmentToday && !appointmentFromStorage) {
        throw new Error("คุณไม่มีการนัดหมายสำหรับวันนี้ ไม่สามารถเข้าจอดได้");
      }
      
      // สร้างข้อมูลฟอร์มใหม่
      let formData = {};
      
      // ถ้าเป็น Visitor ให้ใช้ข้อมูลจากการนัดหมายโดยตรง
      if (role === "Visitor") {
        // ใช้ข้อมูลจาก appointmentFromStorage ก่อน (ถ้ามี)
        if (appointmentFromStorage) {
          // สร้างข้อมูลฟอร์มจากการนัดหมายโดยตรง
          formData = {
            area_id: appointmentFromStorage.area_id,
            entry_time: appointmentFromStorage.start_time || new Date().toTimeString().substring(0, 5),
            vehicle_id: appointmentFromStorage.vehicle_id || entryFormData.vehicle_id
          };
          
          console.log("Created form data directly from stored appointment:", formData);
          
          // ตรวจสอบว่ามี area_id หรือไม่
          if (!formData.area_id) {
            console.error("Missing area_id in appointmentFromStorage:", appointmentFromStorage);
            
            // ถ้าไม่มี area_id แต่มี area_name ให้ค้นหา area_id จาก area_name
            if (appointmentFromStorage.area_name) {
              console.log("Trying to find area_id from area_name:", appointmentFromStorage.area_name);
              
              // ค้นหาพื้นที่จอดรถที่มีชื่อตรงกับ area_name
              const matchingArea = parkingAreas.find(area => area.area_name === appointmentFromStorage.area_name);
              
              if (matchingArea) {
                console.log("Found matching area:", matchingArea);
                formData.area_id = matchingArea.area_id;
              } else {
                // ถ้าไม่พบ area_id ให้ใช้ค่าจาก pa.area_id ที่เพิ่มเข้ามาในการ query
                if (appointmentFromStorage.area_id) {
                  console.log("Using area_id directly from appointment:", appointmentFromStorage.area_id);
                  formData.area_id = appointmentFromStorage.area_id;
                } else {
                  throw new Error("ไม่พบข้อมูลลานจอดในการนัดหมาย กรุณาติดต่อผู้ดูแลระบบ");
                }
              }
            } else {
              throw new Error("ไม่พบข้อมูลลานจอดในการนัดหมาย กรุณาติดต่อผู้ดูแลระบบ");
            }
          }
        } 
        // ถ้าไม่มี appointmentFromStorage แต่มีการนัดหมายวันนี้
        else if (hasAppointmentToday && visitorAppointments.length > 0) {
          const appointment = visitorAppointments[0];
          
          // สร้างข้อมูลฟอร์มจากการนัดหมายโดยตรง
          formData = {
            area_id: appointment.area_id,
            entry_time: appointment.start_time || new Date().toTimeString().substring(0, 5),
            vehicle_id: appointment.vehicle_id || entryFormData.vehicle_id
          };
          
          console.log("Created form data directly from today's appointment:", formData);
          
          // ตรวจสอบว่ามี area_id หรือไม่
          if (!formData.area_id) {
            console.error("Missing area_id in today's appointment:", appointment);
            
            // ถ้าไม่มี area_id แต่มี area_name ให้ค้นหา area_id จาก area_name
            if (appointment.area_name) {
              console.log("Trying to find area_id from area_name:", appointment.area_name);
              
              // ค้นหาพื้นที่จอดรถที่มีชื่อตรงกับ area_name
              const matchingArea = parkingAreas.find(area => area.area_name === appointment.area_name);
              
              if (matchingArea) {
                console.log("Found matching area:", matchingArea);
                formData.area_id = matchingArea.area_id;
              } else {
                // ถ้าไม่พบ area_id ให้ใช้ค่าจาก pa.area_id ที่เพิ่มเข้ามาในการ query
                if (appointment.area_id) {
                  console.log("Using area_id directly from appointment:", appointment.area_id);
                  formData.area_id = appointment.area_id;
                } else {
                  throw new Error("ไม่พบข้อมูลลานจอดในการนัดหมาย กรุณาติดต่อผู้ดูแลระบบ");
                }
              }
            } else {
              throw new Error("ไม่พบข้อมูลลานจอดในการนัดหมาย กรุณาติดต่อผู้ดูแลระบบ");
            }
          }
        }
      } else {
        // ถ้าไม่ใช่ Visitor ให้ใช้ข้อมูลจากฟอร์ม
        formData = { ...entryFormData };
      }
      
      // Detailed logging for debugging
      console.log("Form data before validation:", formData);
      console.log("area_id:", formData.area_id);
      console.log("vehicle_id:", formData.vehicle_id);
      console.log("entry_time:", formData.entry_time);
      
      // ตรวจสอบและแก้ไขค่า area_id ถ้าไม่มี
      if (!formData.area_id && role === "Visitor") {
        if (appointmentFromStorage && appointmentFromStorage.area_id) {
          console.log("Fixing missing area_id with value from storage:", appointmentFromStorage.area_id);
          formData.area_id = appointmentFromStorage.area_id;
        } else if (hasAppointmentToday && visitorAppointments.length > 0 && visitorAppointments[0].area_id) {
          console.log("Fixing missing area_id with value from today's appointment:", visitorAppointments[0].area_id);
          formData.area_id = visitorAppointments[0].area_id;
        }
        
        // ถ้ายังไม่มี area_id ให้ดึงจาก hidden input
        if (!formData.area_id) {
          const hiddenInput = document.getElementById('visitor-area-id');
          if (hiddenInput && hiddenInput.value) {
            console.log("Getting area_id from hidden input:", hiddenInput.value);
            formData.area_id = hiddenInput.value;
          }
        }
        
        // ถ้ายังไม่มี area_id ให้แสดงข้อความผิดพลาด
        if (!formData.area_id) {
          console.error("Still missing area_id after all attempts");
          throw new Error("ไม่พบข้อมูลลานจอดในการนัดหมาย กรุณาติดต่อผู้ดูแลระบบ");
        }
      }
      
      // Validate form data with detailed error messages
      if (!formData.area_id) {
        console.error("Missing area_id in form data");
        throw new Error("กรุณาเลือกลานจอด (area_id is missing)");
      }
      
      if (!formData.vehicle_id) {
        console.error("Missing vehicle_id in form data");
        throw new Error("กรุณาเลือกยานพาหนะ (vehicle_id is missing)");
      }
      
      if (!formData.entry_time) {
        console.error("Missing entry_time in form data");
        throw new Error("กรุณาระบุเวลาเข้า (entry_time is missing)");
      }
      
      console.log("Submitting entry data:", formData);

      // Create parking entry
      const response = await createParkingEntry(formData);

      if (response.success) {
        setSuccess("บันทึกข้อมูลการเข้าจอดสำเร็จ");

        // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
        localStorage.removeItem('active_parking');
        localStorage.removeItem('selectedAppointment');
        
        // รีเฟรชข้อมูลเพื่อให้แน่ใจว่าข้อมูลที่แสดงเป็นข้อมูลล่าสุดจากฐานข้อมูล
        setTimeout(async () => {
          await refreshAllData();
          setShowEntryModal(false);
        }, 2000);
      } else {
        throw new Error(response.message || "ไม่สามารถบันทึกข้อมูลการเข้าจอดได้");
      }
    } catch (error) {
      console.error("Error creating parking entry:", error);
      setError(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // เพิ่ม state สำหรับตรวจสอบการชำระเงิน
  const [isPaid, setIsPaid] = useState(false);
  const [showPaymentRequiredAlert, setShowPaymentRequiredAlert] = useState(false);

  // ฟังก์ชันสำหรับนำทางไปยังหน้าชำระเงิน
  const handleGoToPayment = () => {
    // เก็บข้อมูลการจอดและฟอร์มออกจากที่จอดใน sessionStorage
    if (activeParking) {
      // คำนวณค่าบริการจากข้อมูลที่มี
      const parkingFee = activeParking.parking_fee ? parseFloat(activeParking.parking_fee) : 20;
      const serviceFee = activeParking.service_fee ? parseFloat(activeParking.service_fee) : 0;
      const fineFee = activeParking.fine_fee ? parseFloat(activeParking.fine_fee) : 0;
      const discount = activeParking.discount ? parseFloat(activeParking.discount) : 0;
      
      // คำนวณยอดรวม
      const total = parkingFee + serviceFee + fineFee - discount;
      
      const paymentData = {
        historyId: activeParking.history_id,
        exitTime: exitFormData.exit_time,
        parkingFee: parkingFee,
        penaltyFee: fineFee,
        serviceFee: serviceFee,
        discount: discount,
        total: total,
        buildingName: activeParking.building_name,
        areaName: activeParking.area_name,
        licensePlate: activeParking.license_plate,
        entryDate: activeParking.entry_date,
        entryTime: activeParking.entry_time,
        duration: activeParking.duration,
        fromParkingExit: true // เพิ่มฟิลด์นี้เพื่อระบุว่ามาจากหน้าออกจากที่จอด
      };
      
      sessionStorage.setItem("paymentData", JSON.stringify(paymentData));
      console.log("Saved payment data to sessionStorage:", paymentData);
      
      // นำทางไปยังหน้าชำระเงิน
      navigate("/profile/payment");
    }
  };

  // Handle form submission for parking exit
  const handleExitSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ตรวจสอบว่าเป็น Visitor และยังไม่ได้ชำระเงิน
    if (role === "Visitor" && !isPaid) {
      setShowPaymentRequiredAlert(true);
      return;
    }

    setLoading(true);

    try {
      // Validate form data
      if (!exitFormData.history_id || !exitFormData.exit_time) {
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
      }

      // Create parking exit
      const response = await createParkingExit(exitFormData);

      if (response.success) {
        const parkingFee = response.data.parking_fee ? parseFloat(response.data.parking_fee) : 0;
        setSuccess(`บันทึกข้อมูลการออกจากที่จอดสำเร็จ ค่าบริการ ${parkingFee.toFixed(2)} บาท`);

        // รีเซ็ตข้อมูลการจอดที่กำลังใช้งานอยู่
        setActiveParking(null);
        
        // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
        localStorage.removeItem('active_parking');
        
        // ถ้าเป็น Visitor ให้อัพเดทสถานะการนัดหมายเป็น completed
        if (role === "Visitor") {
          try {
            // ตรวจสอบว่ามีการนัดหมายหรือไม่
            if (hasAppointmentToday && visitorAppointments.length > 0) {
              const appointmentId = visitorAppointments[0].appointment_id;
              console.log("Updating appointment status to completed for ID:", appointmentId);
              
              // อัพเดทสถานะการนัดหมายเป็น completed
              await updateAppointmentStatus(appointmentId, "completed");
              console.log("Appointment status updated to completed");
              
              // รีเซ็ตสถานะการนัดหมาย
              setHasAppointmentToday(false);
              setVisitorAppointments([]);
            }
          } catch (appointmentError) {
            console.error("Error updating appointment status:", appointmentError);
            // ไม่ต้องแสดงข้อผิดพลาดนี้ให้ผู้ใช้เห็น เพราะการออกจากที่จอดสำเร็จแล้ว
          }
        }
        
        // รีเซ็ตสถานะการชำระเงิน
        setIsPaid(false);
        
        // รีเฟรชข้อมูลเพื่อให้แน่ใจว่าข้อมูลที่แสดงเป็นข้อมูลล่าสุดจากฐานข้อมูล
        setTimeout(() => {
          refreshAllData();
          setShowExitModal(false);
        }, 2000);
      } else {
        throw new Error(response.message || "ไม่สามารถบันทึกข้อมูลการออกจากที่จอดได้");
      }
    } catch (error) {
      console.error("Error creating parking exit:", error);
      setError(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };
  
  // ตรวจสอบการชำระเงินจาก sessionStorage เมื่อกลับมาจากหน้าชำระเงิน
  useEffect(() => {
    const checkPaymentStatus = () => {
      const paymentStatus = sessionStorage.getItem("paymentCompleted");
      if (paymentStatus === "true") {
        setIsPaid(true);
        setShowPaymentRequiredAlert(false);
        sessionStorage.removeItem("paymentCompleted"); // ลบข้อมูลหลังจากใช้งาน
      }
    };
    
    checkPaymentStatus();
  }, [location]);

  // Handle modal close
  const handleCloseModal = () => {
    setShowEntryModal(false);
    setShowExitModal(false);
    setError("");
    setSuccess("");
  };

  // แสดงการจอดที่กำลังใช้งานอยู่
  const renderActiveParking = () => {
    if (!activeParking) return null;
    
    return (
      <Card className="mb-4 active-parking-card">
        <Card.Header as="h5">
          กำลังจอดอยู่
        </Card.Header>
        <Card.Body>
          <p><strong>สถานที่:</strong> {activeParking.building_name} {activeParking.area_name}</p>
          <p><strong>ทะเบียนรถ:</strong> {activeParking.license_plate}</p>
          <p><strong>เข้าจอด:</strong> {activeParking.entry_date} เวลา {activeParking.entry_time}</p>
          <p><strong>ระยะเวลา:</strong> {activeParking.duration}</p>
          <p><strong>ค่าจอดปัจจุบัน:</strong> {activeParking.current_fee || 0} บาท</p>
          
          <Button 
            variant="danger" 
            className="w-100 mt-2"
            onClick={() => setShowExitModal(true)}
          >
            บันทึกการออกจากที่จอด
          </Button>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div style={{ minHeight: "900px", display: "flex", flexDirection: "column" }}>
      <div>
        <div className="box3">
          <img src={logo} alt="My Logo1" className="Logo3-image" />
        </div>
      </div>

      <div className="main-content">
        <div className="titleQR">
          <h2>Scan QR Code</h2>
        </div>

        {/* แสดงข้อความแจ้งเตือนสำหรับ Visitor ที่ไม่มีการนัดหมาย */}
        {role === "Visitor" && !hasAppointmentToday && !appointmentFromStorage && (
          <Alert variant="warning" className="mt-3 mb-3">
            <p>คุณไม่มีการนัดหมายสำหรับวันนี้</p>
            <p>คุณจำเป็นต้องได้รับการนัดหมายจาก Member ก่อนจึงจะสามารถเข้าจอดได้</p>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => navigate("/profile/appointments")}
            >
              ตรวจสอบการนัดหมาย
            </Button>
          </Alert>
        )}

        {/* QR Scanner */}
        <div className="boxscan">
          {cameraError ? (
            <div className="camera-error">
              <Alert variant="warning">
                <p>ไม่สามารถเข้าถึงกล้องได้</p>
                <p>กรุณาตรวจสอบการเชื่อมต่อกล้องและการอนุญาตให้เข้าถึงกล้อง</p>
                <Button onClick={() => setCameraError(false)} variant="primary" className="mt-2">
                  ลองใหม่
                </Button>
              </Alert>
            </div>
          ) : (
            <QrScanner
              delay={300}
              className="previewStyle"
              onError={handleError}
              onScan={handleScan}
              constraints={{
                video: {
                  facingMode: "environment",
                  width: { ideal: 1280 },
                  height: { ideal: 1280 },
                },
              }}
            />
          )}
        </div>

        <div className="scan-result">
          {scanResult ? (
            <p>ผลลัพธ์: {scanResult}</p>
          ) : (
            <p className="text-muted1">กรุณาสแกน QR Code</p>
          )}
        </div>

        {/* แสดงข้อความ error ถ้ามี */}
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Active Parking Display */}
        {renderActiveParking()}

        {/* Simulation Buttons */}
        <div className="simulation-buttons">
          <button
            className="entry-btn"
            onClick={handleOpenEntryModal}
            // แก้ไขเงื่อนไขการ disabled ให้รวมกรณี visitor ไม่มีการนัดหมาย
            disabled={activeParking !== null || (role === "Visitor" && !hasAppointmentToday && !appointmentFromStorage)}
          >
            {role === "Visitor" ? "บันทึกการเข้าจอดตามการนัดหมาย" : "จำลองการแสกนเข้า"}
          </button>

          <button
            className="exit-btn"
            onClick={() => {
              setShowExitModal(true);
              setError("");
              setSuccess("");
              // รีเซ็ตฟอร์มเป็นค่าเริ่มต้น
              setExitFormData({
                ...exitFormData,
                exit_time: new Date().toTimeString().substring(0, 5),
                history_id: activeParking?.history_id || ""
              });
            }}
            disabled={activeParking === null}
          >
            จำลองการแสกนออก
          </button>
        </div>
        
        {/* เพิ่มปุ่มรีเฟรชข้อมูล */}
        <div className="refresh-container text-center mt-3">
          <Button 
            variant="outline-primary" 
            onClick={refreshAllData} 
            disabled={loading}
            className="refresh-button"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                กำลังโหลด...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-repeat me-2"></i>
                รีเฟรชข้อมูล
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Entry Modal */}
      <Modal 
        show={showEntryModal} 
        onHide={handleCloseModal} 
        centered
        onShow={() => {
          // เมื่อ Modal แสดง ให้ตรวจสอบและตั้งค่า area_id ใหม่
          if (role === "Visitor") {
            let areaId = null;
            let vehicleId = null;
            let entryTime = null;
            
            if (appointmentFromStorage) {
              if (appointmentFromStorage.area_id) {
                areaId = appointmentFromStorage.area_id;
                console.log("Setting area_id on modal show from storage:", areaId);
              }
              
              if (appointmentFromStorage.vehicle_id) {
                vehicleId = appointmentFromStorage.vehicle_id;
                console.log("Setting vehicle_id on modal show from storage:", vehicleId);
              }
              
              if (appointmentFromStorage.start_time) {
                entryTime = appointmentFromStorage.start_time;
                console.log("Setting entry_time on modal show from storage:", entryTime);
              }
            } else if (hasAppointmentToday && visitorAppointments.length > 0) {
              const appointment = visitorAppointments[0];
              
              if (appointment.area_id) {
                areaId = appointment.area_id;
                console.log("Setting area_id on modal show from today's appointment:", areaId);
              }
              
              if (appointment.vehicle_id) {
                vehicleId = appointment.vehicle_id;
                console.log("Setting vehicle_id on modal show from today's appointment:", vehicleId);
              }
              
              if (appointment.start_time) {
                entryTime = appointment.start_time;
                console.log("Setting entry_time on modal show from today's appointment:", entryTime);
              }
            }
            
            // อัพเดทฟอร์มข้อมูล
            let updatedFormData = { ...entryFormData };
            
            if (areaId) {
              updatedFormData.area_id = areaId;
            }
            
            if (vehicleId) {
              updatedFormData.vehicle_id = vehicleId;
            }
            
            if (entryTime) {
              updatedFormData.entry_time = entryTime;
            }
            
            setEntryFormData(updatedFormData);
            console.log("Updated form data on modal show:", updatedFormData);
            
            // ตรวจสอบว่า area_id ถูกตั้งค่าหรือไม่
            setTimeout(() => {
              console.log("Current entryFormData after modal show:", entryFormData);
            }, 100);
          }
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{role === "Visitor" ? "บันทึกการเข้าจอดตามการนัดหมาย" : "จำลองการเข้าจอดรถ"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          {/* แสดงข้อความแจ้งเตือนสำหรับ Visitor ว่าข้อมูลถูกกำหนดจากการนัดหมาย */}
          {role === "Visitor" && (hasAppointmentToday || appointmentFromStorage) && (
            <div className="alert alert-info mb-3">
              <p><strong>ข้อมูลการจอดถูกกำหนดตามการนัดหมายของคุณ</strong></p>
              <p>คุณไม่สามารถแก้ไขข้อมูลสถานที่และเวลาได้ เนื่องจากถูกกำหนดโดยการนัดหมาย</p>
              <div className="mt-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => {
                    console.log("Current form data:", entryFormData);
                    console.log("Appointment from storage:", appointmentFromStorage);
                    console.log("Today's appointments:", visitorAppointments);
                    console.log("Has appointment today:", hasAppointmentToday);
                    
                    // ตรวจสอบและแสดงค่า area_id
                    if (appointmentFromStorage) {
                      alert(`Area ID from storage: ${appointmentFromStorage.area_id || 'Not found'}`);
                    } else if (hasAppointmentToday && visitorAppointments.length > 0) {
                      alert(`Area ID from today's appointment: ${visitorAppointments[0].area_id || 'Not found'}`);
                    } else {
                      alert('No appointment data found');
                    }
                  }}
                >
                  ตรวจสอบข้อมูล
                </Button>
              </div>
            </div>
          )}

          <Form onSubmit={handleEntrySubmit}>
            {/* วันที่และเวลา */}
            
            <Form.Group className="mb-3">
              <Form.Label>วันที่</Form.Label>
              <Form.Control
                type="date"
                value={role === "Visitor" && appointmentFromStorage && appointmentFromStorage.appointment_date ? 
                  appointmentFromStorage.appointment_date : date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]}
                disabled={role === "Visitor"}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>เวลาเข้า</Form.Label>
              <Form.Control
                type="time"
                name="entry_time"
                value={role === "Visitor" && appointmentFromStorage && appointmentFromStorage.start_time ? 
                  appointmentFromStorage.start_time : entryFormData.entry_time}
                onChange={handleEntryFormChange}
                required
                disabled={role === "Visitor"}
              />
            </Form.Group>

            {/* Building Selection - แสดงแต่ไม่ให้แก้ไขถ้าเป็น Visitor */}
            <Form.Group className="mb-3">
              <Form.Label>อาคาร</Form.Label>
              {role === "Visitor" ? (
                <Form.Control
                  type="text"
                  value={appointmentFromStorage ? appointmentFromStorage.building_name || "" : 
                    (hasAppointmentToday && visitorAppointments.length > 0 ? 
                      visitorAppointments[0].building_name || "" : "")}
                  disabled
                />
              ) : (
                <Form.Select
                  value={selectedBuilding}
                  onChange={(e) => {
                    setSelectedBuilding(e.target.value);
                    setEntryFormData(prev => ({ ...prev, area_id: "" }));
                  }}
                  required
                  disabled={role === "Visitor"}
                >
                  <option value="">-- เลือกอาคาร --</option>
                  {buildings.map((building, index) => (
                    <option key={index} value={building}>
                      อาคาร {building}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>

            {/* Area Selection - แสดงแต่ไม่ให้แก้ไขถ้าเป็น Visitor */}
            <Form.Group className="mb-3">
              <Form.Label>ลานจอด</Form.Label>
              {role === "Visitor" ? (
                <Form.Control
                  type="text"
                  value={appointmentFromStorage ? appointmentFromStorage.area_name || "" : 
                    (hasAppointmentToday && visitorAppointments.length > 0 ? 
                      visitorAppointments[0].area_name || "" : "")}
                  disabled
                />
              ) : (
                <Form.Select
                  name="area_id"
                  value={entryFormData.area_id}
                  onChange={handleEntryFormChange}
                  required
                  disabled={!selectedBuilding || role === "Visitor"}
                >
                  <option value="">-- เลือกลานจอด --</option>
                  {filteredAreas.map((area) => (
                    <option
                      key={area.id}
                      value={area.id}
                      disabled={area.parking_status !== 'open'}
                    >
                      {area.floor} ({area.slots}) - {area.status}
                    </option>
                  ))}
                </Form.Select>
              )}
              {/* Hidden input to store the area_id from appointment */}
              {role === "Visitor" && (
                <input 
                  type="hidden" 
                  id="visitor-area-id"
                  value={appointmentFromStorage ? appointmentFromStorage.area_id : 
                    (hasAppointmentToday && visitorAppointments.length > 0 ? 
                      visitorAppointments[0].area_id : "")}
                />
              )}
            </Form.Group>

            {/* Vehicle Selection */}
            <Form.Group className="mb-3">
              <Form.Label>เลือกยานพาหนะ</Form.Label>
              <Form.Select
                name="vehicle_id"
                value={entryFormData.vehicle_id}
                onChange={handleEntryFormChange}
                required
                disabled={role === "Visitor" && (appointmentFromStorage?.vehicle_id || 
                  (hasAppointmentToday && visitorAppointments.length > 0 && visitorAppointments[0].vehicle_id))}
              >
                <option value="">-- เลือกยานพาหนะ --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                    {vehicle.license_plate} - {vehicle.vehicle_brand} {vehicle.vehicle_model}
                    {vehicle.is_primary ? " (คันหลัก)" : ""}
                  </option>
                ))}
              </Form.Select>
              {vehicles.length === 0 && (
                <div className="text-muted mt-2">
                  <small>ไม่พบข้อมูลยานพาหนะ <Link to="/profile/vehicles">เพิ่มทะเบียนรถ</Link></small>
                </div>
              )}
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                className="me-2"
              >
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    <span className="ms-2">กำลังบันทึก...</span>
                  </>
                ) : (
                  "บันทึกการเข้าจอด"
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Exit Modal */}
      <Modal show={showExitModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>จำลองการออกจากที่จอด</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {showPaymentRequiredAlert && role === "Visitor" && (
            <div className="alert alert-warning">
              กรุณาชำระค่าบริการก่อนออกจากที่จอด
            </div>
          )}

          {!activeParking ? (
            <div className="text-center py-4">
              <Button
                variant="primary"
                onClick={() => {
                  setShowExitModal(false);
                  setShowEntryModal(true);
                }}
              >
                ไปยังหน้าบันทึกการเข้าจอด
              </Button>
            </div>
          ) : (
            <Form onSubmit={handleExitSubmit}>
              {/* แสดงข้อมูลการจอดที่กำลังใช้งาน */}
              <div className="parking-info mb-3">
                <h6>ข้อมูลการจอด</h6>
                <p><strong>สถานที่:</strong> {activeParking.building_name} {activeParking.area_name}</p>
                <p><strong>ทะเบียนรถ:</strong> {activeParking.license_plate}</p>
                <p><strong>เข้าจอด:</strong> {activeParking.entry_date} เวลา {activeParking.entry_time}</p>
                <p><strong>ระยะเวลาจนถึงปัจจุบัน:</strong> {activeParking.duration}</p>
                
                {/* แสดงค่าบริการสำหรับ Visitor */}
                {role === "Visitor" && (
                  <div className="fee-info mt-3 p-2 bg-light rounded">
                    <h6 className="text-primary">ค่าบริการ</h6>
                    <p className="mb-1"><strong>ค่าจอดรถ:</strong> {activeParking.parking_fee ? parseFloat(activeParking.parking_fee).toFixed(2) : "20.00"} บาท</p>
                    <p className="mb-0"><strong>สถานะการชำระเงิน:</strong> {isPaid ? 
                      <span className="text-success">ชำระแล้ว</span> : 
                      <span className="text-danger">ยังไม่ได้ชำระ</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* บันทึกเวลาออก */}
              <Form.Group className="mb-3">
                <Form.Label>เวลาออก</Form.Label>
                <Form.Control
                  type="time"
                  name="exit_time"
                  value={exitFormData.exit_time}
                  onChange={handleExitFormChange}
                  required
                />
                <input
                  type="hidden"
                  name="history_id"
                  value={activeParking.history_id}
                />
              </Form.Group>

              {/* แสดงปุ่มชำระเงินสำหรับ Visitor */}
              {role === "Visitor" && !isPaid && (
                <div className="d-grid gap-2 mb-3">
                  <Button 
                    variant="success" 
                    onClick={handleGoToPayment}
                    className="py-2"
                  >
                    ชำระค่าบริการ 20 บาท
                  </Button>
                </div>
              )}

              <div className="d-flex justify-content-end">
                <Button
                  variant="secondary"
                  onClick={handleCloseModal}
                  className="me-2"
                >
                  ยกเลิก
                </Button>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loading || (role === "Visitor" && !isPaid)}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="ms-2">กำลังบันทึก...</span>
                    </>
                  ) : (
                    "บันทึกการออกจากที่จอด"
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
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

export default ScanQR;