import React, { useState, useMemo } from "react";
import {
  Paper,
  Typography,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Collapse,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { motion } from "framer-motion";

/**
 * DeviceMatchPanel
 * Displays devices and their associated metadata.
 * Supports optional filters (for matched panel).
 *
 * @param {string} title - Section title
 * @param {Array} rows - [{ deviceName, canonicalType, metadata: { Mechanical Type, Location, Area } }]
 * @param {string} color - 'green' | 'red'
 * @param {Array<string>} metadataCols - metadata fields to display
 * @param {boolean} enableFilters - whether to show filters based on non-empty metadata values
 */
export default function DeviceMatchPanel({
  title,
  rows,
  color,
  metadataCols = [],
  enableFilters = false,
}) {
  const bg = color === "green" ? "#e8f5e9" : "#ffebee";
  const border = color === "green" ? "#a5d6a7" : "#ef9a9a";
  const text = color === "green" ? "#1b5e20" : "#b71c1c";

  const [expanded, setExpanded] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(10);
  const [filters, setFilters] = useState(
    metadataCols.reduce((acc, c) => ({ ...acc, [c]: false }), {})
  );

  const handleToggle = () => setExpanded((prev) => !prev);

  // apply filters (for matched panel only)
  const filteredRows = useMemo(() => {
    if (!enableFilters) return rows;
    const active = Object.entries(filters)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (active.length === 0) return rows;

    return rows.filter((r) =>
      active.every((field) => {
        const val = String(r.metadata?.[field] ?? "").trim();
        return val.length > 0;
      })
    );
  }, [rows, filters, enableFilters]);

  // if no rows, show header only (no expand or table)
  if (!rows || rows.length === 0) {
    return (
      <Paper
        sx={{
          p: 0,
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="h6">
            {title} (0)
          </Typography>
        </Box>
      </Paper>
    );
  }

  // otherwise show normal expandable panel
  return (
    <Paper
      sx={{
        p: 0,
        background: bg,
        color: text,
        overflowX: "auto",
        width: "100%",
        border: `1px solid ${border}`,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
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
          "&:hover": {
            backgroundColor: color === "green" ? "#dcedc8" : "#ffcdd2",
          },
        }}
      >
        <Typography variant="h6">
          {title} ({filteredRows.length})
        </Typography>

        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <IconButton size="small" sx={{ color: text }}>
            <ChevronRight />
          </IconButton>
        </motion.div>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2 }}>
          {/* Filters */}
          {enableFilters && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Show only devices with values in:
              </Typography>
              <FormGroup row>
                {metadataCols.map((col) => (
                  <FormControlLabel
                    key={col}
                    control={
                      <Checkbox
                        size="small"
                        checked={filters[col]}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [col]: e.target.checked,
                          }))
                        }
                      />
                    }
                    label={col}
                  />
                ))}
              </FormGroup>
            </Box>
          )}

          {/* Table */}
          <TableContainer>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Device Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Canonical Type
                  </TableCell>
                  {metadataCols.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: "bold" }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.slice(0, visibleLimit).map((r, idx) => (
                  <TableRow key={`device-${idx}-${r.deviceName}`}>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {r.deviceName ?? ""}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {r.canonicalType ?? ""}
                    </TableCell>
                    {metadataCols.map((col) => (
                      <TableCell
                        key={col}
                        sx={{ backgroundColor: bg }}
                      >
                        {String(r.metadata?.[col] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Show more button */}
          {expanded && filteredRows.length > visibleLimit && (
            <Box sx={{ mt: 1 }}>
              <Button
                onClick={() => setVisibleLimit(visibleLimit + 10)}
                size="small"
                variant="outlined"
              >
                Show more
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
