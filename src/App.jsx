import React, { useState } from 'react'
import { Container, Box, Typography, Paper, ThemeProvider, createTheme, CssBaseline, Button } from '@mui/material'
import UploadPage from './components/UploadPage'
import StepperPage from './components/StepperPage'
import StepStatusCard from './components/StepStatusCard'
import ExportPage from './components/ExportPage'

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    background: { default: '#f7f9fc' }
  },
  typography: {
    h4: { fontWeight: 600 }
  }
})

export default function App() {
  const [state, setState] = useState({
    step: 'upload',
    df: null,
    columns: null,
    mapping: null,
    proceedMode: 'auto',
    suffixUsed: false,
  })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Load Sheet Validator</Typography>
          {state.step === 'steps' && (
            <Button variant="outlined" onClick={() => setState({ ...state, step: 'upload' })}>Back to Upload</Button>
          )}
          {state.step === 'export' && (
            <Button variant="outlined" onClick={() => setState({ ...state, step: 'steps' })}>Back to checks</Button>
          )}
        </Box>

        {/* step status card slot (rendered by StepperPage via portal) */}
        <Box id="step-status-slot" sx={{ mb: 2 }} />

        {state.step === 'upload' && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <UploadPage onNext={(newState) => setState({ ...state, ...newState, step: 'steps' })} />
          </Paper>
        )}

        {/* when in steps mode, render StepperPage outside of the Paper so its cards are top-level */}
        {state.step === 'steps' && (
          <Box sx={{ mt: 2 }}>
            <StepperPage
              initialState={state}
              onBack={() => setState({ ...state, step: 'upload' })}
              onProceedToExport={(finalDf) => setState({ ...state, df: finalDf, step: 'export' })}
            />
          </Box>
        )}

        {/* export page */}
        {state.step === 'export' && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <ExportPage
              initialDf={state.df}
              originalMapping={state.mapping}
              originalColumns={state.columns}
              onBack={() => setState({ ...state, step: 'steps' })}
            />
          </Paper>
        )}
      </Container>
    </ThemeProvider>
  )
}
