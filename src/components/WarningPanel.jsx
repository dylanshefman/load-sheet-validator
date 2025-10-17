import React, { useState } from 'react'
import { Paper, Typography, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Collapse, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// warning expected shape:
// { type: 'duplicate-fields', detail: { message: '...', offendingByDevice: [ { device: 'd', rows: [{ row: 12, record: { slotpath, pointName, field } }, ... ] }, ... ] } }
export default function WarningPanel({ warning, spCol = 'slotpath', pnCol = 'pointName', fCol = 'field' }) {
  if (!warning) return null

  const detail = warning.detail || {}
  const message = detail.message || ''
  const groups = Array.isArray(detail.offendingByDevice) ? detail.offendingByDevice : []

  const [openMap, setOpenMap] = useState({})

  const toggle = (device) => {
    setOpenMap(prev => ({ ...prev, [device]: !prev[device] }))
  }

  return (
    <Paper sx={{ p: 2, background: '#fff8e1', color: '#5a3e00', overflowX: 'auto', width: '100%', boxSizing: 'border-box', border: '1px solid #ffd54f' }}>
      <Typography variant="h6">Warning: {warning.type}</Typography>
      {message && <Typography variant="body2" sx={{ mt: 1 }}>{message}</Typography>}

      {groups.map(g => {
        const device = g.device || 'unknown'
        const isOpen = !!openMap[device]
        // compute number of fields that appear multiple times within this device (exclude '!')
        const fieldCounts = {};
        (g.rows || []).forEach(r => {
          const val = String((r.record && r.record[fCol]) || '')
          if (!val || val === '!') return
          fieldCounts[val] = (fieldCounts[val] || 0) + 1
        })
        const dupCount = Object.values(fieldCounts).filter(c => c > 1).length

        return (
          <Box key={`dev-${device}`} sx={{ mt: 2 }}>
            <Box
              onClick={() => toggle(device)}
              role="button"
              aria-expanded={isOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { backgroundColor: '#fff2bf' }
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>{device}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> 
                <Typography variant="body2" sx={{ color: '#5a3e00', opacity: 0.95 }}>{dupCount} duplicate field{dupCount !== 1 ? 's' : ''}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); toggle(device) }}
                  aria-label={isOpen ? 'collapse' : 'expand'}
                  sx={{
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 160ms ease'
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            </Box>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1 }}>
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
                      {g.rows.map(({ row, record }, idx) => (
                        <TableRow key={`r-${device}-${row}-${idx}`}>
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
            </Collapse>
          </Box>
        )
      })}
    </Paper>
  )
}
