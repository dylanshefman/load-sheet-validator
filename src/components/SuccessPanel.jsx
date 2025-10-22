import React from 'react'
import { Paper, Typography, Box, Button } from '@mui/material'

export default function SuccessPanel({ onProceed = () => {} }) {
  return (
    <Paper sx={{ p: 2, background: '#e8f5e9', color: '#1b5e20', width: '100%', boxSizing: 'border-box', border: '1px solid #a5d6a7' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h6">Success</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>All checks passed for this step.</Typography>
        </Box>
        <Box>
          <Button variant="contained" color="success" onClick={onProceed}>Proceed to Facet Mapping</Button>
        </Box>
      </Box>
    </Paper>
  )
}
