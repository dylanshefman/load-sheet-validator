import React from 'react'
import { Card, CardContent, Typography, LinearProgress } from '@mui/material'

export default function StepStatusCard({ step, totalSteps, stepDescriptions }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">Step {step}</Typography>
        <Typography variant="body2" color="text.secondary">{stepDescriptions[step]}</Typography>
        <LinearProgress variant="determinate" value={Math.round(((step-1)/(totalSteps-1))*100)} sx={{ my: 1 }} />
      </CardContent>
    </Card>
  )
}
