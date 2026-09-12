// appointmentAutomationSystem.js
import axios from 'axios';

/**
 * ระบบจัดการการอัพเดทสถานะหลังจากการนัดหมาย
 * - อัพเดทประวัติการจอดให้ Visitor เมื่อได้รับการยืนยัน
 * - อัพเดทสถานะลานจอด (จำนวนที่ว่าง, โอกาสที่จะว่าง)
 * - ยกเลิกและลบประวัติการจอดอัตโนมัติหากไม่มาตามนัด
 * - อัพเดทสถานะเมื่อ Visitor จอดเสร็จสิ้น
 */
class AppointmentAutomationSystem {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3000';
    this.token = localStorage.getItem('userToken');
  }

  /**
   * อัพเดทประวัติการจอดเมื่อการนัดหมายได้รับการยืนยัน
   * @param {Object} appointmentData ข้อมูลการนัดหมาย
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async createParkingHistory(appointmentData) {
    try {
      // เตรียมข้อมูลประวัติการจอด
      const parkingHistoryData = {
        visitor_id: appointmentData.visitor_id,
        visitor_name: appointmentData.visitor_name,
        visitor_phone: appointmentData.visitor_phone,
        area_id: appointmentData.area_id,
        appointment_id: appointmentData.appointment_id,
        entry_time: `${appointmentData.appointment_date}T${appointmentData.appointment_time}`,
        vehicle_info: {
          license_plate: appointmentData.license_plate || 'รอการบันทึก',
          vehicle_brand: appointmentData.vehicle_brand || 'รอการบันทึก',
          vehicle_model: appointmentData.vehicle_model || 'รอการบันทึก',
          vehicle_color: appointmentData.vehicle_color || 'รอการบันทึก'
        },
        parking_status: 'pending', // สถานะเริ่มต้นเป็นรอเข้าจอด
        payment_status: 'pending'  // สถานะการชำระเงินเริ่มต้นเป็นรอชำระ
      };

      // สร้างประวัติการจอดรถ
      const response = await axios.post(
        `${this.API_BASE_URL}/parking/history/appointment`,
        parkingHistoryData,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // อัพเดทสถานะลานจอด (ลดจำนวนที่ว่าง)
      await this.updateParkingAreaAvailability(appointmentData.area_id, -1);

      console.log('Created parking history for appointment:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating parking history:', error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะลานจอดเมื่อมีการเปลี่ยนแปลง
   * @param {number} areaId รหัสลานจอด
   * @param {number} change การเปลี่ยนแปลงจำนวนที่ว่าง (+1 เพิ่ม, -1 ลด)
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async updateParkingAreaAvailability(areaId, change) {
    try {
      const response = await axios.put(
        `${this.API_BASE_URL}/parking/areas/${areaId}/availability`,
        { change },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Updated parking area ${areaId} availability by ${change}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating parking area ${areaId} availability:`, error);
      throw error;
    }
  }

  /**
   * ตรวจสอบการนัดหมายที่เลยเวลาแล้วไม่มาตามนัด (เกิน 5 นาที)
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async checkMissedAppointments() {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/appointments/missed`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );

      const missedAppointments = response.data.data || [];
      
      // ดำเนินการกับการนัดหมายที่เลยเวลาแล้วไม่มาตามนัด
      await Promise.all(missedAppointments.map(async (appointment) => {
        // 1. ยกเลิกการนัดหมาย
        await this.cancelAppointment(appointment.appointment_id);
        
        // 2. ลบประวัติการจอดที่เกี่ยวข้อง
        await this.removeParkingHistory(appointment.appointment_id);
        
        // 3. อัพเดทสถานะลานจอด (เพิ่มจำนวนที่ว่าง)
        await this.updateParkingAreaAvailability(appointment.area_id, 1);
      }));

      console.log(`Processed ${missedAppointments.length} missed appointments`);
      return missedAppointments.length;
    } catch (error) {
      console.error('Error checking missed appointments:', error);
      throw error;
    }
  }

  /**
   * ยกเลิกการนัดหมาย
   * @param {number} appointmentId รหัสการนัดหมาย
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async cancelAppointment(appointmentId) {
    try {
      const response = await axios.put(
        `${this.API_BASE_URL}/appointments/${appointmentId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Cancelled appointment ${appointmentId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error cancelling appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * ลบประวัติการจอดที่เกี่ยวข้องกับการนัดหมาย
   * @param {number} appointmentId รหัสการนัดหมาย
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async removeParkingHistory(appointmentId) {
    try {
      const response = await axios.delete(
        `${this.API_BASE_URL}/parking/history/appointment/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );
      
      console.log(`Removed parking history for appointment ${appointmentId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error removing parking history for appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะการจอดเมื่อ Visitor มาถึงและเริ่มจอด
   * @param {number} appointmentId รหัสการนัดหมาย
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async updateParkingArrival(appointmentId) {
    try {
      const response = await axios.put(
        `${this.API_BASE_URL}/parking/history/appointment/${appointmentId}/arrival`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Updated parking arrival for appointment ${appointmentId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating parking arrival for appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะการชำระเงิน
   * @param {number} historyId รหัสประวัติการจอด
   * @param {Object} paymentData ข้อมูลการชำระเงิน
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async updatePaymentStatus(historyId, paymentData) {
    try {
      const response = await axios.put(
        `${this.API_BASE_URL}/parking/history/${historyId}/payment`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Updated payment status for history ${historyId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating payment status for history ${historyId}:`, error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะการจอดเมื่อเสร็จสิ้น (จำลองการสแกน)
   * @param {number} appointmentId รหัสการนัดหมาย
   * @returns {Promise} ผลลัพธ์การดำเนินการ
   */
  async completeParkingSession(appointmentId) {
    try {
      // 1. อัพเดทสถานะการนัดหมายเป็นเสร็จสิ้น
      const appointmentResponse = await axios.put(
        `${this.API_BASE_URL}/appointments/${appointmentId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 2. อัพเดทประวัติการจอดเป็นเสร็จสิ้น
      const historyResponse = await axios.put(
        `${this.API_BASE_URL}/parking/history/appointment/${appointmentId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 3. อัพเดทสถานะลานจอด (เพิ่มจำนวนที่ว่าง)
      await this.updateParkingAreaAvailability(historyResponse.data.area_id, 1);
      
      console.log(`Completed parking session for appointment ${appointmentId}`);
      return {
        appointment: appointmentResponse.data,
        history: historyResponse.data
      };
    } catch (error) {
      console.error(`Error completing parking session for appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * ตั้งเวลาตรวจสอบการนัดหมายที่เลยเวลา
   * @param {number} intervalMinutes จำนวนนาทีในการตรวจสอบซ้ำ
   * @returns {number} รหัสการตั้งเวลา
   */
  startMissedAppointmentChecker(intervalMinutes = 1) {
    const intervalId = setInterval(() => {
      this.checkMissedAppointments()
        .catch(error => console.error('Error in missed appointment checker:', error));
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Started missed appointment checker with interval ${intervalMinutes} minute(s)`);
    return intervalId;
  }

  /**
   * หยุดการตรวจสอบการนัดหมายที่เลยเวลา
   * @param {number} intervalId รหัสการตั้งเวลา
   */
  stopMissedAppointmentChecker(intervalId) {
    clearInterval(intervalId);
    console.log('Stopped missed appointment checker');
  }
}

export default AppointmentAutomationSystem;