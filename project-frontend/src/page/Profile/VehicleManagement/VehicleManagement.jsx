import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Navbar, Nav, Button, Modal, Spinner, Form } from "react-bootstrap";
import { IoHome } from "react-icons/io5";
import { FaSearch, FaCar, FaEdit, FaTrash, FaStar, FaRegStar, FaCamera, FaImage, FaTimesCircle } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { faBuildingCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { 
  getUserVehicles, 
  addVehicle, 
  updateVehicle, 
  deleteVehicle, 
  VehicleEditLimitManager,
  uploadVehicleImage,
  getVehicleImage,
  deleteVehicleImage
} from "../../../services/apiService";

import logo from "/public/Metthier Master Logo.png";

// Add vehicle management styles
const vehicleManagementStyles = `
/* ================= Enhanced Vehicle Management Styles ================= */

/* หน้าจัดการยานพาหนะ - ส่วนหลัก */
.vehicle-management-container {
  padding: 20px;
  margin-bottom: 90px;
  width: 95%;
  margin: 0px auto;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(to bottom, #f8f9fa, #ffffff);
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.vehicle-management-container::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -80px;
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, rgba(253, 110, 43, 0.12) 0%, rgba(253, 110, 43, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.vehicle-management-container::after {
  content: '';
  position: absolute;
  bottom: -100px;
  left: -100px;
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, rgba(71, 51, 102, 0.12) 0%, rgba(71, 51, 102, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}

/* ส่วนหัวของหน้า */
.vehicle-management-title {
  color: #473366;
  text-align: center;
  margin-bottom: 30px;
  font-weight: 800;
  font-size: 28px;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  animation: fadeInDown 0.6s ease-out;
  letter-spacing: 0.5px;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-25px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vehicle-management-title::after {
  content: '';
  display: block;
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #FD6E2B 0%, #FF8C4B 100%);
  margin: 12px auto 0 auto;
  border-radius: 4px;
}

/* ข้อความแจ้งเตือนการแก้ไข */
.vehicle-limit-warning {
  background: linear-gradient(to right, #fff5f5 0%, #ffebeb 100%);
  color: #721c24;
  padding: 18px;
  border-radius: 15px;
  margin-bottom: 25px;
  font-size: 16px;
  text-align: center;
  border-left: 5px solid #e74a3b;
  box-shadow: 0 5px 15px rgba(231, 74, 59, 0.15);
  animation: pulse-red 2s infinite;
  position: relative;
  line-height: 1.5;
}

.vehicle-limit-warning::before {
  content: '⚠️';
  font-size: 20px;
  margin-right: 8px;
  display: inline-block;
  animation: shake 1.5s infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

@keyframes pulse-red {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 74, 59, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 74, 59, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 74, 59, 0);
  }
}

/* ตัวนับจำนวนแก้ไข */
.vehicle-limit-counter {
  text-align: center;
  margin-bottom: 20px;
  font-size: 16px;
  color: #555;
  padding: 15px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
  border-radius: 15px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  border: 1px solid #eee;
  transition: all 0.3s ease;
}

.vehicle-limit-counter:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.vehicle-limit-counter:first-of-type {
  border-left: 5px solid #473366;
  background: linear-gradient(to right, #f5f3f8 0%, #ffffff 100%);
}

.vehicle-limit-counter:last-of-type {
  border-left: 5px solid #FD6E2B;
  background: linear-gradient(to right, #fff5f0 0%, #ffffff 100%);
}

.vehicle-limit-time {
  font-weight: bold;
  color: #e74a3b;
}

/* รายการยานพาหนะ */
.vehicle-list {
  margin-bottom: 25px;
  background-color: #f8f9fa;
  border-radius: 18px;
  padding: 18px;
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
  animation: fadeIn 0.8s ease-out;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ddd #f8f9fa;
  position: relative;
}

.vehicle-list::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23dddddd' fill-opacity='0.2' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
  border-radius: 18px;
  z-index: -1;
  opacity: 0.4;
}

.vehicle-list::-webkit-scrollbar {
  width: 6px;
}

.vehicle-list::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 10px;
}

.vehicle-list::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 10px;
}

.vehicle-card {
  background: linear-gradient(to right, #ffffff 0%, #f9f9f9 100%);
  border-radius: 16px;
  padding: 22px;
  margin-bottom: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
  position: relative;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid #f0f0f0;
  animation: slideInRight 0.5s ease-out;
  overflow: hidden;
}

@keyframes slideInRight {
  from {
    transform: translateX(60px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.vehicle-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, #473366 0%, transparent 100%);
  border-radius: 0 0 16px 16px;
  opacity: 0;
  transition: all 0.3s ease;
}

.vehicle-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

.vehicle-card:hover::after {
  opacity: 1;
}

.vehicle-card.primary {
  border-left: 6px solid #4e73df;
  background: linear-gradient(to right, #f0f7ff 0%, #ffffff 100%);
}

.vehicle-card.primary::after {
  background: linear-gradient(90deg, #4e73df 0%, transparent 100%);
  opacity: 1;
}

.vehicle-license {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
  position: relative;
  display: inline-block;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.vehicle-license::after {
  content: '';
  display: block;
  width: 45px;
  height: 3px;
  background: #ddd;
  margin-top: 6px;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.vehicle-card:hover .vehicle-license::after {
  width: 100%;
  background: linear-gradient(90deg, #FD6E2B 0%, transparent 100%);
}

.vehicle-details {
  font-size: 16px;
  color: #666;
  margin-bottom: 18px;
  line-height: 1.6;
  padding-left: 5px;
}

.vehicle-details div {
  margin-bottom: 7px;
  display: flex;
  align-items: center;
}

.vehicle-details div strong {
  min-width: 85px;
  color: #473366;
  font-weight: 600;
}

/* ป้ายคันหลัก */
.primary-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #4e73df 0%, #3a5fcc 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 8px rgba(78, 115, 223, 0.3);
  animation: pulse 2s infinite;
  letter-spacing: 0.5px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(78, 115, 223, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(78, 115, 223, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(78, 115, 223, 0);
  }
}

/* ปุ่มดำเนินการ */
.vehicle-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: 10px;
}

/* ปุ่มดาว (ตั้งเป็นคันหลัก) */
.btn-star {
  color: #f8c200;
  background: none;
  border: none;
  padding: 10px;
  font-size: 24px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.btn-star::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(248, 194, 0, 0.15);
  border-radius: 50%;
  transform: scale(0);
  transition: all 0.3s ease;
}

.btn-star:hover::before {
  transform: scale(1.2);
}

.btn-star:hover {
  transform: scale(1.25) rotate(15deg);
  color: #ffb400;
}

/* ปุ่มแก้ไข */
.btn-edit {
  color: #4e73df;
  background: none;
  border: none;
  padding: 10px;
  font-size: 22px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.btn-edit::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(78, 115, 223, 0.15);
  border-radius: 50%;
  transform: scale(0);
  transition: all 0.3s ease;
}

.btn-edit:hover::before {
  transform: scale(1.2);
}

.btn-edit:hover {
  transform: scale(1.25) rotate(5deg);
  color: #3a5fcc;
}

/* ปุ่มลบ */
.btn-delete {
  color: #e74a3b;
  background: none;
  border: none;
  padding: 10px;
  font-size: 22px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.btn-delete::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(231, 74, 59, 0.15);
  border-radius: 50%;
  transform: scale(0);
  transition: all 0.3s ease;
}

.btn-delete:hover::before {
  transform: scale(1.2);
}

.btn-delete:hover {
  transform: scale(1.25) rotate(-15deg);
  color: #d32a1a;
}

/* ปุ่มเพิ่มยานพาหนะ */
.add-vehicle-button {
  background: linear-gradient(135deg, #473366 0%, #5c4180 100%);
  color: white;
  border: none;
  border-radius: 15px;
  padding: 16px;
  width: 100%;
  margin-top: 25px;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 6px 15px rgba(71, 51, 102, 0.3);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.add-vehicle-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: all 0.6s ease;
}

.add-vehicle-button:hover::before {
  left: 100%;
}

.add-vehicle-button:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(71, 51, 102, 0.4);
  background: linear-gradient(135deg, #5c4180 0%, #473366 100%);
}

.add-vehicle-button:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(71, 51, 102, 0.3);
}

/* ปุ่มย้อนกลับ */
.back-button {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #333;
  border: none;
  border-radius: 15px;
  padding: 14px;
  margin-top: 15px;
  width: 100%;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.back-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.05), transparent);
  transition: all 0.6s ease;
}

.back-button:hover::before {
  left: 100%;
}

.back-button:hover {
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.back-button:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* ฟอร์มข้อมูลยานพาหนะ */
.vehicle-form-container {
  background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  position: relative;
  animation: fadeInUp 0.6s ease-out;
  border: 1px solid #f0f0f0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vehicle-form-container::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, rgba(253, 110, 43, 0.1) 0%, rgba(253, 110, 43, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.vehicle-form-container::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, rgba(71, 51, 102, 0.1) 0%, rgba(71, 51, 102, 0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.vehicle-form-container h5 {
  font-size: 22px;
  font-weight: 700;
  color: #473366;
  margin-bottom: 28px;
  position: relative;
  display: inline-block;
  text-align: center;
  width: 100%;
  letter-spacing: 0.5px;
}

.vehicle-form-container h5::after {
  content: '';
  display: block;
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #FD6E2B 0%, transparent 100%);
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}

.vehicle-form-group {
  margin-bottom: 22px;
  position: relative;
  transition: all 0.3s ease;
}

.vehicle-form-group:hover {
  transform: translateY(-2px);
}

.vehicle-form-label {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 16px;
  color: #473366;
  display: block;
  letter-spacing: 0.3px;
}

/* ช่องกรอกข้อมูล */
.form-control {
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #ddd;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  font-size: 16px;
  width: 100%;
  background-color: #f9f9f9;
}

.form-control:focus {
  border-color: #473366;
  box-shadow: 0 0 0 3px rgba(71, 51, 102, 0.1), inset 0 1px 3px rgba(0, 0, 0, 0.05);
  outline: none;
  background-color: #fff;
  transform: translateY(-1px);
}

.form-check-input:checked {
  background-color: #473366;
  border-color: #473366;
}

/* ล็อคการแก้ไข */
.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  border-radius: 16px;
  font-size: 22px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  z-index: 10;
}

.locked-overlay::before {
  content: '🔒';
  font-size: 28px;
  margin-right: 10px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* สถานะว่าง */
.vehicle-list div[style*="text-align: center"] {
  padding: 60px 20px !important;
  background: linear-gradient(135deg, #f9f9f9 0%, #f5f5f5 100%);
  border-radius: 16px;
  border: 1px dashed #ddd;
  color: #888;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  text-align: center;
  animation: fadeIn 1s ease-out;
}

.vehicle-list div[style*="text-align: center"] svg {
  margin-bottom: 16px;
  color: #ccc;
  font-size: 48px !important;
  animation: moveUpDown 3s infinite;
}

@keyframes moveUpDown {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* ปรับแต่ง Modal */
.modal-header {
  background: linear-gradient(135deg, #473366 0%, #5c4180 100%);
  color: white;
  border-radius: 15px 15px 0 0;
  padding: 18px 24px;
  border-bottom: none;
}

.modal-title {
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.5px;
}

.modal-body {
  font-size: 18px;
  padding: 25px;
  color: #333;
  text-align: center;
}

.modal-footer {
  padding: 15px 25px 25px;
  border-top: none;
  justify-content: center;
}

.modal-footer .btn {
  min-width: 120px;
  padding: 12px 25px;
  font-weight: 600;
  border-radius: 10px;
  letter-spacing: 0.5px;
  font-size: 15px;
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.modal-footer .btn-primary {
  background: linear-gradient(135deg, #473366 0%, #5c4180 100%);
  border: none;
  box-shadow: 0 5px 15px rgba(71, 51, 102, 0.3);
}

.modal-footer .btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(71, 51, 102, 0.4);
  background: linear-gradient(135deg, #5c4180 0%, #473366 100%);
}

.modal-footer .btn-danger {
  background: linear-gradient(135deg, #e74a3b 0%, #d32a1a 100%);
  border: none;
  box-shadow: 0 5px 15px rgba(231, 74, 59, 0.3);
}

.modal-footer .btn-danger:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(231, 74, 59, 0.4);
  background: linear-gradient(135deg, #d32a1a 0%, #e74a3b 100%);
}

.modal-content {
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  border: none;
}

.modal-footer .btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  border: none;
  box-shadow: 0 5px 15px rgba(108, 117, 125, 0.3);
}

.modal-footer .btn-secondary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(108, 117, 125, 0.4);
  background: linear-gradient(135deg, #5a6268 0%, #6c757d 100%);
}

/* สไตล์ทันสมัยสำหรับ Loading Spinner */
.loading-spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  animation: gradientBG 10s ease infinite;
}

@keyframes gradientBG {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.loading-spinner-container .spinner-border {
  width: 3.5rem;
  height: 3.5rem;
  border-width: 0.25rem;
  color: #473366;
  animation: spin 1s linear infinite, pulse-scale 2s ease-in-out infinite;
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* เพิ่มสไตล์สำหรับรูปภาพยานพาหนะ */
.vehicle-image-container {
  margin-bottom: 20px;
  text-align: center;
  position: relative;
}

.vehicle-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid #eee;
}

.vehicle-image:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.vehicle-image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 20px;
}

.vehicle-image-upload:hover {
  border-color: #4e73df;
  background-color: #f5f8ff;
}

.vehicle-image-upload .upload-icon {
  font-size: 36px;
  color: #aaa;
  margin-bottom: 10px;
  animation: pulse 2s infinite;
}

.vehicle-image-upload .upload-text {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.vehicle-image-preview {
  position: relative;
  width: 100%;
  height: 200px;
}

.vehicle-delete-image {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  color: #e74a3b;
  z-index: 2;
}

.vehicle-delete-image:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
  color: #d32a1a;
}

.card-image-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin-right: 15px;
  flex-shrink: 0;
}

.card-vehicle-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eee;
}

.vehicle-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
`;

function VehicleManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for vehicles
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for vehicle form
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    license_plate: "",
    vehicle_type: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_color: "",
    is_primary: false
  });
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  
  // Vehicle edit limit state
  const [vehicleEditStatus, setVehicleEditStatus] = useState({
    canEdit: true,
    editsLeft: 3,
    lockUntil: null
  });
  
  // State for image handling
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [vehicleImages, setVehicleImages] = useState({});
  const [shouldDeleteImage, setShouldDeleteImage] = useState(false);
  
  // UI states
  const [savingChanges, setSavingChanges] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  // Load vehicle images
  const loadVehicleImages = async (vehiclesData) => {
    const imagesMap = {};
    
    // Load images for each vehicle in parallel
    await Promise.all(vehiclesData.map(async (vehicle) => {
      try {
        const imageData = await getVehicleImage(vehicle.vehicle_id);
        if (imageData.vehicle_image) {
          // Construct full URL for image
          imagesMap[vehicle.vehicle_id] = `http://localhost:3000${imageData.vehicle_image}`;
        }
      } catch (error) {
        console.error(`Error fetching image for vehicle ${vehicle.vehicle_id}:`, error);
      }
    }));
    
    setVehicleImages(imagesMap);
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        
        // If vehicles were passed from Profile component, use them
        if (location.state?.vehicles) {
          const vehiclesData = location.state.vehicles;
          setVehicles(vehiclesData);
          
          // Load vehicle images
          await loadVehicleImages(vehiclesData);
          
          // Also get vehicle edit status if available
          if (location.state?.vehicleEditStatus) {
            setVehicleEditStatus(location.state.vehicleEditStatus);
          } else {
            // Otherwise check edit limit
            const editStatus = VehicleEditLimitManager.checkEditLimit();
            setVehicleEditStatus(editStatus);
          }
          
          setLoading(false);
          return;
        }
        
        // Otherwise fetch from API
        const vehiclesData = await getUserVehicles();
        setVehicles(vehiclesData);
        
        // Load vehicle images
        await loadVehicleImages(vehiclesData);
        
        // Check vehicle edit limit
        const editStatus = VehicleEditLimitManager.checkEditLimit();
        setVehicleEditStatus(editStatus);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setErrorMessage("ไม่สามารถโหลดข้อมูลยานพาหนะได้ กรุณาลองใหม่อีกครั้ง");
        setShowErrorModal(true);
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [location.state]);

  const handleBack = () => {
    navigate("/profile");
  };
  
  const handleAddVehicle = () => {
    // Reset form data
    setVehicleFormData({
      license_plate: "",
      vehicle_type: "",
      vehicle_brand: "",
      vehicle_model: "",
      vehicle_color: "",
      is_primary: false
    });
    
    // Reset image state
    setImageFile(null);
    setImagePreview(null);
    
    setEditingVehicleId(null);
    setShowVehicleForm(true);
  };
  
  const handleEditVehicle = async (vehicle) => {
    if (!vehicleEditStatus.canEdit) {
      setErrorMessage(`คุณแก้ไขข้อมูลยานพาหนะครบ 3 ครั้งแล้ว จะสามารถแก้ไขได้อีกครั้งในวันถัดไป`);
      setShowErrorModal(true);
      return;
    }
    
    setVehicleFormData({
      license_plate: vehicle.license_plate,
      vehicle_type: vehicle.vehicle_type || "",
      vehicle_brand: vehicle.vehicle_brand || "",
      vehicle_model: vehicle.vehicle_model || "",
      vehicle_color: vehicle.vehicle_color || "",
      is_primary: vehicle.is_primary || false
    });
    
    setEditingVehicleId(vehicle.vehicle_id);
    
    // Check if vehicle has image and set preview
    if (vehicleImages[vehicle.vehicle_id]) {
      setImagePreview(vehicleImages[vehicle.vehicle_id]);
    } else {
      setImagePreview(null);
    }
    
    setImageFile(null);
    setShouldDeleteImage(false); // รีเซ็ตสถานะการลบรูปภาพเมื่อเริ่มการแก้ไข
    setShowVehicleForm(true);
  };
  
  const handleDeleteVehicle = (vehicleId) => {
    setDeletingVehicleId(vehicleId);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteVehicle = async () => {
    try {
      setSavingChanges(true);
      
      await deleteVehicle(deletingVehicleId);
      
      // Update vehicles list
      const updatedVehicles = vehicles.filter(v => v.vehicle_id !== deletingVehicleId);
      setVehicles(updatedVehicles);
      
      // Remove from images map
      const updatedImages = { ...vehicleImages };
      delete updatedImages[deletingVehicleId];
      setVehicleImages(updatedImages);
      
      setSuccessMessage("ลบข้อมูลยานพาหนะเรียบร้อยแล้ว");
      setShowSuccessModal(true);
      setShowDeleteConfirm(false);
      setSavingChanges(false);
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      setErrorMessage(error.response?.data?.message || "ไม่สามารถลบข้อมูลยานพาหนะได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setShowDeleteConfirm(false);
      setSavingChanges(false);
    }
  };
  
  const handleSetPrimary = async (vehicleId) => {
    try {
      // Find the vehicle
      const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
      
      if (!vehicle) return;
      
      setSavingChanges(true);
      
      // Update vehicle to make it primary
      await updateVehicle(vehicleId, {
        ...vehicle,
        is_primary: true
      });
      
      // Record edit
      if (!vehicle.is_primary) {
        const editStatus = VehicleEditLimitManager.recordEdit(vehicleId);
        setVehicleEditStatus(editStatus);
      }
      
      // Update vehicles list
      const updatedVehicles = vehicles.map(v => ({
        ...v,
        is_primary: v.vehicle_id === vehicleId
      }));
      
      setVehicles(updatedVehicles);
      setSavingChanges(false);
    } catch (error) {
      console.error("Error updating primary vehicle:", error);
      setErrorMessage(error.response?.data?.message || "ไม่สามารถตั้งเป็นรถคันหลักได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setSavingChanges(false);
    }
  };
  
  const handleVehicleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVehicleFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      setErrorMessage("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
      setShowErrorModal(true);
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("ขนาดไฟล์ต้องไม่เกิน 5MB");
      setShowErrorModal(true);
      return;
    }
    
    // Set image file for upload
    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleDeleteImage = (e) => {
    e.preventDefault();
    
    if (!editingVehicleId) {
      // ถ้าไม่ได้อยู่ในโหมดแก้ไขแค่ล้างรูปพรีวิว
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    
    // เมื่อกดลบรูปภาพไม่ได้ลบทันที แต่จะตั้งค่าว่าจะลบเมื่อกดบันทึกแทน
    setShouldDeleteImage(true);
    
    // ซ่อนรูปภาพในหน้า UI เท่านั้น
    setImagePreview(null);
  };
  
  const handleVehicleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!vehicleFormData.license_plate) {
      setErrorMessage("กรุณากรอกทะเบียนรถ");
      setShowErrorModal(true);
      return;
    }
    
    // Check if we're editing and if we've reached the edit limit
    if (editingVehicleId && !vehicleEditStatus.canEdit) {
      setErrorMessage(`คุณแก้ไขข้อมูลยานพาหนะครบ 3 ครั้งแล้ว จะสามารถแก้ไขได้อีกครั้งในวันถัดไป`);
      setShowErrorModal(true);
      return;
    }
    
    try {
      setSavingChanges(true);
      
      if (editingVehicleId) {
        // Editing existing vehicle
        await updateVehicle(editingVehicleId, vehicleFormData);
        
        // Record this edit to count towards the daily limit
        const editStatus = VehicleEditLimitManager.recordEdit(editingVehicleId);
        setVehicleEditStatus(editStatus);
        
        // ถ้าผู้ใช้กดลบรูปภาพ ให้ลบรูปภาพจากเซิร์ฟเวอร์ตอนนี้
        if (shouldDeleteImage) {
          try {
            await deleteVehicleImage(editingVehicleId);
            
            // อัปเดตแคชรูปภาพในเครื่อง
            const updatedImages = { ...vehicleImages };
            delete updatedImages[editingVehicleId];
            setVehicleImages(updatedImages);
          } catch (error) {
            console.error("Error deleting vehicle image:", error);
            // ไม่แสดงข้อความแจ้งเตือนเพราะยังบันทึกข้อมูลอื่นสำเร็จ
          }
        }
        // Handle image upload if needed
        else if (imageFile) {
          await uploadVehicleImage(editingVehicleId, imageFile);
          
          // Update local image cache
          const updatedImages = { ...vehicleImages };
          // We need to create a temporary URL for immediate display
          // The actual URL will be loaded next time
          if (imagePreview) {
            updatedImages[editingVehicleId] = imagePreview;
          }
          setVehicleImages(updatedImages);
        }
        
        // Update vehicles list
        const updatedVehicles = vehicles.map(v => 
          v.vehicle_id === editingVehicleId 
            ? { 
                ...v, 
                ...vehicleFormData,
                // If this vehicle is set as primary, unmark others
                is_primary: vehicleFormData.is_primary
              }
            : {
                ...v,
                // If this new vehicle is primary, unmark others
                is_primary: vehicleFormData.is_primary ? false : v.is_primary
              }
        );
        
        setVehicles(updatedVehicles);
        setSuccessMessage("แก้ไขข้อมูลยานพาหนะเรียบร้อยแล้ว");
      } else {
        // Adding new vehicle
        const result = await addVehicle(vehicleFormData);
        
        if (result.vehicleId) {
          // Handle image upload if needed
          if (imageFile) {
            await uploadVehicleImage(result.vehicleId, imageFile);
            
            // Update local image cache
            const updatedImages = { ...vehicleImages };
            if (imagePreview) {
              updatedImages[result.vehicleId] = imagePreview;
            }
            setVehicleImages(updatedImages);
          }
          
          // Fetch the updated vehicle list
          const vehiclesData = await getUserVehicles();
          setVehicles(vehiclesData);
          setSuccessMessage("เพิ่มข้อมูลยานพาหนะเรียบร้อยแล้ว");
        }
      }
      
      // รีเซ็ตสถานะการลบรูปภาพ
      setShouldDeleteImage(false);
      setShowVehicleForm(false);
      setShowSuccessModal(true);
      setSavingChanges(false);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      setErrorMessage(error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลยานพาหนะได้ กรุณาลองใหม่อีกครั้ง");
      setShowErrorModal(true);
      setSavingChanges(false);
    }
  };
  
  const cancelVehicleForm = () => {
    // เมื่อยกเลิกฟอร์ม ต้องรีเซ็ตสถานะการลบรูปภาพ
    setShouldDeleteImage(false);
    setShowVehicleForm(false);
    setImageFile(null);
    
    // ถ้ากำลังแก้ไขและมีรูปภาพเดิม ให้กู้คืนการแสดงรูปภาพ
    if (editingVehicleId && vehicleImages[editingVehicleId]) {
      setImagePreview(vehicleImages[editingVehicleId]);
    } else {
      setImagePreview(null);
    }
  };
  
  // Modal handlers
  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
  };
  
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };
  
  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
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
      <style>{vehicleManagementStyles}</style>
      
      <div className="box2">
        <img src={logo} alt="My Logo" className="Logo2-image" />
      </div>

      <div className="main-content2">
        <div className="vehicle-management-container">
          <h4 className="vehicle-management-title">จัดการยานพาหนะ</h4>
          
          {/* Vehicle edit limit warning */}
          {!vehicleEditStatus.canEdit && (
            <div className="vehicle-limit-warning">
              คุณแก้ไขข้อมูลยานพาหนะครบ 3 ครั้งแล้ว<br />
              จะสามารถแก้ไขได้อีกครั้งในวันถัดไป
            </div>
          )}
          
          {/* Vehicle edit limit counter */}
          {vehicleEditStatus.canEdit && (
            <div className="vehicle-limit-counter">
              จำนวนการแก้ไขคงเหลือวันนี้: {vehicleEditStatus.editsLeft}/3 ครั้ง
            </div>
          )}
          
          {/* Vehicle limit counter */}
          <div className="vehicle-limit-counter">
            จำนวนยานพาหนะ: {vehicles.length}/3 คัน
          </div>
          
          {showVehicleForm ? (
            <div className="vehicle-form-container">
              <h5 style={{ textAlign: 'center', marginBottom: '20px' }}>
                {editingVehicleId ? 'แก้ไขข้อมูลยานพาหนะ' : 'เพิ่มยานพาหนะใหม่'}
              </h5>
              
              <Form onSubmit={handleVehicleFormSubmit}>
                {/* รูปภาพยานพาหนะ */}
                <div className="vehicle-image-container">
                  {imagePreview ? (
                    <div className="vehicle-image-preview">
                      <img src={imagePreview} alt="ตัวอย่างรูปภาพยานพาหนะ" className="vehicle-image" />
                      <button className="vehicle-delete-image" onClick={handleDeleteImage} disabled={imageLoading}>
                        <FaTimesCircle />
                      </button>
                    </div>
                  ) : (
                    <label className="vehicle-image-upload">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }}
                      />
                      <FaCamera className="upload-icon" />
                      <div className="upload-text">
                        คลิกเพื่ออัปโหลดรูปภาพยานพาหนะ<br />
                        <small>(รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB)</small>
                      </div>
                    </label>
                  )}
                </div>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Label className="vehicle-form-label">ทะเบียนรถ *</Form.Label>
                  <Form.Control
                    type="text"
                    name="license_plate"
                    value={vehicleFormData.license_plate}
                    onChange={handleVehicleFormChange}
                    placeholder="กรุณากรอกทะเบียนรถ"
                    required
                  />
                </Form.Group>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Label className="vehicle-form-label">ประเภทรถ</Form.Label>
                  <Form.Control
                    as="select"
                    name="vehicle_type"
                    value={vehicleFormData.vehicle_type}
                    onChange={handleVehicleFormChange}
                  >
                    <option value="">-- เลือกประเภทรถ --</option>
                    <option value="รถยนต์นั่งส่วนบุคคล">รถยนต์นั่งส่วนบุคคล</option>
                    <option value="รถยนต์เพื่อการพาณิชย์">รถยนต์เพื่อการพาณิชย์</option>
                    <option value="รถจักรยานยนต์">รถจักรยานยนต์</option>
                    <option value="รถตู้">รถตู้</option>
                    <option value="รถกระบะ">รถกระบะ</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </Form.Control>
                </Form.Group>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Label className="vehicle-form-label">ยี่ห้อรถ</Form.Label>
                  <Form.Control
                    type="text"
                    name="vehicle_brand"
                    value={vehicleFormData.vehicle_brand}
                    onChange={handleVehicleFormChange}
                    placeholder="กรุณากรอกยี่ห้อรถ"
                  />
                </Form.Group>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Label className="vehicle-form-label">รุ่นรถ</Form.Label>
                  <Form.Control
                    type="text"
                    name="vehicle_model"
                    value={vehicleFormData.vehicle_model}
                    onChange={handleVehicleFormChange}
                    placeholder="กรุณากรอกรุ่นรถ"
                  />
                </Form.Group>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Label className="vehicle-form-label">สีรถ</Form.Label>
                  <Form.Control
                    type="text"
                    name="vehicle_color"
                    value={vehicleFormData.vehicle_color}
                    onChange={handleVehicleFormChange}
                    placeholder="กรุณากรอกสีรถ"
                  />
                </Form.Group>
                
                <Form.Group className="vehicle-form-group">
                  <Form.Check
                    type="checkbox"
                    name="is_primary"
                    label="ตั้งเป็นรถคันหลัก"
                    checked={vehicleFormData.is_primary}
                    onChange={handleVehicleFormChange}
                  />
                </Form.Group>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <Button 
                    variant="secondary" 
                    onClick={cancelVehicleForm}
                    className="back-button"
                    disabled={savingChanges}
                  >
                    ยกเลิก
                  </Button>
                  
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="add-vehicle-button"
                    disabled={savingChanges}
                  >
                    {savingChanges ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span> กำลังบันทึก...</span>
                      </>
                    ) : (
                      <span>บันทึกข้อมูล</span>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          ) : (
            <>
              <div className="vehicle-list">
                {vehicles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                    <FaCar size={32} style={{ marginBottom: '10px' }} />
                    <p>ยังไม่มีข้อมูลยานพาหนะ</p>
                  </div>
                ) : (
                  vehicles.map((vehicle) => (
                    <div key={vehicle.vehicle_id} className={`vehicle-card ${vehicle.is_primary ? 'primary' : ''}`}>
                      {/* Show "locked" overlay if editing is locked */}
                      {!vehicleEditStatus.canEdit && (
                        <div className="locked-overlay">
                          <div>ล็อกการแก้ไข</div>
                        </div>
                      )}
                      
                      {vehicle.is_primary && (
                        <div className="primary-badge">คันหลัก</div>
                      )}
                      
                      <div className="vehicle-card-header">
                        {/* Display vehicle image if available */}
                        {vehicleImages[vehicle.vehicle_id] && (
                          <div className="card-image-container">
                            <img 
                              src={vehicleImages[vehicle.vehicle_id]} 
                              alt={vehicle.license_plate} 
                              className="card-vehicle-image"
                              onError={(e) => {
                                console.error("Error loading image:", e);
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/80?text=No+Image";
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="vehicle-license">{vehicle.license_plate}</div>
                      </div>
                      
                      <div className="vehicle-details">
                        <div><strong>ประเภท:</strong> {vehicle.vehicle_type || "-"}</div>
                        <div><strong>ยี่ห้อ/รุ่น:</strong> {vehicle.vehicle_brand} {vehicle.vehicle_model}</div>
                        <div><strong>สี:</strong> {vehicle.vehicle_color || "-"}</div>
                      </div>
                      
                      <div className="vehicle-actions">
                        {!vehicle.is_primary && (
                          <button 
                            className="btn-star" 
                            onClick={() => handleSetPrimary(vehicle.vehicle_id)}
                            disabled={!vehicleEditStatus.canEdit || savingChanges}
                            title="ตั้งเป็นรถคันหลัก"
                          >
                            <FaRegStar />
                          </button>
                        )}
                        
                        <button 
                          className="btn-edit" 
                          onClick={() => handleEditVehicle(vehicle)}
                          disabled={!vehicleEditStatus.canEdit || savingChanges}
                          title="แก้ไข"
                        >
                          <FaEdit />
                        </button>
                        
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDeleteVehicle(vehicle.vehicle_id)}
                          disabled={savingChanges}
                          title="ลบ"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div>
                {vehicles.length < 3 && (
                  <Button 
                    variant="primary" 
                    className="add-vehicle-button"
                    onClick={handleAddVehicle}
                    disabled={savingChanges}
                  >
                    เพิ่มยานพาหนะใหม่
                  </Button>
                )}
                
                <Button 
                  variant="secondary" 
                  className="back-button"
                  onClick={handleBack}
                  disabled={savingChanges}
                  style={{ marginTop: '10px' }}
                >
                  กลับสู่หน้าโปรไฟล์
                </Button>
              </div>
            </>
          )}
        </div>
        
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
                      location.pathname === "/profile/vehicles" ? "active" : ""
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
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={handleCloseDeleteConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>ยืนยันการลบ</Modal.Title>
        </Modal.Header>
        <Modal.Body>คุณต้องการลบข้อมูลยานพาหนะนี้ใช่หรือไม่?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteConfirm}>
            ยกเลิก
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDeleteVehicle}
            disabled={savingChanges}
          >
            {savingChanges ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span> กำลังลบ...</span>
              </>
            ) : (
              <span>ยืนยันการลบ</span>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default VehicleManagement;