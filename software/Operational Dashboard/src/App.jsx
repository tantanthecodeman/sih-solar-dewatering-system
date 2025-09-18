import React, { useEffect, useState, useRef } from "react";
import { Box, Heading, Text, SimpleGrid, useColorModeValue, Flex } from "@chakra-ui/react";

// Component Imports
import WaterGauge from "./components/WaterGauge";
import PumpControl from "./components/PumpControl";
import SolarChart from "./components/SolarChart";
import ConnectionStatus from "./components/ConnectionStatus";
import AIStatus from "./components/AIStatus";
import Metrics from "./components/Metrics";
import Weather from "./components/Weather";
import Card from "./components/Card";
import ThemeToggle from "./components/ThemeToggle";

// API and WebSocket URLs
const WS_URL = "ws://<Your Ip Address>:1880/mqtt";
const API_URL = "http://<Your Ip Address>:5000/api/status";

export default function App() {
  // --- All State and Logic Hooks Remain Unchanged ---
  const [waterLevel, setWaterLevel] = useState(0);
  const [pumpStatus, setPumpStatus] = useState("OFF");
  const [autoMode, setAutoMode] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.water_level_cm !== undefined) setWaterLevel(msg.water_level_cm);
        if (msg.pump_status !== undefined) setPumpStatus(msg.pump_status);
      } catch { console.log("📩 raw msg:", event.data); }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          setBackendData(data);
        }
      } catch (error) { console.error("Failed to fetch backend data:", error); }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const publishControl = (val) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open. Cannot send command.");
      return;
    }
    wsRef.current.send(val);
  };

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "secondaryGray.600";
  const pageBg = useColorModeValue("secondaryGray.300", "navy.900");

  return (
    <Box bg={pageBg} minH="100vh" w="100%" px={{ base: 4, md: 8 }} py={{ base: 6, md: 8}}>
      <Flex justifyContent="space-between" alignItems="center" mb="20px">
        <Box>
            <Heading color={textColor} fontSize={{ base: "2xl", md: "3xl" }} fontWeight="700">
                Solar Dewatering Dashboard
            </Heading>
            <Text color={textColorSecondary}>AI Enhanced · Realtime</Text>
        </Box>
        <ThemeToggle />
      </Flex>

      {/* --- THIS IS THE NEW TOP ROW --- */}
      <Box mb="20px">
        <Metrics 
          co2={backendData?.co2_saved} 
          solar={backendData?.solar} 
          hybrid={backendData?.hybrid}
        />
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="20px" mb="20px">
          <Card>
              <SolarChart 
                  solarData={backendData?.energy} 
                  dataKey="value"
                  xAxisKey="month"
                  title="Monthly Energy Production (kW)" 
              />
          </Card>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="20px">
            <Card>
                <WaterGauge 
                    level={waterLevel} 
                    percentage={backendData?.water_percentage} 
                />
            </Card>
            <Card>
                <PumpControl
                    pumpStatus={pumpStatus}
                    publishControl={publishControl}
                    autoMode={autoMode}
                    setAutoMode={setAutoMode}
                />
            </Card>
            <Card>
                <AIStatus 
                    prediction={backendData?.ai_prediction} 
                    confidence={backendData?.ai_confidence} 
                />
            </Card>
             <Card>
                <ConnectionStatus connected={connected} />
            </Card>
          </SimpleGrid>
      </SimpleGrid>
    </Box>
  );
}