import React from 'react'
import { Paper, Typography, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material'

// rows: flat array of { slotpath, row, deviceName, canonicalType, field, facets? }
export default function MatchPanel({ title, rows = [], color = 'green', showFacets = true }) {
  const bg = color === 'green' ? '#e8f5e9' : '#ffebee'
  const border = color === 'green' ? '#a5d6a7' : '#ef9a9a'
  const text = color === 'green' ? '#1b5e20' : '#b71c1c'

  const visibleLimit = 25

  return (
    <Paper sx={{ p: 2, background: bg, color: text, overflowX: 'auto', width: '100%', boxSizing: 'border-box', border: `1px solid ${border}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title} ({rows.length})</Typography>
        <Box>
          {/* group/aggregation controls could go here */}
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>slotpath</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>device</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>canonical type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>field</TableCell>
                {showFacets && <TableCell sx={{ fontWeight: 'bold' }}>facets</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, visibleLimit).map((r, idx) => (
                <TableRow key={`r-${idx}-${String(r.slotpath)}`}> 
                  <TableCell sx={{ backgroundColor: bg, borderColor: border, borderStyle: 'solid', borderWidth: '1px' }}>{r.row || ''}</TableCell>
                  <TableCell sx={{ backgroundColor: bg }}>{String(r.slotpath ?? '')}</TableCell>
                  <TableCell sx={{ backgroundColor: bg }}>{String(r.deviceName ?? '')}</TableCell>
                  <TableCell sx={{ backgroundColor: bg }}>{String(r.canonicalType ?? '')}</TableCell>
                  <TableCell sx={{ backgroundColor: bg }}>{String(r.field ?? '')}</TableCell>
                  {showFacets && <TableCell sx={{ backgroundColor: bg }}>{String(r.facets ?? '')}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {rows.length > visibleLimit && (
          <Box sx={{ mt: 1 }}>
            <Button size="small">Show all</Button>
          </Box>
        )}
      </Box>
    </Paper>
  )
}
