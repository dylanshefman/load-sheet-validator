import React from 'react'
import { Card, CardContent, Box, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import ErrorPanel from './ErrorPanel'
import { buildErrorForCheck } from './stepperHelpers'

export default function CheckCard({ c, statusObj, checkStatuses, onDownloadOffending, onDownloadCleaned }) {
  const st = statusObj ? statusObj.status : 'pending'
  const bg = st === 'pending' ? 'grey.100' : st === 'running' ? 'grey.50' : st === 'passed' ? 'success.light' : 'background.paper'
  return (
    <Card variant="outlined" sx={{ bgcolor: bg }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 24, height: 24 }}>{st === 'running' ? <CircularProgress size={20} /> : st === 'passed' ? <CheckCircleIcon color="success" /> : st === 'failed' ? <CancelIcon color="error" /> : <Box sx={{ width: 20 }} />}</Box>
        <Box sx={{ flex: 1, overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body1">{c.label}</Typography>
            {statusObj && statusObj.status === 'failed' && (
              <Box>
                <Tooltip title="Download offending rows">
                  <IconButton size="small" onClick={() => onDownloadOffending(c)}>
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download cleaned table (without offending rows)">
                  <IconButton size="small" onClick={() => onDownloadCleaned(c)}>
                    <RemoveCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
          {statusObj && statusObj.status === 'failed' && (
            <Box sx={{ mt: 1 }}>
              <ErrorPanel error={buildErrorForCheck(statusObj.detail, c.label)} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
