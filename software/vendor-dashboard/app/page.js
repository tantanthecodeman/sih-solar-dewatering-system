"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Zap,
  CloudSun,
  Activity,
  RefreshCw,
  Play,
  StopCircle,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import mqtt from "mqtt";

// synthetic fallback data for testing
const syntheticData = {
  waterLevel: 2.5,
  solarPower: 4.8,
  co2Saved: 1.2,
  energyMix: 65,
  systemHealth: "Good",
  demandForecast: [3.5, 4.2, 4.8, 5.0, 4.6, 4.1],
  energyProduction: [4.5, 4.7, 5.2, 5.1, 4.8, 4.9],
  weather: { temp: 28, condition: "Sunny" },
  aiModel: { status: "Running", accuracy: "92%" },
};

export default function EnhancedDashboard() {
  const [data, setData] = useState(syntheticData);
  const [loading, setLoading] = useState(true);
  const [pumpState, setPumpState] = useState("Idle");
  const [error, setError] = useState(null);

  // --- Backend Fetch (system + weather + AI) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, aiRes] = await Promise.all([
          fetch("/api/status"),
          fetch("/api/ai-status"),
        ]);

        const statusData = await statusRes.json();
        const aiData = await aiRes.json();

        setData((prev) => ({
          ...prev,
          ...statusData,
          aiModel: aiData,
        }));

        setError(null);
      } catch (err) {
        console.error("Backend fetch failed, falling back to synthetic data:", err);
        setData(syntheticData);
        setError("Using synthetic data (backend unreachable)");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- MQTT Subscription (water level from ESP32) ---
  useEffect(() => {
    const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt"); 
    // for local broker use: ws://localhost:9001

    client.on("connect", () => {
      console.log("✅ Connected to MQTT broker");
      client.subscribe("esp32/water-level", (err) => {
        if (!err) console.log("📡 Subscribed to esp32/water-level");
      });
    });

    client.on("message", (topic, message) => {
      if (topic === "esp32/water-level") {
        const newLevel = parseFloat(message.toString());
        console.log("📥 Water Level:", newLevel);
        setData((prev) => ({
          ...prev,
          waterLevel: newLevel,
        }));
      }
    });

    return () => client.end();
  }, []);

  // --- Pump Control Handlers ---
  const handlePumpAction = async (action) => {
    try {
      const res = await fetch(`/api/pump/${action}`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed: ${action}`);
      setPumpState(action === "reset" ? "Idle" : action);
    } catch (err) {
      console.error("Pump control error:", err);
      setError(`Pump control failed: ${action}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Smart Solar Dewatering Dashboard
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Water Level Card */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Droplets className="text-blue-500" />
              Water Level
            </CardTitle>
            <RefreshCw
              className="h-4 w-4 cursor-pointer"
              onClick={() => window.location.reload()}
            />
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(data.waterLevel / 6) * 100}%` }}
              className="h-24 bg-blue-300 rounded-lg"
            />
            <p className="text-center mt-2 text-lg">
              {data.waterLevel.toFixed(2)} cm
            </p>
          </CardContent>
        </Card>

        {/* Pump Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-green-500" />
              Pump Control
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-center text-lg">State: {pumpState}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => handlePumpAction("start")}>
                <Play className="mr-1 h-4 w-4" /> Start
              </Button>
              <Button
                onClick={() => handlePumpAction("stop")}
                variant="destructive"
              >
                <StopCircle className="mr-1 h-4 w-4" /> Stop
              </Button>
              <Button
                onClick={() => handlePumpAction("reset")}
                variant="secondary"
              >
                Reset
              </Button>
            </div>
            <Button onClick={() => handlePumpAction("manual")}>
              Manual Override
            </Button>
          </CardContent>
        </Card>

        {/* Solar Power */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-yellow-500" />
              Solar Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">
              {data.solarPower} kW
            </p>
          </CardContent>
        </Card>

        {/* CO₂ Saved */}
        <Card>
          <CardHeader>
            <CardTitle>CO₂ Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">
              {data.co2Saved} tons
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-red-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl">{data.systemHealth}</p>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudSun className="text-orange-500" />
              Weather
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-2xl">{data.weather.temp}°C</p>
            <p>{data.weather.condition}</p>
          </CardContent>
        </Card>

        {/* AI Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="text-purple-500" />
              AI Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Status: {data.aiModel.status}</p>
            <p>Accuracy: {data.aiModel.accuracy}</p>
          </CardContent>
        </Card>

        {/* Demand Forecast */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.demandForecast.map((y, i) => ({ x: i, y }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Energy Production */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Energy Production</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={data.energyProduction.map((y, i) => ({ x: i, y }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="y" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
