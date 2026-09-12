// src/App.js
import React, { useState,useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate,useNavigate } from 'react-router-dom';
import axios from 'axios';

import Login from './page/Login/Login';
import Signup from './page/Login/Singup/Singup';
import Forgot from './page/Login/Forgot/Forgot';
import Resetpass from './page/Login/Forgot/Resetpass';

import Home from './page/Home/Home';
import ScanQR from './page/Home/ScanQR/ScanQR';

import Findparking from './page/Findparking/Findparking';
import Record from './page/Record/Record';

import Profile from './page/Profile/Profile';
import EditMember from "./page/Profile/editmember/editmember";
import Payment from './page/Profile/Payment/Payment';
import Appointment from './page/Profile/appointment/appointment'
import AppointmentList from './page/Profile/appointment/AppointmentList'; // เพิ่มบรรทัดนี้

import Report from './page/Profile/Report/report';
import True from './page/Profile/Payment/True/True';
import Promptpay from './page/Profile/Payment/Promptpay/Promptpay';
import Finishedp1 from './page/Profile/Payment/Promptpay/Finishedp1/Finishedp1';
import Finishedt2 from './page/Profile/Payment/True/Finishedt2/Finishedt2';
import Unsuccessful1 from './page/Profile/Payment/Promptpay/Unsuccessful1/Unsuccessful1';
import PaymentReceipt from './page/Profile/Payment/Receipt/PaymentReceipt';
import VehicleManagement from './page/Profile/VehicleManagement/VehicleManagement';


import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import './App.css'
function App() {
  // // กำหนดค่าเริ่มต้นโดยตรวจสอบจาก localStorage
  // const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("loggedIn") === "true");

  // const handleLogin = (username, role) => {
  //   localStorage.setItem("loggedIn", "true");
  //   localStorage.setItem("userRole", role); // เก็บ role ของผู้ใช้งาน
  //   setIsAuthenticated(true);
  // };
  

  // const handleLogout = () => {
  //   localStorage.removeItem("loggedIn");
  //   setIsAuthenticated(false);
  // };
  // // <button onClick={onLogout}>ออกจากระบบ</button>  ไว้ใช้ Logout

    // กำหนดค่าเริ่มต้นโดยตรวจสอบจาก localStorage
    const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("loggedIn") === "true");
    const [isLoading, setIsLoading] = useState(true);
    
    // ตรวจสอบความถูกต้องของ token เมื่อโหลดแอพ
    useEffect(() => {
      const verifyToken = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("userToken");
        
        if (token) {
          try {
            // ตรวจสอบความถูกต้องของ token กับ API
            const response = await axios.get("http://localhost:3000/users/verify", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (response.status === 200) {
              setIsAuthenticated(true);
              
              // อัพเดท role หากมีการเปลี่ยนแปลง
              if (response.data.role) {
                localStorage.setItem("userRole", response.data.role === "member" ? "Member" : "Visitor");
              }
            } else {
              // ถ้า token ไม่ถูกต้องหรือหมดอายุ ให้ logout
              handleLogout();
            }
          } catch (error) {
            console.error("Token verification error:", error);
            // ถ้าเกิด error ในการตรวจสอบ token ให้ logout
            handleLogout();
          }
        } else {
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
      };
      
      verifyToken();
    }, []);
    
    const handleLogin = (username, role) => {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("userRole", role);
      setIsAuthenticated(true);
    };
  
    const handleLogout = () => {
      // ลบข้อมูลทั้งหมดออกจาก localStorage
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("userId");
      localStorage.removeItem("userPhone");

        // เพิ่มการลบข้อมูลรูปโปรไฟล์
      localStorage.removeItem("profilePicture");
      localStorage.removeItem("profilePictureOwner");
      localStorage.removeItem("currentUser");

        // ลบข้อมูลแคชอื่นๆ ที่อาจเกี่ยวข้องกับผู้ใช้
      // localStorage.removeItem("vehicleEditHistory");
      
      setIsAuthenticated(false);
    };
  
    // แสดง loading ขณะที่กำลังตรวจสอบ token
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">กำลังโหลด...</span>
          </div>
        </div>
      );
    }

  return (
    <Router>
      
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/login"} />} />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/home" 
          element={isAuthenticated ? <Home onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="/home/ScanQRCode" element={<ScanQR />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<Forgot />} />
        <Route path="/forgot-password/resetpass" element={<Resetpass />} />
        <Route path="/" element={<Home />} />
        <Route path="/findparking" element={<Findparking />} />
        <Route path="/record" element={<Record />} />
        
        <Route path="/profile" element={isAuthenticated ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/profile/edit-member" element={<EditMember />} />
        <Route path="/profile/payment" element={<Payment />} />
        <Route path="/profile/payment/promptpay" element={<Promptpay />} />
        <Route path="/profile/appointment" element={<Appointment />} />
        <Route path="/profile/report" element={<Report />} />
        <Route path="/profile/payment/true" element={<True />} />
        <Route path="/profile/payment/promptpay/finishedp1" element={<Finishedp1 />} />
        <Route path="/profile/payment/true/finished" element={<Finishedt2/>} />
        <Route path="/profile/payment/promptpay/unsuccessful1" element={<Unsuccessful1 />} />
        <Route path="/profile/payment/true/unsuccessful" element={<Unsuccessful1 />} />
        <Route path="/profile/vehicles" element={<VehicleManagement />}/>
        <Route path="/profile/payment/receipt" element={<PaymentReceipt />} />
        <Route path="/profile/appointments" element={<AppointmentList />} />
        
      </Routes>
   
    </Router>
  );
}

export default App;

// Test2
