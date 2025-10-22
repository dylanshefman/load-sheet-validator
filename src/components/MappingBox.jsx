// src/components/MappingBox.jsx
import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  Box,
  Typography,
  Collapse,
  IconButton,
} from "@mui/material"
import { ChevronRight } from "@mui/icons-material"
import { motion } from "framer-motion"

export default function MappingBox({
  title,
  children,
  collapsedSummary = null,
  autoCollapseTrigger = false,
}) {
  const [expanded, setExpanded] = useState(true)

  // Automatically collapse when trigger (e.g., mergedDf exists)
  useEffect(() => {
    if (autoCollapseTrigger) setExpanded(false)
  }, [autoCollapseTrigger])

  const handleToggle = () => setExpanded((prev) => !prev)

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: "none",
        borderRadius: 0,
        width: "calc(100% + 32px)",
        ml: -2,
        mr: -2,
        backgroundColor: "#f5f5f5",
        boxShadow: "none",
        overflow: "hidden",
        transition: "all 0.25s ease",
      }}
    >
      {/* Header row (clickable) */}
      <Box
        onClick={handleToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          cursor: "pointer",
          transition: "background-color 0.2s ease",
          "&:hover": { backgroundColor: "#ebebeb" },
        }}
      >
        <Typography variant="h6">{title}</Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {collapsedSummary && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              {collapsedSummary}
            </Typography>
          )}
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <IconButton size="medium" sx={{ color: "#555" }}>
              <ChevronRight sx={{ fontSize: 26 }} />
            </IconButton>
          </motion.div>
        </Box>
      </Box>

      {/* Collapsible content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 1 }}>{children}</CardContent>
      </Collapse>
    </Card>
  )
}
