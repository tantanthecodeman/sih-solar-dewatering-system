"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from "recharts";
import { 
  Droplets, Power, Zap, Thermometer, Eye, Brain, 
  Wifi, WifiOff, AlertTriangle, CheckCircle, Settings,
  TrendingUp, Cloud, Sun, Play, Pause, RotateCcw
} from "lucide-react";

export default function EnhancedDashboard() {
  const [systemData, setSystemData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);

  // Synthetic test data for testing when backend is not available
  const generateTestData = () => {
    const now = Date.now();
    const waterLevel = 2 + Math.sin(now / 10000) * 2; // Oscillates between 0-4 cm
    const percentage = (waterLevel / 6) * 100;
    
    return {
      pump_status: waterLevel < 2 ? "Running" : "OFF",
      water_level: Math.max(0, waterLevel),
      water_percentage: Math.max(0, percentage),
      solar: 8.5 + Math.sin(now / 15000) * 3,
      hybrid: Math.random() * 30,
      co2_saved: 120 + Math.random() * 50,
      ai_prediction: waterLevel < 2.5 ? 1 : 0,
      ai_confidence: 0.75 + Math.random() * 0.2,
      manual_override: false,
      manual_override_until: null,
      last_updated: new Date().toISOString(),
      weather: {
        temperature: 28 + Math.random() * 6,
        humidity: 60 + Math.random() * 20,
        solar_irradiance: 300 + Math.random() * 400,
        rainfall: Math.random() * 3
      },
      energy: [
        {"month": "Jan", "value": 100},
        {"month": "Feb", "value": 150}, 
        {"month": "Mar", "value": 200},
        {"month": "Apr", "value": 180},
        {"month": "May", "value": 220},
        {"month": "Jun", "value": 190}
      ],
      demand: [
        {"month": "Jan", "value": 80},
        {"month": "Feb", "value": 120},
        {"month": "Mar", "value": 180},
        {"month": "Apr", "value": 160},
        {"month": "May", "value": 200},
        {"month": "Jun", "value": 170}
      ],
      system_health: {
        mqtt_connected: true,
        ai_model_status: "Active",
        sensor_status: "Online", 
        pump_health: "Good"
      }
    };
  };

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
        setTestMode(false);
      } else {
        throw new Error('Backend not available');
      }
      
      if (aiRes.ok) {
        const aiStatusData = await aiRes.json();
        setAiData(aiStatusData);
      }
      
      setLoading(false);
    } catch (error) {
      console.warn("Backend not available, using synthetic test data:", error.message);
      
      // Use synthetic data when backend is not available
      setSystemData(generateTestData());
      setAiData({
        model_loaded: true,
        model_type: "RandomForestClassifier",
        features: ["water_level", "rain", "solar_historical", "time_of_day", "diesel_cost"]
      });
      setIsConnected(false);
      setTestMode(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePumpControl = async (action) => {
    if (testMode) {
      // Simulate pump control in test mode
      console.log(`Test Mode: ${action} pump`);
      setSystemData(prev => ({
        ...prev,
        pump_status: action === "start" ? "Running" : "OFF",
        manual_override: true
      }));
      return;
    }

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
    if (testMode) {
      setManualOverride(!manualOverride);
      setSystemData(prev => ({
        ...prev,
        manual_override: !manualOverride
      }));
      return;
    }

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

  const resetSystem = async () => {
    if (testMode) {
      setSystemData(prev => ({
        ...prev,
        pump_status: "OFF",
        water_level: 3.5,
        water_percentage: 58.3,
        manual_override: false
      }));
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/reset-system", {
        method: "POST"
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error resetting system:", error);
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

  const WaterLevelAnimation = ({ level, percentage }) => {
    // Ensure level is within bounds (0-6 cm)
    const clampedLevel = Math.max(0, Math.min(level || 0, 6));
    const clampedPercentage = Math.max(0, Math.min(percentage || 0, 100));
    
    return (
      <div className="relative">
        {/* Container */}
        <div className="relative w-24 h-40 bg-gray-800 rounded-lg border-2 border-gray-600 overflow-hidden">
          {/* Water */}
          <div 
            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
            style={{ height: `${clampedPercentage}%` }}
          >
            {/* Animated waves - only show if there's water */}
            {clampedPercentage > 5 && (
              <>
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-300 to-blue-500 opacity-70 animate-pulse"></div>
                <div className="absolute top-1 w-full h-1 bg-white opacity-30 rounded animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </>
            )}
          </div>
          
          {/* Water level indicator lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 right-1 w-3 h-px bg-gray-400"></div>
            <div className="absolute top-1/2 right-1 w-3 h-px bg-gray-400"></div>
            <div className="absolute top-3/4 right-1 w-3 h-px bg-gray-400"></div>
            
            {/* Level markers */}
            <div className="absolute top-1/4 right-5 text-xs text-gray-400">4.5cm</div>
            <div className="absolute top-1/2 right-5 text-xs text-gray-400">3.0cm</div>
            <div className="absolute top-3/4 right-5 text-xs text-gray-400">1.5cm</div>
          </div>
          
          {/* Current level indicator */}
          {clampedPercentage > 0 && (
            <div 
              className="absolute right-0 w-1 h-0.5 bg-red-400 animate-pulse"
              style={{ bottom: `${clampedPercentage}%` }}
            ></div>
          )}
        </div>
        
        {/* Level display */}
        <div className="mt-3 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {clampedLevel.toFixed(1)} cm
          </div>
          <div className="text-sm text-gray-400">
            {clampedPercentage.toFixed(1)}% Full
          </div>
          <div className="text-xs text-gray-500">
            Max: 6.0cm Container
          </div>
          
          {/* Status indicator */}
          <div className={`mt-2 text-xs font-medium px-2 py-1 rounded ${
            clampedLevel >= 3.5 
              ? "bg-green-900/50 text-green-400" 
              : clampedLevel >= 2.0 
                ? "bg-yellow-900/50 text-yellow-400"
                : "bg-red-900/50 text-red-400"
          }`}>
            {clampedLevel >= 3.5 ? "OPTIMAL" : clampedLevel >= 2.0 ? "LOW" : "CRITICAL"}
          </div>
        </div>
      </div>
    );
  };

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
          {testMode && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-purple-900/50 text-purple-400 border border-purple-700">
              <Play size={16} />
              Test Mode
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? "bg-green-900/50 text-green-400 border border-green-700" 
              : "bg-red-900/50 text-red-400 border border-red-700"
          }`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isConnected ? "Connected" : testMode ? "Test Data" : "Disconnected"}
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
                <div className="flex gap-2">
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
                  
                  <button
                    onClick={resetSystem}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white transition-all"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Status & Weather */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="text-purple-400" size={24} />
            AI Intelligence {testMode && <span className="text-xs bg-purple-900/50 px-2 py-1 rounded">(Simulated)</span>}
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
                  <div className="text-xl font-semibold">{systemData.weather.temperature.toFixed(1)}°C</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Cloud size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Humidity</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.humidity.toFixed(0)}%</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sun size={16} className="text-yellow-400" />
                    <span className="text-sm text-gray-400">Solar</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.solar_irradiance.toFixed(0)} W/m²</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Droplets size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Rainfall</span>
                  </div>
                  <div className="text-xl font-semibold">{systemData.weather.rainfall.toFixed(1)} mm</div>
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
            <Pause size={18} />
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
            isConnected || testMode ? "text-green-400" : "text-red-400"
          }`}>
            {isConnected || testMode ? "Good" : "Alert"}
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
            <p className="text-xs text-gray-500">{testMode ? "Test simulation" : "Real-time predictions"}</p>
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

      {/* Test Mode Info Panel */}
      {testMode && (
        <div className="mt-6 bg-purple-900/20 border border-purple-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">🧪 Test Mode Active</h3>
          <p className="text-sm text-purple-300 mb-2">
            Backend not available. Using synthetic data with realistic water level changes.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-purple-400">Water Level:</span>
              <br />
              <span className="text-purple-200">Oscillates 0-4 cm</span>
            </div>
            <div>
              <span className="text-purple-400">Pump Logic:</span>
              <br />
              <span className="text-purple-200">ON when &lt; 2cm</span>
            </div>
            <div>
              <span className="text-purple-400">AI Prediction:</span>
              <br />
              <span className="text-purple-200">ON when &lt; 2.5cm</span>
            </div>
            <div>
              <span className="text-purple-400">Update Rate:</span>
              <br />
              <span className="text-purple-200">Every 2 seconds</span>
            </div>
          </div>
        </div>
      )}

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