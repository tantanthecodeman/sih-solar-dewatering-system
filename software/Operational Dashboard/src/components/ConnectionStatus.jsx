import React from "react";
import { Flex, Text, Circle } from "@chakra-ui/react";

export default function ConnectionStatus({ connected }) {
  return (
    <Flex align="center">
      <Circle size="12px" bg={connected ? "green.400" : "red.400"} />
      <Text ml={3} fontWeight="bold">
        {connected ? "Connected" : "Disconnected"}
      </Text>
    </Flex>
  );
}