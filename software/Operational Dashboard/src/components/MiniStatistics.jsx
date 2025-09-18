import React from "react";
import { Flex, Stat, StatLabel, StatNumber, useColorModeValue, Text } from "@chakra-ui/react";
import Card from "./Card";

export default function MiniStatistics(props) {
  const { startContent, name, value } = props;
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "secondaryGray.600";

  return (
    <Card py='15px'>
      <Flex
        my='auto'
        h='100%'
        align={{ base: "center", xl: "start" }}
        justify={{ base: "center", xl: "center" }}
      >
        {startContent}

        <Stat my='auto' ms={startContent ? "18px" : "0px"}>
          <StatLabel
            lineHeight='100%'
            color={textColorSecondary}
            fontSize={{ base: "sm" }}
          >
            {name}
          </StatLabel>
          <StatNumber
            color={textColor}
            fontSize={{ base: "2xl" }}
          >
            {value}
          </StatNumber>
        </Stat>
      </Flex>
    </Card>
  );
}