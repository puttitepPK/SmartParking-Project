import React, { useState, useEffect } from "react";
import { Navbar, Nav } from "react-bootstrap";
import { FaSearch, FaCalendarAlt, FaClock, FaBuilding, FaParking, FaChartLine, FaMapMarkerAlt, FaRegClock, FaSyncAlt } from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingCircleCheck, faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

import {
  findParking,
  getBuildings,
  getFloorsByBuilding,
} from "../../services/parkingService";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./Findparking.css";

import defaultParkingA from "../../assets/images/default-parking-A.jpg";
import defaultParkingB from "../../assets/images/default-parking-B.jpg";
import defaultParkingC from "../../assets/images/default-parking-C.jpg";
import defaultParking from "../../assets/images/default-parking.jpg";

function Findparking() {
  const location = useLocation();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("evening");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [displayedParking, setDisplayedParking] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get default image based on building
  const getDefaultImage = (building) => {
    switch (building) {
      case "A":
        return defaultParkingA;
      case "B":
        return defaultParkingB;
      case "C":
        return defaultParkingC;
      default:
        return defaultParking;
    }
  };

  // Time periods for dropdown
  const timePeriods = [
    { value: "morning", label: "(07:00-11:00)", time: "08:00" },
    { value: "daytime", label: "(11:00-19:00)", time: "14:00" },
    { value: "evening", label: "(19:00-23:00)", time: "20:00" },
  ];

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 7);

  const formatDate = (date) => date.toISOString().split("T")[0];

  // Set initial values - current date and time
  useEffect(() => {
    const currentDate = formatDate(today);
    setSelectedDate(currentDate);

    // Set default time period based on current time
    const hours = today.getHours();
    if (hours >= 7 && hours < 11) {
      setSelectedTimePeriod("morning");
    } else if (hours >= 11 && hours < 19) {
      setSelectedTimePeriod("daytime");
    } else {
      setSelectedTimePeriod("evening");
    }

    // Fetch buildings on component load
    fetchBuildings();
  }, []);

  // Handle changes to selected date
  useEffect(() => {
    if (selectedDate === formatDate(today)) {
      // If today's date is selected, check if selected time period has passed
      if (isTimePeriodPassed(selectedTimePeriod)) {
        const hours = today.getHours();
        
        // Determine which time period to use based on current time
        if (hours >= 23) {
          // After 23:00, all time periods for today have passed
          setError("ไม่สามารถแสดงข้อมูลย้อนหลังของช่วงเวลาที่ผ่านไปแล้ว กรุณาเลือกช่วงเวลาอื่น");
          setDisplayedParking([]);
        } else if (hours >= 19) {
          // Between 19:00 and 23:00, select evening period
          setSelectedTimePeriod("evening");
          setError(null);
        } else if (hours >= 11) {
          // Between 11:00 and 19:00, select daytime period
          setSelectedTimePeriod("daytime");
          setError(null);
        } else {
          // Between 00:00 and 11:00, select morning period
          setSelectedTimePeriod("morning");
          setError(null);
        }
      }
    } else {
      // If not on today's date, clear any time-related errors
      if (error && error.includes("ไม่สามารถแสดงข้อมูลย้อนหลัง")) {
        setError(null);
      }
    }
  }, [selectedDate]);

  // Fetch buildings from API
  const fetchBuildings = async () => {
    try {
      const response = await getBuildings();
      if (response.success) {
        setBuildings(response.data);
      }
    } catch (error) {
      console.error("Error fetching buildings:", error);
      setError("ไม่สามารถดึงข้อมูลอาคารได้");
    }
  };

  // Fetch floors by selected building
  const fetchFloors = async (buildingCode) => {
    if (!buildingCode) {
      setAvailableFloors([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getFloorsByBuilding(buildingCode);
      if (response.success) {
        setAvailableFloors(response.data);
      } else {
        setAvailableFloors([]);
        setError("ไม่พบข้อมูลลานจอดรถในอาคารที่เลือก");
      }
    } catch (error) {
      console.error("Error fetching floors:", error);
      setAvailableFloors([]);
      setError("ไม่สามารถดึงข้อมูลลานจอดรถได้");
    } finally {
      setIsLoading(false);
    }
  };

  // When building is selected, fetch floors
  useEffect(() => {
    setSelectedFloor(null);
    if (selectedBuilding) {
      fetchFloors(selectedBuilding);
    } else {
      setAvailableFloors([]);
    }
  }, [selectedBuilding]);

  // Search for parking when options are selected
  useEffect(() => {
    if (selectedDate && selectedTimePeriod) {
      searchParking();
    }
  }, [selectedDate, selectedTimePeriod, selectedBuilding]);

  // Search parking function
  const searchParking = async () => {
    if (!selectedDate || !selectedTimePeriod) return;

    // Check if current date is selected and it's after 23:00
    const now = new Date();
    if (
      selectedDate === formatDate(today) &&
      now.getHours() >= 23 &&
      now.getMinutes() > 0
    ) {
      setError("ไม่สามารถแสดงข้อมูลย้อนหลังของช่วงเวลาที่ผ่านไปแล้ว กรุณาเลือกช่วงเวลาอื่น");
      setDisplayedParking([]);
      return;
    }
  
    setIsLoading(true);
    setError(null);

    try {
      // Get representative time for selected period
      const representativeTime = timePeriods.find(
        (tp) => tp.value === selectedTimePeriod
      ).time;

      const response = await findParking(
        selectedDate,
        representativeTime,
        selectedBuilding
      );

      if (response.success) {
        // Store raw results
        setSearchResults(response.data);

        // Filter by selected floor if any
        if (selectedFloor) {
          const filteredData = response.data.filter(
            (item) => item.floor === selectedFloor
          );
          setDisplayedParking(filteredData);

          // Show message if no results after filtering
          if (filteredData.length === 0) {
            setError(
              `ไม่พบข้อมูลลานจอดรถ "${selectedFloor}" ในวันและเวลาที่เลือก`
            );
          }
        } else {
          // No filter, show all
          setDisplayedParking(response.data);
        }
      } else {
        setError(response.message || "เกิดข้อผิดพลาดในการค้นหาลานจอดรถ");
      }
    } catch (error) {
      console.error("Error searching for parking:", error);
      setError("ไม่สามารถค้นหาลานจอดรถได้");
    } finally {
      setIsLoading(false);
    }
  };

  // When floor is selected, filter from raw results
  useEffect(() => {
    if (searchResults.length > 0) {
      if (selectedFloor) {
        // Filter raw results by selected floor
        const filteredData = searchResults.filter(
          (item) => item.floor === selectedFloor
        );

        // Show message if no results after filtering
        if (filteredData.length === 0) {
          setError(
            `ไม่พบข้อมูลลานจอดรถ "${selectedFloor}" ในวันและเวลาที่เลือก`
          );
        } else {
          setError(null);
        }

        setDisplayedParking(filteredData);
      } else {
        // No filter, show all
        setDisplayedParking(searchResults);
        setError(null);
      }
    }
  }, [selectedFloor, searchResults]);

  // Reset filters function
  const resetFilters = () => {
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setAvailableFloors([]);
    setError(null);

    // Keep current date
    const currentDate = formatDate(today);
    setSelectedDate(currentDate);

    // Set default time period based on current time
    const hours = today.getHours();
    if (hours >= 7 && hours < 11) {
      setSelectedTimePeriod("morning");
    } else if (hours >= 11 && hours < 19) {
      setSelectedTimePeriod("daytime");
    } else {
      setSelectedTimePeriod("evening");
    }

    // Search again
    searchParking();
  };

  // Handle floor selection
  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
  };

  // Check if time period has passed
  const isTimePeriodPassed = (periodValue) => {
    // If selected date is not today, no time periods have passed
    if (selectedDate !== formatDate(today)) {
      return false;
    }
  
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
  
    switch (periodValue) {
      case "morning": // 07:00-11:00
        return currentHour > 11 || (currentHour === 11 && currentMinute > 0);
      case "daytime": // 11:00-19:00
        return currentHour > 19 || (currentHour === 19 && currentMinute > 0);
      case "evening": // 19:00-23:00
        return currentHour > 23 || (currentHour === 23 && currentMinute > 0);
      default:
        return false;
    }
  };
  
  // Get availability status class
  const getAvailabilityStatusClass = (chance) => {
    const availabilityChance = parseFloat(chance);
    if (availabilityChance > 70) {
      return "status-available";
    } else if (availabilityChance > 30) {
      return "status-medium";
    } else {
      return "status-occupied";
    }
  };

  // Get availability status text
  const getAvailabilityStatusText = (chance) => {
    const availabilityChance = parseFloat(chance);
    if (availabilityChance > 70) {
      return "ว่าง";
    } else if (availabilityChance > 30) {
      return "ว่างบางส่วน";
    } else {
      return "ไม่ว่าง";
    }
  };

  return (
    <div style={{ minHeight: "100%" }}>
      <div className="box2">
        <img
          src="./Metthier Master Logo.png"
          alt="My Logo"
          className="Logo2-image"
        />
      </div>

      <div className="main-content3">
        <h2 className="text-center">
          ค้นหาลานจอดรถ <FaSearch className="iconPark" size={31} />
        </h2>
        
        <div className="boxback">
          {/* Parking Image */}
          <div className="photoparking">
            <img src="parking.png" alt="Parking" className="parking" />
          </div>
          
          {/* Filters Section */}
          <div className="filter-container">
            {/* Date and Time Row */}
            <div className="filter-row">
              <div className="dropdown-container">
                <div className="input-group">
                  
                  <input
                    type="date"
                    className="form-control custom-date-picker"
                    placeholder="วันที่"
                    min={formatDate(today)}
                    max={formatDate(maxDate)}
                    value={selectedDate || ""}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="dropdown-container">
                <div className="dropdown">
                  <button
                    className="btn btn-light dropdown-toggle time-dropdown-btn"
                    type="button"
                    id="timeDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    
                    {timePeriods.find((tp) => tp.value === selectedTimePeriod)
                      ?.label || "เลือกช่วงเวลา"}
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="timeDropdown">
                    {timePeriods.map((period) => (
                      <li key={period.value}>
                        <button
                          className={`dropdown-item ${
                            isTimePeriodPassed(period.value) ? "disabled" : ""
                          }`}
                          onClick={() => !isTimePeriodPassed(period.value) && setSelectedTimePeriod(period.value)}
                          disabled={isTimePeriodPassed(period.value)}
                        >
                          {period.label}
                          {isTimePeriodPassed(period.value) && (
                            <span className="text-muted ms-2">(ผ่านไปแล้ว)</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Building and Floor Row */}
            <div className="filter-row">
              <div className="dropdown-container">
                <div className="dropdown">
                  <button
                    className="btn btn-light dropdown-toggle"
                    type="button"
                    id="dropdownMenuButton"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{ width: "100%", height: "42px" }}
                  >
                    <FaBuilding style={{ marginRight: "8px", color: "#473366" }} />
                    {selectedBuilding 
                      ? buildings.find(b => b.code === selectedBuilding)?.name 
                      : "อาคาร"}
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => setSelectedBuilding(null)}
                      >
                        ทุกอาคาร
                      </button>
                    </li>
                    {buildings.map((building) => (
                      <li key={building.id}>
                        <button
                          className="dropdown-item"
                          onClick={() => setSelectedBuilding(building.code)}
                        >
                          {building.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="dropdown-container">
                <div className="dropdown">
                  <button
                    className="btn btn-light dropdown-toggle"
                    type="button"
                    id="dropdownFloor"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{ width: "100%", height: "42px" }}
                    disabled={!selectedBuilding}
                  >
                    <FaParking style={{ marginRight: "8px", color: "#473366" }} />
                    {selectedFloor || "เลือกลาน"}
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="dropdownFloor">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => handleFloorSelect(null)}
                      >
                        ทุกลาน
                      </button>
                    </li>
                    {availableFloors.map((floor) => (
                      <li key={floor.id}>
                        <button
                          className="dropdown-item"
                          onClick={() => handleFloorSelect(floor.name)}
                        >
                          {floor.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                className="btn btn-reset"
                type="button"
                onClick={resetFilters}
              >
                <FaSyncAlt style={{ marginRight: "5px" }} />
                รีเซ็ต
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="spinner-container">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
            </div>
          )}

          {/* Parking List */}
          <div className="parking-list">
            {displayedParking.map((item) => (
              <div key={item.id} className="parking-item">
                <img
                  src={item.image_url || getDefaultImage(item.building)}
                  alt={`ลานจอดรถ ${item.building_name} ${item.floor}`}
                  className="parking-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getDefaultImage(item.building);
                  }}
                />
                <div className="parking-content">
                  <div className="parking-header">
                    <div className="parking-title">
                      <FaBuilding /> {item.building_name} {item.floor}
                    </div>
                    <div className={`availability-badge ${getAvailabilityStatusClass(item.availability_chance)}`}>
                      {getAvailabilityStatusText(item.availability_chance)}
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <FaParking className="info-icon" />
                    สถานะลานจอด: {item.slots}
                  </div>
                  
                  <div className="info-row">
                    <FaChartLine className="info-icon" />
                    โอกาสที่จะว่าง: {item.availability_chance}%
                  </div>
                  
                  <div className="info-row">
                    <FaClock className="info-icon" />
                    ช่วงเวลา: {timePeriods.find((tp) => tp.value === selectedTimePeriod)?.label}
                  </div>
                  
                  <div className="info-row">
                    <FaRegClock className="info-icon" />
                    เวลาทำการ: {item.time} น.
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {!isLoading && displayedParking.length === 0 && !error && (
              <div className="empty-state">
                <p style={{ color: "#666", fontSize: "16px" }}>ไม่พบข้อมูลลานจอดรถ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navbar - Keep the original */}
      <div className="boxnav1">
        <div className="boxnav">
          <div className="bottom-navbar">
            <Nav className="justify-content-around">
              <Nav.Item>
                <Link
                  to="/home"
                  className={`nav-item home-link ${
                    location.pathname === "/home/ScanQRCode" ? "active" : ""
                  }`}
                >
                  <IoHome className="icon" size={31} />
                  <span> หน้าแรก</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link
                  to="/findparking"
                  className={`nav-item findparking-link ${
                    location.pathname === "/findparking" ? "active" : ""
                  }`}
                >
                  <FaSearch className="icon" size={31} />
                  <span> ค้นหาลานจอด</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link
                  to="/record"
                  className={`nav-item record-link ${
                    location.pathname === "/record" ? "active" : ""
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faBuildingCircleCheck}
                    className="icon"
                    style={{ fontSize: "31px" }}
                  />
                  <span> ประวัติการจอด</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link
                  to="/profile"
                  className={`nav-item profile-link ${
                    location.pathname === "/profile" ? "active" : ""
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faAddressCard}
                    className="icon"
                    style={{ fontSize: "31px" }}
                  />
                  <span> ข้อมูลส่วนตัว</span>
                </Link>
              </Nav.Item>
            </Nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Findparking;