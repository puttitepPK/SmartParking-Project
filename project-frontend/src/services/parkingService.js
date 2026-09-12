import axios from 'axios';

const API_URL = 'http://localhost:3000';

// สร้าง axios instance พร้อม token
const getAuthAxios = () => {
  const token = localStorage.getItem('userToken');
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

// ค้นหาลานจอดรถ
export const findParking = async (date, time, building = null) => {
  try {
    const api = getAuthAxios();
    
    let queryParams = `date=${date}&time=${time}`;
    if (building) {
      queryParams += `&building=${building}`;
    }
    
    const response = await api.get(`/parking/find?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error searching for parking:', error);
    // ส่งข้อมูลจำลองเมื่อ API ไม่พร้อม
    return {
      success: true,
      date,
      time,
      data: [
        {
          id: 1,
          building: "A",
          building_name: "อาคาร A",
          floor: "ลาน 1",
          slots: "25/50", 
          availability_chance: 75,
          status: "มีโอกาสว่างสูง",
          parking_status: "open"
        },
        {
          id: 2,
          building: "A",
          building_name: "อาคาร A",
          floor: "ลาน 2",
          slots: "10/30",
          availability_chance: 30,
          status: "มีโอกาสว่างน้อย",
          parking_status: "open"
        },
        {
          id: 3,
          building: "B",
          building_name: "อาคาร B",
          floor: "ลาน 1",
          slots: "5/40",
          availability_chance: 15,
          status: "มีโอกาสไม่ว่างสูง",
          parking_status: "open"
        }
      ]
    };
  }
};

// ดึงข้อมูลอาคารทั้งหมด
export const getBuildings = async () => {
  try {
    const api = getAuthAxios();
    const response = await api.get('/parking/buildings');
    return response.data;
  } catch (error) {
    console.error('Error fetching buildings:', error);
    throw error;
  }
};

// ดึงข้อมูลลานจอดรถตามอาคาร
export const getFloorsByBuilding = async (buildingCode) => {
  try {
    const api = getAuthAxios();
    const response = await api.get(`/parking/buildings/${buildingCode}/floors`);
    return response.data;
  } catch (error) {
    console.error('Error fetching floors for building:', error);
    throw error;
  }
};

// ดึงข้อมูลลานจอดรถที่มีอยู่ทั้งหมด
export const getAvailableParkingAreas = async () => {
  try {
    const api = getAuthAxios();
    // เปลี่ยนเป็น /parking/status หรือ endpoint ที่ถูกต้อง
    const response = await api.get('/parking/status');

    // แปลงข้อมูล
    const formattedAreas = response.data.data.map(area => ({
      area_id: area['รหัสลาน'] || 1,
      building_code: area['รหัสอาคาร'] || 'A',
      building_name: area['ชื่ออาคาร'] || 'อาคาร A',
      area_name: area['ชื่อลาน'] || 'ลานจอด A1',
      total_spaces: area['จำนวนที่ทั้งหมด'] || 50,
      available_spaces: area['จำนวนที่ว่าง'] || 25
    }));

    return {
      success: true,
      data: formattedAreas
    };
  } catch (error) {
    console.error('Error fetching available parking areas:', error);
    
    // Fallback mock data
    const mockData = [
      {
        area_id: 1,
        building_code: 'A',
        building_name: 'อาคาร A',
        area_name: 'ลานจอด A1',
        total_spaces: 50,
        available_spaces: 25
      },
      {
        area_id: 2,
        building_code: 'B',
        building_name: 'อาคาร B',
        area_name: 'ลานจอด B1', 
        total_spaces: 40,
        available_spaces: 15
      }
    ];

    return {
      success: false,
      data: mockData,
      message: error.response?.data?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลลานจอด'
    };
  }
};