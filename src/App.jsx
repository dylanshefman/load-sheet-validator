import React, { useState } from 'react'
import { Container, Box, Typography, Paper, ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import UploadPage from './components/UploadPage'
import StepperPage from './components/StepperPage'

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
        <Paper sx={{ p: 3 }} elevation={3}>
          <Typography variant="h4" gutterBottom>Load Sheet Validator</Typography>
          {state.step === 'upload' && (
            <UploadPage onNext={(newState) => setState({ ...state, ...newState, step: 'steps' })} />
          )}

          {state.step === 'steps' && (
            <StepperPage initialState={state} onBack={() => setState({ ...state, step: 'upload' })} />
          )}
        </Paper>
      </Container>
    </ThemeProvider>
  )
}
