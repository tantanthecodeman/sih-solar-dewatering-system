import React from "react";
import { Box, Text, SimpleGrid, VStack } from "@chakra-ui/react";

export default function Weather({ weather }) {
  return (
    <VStack align="start" spacing={3}>
      <Text color="secondaryGray.600" fontWeight="bold">
        Live Weather
      </Text>
      <SimpleGrid columns={2} spacingX={8} spacingY={2} w="100%">
        <Text>Temp: <Text as="span" fontWeight="bold">{weather?.temperature ?? '...'}°C</Text></Text>
        <Text>Humidity: <Text as="span" fontWeight="bold">{weather?.humidity ?? '...'}%</Text></Text>
        <Text>Rain: <Text as="span" fontWeight="bold">{weather?.rainfall ?? '...'} mm</Text></Text>
        <Text>Irradiance: <Text as="span" fontWeight="bold">{weather?.solar_irradiance ?? '...'} W/m²</Text></Text>
      </SimpleGrid>
    </VStack>
  );
}