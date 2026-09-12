import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { findParking } from "../../../services/parkingService"; // เพิ่มการนำเข้า API

import "./graph.css";

ChartJS.register(BarElement, CategoryScale, LinearScale);

const GraphComponent = () => {
  const [data, setData] = useState({
    A: 0,
    B: 0,
    C: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // กำหนดวันปัจจุบัน
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7);

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // กำหนดค่าเริ่มต้นวันที่และเวลาปัจจุบัน
  useEffect(() => {
    const currentDate = formatDate(today);
    setSelectedDate(currentDate);
    
    // ตั้งค่าเวลาปัจจุบัน
    const hours = today.getHours().toString().padStart(2, '0');
    const minutes = today.getMinutes().toString().padStart(2, '0');
    setSelectedTime(`${hours}:${minutes}`);
  }, []);

  // ฟังก์ชันสำหรับดึงข้อมูลจาก API
  const fetchParkingData = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await findParking(selectedDate, selectedTime);
      
      if (response.success) {
        // กรองข้อมูลตามอาคาร A, B, C
        const buildingData = {
          A: 0,
          B: 0,
          C: 0,
        };
        
        // หาค่าเฉลี่ยของโอกาสที่จะว่างตามอาคาร
        const buildingCounts = {
          A: 0,
          B: 0,
          C: 0,
        };
        
        response.data.forEach(item => {
          if (item.building && ["A", "B", "C"].includes(item.building)) {
            buildingData[item.building] += parseFloat(item.availability_chance);
            buildingCounts[item.building]++;
          }
        });
        
        // คำนวณค่าเฉลี่ยของแต่ละอาคาร
        Object.keys(buildingData).forEach(building => {
          if (buildingCounts[building] > 0) {
            buildingData[building] = Math.round(buildingData[building] / buildingCounts[building]);
          }
        });
        
        setData(buildingData);
      } else {
        setError("ไม่สามารถดึงข้อมูลได้");
      }
    } catch (error) {
      console.error("Error fetching parking data:", error);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อเลือกวันที่หรือเวลา
  useEffect(() => {
    if (selectedDate && selectedTime) {
      fetchParkingData();
    }
  }, [selectedDate, selectedTime]);

  const chartData = {
    labels: ["อาคาร A", "อาคาร B", "อาคาร C"],
    datasets: [
      {
        label: "โอกาสที่จะว่าง (%)",
        data: [data.A, data.B, data.C],
        backgroundColor: ["#FD6E2B", "#FD6E2B", "#FD6E2B"],
        borderColor: ["#B8B1C3", "#B8B1C3", "#B8B1C3"],
        borderWidth: 3,
      },
    ],
  };

  const options = {
    scales: {
      x: {
        ticks: {
          color: "#000000",
        },
        grid: {
          color: "#adadad",
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#000000",
        },
        grid: {
          color: "#adadad",
        },
      },
    },
  };

  // Custom Plugin สำหรับแสดงเปอร์เซ็นต์บนแท่ง
  const plugins = [
    {
      id: "displayPercentage",
      afterDatasetsDraw: (chart) => {
        const { ctx, data } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];
            ctx.save();
            ctx.font = "20px ";
            ctx.fillStyle = "#473366";
            ctx.textAlign = "center";
            ctx.fillText(`${value}%`, bar.x, bar.y - 5);
            ctx.restore();
          });
        });
      },
    },
  ];

  return (
    <div className="graphall">
      <div className="dategraphtime">
        <input
          type="date"
          className="form-control custom-date-pickerG2"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={formatDate(today)}
          max={formatDate(maxDate)}
        />
        <input
          type="time"
          className="form-control custom-date-pickerGT"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
        />
      </div>

      <div className="titlegraph1">
        <p>สถานะอาคารว่าง</p>
      </div>

      {loading ? (
        <div className="text-center p-3">กำลังโหลดข้อมูล...</div>
      ) : error ? (
        <div className="text-center text-danger p-2">{error}</div>
      ) : (
        <Bar data={chartData} options={options} plugins={plugins} />
      )}
    </div>
  );
};

export default GraphComponent;