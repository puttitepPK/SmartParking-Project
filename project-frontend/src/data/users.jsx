// ตัวแปร defaultUsers สำหรับผู้ใช้เริ่มต้น
const defaultUsers = [
  {
    username: "1",
    password: "1",
    phoneNumber: "123456",
    role: "Member",
  },
  {
    username: "visitor",
    password: "pass",
    phoneNumber: "654321",
    role: "Visitor",
  },
];

//ของเก่า
// ฟังก์ชันโหลดข้อมูลผู้ใช้จาก Local Storage หรือใช้ข้อมูลเริ่มต้น
// function loadUsersFromLocalStorage() {
//   try {
//     const storedUsers = localStorage.getItem("users");
//     if (storedUsers) {
//       return JSON.parse(storedUsers);
//     } else {
//       localStorage.setItem("users", JSON.stringify(defaultUsers));
//       return defaultUsers;
//     }
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้:", error);
//     return defaultUsers;
//   }
// }

// ฟังก์ชันโหลดข้อมูลผู้ใช้จาก Local Storage หรือใช้ข้อมูลเริ่มต้น ดูว่ามีใครสมัคร กับเก็บข้อมูล
function loadUsersFromLocalStorage() {
  try {
    const storedUsers = localStorage.getItem("users");

    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      console.log("โหลดผู้ใช้จาก Local Storage:", parsedUsers); // ตรวจสอบค่าที่โหลด
      return parsedUsers;
    } else {
      // หากไม่มีข้อมูลใน Local Storage ให้ตั้งค่าเริ่มต้น
      localStorage.setItem("users", JSON.stringify(defaultUsers));
      return defaultUsers;
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้:", error);
    return defaultUsers;
  }
}


//รีเซ็ท Users ทั้งหมด
export function resetToDefaultUsers() {
  localStorage.setItem("users", JSON.stringify(defaultUsers)); // เซตข้อมูลใน Local Storage ใหม่
  users = [...defaultUsers]; // อัปเดตตัวแปร users
  console.log("รีเซ็ตข้อมูลกลับเป็น defaultUsers:", users);
}


// เก็บข้อมูลผู้ใช้จาก Local Storage ในตัวแปร users
let users = loadUsersFromLocalStorage();
//resetToDefaultUsers();  //  อย่าเอา // ออกเพราะ reset ผู้ใช้


// ฟังก์ชันคืนค่ารายชื่อผู้ใช้ทั้งหมด
export function getAllUsers() {
  return users.map((user) => ({
    username: user.username,
    phoneNumber: user.phoneNumber,
    role: user.role,
    fullName: user.fullName,
  }));
}


// ฟังก์ชันตรวจสอบการ login
export function authenticateUser(identifier, password) {
  const user = users.find(
    (user) =>
      (user.username === identifier || user.phoneNumber === identifier) &&
      user.password === password
  );

  if (user) {
    return { username: user.username, phoneNumber: user.phoneNumber, role: user.role };
  } else {
    return null;
  }
}


// ฟังก์ชันเพิ่มผู้ใช้ใหม่ที่สมัคร
export function addUser(fullName, userName, phoneNumber, password) {
  if (isUserExists(userName, phoneNumber, fullName)) {
    console.log("ผู้ใช้นี้มีอยู่ในระบบแล้ว");
    return false; // สมัครไม่สำเร็จเพราะมีผู้ใช้นี้อยู่แล้ว
  }

  // เพิ่มผู้ใช้ใหม่ใน array
  users.push({
    username: userName,
    phoneNumber,
    password: password,
    role: "Visitor",
    fullName: fullName,
  });

  // บันทึกข้อมูลลงใน Local Storage
  localStorage.setItem("users", JSON.stringify(users));
  console.log("ผู้ใช้ใหม่ถูกเพิ่ม:", users);
  return true; // สมัครสำเร็จ
}


// ฟังก์ชันตรวจสอบว่ามีผู้ใช้คนนี้ในระบบหรือไม่
export function isUserExists(userName, phoneNumber, fullName) {
  return users.some(
    (user) =>
      user.username === userName ||
      user.phoneNumber === phoneNumber ||
      user.fullName === fullName
  );
}

// อัปเดตข้อมูลผู้ใช้หลังจากการสมัคร
export function refreshUserData() {
  users = loadUsersFromLocalStorage(); // โหลดข้อมูลผู้ใช้ใหม่จาก Local Storage
  console.log("ข้อมูลผู้ใช้ถูกรีเฟรช:", users);
}


// ฟังก์ชันลบผู้ใช้
export function removeUser(identifier) {
  const userIndex = users.findIndex(
    (user) => user.username === identifier || user.phoneNumber === identifier
  );

  if (userIndex !== -1) {
    const removedUser = users.splice(userIndex, 1); // ลบผู้ใช้ออกจาก users
    console.log("ผู้ใช้ที่ถูกลบ:", removedUser[0]);

    // บันทึก users ที่อัปเดตแล้วลงใน Local Storage
    localStorage.setItem("users", JSON.stringify(users));
    console.log(
      "อัปเดต Local Storage:",
      JSON.parse(localStorage.getItem("users"))
    ); // ตรวจสอบว่าอัปเดตแล้ว

    return true; // ลบสำเร็จ
  } else {
    //console.log("ไม่พบผู้ใช้ที่ต้องการลบ");
    return false; // ลบไม่สำเร็จ เพราะไม่พบผู้ใช้
  }
}
if (removeUser("")) {
  refreshUserData(); // โหลดข้อมูลใหม่
  console.log("ลบผู้ใช้สำเร็จ");
}


// ฟังก์ชันรีเซ็ตรหัสผ่านของผู้ใช้
export function updatePasswordByPhoneNumber(phoneNumber, newPassword) {
  const userIndex = users.findIndex((user) => user.phoneNumber === phoneNumber);

  if (userIndex !== -1) {
    users[userIndex].password = newPassword; // อัปเดตรหัสผ่าน
    localStorage.setItem("users", JSON.stringify(users)); // บันทึกใน Local Storage
    console.log("รหัสผ่านถูกรีเซ็ตสำเร็จสำหรับหมายเลข:", phoneNumber);
    return true;
  } else {
    console.log("ไม่พบหมายเลขโทรศัพท์ที่ต้องการรีเซ็ตรหัสผ่าน");
    return false;
  }
}

export default users; 
