import React, { useState } from 'react'
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
} from '@mui/material'
import { ChevronRight, ExpandMore } from '@mui/icons-material'
import { motion } from 'framer-motion'

// rows: flat array of { slotpath, row, deviceName, canonicalType, field, facets? }
export default function MatchPanel({
  title,
  rows,
  color,
  showFacets,
  slotpathCol,
  deviceCol,
  canonicalTypeCol,
  fieldCol,
  facetsCol,
}) {
  const bg = color === 'green' ? '#e8f5e9' : '#ffebee'
  const border = color === 'green' ? '#a5d6a7' : '#ef9a9a'
  const text = color === 'green' ? '#1b5e20' : '#b71c1c'

  const [visibleLimit, setVisibleLimit] = useState(10)
  const [expanded, setExpanded] = useState(false)

  const handleToggle = () => setExpanded((prev) => !prev)

  return (
    <Paper
      sx={{
        p: 0,
        background: bg,
        color: text,
        overflowX: 'auto',
        width: '100%',
        border: `1px solid ${border}`,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: color === 'green' ? '#dcedc8' : '#ffcdd2' },
        }}
      >
        <Typography variant="h6">
          {title} ({rows.length})
        </Typography>

        {/* Animated chevron */}
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <IconButton size="small" sx={{ color: text }}>
            <ChevronRight />
          </IconButton>
        </motion.div>
      </Box>

      {/* Collapsible content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>slotpath</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>device</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>canonical type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>field</TableCell>
                  {showFacets && (
                    <TableCell sx={{ fontWeight: 'bold' }}>facets</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(0, visibleLimit).map((r, idx) => (
                  <TableRow key={`r-${idx}-${String(r[slotpathCol])}`}>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {String(r[slotpathCol] ?? '')}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {String(r[deviceCol] ?? '')}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {String(r[canonicalTypeCol] ?? '')}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: bg }}>
                      {String(r[fieldCol] ?? '')}
                    </TableCell>
                    {showFacets && (
                      <TableCell sx={{ backgroundColor: bg }}>
                        {String(r[facetsCol] ?? '')}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Show more button (only visible when expanded) */}
          {expanded && rows.length > visibleLimit && (
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
  )
}
