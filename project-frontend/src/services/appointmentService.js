import axios from 'axios';

const API_URL = 'http://localhost:3000';

// ฟังก์ชั่นสำหรับการค้นหา visitor ที่มีบัญชีในระบบ
export const searchVisitors = async (searchTerm) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/appointments/visitors/search`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { searchTerm }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching visitors:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับดึงข้อมูลพื้นที่จอดรถที่ว่าง
export const getAvailableParkingAreas = async () => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/appointments/areas/available`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available parking areas:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับสร้างการนัดหมายใหม่
export const createAppointment = async (appointmentData) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.post(`${API_URL}/appointments`, appointmentData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับดึงข้อมูลการนัดหมายของผู้ใช้
export const getUserAppointments = async (filters = {}) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/appointments`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับดึงรายละเอียดการนัดหมายตาม ID
export const getAppointmentById = async (appointmentId) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/appointments/${appointmentId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับอัพเดทสถานะนัดหมาย
export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.put(`${API_URL}/appointments/${appointmentId}/status`, 
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

// ฟังก์ชั่นสำหรับยกเลิกการนัดหมาย
export const cancelAppointment = async (appointmentId) => {
  try {
    const token = localStorage.getItem('userToken');
    const response = await axios.put(`${API_URL}/appointments/${appointmentId}/cancel`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
};


// ฟังก์ชั่นสำหรับจำลองการสแกน QR Code
// แก้ไขฟังก์ชัน simulateScanQRCode ใน appointmentService.js เพื่อรองรับการส่งข้อมูลรถและข้อมูลอื่นๆที่จำเป็น
export const simulateScanQRCode = async (appointmentId, vehicleId = null) => {
  try {
    const token = localStorage.getItem('userToken');
    
    // ปรับปรุงให้ส่งข้อมูลรถด้วย (ถ้ามี)
    const requestBody = vehicleId ? { vehicleId } : {};
    
    const response = await axios.put(
      `${API_URL}/appointments/${appointmentId}/simulate-scan`, 
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error simulating QR scan:', error);
    throw error;
  }
};