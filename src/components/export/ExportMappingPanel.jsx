import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
} from "@mui/material";
import MappingBox from "../MappingBox";
import MatchPanel from "../MatchPanel";

export default function ExportMappingPanel({
  mappingState,
  setMappingState,
  processToMerged,
  setAcceptDisabled,
  handleUpload,
  mergedDf,
  initialMapping,
  matchedRows,
  missingRows,
  acceptDisabled,
  onProceedToMappings, // progressive mappings step trigger
}) {
  const initialCols = initialMapping.initialCols ?? [];
  const uploadCols = mappingState.uploadDf?.columns ?? [];

  return (
    <>
      {/* Mapping source selector */}
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Mapping source</FormLabel>
        <RadioGroup
          row
          value={mappingState.source}
          onChange={(e) => {
            setMappingState({
              source: e.target.value,
              // reset initial mode picks
              initialFacetsCol: "",
              initialOutCol: "",
              // reset upload mode picks
              uploadDf: null,
              uploadSlotpathCol: "",
              uploadFacetsCol: "",
              uploadOutCol: "",
            });
            setAcceptDisabled(true);
          }}
        >
          <FormControlLabel value="initial" control={<Radio />} label="Initial data" />
          <FormControlLabel value="upload" control={<Radio />} label="New CSV upload" />
        </RadioGroup>
      </FormControl>

      {/* Mapping configuration */}
      {mappingState.source === "initial" && (
        <MappingBox
          title="Select columns from initial data"
          autoCollapseTrigger={!!mergedDf && mergedDf.shape[0] > 0}
          collapsedSummary={[
            mappingState.initialFacetsCol ? `FACETS: ${mappingState.initialFacetsCol}` : null,
            mappingState.initialOutCol ? `OUT: ${mappingState.initialOutCol}` : null,
          ]
            .filter(Boolean)
            .join(" • ")}
        >
          {/* Stacked selects */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="facets-initial-label">Facets column</InputLabel>
              <Select
                labelId="facets-initial-label"
                value={mappingState.initialFacetsCol}
                label="Facets column"
                onChange={(e) =>
                  setMappingState((s) => ({ ...s, initialFacetsCol: e.target.value }))
                }
              >
                <MenuItem value="">-- select --</MenuItem>
                {initialCols.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="out-initial-label">Out column</InputLabel>
              <Select
                labelId="out-initial-label"
                value={mappingState.initialOutCol ?? ""}
                label="Out column"
                onChange={(e) =>
                  setMappingState((s) => ({ ...s, initialOutCol: e.target.value }))
                }
              >
                <MenuItem value="">- (none) -</MenuItem>
                {initialCols.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="contained"
                onClick={() => {
                  processToMerged();
                  setAcceptDisabled(false);
                }}
                disabled={!mappingState.initialFacetsCol}
              >
                Process
              </Button>
            </Box>
          </Box>
        </MappingBox>
      )}

      {mappingState.source === "upload" && (
        <MappingBox
          title="Upload CSV & assign columns"
          autoCollapseTrigger={!!mergedDf && mergedDf.shape[0] > 0}
          collapsedSummary={[
            mappingState.uploadSlotpathCol && mappingState.uploadFacetsCol
              ? `${mappingState.uploadSlotpathCol} → ${mappingState.uploadFacetsCol}`
              : null,
            mappingState.uploadOutCol ? `OUT: ${mappingState.uploadOutCol}` : null,
          ]
            .filter(Boolean)
            .join(" • ")}
        >
          {/* File picker */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <Button variant="outlined" component="label">
              Choose CSV
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </Button>
            {mappingState.uploadDf && (
              <Typography variant="body2" color="text.secondary">
                Loaded {mappingState.uploadDf.shape[0]} rows • {mappingState.uploadDf.columns.length} columns
              </Typography>
            )}
          </Box>

          {/* Stacked selects */}
          {mappingState.uploadDf && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="up-slot-label">Uploaded slotpath column</InputLabel>
                <Select
                  labelId="up-slot-label"
                  value={mappingState.uploadSlotpathCol}
                  label="Uploaded slotpath column"
                  onChange={(e) =>
                    setMappingState((s) => ({ ...s, uploadSlotpathCol: e.target.value }))
                  }
                >
                  <MenuItem value="">-- select --</MenuItem>
                  {uploadCols.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="up-facets-label">Uploaded facets column</InputLabel>
                <Select
                  labelId="up-facets-label"
                  value={mappingState.uploadFacetsCol}
                  label="Uploaded facets column"
                  onChange={(e) =>
                    setMappingState((s) => ({ ...s, uploadFacetsCol: e.target.value }))
                  }
                >
                  <MenuItem value="">-- select --</MenuItem>
                  {uploadCols.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="up-out-label">Uploaded out column</InputLabel>
                <Select
                  labelId="up-out-label"
                  value={mappingState.uploadOutCol ?? ""}
                  label="Uploaded out column"
                  onChange={(e) =>
                    setMappingState((s) => ({ ...s, uploadOutCol: e.target.value }))
                  }
                >
                  <MenuItem value="">- (none) -</MenuItem>
                  {uploadCols.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    processToMerged();
                    setAcceptDisabled(false);
                  }}
                  disabled={!mappingState.uploadSlotpathCol || !mappingState.uploadFacetsCol}
                >
                  Process
                </Button>
              </Box>
            </Box>
          )}
        </MappingBox>
      )}

      {/* Results */}
      {mergedDf && mergedDf.shape[0] > 0 && (
        <>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <MatchPanel
              title="Matched facets"
              rows={matchedRows}
              color="green"
              showFacets
              slotpathCol="SP"
              deviceCol={initialMapping.deviceName}
              canonicalTypeCol={initialMapping.canonicalType}
              fieldCol={initialMapping.field}
              facetsCol="FACETS"
            />
            <MatchPanel
              title="Unmatched rows"
              rows={missingRows}
              color="red"
              slotpathCol="SP"
              deviceCol={initialMapping.deviceName}
              canonicalTypeCol={initialMapping.canonicalType}
              fieldCol={initialMapping.field}
            />
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={false}
              onClick={onProceedToMappings}
            >
              Accept Column Mapping and Continue
            </Button>
          </Box>
        </>
      )}
    </>
  );
}
