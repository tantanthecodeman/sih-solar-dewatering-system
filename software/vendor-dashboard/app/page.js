"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from "recharts";
import { 
  Droplets, Power, Zap, Thermometer, Eye, Brain, 
  Wifi, WifiOff, AlertTriangle, CheckCircle, Settings,
  TrendingUp, Cloud, Sun
} from "lucide-react";

export default function EnhancedDashboard() {
  const [systemData, setSystemData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch data from backend
  const fetchData = async () => {
    try {
      const [statusRes, aiRes] = await Promise.all([
        fetch("http://127.0.0.1:5000/api/status"),
        fetch("http://127.0.0.1:5000/api/ai-status")
      ]);
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemData(statusData);
        setIsConnected(true);
        setManualOverride(statusData.manual_override || false);
      }
      
      if (aiRes.ok) {
        const aiStatusData = await aiRes.json();
        setAiData(aiStatusData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setIsConnected(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePumpControl = async (action) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/${action}-pump`, {
        method: "POST"
      });
      if (response.ok) {
        const result = await response.json();
        console.log(result.message);
        fetchData(); // Refresh data immediately
      }
    } catch (error) {
      console.error(`Error ${action}ing pump:`, error);
    }
  };

  const toggleManualOverride = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/manual-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !manualOverride })
      });
      if (response.ok) {
        setManualOverride(!manualOverride);
        fetchData();
      }
    } catch (error) {
      console.error("Error toggling manual override:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Solar Dewatering System...</p>
        </div>
      </div>
    );
  }

  const WaterLevelAnimation = ({ level, percentage }) => (
    <div className="relative">
      {/* Container */}
      <div className="relative w-20 h-32 bg-gray-800 rounded-lg border-2 border-gray-600 overflow-hidden">
        {/* Water */}
        <div 
          className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
          style={{ height: `${Math.min(percentage, 100)}%` }}
        >
          {/* Animated waves */}
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-300 to-blue-500 opacity-70 animate-pulse"></div>
          <div className="absolute top-1 w-full h-1 bg-white opacity-30 rounded animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        
        {/* Water level indicator lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1 w-2 h-px bg-gray-500"></div>
          <div className="absolute top-1/2 right-1 w-2 h-px bg-gray-500"></div>
          <div className="absolute top-3/4 right-1 w-2 h-px bg-gray-500"></div>
        </div>
      </div>
      
      {/* Level display */}
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold text-blue-400">{level?.toFixed(1)} cm</div>
        <div className="text-sm text-gray-400">{percentage?.toFixed(1)}% Full</div>
        <div className="text-xs text-gray-500">6cm Container</div>
      </div>
    </div>
  );

  const StatusBadge = ({ status, isAi = false }) => {
    const isRunning = status === "Running";
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
        isRunning 
          ? "bg-green-900/50 text-green-400 border border-green-700" 
          : "bg-red-900/50 text-red-400 border border-red-700"
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isRunning ? "bg-green-400 animate-pulse" : "bg-red-400"
        }`}></div>
        {isAi && <Brain size={14} />}
        {status}
      </div>
    );
  };

  const pieData = systemData ? [
    { name: 'Solar', value: 100 - (systemData.hybrid || 0), color: '#10b981' },
    { name: 'Diesel', value: systemData.hybrid || 0, color: '#f59e0b' }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Solar Dewatering System
          </h1>
          <p className="text-gray-400 mt-1">AI-Powered Mining Site Water Management</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? "bg-green-900/50 text-green-400 border border-green-700" 
              : "bg-red-900/50 text-red-400 border border-red-700"
          }`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isConnected ? "Connected" : "Disconnected"}
          </div>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleString()}
          </div>
        </div>
      </header>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pump Status & Water Level */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Power className="text-blue-400" size={24} />
            Pump Control Center
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <WaterLevelAnimation 
                level={systemData?.water_level} 
                percentage={systemData?.water_percentage}
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">System Status</h3>
                <StatusBadge status={systemData?.pump_status || "OFF"} />
                
                {systemData?.ai_prediction !== undefined && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-400">AI Recommendation:</div>
                    <StatusBadge 
                      status={systemData.ai_prediction === 1 ? "Running" : "OFF"} 
                      isAi={true}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Confidence: {(systemData.ai_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Control Mode</span>
                </div>
                <button
                  onClick={toggleManualOverride}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    manualOverride
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {manualOverride ? "Manual Override" : "AI Automatic"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Status & Weather */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="text-purple-400" size={24} />
            AI Intelligence
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Model Status</span>
              <div className={`flex items-center gap-2 ${
                aiData?.model_loaded ? "text-green-400" : "text-red-400"
              }`}>
                {aiData?.model_loaded ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {aiData?.model_loaded ? "Active" : "Inactive"}
              </div>
            </div>
            
            {systemData?.weather && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Thermometer size={16} className="text-orange-400" />
                    <span className="text-sm text-gray-400">Temperature</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.temperature}°C</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Cloud size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Humidity</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.humidity}%</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sun size={16} className="text-yellow-400" />
                    <span className="text-sm text-gray-400">Solar</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.solar_irradiance} W/m²</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Droplets size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Rainfall</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.rainfall} mm</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-semibold mb-4">Manual Control</h2>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handlePumpControl("start")}
            disabled={systemData?.pump_status === "Running"}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              systemData?.pump_status === "Running"
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white hover:scale-105"
            }`}
          >
            <Power size={18} />
            Start Pump
          </button>

          <button
            onClick={() => handlePumpControl("stop")}
            disabled={systemData?.pump_status !== "Running"}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              systemData?.pump_status !== "Running"
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white hover:scale-105"
            }`}
          >
            <Power size={18} />
            Stop Pump
          </button>
        </div>

        {manualOverride && systemData?.manual_override_until && (
          <div className="mt-4 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">Manual Override Active</span>
            </div>
            <div className="text-xs text-orange-300 mt-1">
              AI control will resume at: {new Date(systemData.manual_override_until).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="text-yellow-400" size={20} />
            <span className="text-gray-400 text-sm">Solar Power</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {systemData?.solar?.toFixed(1) || 0} kW
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="text-green-400" size={20} />
            <span className="text-gray-400 text-sm">CO₂ Saved</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {systemData?.co2_saved?.toFixed(1) || 0} kg
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="text-blue-400" size={20} />
            <span className="text-gray-400 text-sm">System Health</span>
          </div>
          <div className={`text-2xl font-bold ${
            isConnected ? "text-green-400" : "text-red-400"
          }`}>
            {isConnected ? "Good" : "Alert"}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
          <div className="text-center mb-2">
            <span className="text-gray-400 text-sm">Energy Mix</span>
          </div>
          {systemData && (
            <div className="flex justify-center">
              <PieChart width={80} height={80}>
                <Pie
                  data={pieData}
                  cx={40}
                  cy={40}
                  innerRadius={20}
                  outerRadius={35}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {systemData?.hybrid?.toFixed(1) || 0}% Diesel
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Energy Production Chart */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            Energy Production (Monthly)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={systemData?.energy || []}>
              <defs>
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#energyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Demand Forecast Chart */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={20} />
            Water Demand Forecast
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={systemData?.demand || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">System Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Location</h4>
            <p className="text-sm">Singrauli Coalfield, MP</p>
            <p className="text-xs text-gray-500">24.12°N, 82.67°E</p>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Container Specs</h4>
            <p className="text-sm">6cm Height Container</p>
            <p className="text-xs text-gray-500">Threshold: ≥3.5cm ON</p>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">AI Model</h4>
            <p className="text-sm">{aiData?.model_loaded ? "Random Forest" : "Fallback Logic"}</p>
            <p className="text-xs text-gray-500">Real-time predictions</p>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Last Updated</h4>
            <p className="text-sm">
              {systemData?.last_updated ? 
                new Date(systemData.last_updated).toLocaleTimeString() : 
                "Never"
              }
            </p>
            <p className="text-xs text-gray-500">Auto-refresh: 2s</p>
          </div>
        </div>
      </div>

      {/* Loading overlay for actions */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}