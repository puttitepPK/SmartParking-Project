// src/services/parkingHistoryService.js
import axios from 'axios';

// สร้าง axios instance พร้อม token
const getAuthAxios = () => {
  const token = localStorage.getItem('userToken');
  
  // ตรวจสอบว่ามี token หรือไม่
  if (!token) {
    console.error('ไม่พบ Token ในระบบ กรุณาล็อกอินใหม่');
    throw new Error('กรุณาล็อกอินก่อนใช้งาน');
  }
  
  console.log('Using token:', token);
  
  return axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// บันทึกข้อมูลการเข้าจอดรถ
export const createParkingEntry = async (parkingData) => {
  try {
    console.log("บันทึกข้อมูลเข้าจอด:", parkingData);
    
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // เชื่อมต่อกับ API จริงที่ endpoint /parking/entry
    console.log('Sending request to /parking/entry with data:', parkingData);
    const response = await api.post('/parking/entry', parkingData);
    console.log('Response from server:', response.data);
    
    // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
    localStorage.removeItem('active_parking');
    
    return response.data;
  } catch (error) {
    console.error('Error creating parking entry:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // ถ้าไม่สามารถเชื่อมต่อกับ API ได้ ให้แสดงข้อความผิดพลาด
    throw new Error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลการเข้าจอดได้ กรุณาลองใหม่อีกครั้ง');
  }
};

// บันทึกข้อมูลการออกจากที่จอดรถ
export const createParkingExit = async (exitData) => {
  try {
    console.log("บันทึกข้อมูลออกจากที่จอด:", exitData);
    
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // สร้าง format ใหม่ของวันที่และเวลา
    const currentDate = new Date().toISOString().split('T')[0]; // ได้ YYYY-MM-DD
    
    // เชื่อมต่อกับ API จริงที่ endpoint /parking/exit/:historyId
    console.log('Sending request to /parking/exit/' + exitData.history_id + ' with data:', exitData);
    const response = await api.put(`/parking/exit/${exitData.history_id}`, {
      exit_time: exitData.exit_time,
      exit_date: currentDate, // เพิ่มส่วนนี้
      payment_status: 'completed'
    });
    console.log('Response from server:', response.data);
    
    // ลบข้อมูลการจอดที่กำลังใช้งานออกจาก localStorage
    if (response.data.success) {
      // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
      localStorage.removeItem('active_parking');
      
      // ดึงข้อมูลการจอดจาก response
      const parkingData = response.data.data;
      
      console.log("บันทึกข้อมูลการออกจากที่จอดสำเร็จ:", parkingData);
    }
    
    return response.data;
  } catch (error) {
    // ส่วนจัดการข้อผิดพลาดที่มีอยู่แล้ว
    console.error('Error creating parking exit:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // ถ้าไม่สามารถเชื่อมต่อกับ API ได้ ให้แสดงข้อความผิดพลาด
    throw new Error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลการออกจากที่จอดได้ กรุณาลองใหม่อีกครั้ง');
  }
};

// ดึงข้อมูลการจอดที่กำลังใช้งานอยู่
export const getActiveParking = async () => {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      return {
        success: false,
        hasActiveParking: false,
        message: "กรุณาล็อกอินก่อนใช้งาน"
      };
    }
    
    const api = getAuthAxios();
    
    // เชื่อมต่อกับ API จริงใน parkingHistoryController.js
    console.log('Fetching active parking data...');
    const response = await api.get('/parking/active');
    console.log('Active parking response:', response.data);
    
    // ล้างข้อมูลใน localStorage เพื่อไม่ให้มีการใช้งานข้อมูลเก่า
    localStorage.removeItem('active_parking');
    
    return response.data;
  } catch (error) {
    console.error('Error fetching active parking:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      
      return {
        success: false,
        hasActiveParking: false,
        message: "กรุณาล็อกอินก่อนใช้งาน"
      };
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    return {
      success: false,
      hasActiveParking: false,
      message: "ไม่สามารถดึงข้อมูลการจอดที่กำลังใช้งานได้"
    };
  }
};

// ฟังก์ชันดึงประวัติการจอดรถทั้งหมด
export const getAllParkingHistory = async (page = 1, limit = 10) => {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // ดึงประวัติการจอดรถจาก API
    console.log('Fetching parking history data...');
    const response = await api.get('/parking/history', {
      params: { page, limit }
    });
    console.log('Parking history response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching parking history:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // ถ้าไม่สามารถเชื่อมต่อกับ API ได้ ให้แสดงข้อความผิดพลาด
    throw new Error('ไม่สามารถดึงข้อมูลประวัติการจอดรถได้ กรุณาลองใหม่อีกครั้ง');
  }
};

// เพิ่มฟังก์ชันสำหรับดึงรายละเอียดประวัติการจอด
export const getParkingHistoryDetail = async (historyId) => {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // ดึงรายละเอียดประวัติการจอดจาก API
    console.log('Fetching parking history detail for ID:', historyId);
    const response = await api.get(`/parking/history/${historyId}`);
    console.log('Parking history detail response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching parking history detail:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // ถ้าไม่สามารถเชื่อมต่อกับ API ได้ ให้แสดงข้อความผิดพลาด
    throw new Error('ไม่สามารถดึงรายละเอียดประวัติการจอดรถได้ กรุณาลองใหม่อีกครั้ง');
  }
};

// สำหรับการจำลองการสแกน QR Code
export const simulateScanQRCode = async (appointmentId) => {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // เรียกใช้ API สำหรับจำลองการสแกน QR Code
    console.log('Simulating QR code scan for appointment ID:', appointmentId);
    const response = await api.post(`/appointments/${appointmentId}/check-in`);
    console.log('QR code scan response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error simulating QR scan:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    throw new Error('ไม่สามารถจำลองการสแกน QR Code ได้ กรุณาลองใหม่อีกครั้ง');
  }
};

// อัพเดทสถานะการชำระเงินสำหรับประวัติการจอด
export const updateParkingPayment = async (historyId, paymentData = {}) => {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    if (!localStorage.getItem('userToken')) {
      throw new Error('กรุณาล็อกอินก่อนใช้งาน');
    }
    
    const api = getAuthAxios();
    
    // ตั้งค่าข้อมูลการชำระเงิน
    const paymentInfo = {
      payment_status: 'completed',
      payment_method: paymentData.method || 'online',
      payment_amount: paymentData.amount || 20, // ค่าบริการคงที่ 20 บาท
      payment_date: new Date().toISOString().split('T')[0],
      payment_time: new Date().toTimeString().substring(0, 5),
      ...paymentData
    };
    
    console.log('Updating payment for history ID:', historyId, 'with data:', paymentInfo);
    
    try {
      // เรียกใช้ API จริงเพื่ออัพเดทสถานะการชำระเงิน
      const response = await api.put(`/payments/${historyId}`, paymentInfo);
      console.log('Payment update response:', response.data);
      
      // บันทึกข้อมูลลงใน localStorage เพื่อเก็บประวัติการชำระเงิน
      const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
      paymentHistory.push(response.data.data || {
        history_id: historyId,
        ...paymentInfo,
        updated_at: new Date().toISOString()
      });
      localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory));
      
      return response.data;
    } catch (apiError) {
      console.error('API Error:', apiError);
      
      // ถ้า API ไม่ตอบสนองหรือมีข้อผิดพลาด ให้ใช้การจำลองข้อมูลแทน
      console.log('API failed, using fallback mock response');
      
      // สร้างข้อมูลจำลองสำหรับการตอบกลับ
      const mockResponse = {
        success: true,
        message: 'ชำระเงินสำเร็จ (จำลอง)',
        data: {
          history_id: historyId,
          ...paymentInfo,
          updated_at: new Date().toISOString()
        }
      };
      
      // บันทึกข้อมูลลงใน localStorage เพื่อเก็บประวัติการชำระเงิน
      const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
      paymentHistory.push(mockResponse.data);
      localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory));
      
      console.log('Using mock response:', mockResponse);
      return mockResponse;
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    
    // ตรวจสอบว่าเป็นข้อผิดพลาดเกี่ยวกับการยืนยันตัวตนหรือไม่
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Authentication error:', error.response?.data);
      // ล้าง token และนำผู้ใช้ไปยังหน้าล็อกอิน
      localStorage.removeItem('userToken');
      window.location.href = '/login';
      throw new Error('กรุณาล็อกอินใหม่เพื่อดำเนินการต่อ');
    }
    
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    throw new Error('ไม่สามารถอัพเดทสถานะการชำระเงินได้ กรุณาลองใหม่อีกครั้ง');
  }
};

