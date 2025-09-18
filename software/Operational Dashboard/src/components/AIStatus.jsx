import React from "react";
import { Box, Text, Heading, VStack } from "@chakra-ui/react";

export default function AIStatus({ prediction, confidence }) {
  const recommendation = prediction === 1 ? "TURN ON" : "TURN OFF";
  const confidencePercent = (confidence * 100).toFixed(1);
  const color = prediction === 1 ? "green.400" : "red.400";

  return (
    <VStack align="start" spacing={1}>
      <Text color="secondaryGray.600" fontWeight="bold">
        AI Recommendation
      </Text>
      <Heading size="md" color={color}>
        {recommendation}
      </Heading>
      {/* <Text color="secondaryGray.600">
        Confidence: {confidencePercent}%
      </Text> */}
    </VStack>
  );
}