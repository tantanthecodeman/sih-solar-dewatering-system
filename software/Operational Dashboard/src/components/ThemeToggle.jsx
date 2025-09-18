// src/components/ThemeToggle.jsx
import React from "react";
import { useColorMode, IconButton, Icon } from "@chakra-ui/react";
import { IoMdMoon, IoMdSunny } from "react-icons/io";

export default function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      aria-label="Toggle theme"
      variant="ghost"
      onClick={toggleColorMode}
      icon={
        <Icon
          h="24px"
          w="24px"
          color="gray.400"
          as={colorMode === "light" ? IoMdMoon : IoMdSunny}
        />
      }
    />
  );
}