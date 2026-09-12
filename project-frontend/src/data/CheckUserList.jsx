import React, { useEffect } from "react";
import { getAllUsers } from "./users";

function CheckUserList() {
  useEffect(() => {
    const userList = getAllUsers();
    console.log("รายชื่อบัญชีที่สมัครแล้ว:", userList); // แสดงรายชื่อบัญชีทั้งหมดใน Console
  }, []);

  return (
    <div>
      <h2>เช็คบัญชีที่สมัครแล้วใน Console</h2>
    </div>
  );
}

export default CheckUserList;
