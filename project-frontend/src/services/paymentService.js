// src/services/paymentService.js
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// สร้างรายการชำระเงิน
export const createPayment = async (historyId, paymentMethod) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.post(
      `${API_URL}/payments/create`, 
      { history_id: historyId, payment_method: paymentMethod },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // เก็บข้อมูลใน sessionStorage สำหรับหน้าชำระเงิน
    if (response.data.success) {
      const paymentData = response.data.data;
      sessionStorage.setItem(
        paymentMethod === 'promptpay' ? "promptpayPaymentData" : "trueMoneyPaymentData", 
        JSON.stringify({
          paymentId: paymentData.payment_id,
          historyId: paymentData.history_id,
          amount: paymentData.total_amount,
          buildingName: paymentData.building_name,
          areaName: paymentData.area_name,
          entryDate: paymentData.entry_date,
          entryTime: paymentData.entry_time,
          isFromParkingExit: true
        })
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

// อัพเดทสถานะการชำระเงิน
export const updatePaymentStatus = async (paymentId, status, transactionRef) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.put(
      `${API_URL}/payments/${paymentId}/status`,
      { status, transaction_ref: transactionRef },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // ตั้งค่าสถานะการชำระเงิน
    if (response.data.success && status === 'completed') {
      sessionStorage.setItem("paymentCompleted", "true");
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

// ดึงข้อมูลใบเสร็จ
export const getReceipt = async (paymentId) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(
      `${API_URL}/payments/${paymentId}/receipt`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // เก็บข้อมูลใบเสร็จใน sessionStorage
    if (response.data.success) {
      sessionStorage.setItem("receiptData", JSON.stringify(response.data.data));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting receipt:', error);
    throw error;
  }
};

// ดึงประวัติการชำระเงิน
export const getPaymentHistory = async () => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(
      `${API_URL}/payments/history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw error;
  }
};