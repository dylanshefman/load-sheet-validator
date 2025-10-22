import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
} from "@mui/material";
import UploadPage from "./components/UploadPage";
import StepperPage from "./components/StepperPage";
import StepStatusCard from "./components/StepStatusCard";
import ExportPage from "./components/export/ExportPage";
import DeviceMetadataPage from "./components/deviceMeta/DeviceMetadataPage"; // ⬅️ NEW
import ExportFinalPage from "./components/exportFinal/ExportFinalPage";

const theme = createTheme({
  palette: {
    primary: { main: "#1565c0" },
    background: { default: "#f7f9fc" },
  },
  typography: {
    h4: { fontWeight: 600 },
  },
});

export default function App() {
  const [state, setState] = useState({
    step: "upload", // "upload" → "steps" → "export" → "deviceMeta" → "exportFinal"
    df: null,
    columns: null,
    mapping: null,
    proceedMode: "auto",
    suffixUsed: false,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h4">Load Sheet Validator</Typography>

          {state.step === "steps" && (
            <Button
              variant="outlined"
              onClick={() => setState({ ...state, step: "upload" })}
            >
              Back to Upload
            </Button>
          )}

          {state.step === "export" && (
            <Button
              variant="outlined"
              onClick={() => setState({ ...state, step: "steps" })}
            >
              Back to Checks
            </Button>
          )}

          {state.step === "deviceMeta" && (
            <Button
              variant="outlined"
              onClick={() => setState({ ...state, step: "export" })}
            >
              Back to Mappings
            </Button>
          )}

          {state.step === "exportFinal" && (
            <Button
              variant="outlined"
              onClick={() => setState({ ...state, step: "deviceMeta" })}
            >
              Back to Device Metadata
            </Button>
          )}
        </Box>

        {/* step status card slot (rendered by StepperPage via portal) */}
        <Box id="step-status-slot" sx={{ mb: 2 }} />

        {/* Step 1: Upload */}
        {state.step === "upload" && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <UploadPage
              onNext={(newState) =>
                setState({ ...state, ...newState, step: "steps" })
              }
            />
          </Paper>
        )}

        {/* Step 2: Checks / Validation */}
        {state.step === "steps" && (
          <Box sx={{ mt: 2 }}>
            <StepperPage
              initialState={state}
              onBack={() => setState({ ...state, step: "upload" })}
              onProceedToExport={(finalDf) =>
                setState({ ...state, df: finalDf, step: "export" })
              }
            />
          </Box>
        )}

        {/* Step 3: Export / Facet Mapping */}
        {state.step === "export" && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <ExportPage
              initialDf={state.df}
              initialMapping={state.mapping}
              onBack={() => setState({ ...state, step: "steps" })}
              onProceedToDeviceMeta={(dfAfterFacets) =>
                setState({ ...state, df: dfAfterFacets, step: "deviceMeta" })
              }
            />
          </Paper>
        )}

        {/* Step 4: Device Metadata */}
        {state.step === "deviceMeta" && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <DeviceMetadataPage
              baseDf={state.df}
              initialDf={state.df}
              initialMapping={state.mapping}
              onBack={() => setState({ ...state, step: "export" })}
              onFinish={(dfAfterMeta) =>
                setState({ ...state, df: dfAfterMeta, step: "exportFinal" })
              }
            />
          </Paper>
        )}

        {/* Step 5: Export Final */}
        {state.step === "exportFinal" && (
          <Paper sx={{ p: 3 }} elevation={3}>
            <ExportFinalPage
              df={state.df}
              suffixUsed={state.suffixUsed}
            />
          </Paper>
        )}
      </Container>
    </ThemeProvider>
  );
}
