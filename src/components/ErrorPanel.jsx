import React, { useState } from 'react'
import { Paper, Typography, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField, IconButton } from '@mui/material'
import GroupWorkIcon from '@mui/icons-material/GroupWork'
import ClearIcon from '@mui/icons-material/Clear'

// error expected shape (preferred):
// { type: '...', message: 'short msg', offendingRows: [{ row: 12, record: {...}, fields: ['slotpath','handle'] }, ...] }
export default function ErrorPanel({ error }) {
  if (!error) return null

  const [visibleCount, setVisibleCount] = useState(10)
  const [increment, setIncrement] = useState(10)

  const detail = error.detail || {}
  const message = detail.message || error.message || ''
  const offendingAll = Array.isArray(detail.offendingRows) ? detail.offendingRows : null
  const offending = offendingAll ? offendingAll.slice(0, visibleCount) : null
  const [groupedColumn, setGroupedColumn] = useState(null)

  return (
    <Paper sx={{ p: 2, background: '#fff4f4', color: '#600', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6">Validation failed: {error.type}</Typography>
      {message && <Typography variant="body2" sx={{ mt: 1 }}>{message}</Typography>}

      {offending ? (
          <TableContainer sx={{ mt: 1 }}>
          {/* compute a conservative minWidth so wide records will cause scrolling */}
          <Table size="small" sx={{ minWidth: Math.max(640, Object.keys(offending[0].record).length * 140) }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                {Object.keys(offending[0].record).map((col, idx) => (
                  <TableCell key={col} sx={{ fontWeight: 'bold', position: 'relative', pr: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{col}</Typography>
                      <IconButton size="small" onClick={() => {
                        // if currently grouped on this column, remove grouping; otherwise set grouping to this column
                        if (groupedColumn === col) setGroupedColumn(null)
                        else setGroupedColumn(col)
                      }} sx={{ ml: 0.5, borderRadius: 1, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }} aria-label={groupedColumn === col ? 'remove-group' : 'group'}>
                        {groupedColumn === col ? <ClearIcon fontSize="small" /> : <GroupWorkIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedColumn ? (
                (() => {
                  const cols = Object.keys(offending[0].record)
                  const colIndex = cols.indexOf(groupedColumn)
                  // group by the grouped column value
                  const groups = {}
                  offending.forEach(({ row, record, fields }) => {
                    const key = String(record[groupedColumn] ?? '')
                    groups[key] = groups[key] || []
                    groups[key].push({ row, record, fields })
                  })
                  const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b))
                  return sortedKeys.map(gk => (
                    <React.Fragment key={`group-${gk}`}>
                      {/* group header: place empty cells up to grouped column index, then a spanning cell */}
                      <TableRow>
                        {Array.from({ length: colIndex + 1 }).map((_, i) => (
                          <TableCell key={`sp-${i}`} sx={{ backgroundColor: '#f0f0f0', border: 'none', p: 0 }} />
                        ))}
                        <TableCell sx={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }} colSpan={Math.max(1, Object.keys(offending[0].record).length - colIndex)}>
                          {`${groupedColumn}: ${gk}`}
                        </TableCell>
                      </TableRow>
                      {groups[gk].map(({ row, record, fields }) => (
                        <TableRow key={`r-${row}`}>
                            <TableCell sx={{ backgroundColor: '#ffecec', borderColor: '#ff6b6b', borderStyle: 'solid', borderWidth: '1px' }}>{row}</TableCell>
                            {Object.entries(record).map(([col, val]) => (
                              <TableCell key={col} sx={{ backgroundColor: '#ffecec', borderColor: '#ff6b6b', borderStyle: 'solid', borderWidth: '1px' }}>
                                {String(val ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                })()
              ) : (
                offending.map(({ row, record, fields }) => (
                  <TableRow key={row}>
                    <TableCell sx={{ backgroundColor: '#ffecec', borderColor: '#ff6b6b', borderStyle: 'solid', borderWidth: '1px' }}>{row}</TableCell>
                    {Object.entries(record).map(([col, val]) => (
                      <TableCell key={col} sx={{ backgroundColor: '#ffecec', borderColor: '#ff6b6b', borderStyle: 'solid', borderWidth: '1px' }}>
                        {String(val ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{JSON.stringify(detail, null, 2)}</Box>
      )}
      {/* row counter and inline editable 'show N more rows' control */}
      {offendingAll && offendingAll.length > (offending ? offending.length : 0) && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ textTransform: 'lowercase' }}>showing {Math.min(visibleCount, offendingAll.length)} of {offendingAll.length} rows</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" color="primary" onClick={() => {
                const inc = Number.isFinite(Number(increment)) && Number(increment) > 0 ? Number(increment) : 10
                setVisibleCount(c => Math.min((offendingAll || []).length, c + inc))
              }} sx={{ display: 'flex', alignItems: 'stretch', gap: 1, backgroundColor: 'white', '&:hover': { backgroundColor: '#f5f7ff' } }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 1 }}>show</Typography>
              <TextField
                size="small"
                variant="outlined"
                value={increment}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10)
                  setIncrement(Number.isFinite(v) && v >= 0 ? v : 0)
                }}
                inputProps={{ style: { textAlign: 'center' } }}
                sx={{ width: 90, '& .MuiOutlinedInput-root': { height: '100%', boxSizing: 'border-box' } }}
                aria-label="rows-increment"
              />
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 1 }}>more rows</Typography>
            </Button>

            <Button variant="outlined" color="primary" onClick={() => {
              setVisibleCount((offendingAll || []).length)
            }} sx={{ display: 'flex', alignItems: 'stretch', gap: 1, backgroundColor: 'white', '&:hover': { backgroundColor: '#f5f7ff' } }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 1 }}>Show all rows</Typography>
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  )
}
