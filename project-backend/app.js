import express from "express";
import cors from "cors";
import cron from "node-cron";
import usersRouter from "./routers/usersRouter.js";
import passwordResetRouter from "./routers/forgot-password-routes.js";

import parkingRouter from "./routers/parkingRouter.js";
import parkingHistoryRouter from "./routers/parkingHistoryRouter.js"; // เพิ่ม import router ใหม่
import appointmentRouter from "./routers/appointmentRouter.js";
import appointmentAutomationRouter from "./routers/appointmentAutomationRouter.js";
import paymentRouter from "./routers/paymentRouter.js";

import { updateParkingPredictions } from "./controllers/parkingController.js";

import path from "path";
import { fileURLToPath } from "url";

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// create express app
const app = express();
//server information
const host = "localhost";
const port = 3000;

// Get the current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//swagger
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "project-backend",
      description: `Project API integration

* User - จำนวน 7 API
* Password Reset - จำนวน 3 API
* Profile - จำนวน 13 API
* Parking - จำนวน 6 API
* Parking History - จำนวน 5 API
* Payments - จำนวน 5 API
* Appointments - จำนวน 8 API
      
โดยรายละเอียดของแต่ละ API แสดงไว้ตามด้านล่างนี้`,
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://${host}:${port}`,
        description: "Local server",
      },
      {
        url: "https://project-backend.onrender.com", //ไม่ได้ใช้ สมมติกรณีมี 2 server
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Users", //หัวข้อใหญ๋ที่แสดง
        description: "การจัดการข้อมูลผู้ใช้งานและสมาชิก", //รายละเอียดในหัวข้อ
      },
      {
        name: "Password Reset", //หัวข้อใหญ๋ที่แสดง
        description: "การรีเซ็ตรหัสผ่าน", //รายละเอียดในหัวข้อ
      },
      {
        name: "Profile", //หัวข้อใหญ๋ที่แสดง
        description: "การจัดการข้อมูลส่วนตัว", //รายละเอียดในหัวข้อ
      },
      {
        name: "Parking", //หัวข้อใหญ่ที่แสดง
        description: "การจัดการข้อมูลลานจอดรถ", //รายละเอียดในหัวข้อ
      },
      {
        name: "Parking History", //หัวข้อใหญ่ที่แสดง (เพิ่มใหม่)
        description: "การจัดการข้อมูลประวัติการจอดรถ", //รายละเอียดในหัวข้อ
      },
      {
        name: "Payments", //หัวข้อใหญ่ที่แสดง (เพิ่มใหม่)
        description: "ระบบชำระเงิน", //รายละเอียดในหัวข้อ
      },
      {
        name: "Appointments", //หัวข้อใหญ่ที่แสดง (เพิ่มใหม่)
        description: "การจัดการนัดหมายการจอดรถ", //รายละเอียดในหัวข้อ
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "กรุณาใส่ JWT token หลังจาก login เพื่อเข้าถึง API ที่ต้องการการยืนยันตัวตน",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./routers/usersRouter.js",
    "./routers/forgot-password-routes.js",
    "./controllers/passwordController.js",
    "./controllers/userController.js",
    "./routers/parkingRouter.js",
    "./routers/parkingHistoryRouter.js", // เพิ่มไฟล์ parkingHistoryRouter.js ในการสร้าง API docs
    "./routers/appointmentRouter.js",
    "./routers/paymentRouter.js",
  ],
});

// ตั้งค่า Cron Job ให้รันทุกวันเวลาเที่ยงคืน
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily parking prediction update...");
  try {
    await updateParkingPredictions();
  } catch (error) {
    console.error("Error running daily parking prediction update:", error);
  }
});

// รันครั้งแรกเมื่อเริ่มต้นเซิร์ฟเวอร์
// updateParkingPredictions()
//   .then(() => console.log("Initial parking predictions generated."))
//   .catch((err) => console.error("Failed to generate predictions:", err));
updateParkingPredictions()
  .then((success) => {
    if (success) {
      console.log("Initial parking predictions generated.");
    } else {
      console.log("Skipping initial prediction generation. Using existing data.");
    }
  })
  .catch((err) => {
    console.error("Failed to generate predictions:", err);
    console.log("Continuing server startup with existing prediction data...");
  });

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/users", usersRouter);
app.use("/password", passwordResetRouter);
app.use("/parking", parkingRouter);
app.use("/parking", parkingHistoryRouter); // เพิ่ม route ใหม่ (แชร์ prefix เดียวกับ parkingRouter)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/appointments", appointmentRouter); // เพิ่ม route นี้
app.use("/automation", appointmentAutomationRouter);
app.use("/payments", paymentRouter);


// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// });

app.listen(port, () =>
  console.log(`Server is running on http://${host}:${port}`)
);

////เพิ่มมาใหม่