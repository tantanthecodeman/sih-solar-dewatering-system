import React from "react";
import { motion } from "framer-motion";
import { Box, Text } from "@chakra-ui/react"; // Correctly import Text instead of Typography
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function SolarChart({ solarData, title, dataKey, xAxisKey }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      {/* Use the Text component for the title */}
      <Text color="secondaryGray.600" fontWeight="bold">
        {title || "Chart"}
      </Text>
      
      <Box style={{ width: "100%", height: 300 }} mt={2}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={solarData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                borderColor: '#475569',
                color: '#e2e8f0'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#38bdf8" 
              strokeWidth={2} 
              dot={{ r: 4, fill: '#0ea5e9' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </motion.div>
  );
}