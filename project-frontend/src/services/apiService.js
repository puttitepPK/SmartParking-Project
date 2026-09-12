// src/services/apiService.js
import axios from 'axios';  // Keep only one import statement

const API_URL = 'http://localhost:3000';

// Create axios instance with authorization header
const getAuthAxios = () => {
  const token = localStorage.getItem('userToken');
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

// Get the current user ID from token
const getCurrentUserId = () => {
  // ตรวจสอบ userId จาก localStorage ก่อน (ที่ถูกบันทึกตอน login)
  const userIdFromStorage = localStorage.getItem('userId');
  if (userIdFromStorage) {
    return userIdFromStorage;
  }
  
  // ถ้าไม่พบใน localStorage ให้ลองดึงจาก token
  const token = localStorage.getItem('userToken');
  if (!token) return null;
  
  try {
    // Get payload from JWT token (assumes token is in format: header.payload.signature)
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.userId || decoded.user_id || decoded.id || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// User Profile API Functions
export const getUserProfile = async () => {
  try {
    const api = getAuthAxios();
    const response = await api.get('/users/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const api = getAuthAxios();
    const response = await api.put('/users/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const updateUserPassword = async (passwordData) => {
  try {
    const api = getAuthAxios();
    const response = await api.put('/users/password', passwordData);
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Vehicle Management API Functions
// src/services/apiService.js


export const getUserVehicles = async () => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('ไม่พบ token กรุณาล็อกอินใหม่');
    }

    const response = await axios.get(
      'http://localhost:3000/users/vehicles',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    // ส่งค่าตัวอย่างเพื่อให้ UI แสดงผลได้
    return [
      { vehicle_id: 1, license_plate: "กข 1234", vehicle_brand: "Toyota", vehicle_model: "Camry" },
      { vehicle_id: 2, license_plate: "ขค 5678", vehicle_brand: "Honda", vehicle_model: "Civic" }
    ];
  }
};

export const getVehicleById = async (vehicleId) => {
  try {
    const api = getAuthAxios();
    const response = await api.get(`/users/vehicles/${vehicleId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    throw error;
  }
};

export const addVehicle = async (vehicleData) => {
  try {
    const api = getAuthAxios();
    const response = await api.post('/users/vehicles', vehicleData);
    return response.data;
  } catch (error) {
    console.error('Error adding vehicle:', error);
    throw error;
  }
};

export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const api = getAuthAxios();
    const response = await api.put(`/users/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

export const deleteVehicle = async (vehicleId) => {
  try {
    const api = getAuthAxios();
    const response = await api.delete(`/users/vehicles/${vehicleId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

// Vehicle Edit Limit Manager
// This utility helps implement the "max 3 edits per day" restriction per user
export const VehicleEditLimitManager = {
  // Check if a user has reached their edit limit
  checkEditLimit: () => {
    const userId = getCurrentUserId();
    if (!userId) return { canEdit: true, editsLeft: 3, lockUntil: null };
    
    // Get edit history from localStorage
    const allEditHistory = JSON.parse(localStorage.getItem('vehicleEditHistory') || '{}');
    // Get user-specific edit history (or empty array if none exists)
    const userEditHistory = allEditHistory[userId] || [];
    
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    // Filter to get only today's edits for this user
    const todayEdits = userEditHistory.filter(edit => edit.date === today);
    
    return {
      canEdit: todayEdits.length < 3,
      editsLeft: 3 - todayEdits.length,
      lockUntil: todayEdits.length >= 3 ? getNextDay(today) : null
      
    };
  },
  
  // Record a vehicle edit for the current user
  recordEdit: (vehicleId) => {
    const userId = getCurrentUserId();
    if (!userId) return { canEdit: true, editsLeft: 3, lockUntil: null };
    
    // Get all users' edit history
    const allEditHistory = JSON.parse(localStorage.getItem('vehicleEditHistory') || '{}');
    // Get current user's edit history (or initialize empty array)
    const userEditHistory = allEditHistory[userId] || [];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Add new edit to this user's history
    userEditHistory.push({
      vehicleId,
      date: today,
      timestamp: new Date().toISOString()
    });
    
    // Update user's history in the overall history object
    allEditHistory[userId] = userEditHistory;
    
    // Save updated history for all users
    localStorage.setItem('vehicleEditHistory', JSON.stringify(allEditHistory));
    
    // Return current status for this user
    return VehicleEditLimitManager.checkEditLimit();
  },
  
  // Clear old entries for all users (entries older than 1 day)
  cleanup: () => {
    const allEditHistory = JSON.parse(localStorage.getItem('vehicleEditHistory') || '{}');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Process each user's history separately
    const cleanedHistory = {};
    
    for (const userId in allEditHistory) {
      // Check if userEditHistory is an array before filtering
      const userEditHistory = allEditHistory[userId];
      
      // Skip if not an array or is empty
      if (!Array.isArray(userEditHistory) || userEditHistory.length === 0) {
        continue;
      }
      
      // Keep only entries from yesterday and today for each user
      const recentEdits = userEditHistory.filter(edit => edit.date >= yesterdayStr);
      
      // Only add user to cleaned history if they have recent edits
      if (recentEdits.length > 0) {
        cleanedHistory[userId] = recentEdits;
      }
    }
    
    localStorage.setItem('vehicleEditHistory', JSON.stringify(cleanedHistory));
  }
};

// Helper function to get the next day in YYYY-MM-DD format
function getNextDay(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

// Initialize: clean up old vehicle edit records
VehicleEditLimitManager.cleanup();


// Upload user profile picture
export const uploadProfilePicture = async (file) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('profile_picture', file);

    // Use axios for consistent error handling
    const api = getAuthAxios();
    const response = await api.post('/users/profile-picture', 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          // No need to set Authorization as it's already in getAuthAxios
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Get user profile picture
export const getProfilePicture = async () => {
  try {
    const api = getAuthAxios();
    const response = await api.get('/users/profile-picture');
    
    return response.data;
  } catch (error) {
    // If 404 (no profile picture), return null 
    if (error.response && error.response.status === 404) {
      return { profile_picture: null };
    }
    console.error('Error getting profile picture:', error);
    throw error;
  }
};

// Delete user profile picture
export const deleteProfilePicture = async () => {
  try {
    const api = getAuthAxios();
    const response = await api.delete('/users/profile-picture');
    
    return response.data;
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    throw error;
  }
};


// เพิ่มฟังก์ชันสำหรับจัดการรูปภาพยานพาหนะใน apiService.js

// อัปโหลดรูปภาพยานพาหนะ
export const uploadVehicleImage = async (vehicleId, file) => {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('vehicle_image', file);

    // ใช้ axios เพื่อความสม่ำเสมอในการจัดการข้อผิดพลาด
    const api = getAuthAxios();
    const response = await api.post(`/users/vehicles/${vehicleId}/image`, 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          // ไม่จำเป็นต้องตั้งค่า Authorization เนื่องจากมีอยู่แล้วใน getAuthAxios
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading vehicle image:', error);
    throw error;
  }
};

// ดึงข้อมูลรูปภาพยานพาหนะ
export const getVehicleImage = async (vehicleId) => {
  try {
    const api = getAuthAxios();
    const response = await api.get(`/users/vehicles/${vehicleId}/image`);
    
    return response.data;
  } catch (error) {
    // หาก 404 (ไม่พบรูปภาพ) ให้ส่งคืนค่า null
    if (error.response && error.response.status === 404) {
      return { vehicle_image: null };
    }
    console.error('Error getting vehicle image:', error);
    throw error;
  }
};

// ลบรูปภาพยานพาหนะ
export const deleteVehicleImage = async (vehicleId) => {
  try {
    const api = getAuthAxios();
    const response = await api.delete(`/users/vehicles/${vehicleId}/image`);
    
    return response.data;
  } catch (error) {
    console.error('Error deleting vehicle image:', error);
    throw error;
  }
};  

