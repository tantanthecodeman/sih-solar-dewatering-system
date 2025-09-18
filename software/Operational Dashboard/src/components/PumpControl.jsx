import React from "react";
import { Box, Text, Button, FormControl, FormLabel, Switch, VStack, HStack } from "@chakra-ui/react";

export default function PumpControl({ pumpStatus, publishControl, autoMode, setAutoMode }) {
  return (
    <VStack align="start" spacing={4}>
      <Text color="secondaryGray.600" fontWeight="bold">Pump Control</Text>

      {/* Manual Control Buttons (human-written) */}

      <HStack spacing={4} w="100%">
        <Button
          onClick={() => publishControl("ON")}
          isDisabled={autoMode}
          colorScheme="green"
          w="100%"
        >
          Turn ON
        </Button>
        <Button
          onClick={() => publishControl("OFF")}
          isDisabled={autoMode}
          colorScheme="red"
          w="100%"
        >
          Turn OFF
        </Button>
      </HStack>

      {/* Auto (AI) Mode Switch (human layout, AI-assisted logic)*/}

      <FormControl display="flex" alignItems="center">
        <Switch
          isChecked={autoMode}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setAutoMode(isChecked);
            publishControl(isChecked ? "AUTO" : "OFF");
          }}
          id="auto-mode-switch"
          colorScheme="brand"
        />
        <FormLabel htmlFor="auto-mode-switch" mb="0" ml="3">
          Auto (AI) Mode
        </FormLabel>
      </FormControl>

      {/* <Text>
        Status: <Text as="span" fontWeight="bold">{pumpStatus}</Text>
      </Text> */}
    </VStack>
  );
}