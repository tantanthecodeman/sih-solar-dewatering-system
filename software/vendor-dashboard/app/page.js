"use client";
import { useEffect, useState } from "react";
// import mqtt from "mqtt";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Droplet, Power } from "lucide-react";

export default function Dashboard() {
  const [mqttData, setMqttData] = useState({});
  const [aiStatus, setAiStatus] = useState("OFF");
  const [isConnected, setIsConnected] = useState(false);

  // ✅ Connect MQTT
  // useEffect(() => {
  //   const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt");
  //   client.on("connect", () => {
  //     setIsConnected(true);
  //     client.subscribe("mining/solar");
  //   });
  //   client.on("message", (topic, message) => {
  //     setMqttData(JSON.parse(message.toString()));
  //   });
  //   client.on("close", () => setIsConnected(false));
  //   return () => client.end();
  // }, []);

  return (
    <div className="min-h-screen bg-black text-gray-200 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Solar Pump Dashboard</h1>
        <div>{new Date().toLocaleString()}</div>
      </header>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {/* Pump Status */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-sm text-gray-400">Pump Status</h2>
          <p
            className={`text-xl font-bold ${
              aiStatus === "Running" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {aiStatus}
          </p>
        </div>

        {/* Solar Power */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-sm text-gray-400">Solar Power</h2>
          <p className="text-xl font-bold">{mqttData.solar || 0} kW</p>
        </div>

        {/* Water Level */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-sm text-gray-400 mb-2">Water Level</h2>
          <div className="flex items-center gap-4">
            {/* Droplet level indicator */}
            <div className="relative w-6 h-16 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute bottom-0 w-full bg-blue-500"
                style={{ height: `${mqttData.water || 0}%` }}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{mqttData.water || 0} cm</p>
              <p className="text-xs text-gray-400">
                Auto: ON ≥80cm, OFF ≤20cm
              </p>
            </div>
          </div>
        </div>

        {/* Hybrid Source */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-sm text-gray-400">Hybrid Source</h2>
          <p className="text-xl font-bold">{mqttData.hybrid || 0}% Diesel</p>
        </div>

        {/* Carbon Savings */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="text-sm text-gray-400">Carbon Savings</h2>
          <p className="text-xl font-bold">{mqttData.co2 || 0} kg</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-900 p-4 rounded-lg mb-8">
        <h2 className="text-sm text-gray-400 mb-2">Connection Status</h2>
        <p
          className={`text-lg font-bold flex items-center gap-2 ${
            isConnected ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-red-500"
            }`}
          />
          {isConnected ? "Connected" : "Disconnected"}
        </p>
      </div>

      {/* Manual Control */}
      <div className="flex gap-4 mb-8">
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700">
          <Power size={18} /> Start Pump
        </button>
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700">
          <Power size={18} /> Stop Pump
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="mb-2">Energy Delivered</h2>
          <BarChart width={400} height={200} data={mqttData.energy || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" />
          </BarChart>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <h2 className="mb-2">Seasonal Demand</h2>
          <LineChart width={400} height={200} data={mqttData.demand || []}>
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#facc15" />
          </LineChart>
        </div>
      </div>
    </div>
  );
}
