import React from "react";
import { SimpleGrid, Icon, useColorModeValue } from "@chakra-ui/react";
import { MdWbSunny, MdEco } from "react-icons/md"; // Import a sun icon
import MiniStatistics from "./MiniStatistics";
import IconBox from "./IconBox";

export default function Metrics({ co2, solar, hybrid }) {
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  // Calculate Solar Contribution percentage
  const solarContribution = 100 - (hybrid ?? 0);

  return (
    <SimpleGrid columns={{ base: 1, md: 3, lg: 2, xl: 3 }} gap="20px">
      <MiniStatistics
        startContent={
          <IconBox
            w="56px"
            h="56px"
            bg={boxBg}
            icon={<Icon w="32px" h="32px" as={MdEco} color={brandColor} />}
          />
        }
        name="CO₂ Saved"
        value={`${co2?.toFixed(1) ?? '...'} kg`}
      />
      <MiniStatistics
        startContent={
          <IconBox
            w="56px"
            h="56px"
            bg={boxBg}
            icon={<Icon w="32px" h="32px" as={MdWbSunny} color={brandColor} />}
          />
        }
        name="Solar Power"
        value={`${solar?.toFixed(2) ?? '...'} kW`}
      />
      <MiniStatistics
        startContent={
          <IconBox
            w="56px"
            h="56px"
            bg={boxBg}
            icon={<Icon w="32px" h="32px" as={MdWbSunny} color={brandColor} />}
          />
        }
        name="Solar Contribution"
        value={`${solarContribution?.toFixed(1) ?? '...'} %`}
      />
    </SimpleGrid>
  );
}