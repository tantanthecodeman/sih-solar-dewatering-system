"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Droplets,
  Activity,
  Clock,
  DollarSign,
  MapPin,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// Human-written: API fetch function
// AI-assisted: Minor optimization suggestion

async function fetchSolarData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=direct_radiation,global_tilted_irradiance,temperature_2m,cloud_cover&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch from Open-Meteo");
  return await resp.json();
}

// Human-written: Main Dashboard Component
// AI-assisted: Initial chart rendering structure, some layout suggestions

export default function Page() {
  const latitude = 12.9716;
  const longitude = 77.5946;
  const locationName = "Bengaluru, India";

  const panelArea = 50; // m²
  const panelEfficiency = 0.18;

  const energyCostPerKWh = 10;
  const waterCostPerCubicM = 5;
  const pumpFlowRate = 1; // m³ per kWh
  const fixedSetupCost = 47400;
  const rentingCost = 15000;

  const waterTarget = 400; // daily target (m³)

  // State hooks (human-written)

  const [currentTime, setCurrentTime] = useState(new Date());
  const [pumpStatus, setPumpStatus] = useState("Running");

  const [todayGeneration, setTodayGeneration] = useState(null);
  const [uptimePercent, setUptimePercent] = useState(null);
  const [efficiencyPercent, setEfficiencyPercent] = useState(null);
  const [waterDelivered, setWaterDelivered] = useState(null);

  const [pumpPowerData, setPumpPowerData] = useState([]);
  const [monthlyCosts, setMonthlyCosts] = useState([]);
  const [solarIrradiance, setSolarIrradiance] = useState(null);

  // Human-written: Clock updater

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // AI-assisted: Data fetching & calculations

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSolarData(latitude, longitude);
        const hours = data.hourly.time;
        const irradiance = data.hourly.global_tilted_irradiance; // W/m²
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

       
        const todayHours = [];
        const todayIrr = [];
        hours.forEach((t, i) => {
          if (t.startsWith(todayStr)) {
            todayHours.push(t);
            todayIrr.push(irradiance[i]);
          }
        });

        // Convert irradiance (W/m²) → kWh (per hour)
        
        // Conversion & calculations (human-written formulas, AI-assisted mapping)

        const hourlyPower = todayIrr.map((irr) => {
          const kWh = (irr * panelArea * panelEfficiency) / 1000; 
          return kWh;
        });

        const gen = hourlyPower.reduce((a, b) => a + b, 0);
        setTodayGeneration(gen.toFixed(2));

        // Peak irradiance
        setSolarIrradiance(Math.max(...todayIrr));

        // Water delivery
        const water = gen * pumpFlowRate;
        setWaterDelivered(water.toFixed(2));

        // Uptime (vs water target)
        const uptime = (water / waterTarget) * 100;
        setUptimePercent(Math.min(uptime, 100).toFixed(1));

        // Efficiency
        const theoreticalMax = todayIrr.reduce((sum, irr) => sum + (irr * panelArea) / 1000, 0);
        const eff = (gen / theoreticalMax) * 100;
        setEfficiencyPercent(Math.max(eff, 0).toFixed(1));

        const chartData = todayHours.map((t, i) => ({
          time: t.split("T")[1].slice(0, 5),
          power: hourlyPower[i].toFixed(2),
        }));
        setPumpPowerData(chartData);

        // Monthly costs (human-written calculation, AI-assisted formatting)

        const energyCost = gen * energyCostPerKWh;
        const consumedWaterCost = water * waterCostPerCubicM;

        setMonthlyCosts([
          { item: "Fixed Setup Cost", amount: fixedSetupCost },
          { item: "Renting Cost", amount: rentingCost },
          { item: "Energy Cost", amount: Math.round(energyCost) },
          { item: "Consumed Water Cost", amount: Math.round(consumedWaterCost) },
        ]);
      } catch (err) {
        console.error("Error loading Open-Meteo data:", err);
      }
    }

    loadData();
  }, []);

  const pieColors = ["#f97316", "#3b82f6"];

  // Human-written: JSX layout, Tailwind classes, cards, headers

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-orange-900 rounded-xl border border-orange-700">
              <Sun className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Solar Pump Vendor Dashboard</h1>
              <p className="text-gray-400 text-sm">Real-time monitoring & analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <PumpStatusBadge pumpStatus={pumpStatus} />
            <div className="flex items-center space-x-1 text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {currentTime.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-6 py-6">
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatusCard icon={Sun} title="Solar Power" value={todayGeneration ?? "---"} unit="kWh" color="orange" />
          <StatusCard icon={Activity} title="Uptime" value={uptimePercent ?? "---"} unit="%" color="purple" />
          <StatusCard icon={Activity} title="Efficiency" value={efficiencyPercent ?? "---"} unit="%" color="cyan" />
          <StatusCard icon={Droplets} title="Water Delivered" value={waterDelivered ?? "---"} unit="m³" color="blue" />
          <StatusCard icon={MapPin} title="Location" value={locationName} unit="" color="orange" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-orange-600 to-yellow-600 rounded-xl p-6 shadow-lg">
            <h4 className="text-xl font-semibold mb-2">Today's Generation</h4>
            <p className="text-3xl font-bold">{todayGeneration ? `${todayGeneration} kWh` : "---"}</p>
            <p className="text-orange-100">
              Peak Irradiance: {solarIrradiance ? `${solarIrradiance.toFixed(1)} W/m²` : "---"}
            </p>
            <p className="text-sm mt-2">Daily Target: 400 kWh</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg">
            <h4 className="text-xl font-semibold mb-2">Water Delivery</h4>
            <p className="text-3xl font-bold">{waterDelivered ? `${waterDelivered} m³` : "---"}</p>
            <p className="text-blue-100">Target: {waterTarget} m³/day</p>
          </div>
        </div>

        
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 shadow-lg mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <DollarSign className="h-6 w-6 mr-2" /> Revenue & Analytics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LineChart */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h4 className="text-sm mb-2">Pump Power (Hourly)</h4>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={pumpPowerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#ccc" />
                  <YAxis stroke="#ccc" />
                  <Tooltip />
                  <Line type="monotone" dataKey="power" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PieChart */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h4 className="text-sm mb-2">Energy Source Distribution</h4>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Solar", value: todayGeneration ? Math.max(parseFloat(todayGeneration) * 0.6, 0) : 60 },
                      { name: "Backup", value: todayGeneration ? Math.max(parseFloat(todayGeneration) * 0.4, 0) : 40 },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={30}
                    outerRadius={60}
                    label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {[0, 1].map((i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value.toFixed(2)} kWh`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

           
            <div className="bg-gray-900 rounded-xl p-4">
              <h4 className="text-sm mb-2">Monthly Costs</h4>
              <ul className="space-y-1 text-gray-300 text-sm">
                {monthlyCosts.map((c, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{c.item}</span>
                    <span>₹{c.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between font-bold">
                <span>Total</span>
                <span>₹{monthlyCosts.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Human-written: small helper components

const StatusCard = ({ icon: Icon, title, value, unit, color }) => {
  const colorMap = {
    orange: "text-orange-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {value} <span className="text-sm text-gray-500">{unit}</span>
      </p>
      <Icon className={`h-5 w-5 mt-2 ${colorMap[color]}`} />
    </div>
  );
};

const PumpStatusBadge = ({ pumpStatus }) => (
  <div
    className={`px-3 py-1 rounded-lg text-sm font-medium border ${
      pumpStatus === "Running"
        ? "bg-green-900 text-green-300 border-green-700"
        : pumpStatus === "Idle"
        ? "bg-yellow-900 text-yellow-300 border-yellow-700"
        : "bg-red-900 text-red-300 border-red-700"
    }`}
  >
    {pumpStatus}
  </div>
);