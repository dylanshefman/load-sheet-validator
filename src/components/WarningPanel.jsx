import React, { useState } from 'react'
import { Paper, Typography, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'

// warning expected shape:
// { type: 'duplicate-fields', detail: { message: '...', offendingByDevice: [ { device: 'd', rows: [{ row: 12, record: { slotpath, pointName, field } }, ... ] }, ... ] } }
export default function WarningPanel({ warning, spCol, pnCol, fCol }) {
  if (!warning) return null

  const detail = warning.detail || {}
  const message = detail.message || ''
  const groups = Array.isArray(detail.offendingByDevice) ? detail.offendingByDevice : []

  return (
    <Paper sx={{ p: 2, background: '#fff8e1', color: '#5a3e00', overflowX: 'auto', width: '100%', boxSizing: 'border-box', border: '1px solid #ffd54f' }}>
      <Typography variant="h6">Warning: {warning.type}</Typography>
      {message && <Typography variant="body2" sx={{ mt: 1 }}>{message}</Typography>}

      {groups.map(g => (
        <Box key={`dev-${g.device}`} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{g.device}</Typography>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>slotpath</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>point name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>field</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {g.rows.map(({ row, record }) => (
                  <TableRow key={`r-${g.device}-${row}`}> 
                    <TableCell sx={{ backgroundColor: '#fff8e1', borderColor: '#ffd54f', borderStyle: 'solid', borderWidth: '1px' }}>{row}</TableCell>
                    <TableCell sx={{ backgroundColor: '#fff8e1' }}>{String(record[spCol] ?? '')}</TableCell>
                    <TableCell sx={{ backgroundColor: '#fff8e1' }}>{String(record[pnCol] ?? '')}</TableCell>
                    <TableCell sx={{ backgroundColor: '#fff8e1' }}>{String(record[fCol] ?? '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Paper>
  )
}
