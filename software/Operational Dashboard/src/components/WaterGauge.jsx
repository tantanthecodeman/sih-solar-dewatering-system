import React from "react";
import { Box, Text, Heading, Flex, Tag } from "@chakra-ui/react";

// In src/components/WaterGauge.jsx

export default function WaterGauge({ level, percentage }) {
  // CORRECTED LOGIC FOR DEWATERING
  const getStatus = () => {
    if (percentage == null || level < 0) return { text: "NO DATA", color: "gray" };
    if (percentage >= 85) return { text: "CRITICAL", color: "red" };
    if (percentage >= 60) return { text: "HIGH", color: "orange" };
    if (percentage >= 20) return { text: "OPTIMAL", color: "blue" };
    return { text: "LOW", color: "green" };
  };

  const status = getStatus();


  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="start">
        <Box>
          <Text color="secondaryGray.600" fontWeight="bold">
            Water Distance from the Sensor
          </Text>
          <Heading size="lg" mt="1">
            {level?.toFixed(1) ?? '...'} cm
          </Heading>
          {/* <Text color="secondaryGray.600">
            {percentage?.toFixed(1) ?? '...'}% Full
          </Text> */}
        </Box>
        {/* <Tag size="lg" variant="solid" colorScheme={status.color}>
          {status.text}
        </Tag> */}
      </Flex>
    </Box>
  );
}