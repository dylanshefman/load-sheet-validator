import React from 'react'
import * as dfd from 'danfojs'
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer } from '@mui/material'

export default function PreviewTable({ rows = [] }) {
  let data = rows
  // if a danfo DataFrame is passed, try to extract JSON rows
  try {
    if (rows && typeof rows === 'object' && typeof rows.head === 'function') {
      // assume DataFrame
      data = dfd.toJSON(rows, { format: 'row' }).slice(0, 30)
    }
  } catch (e) {
    // fallback: use rows as-is
  }

  if (!data || !data.length) return <Paper sx={{ p: 2 }}>No data loaded</Paper>
  const cols = Object.keys(data[0])
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 360 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>{cols.map(c => <TableCell key={c}>{c}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {data.map((r, i) => (
            <TableRow key={i}>{cols.map(c => <TableCell key={c}>{r[c]}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
