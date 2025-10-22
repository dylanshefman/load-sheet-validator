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
  Divider,
} from "@mui/material";
import MappingBox from "../MappingBox";

export default function DeviceMetadataMappingPanel({
  initialCols = [],
  mappingState,
  setMappingState,
  processDeviceMerge,
  handleUpload,
  baseDf,
}) {
  const uploadCols = mappingState.uploadDf?.columns ?? [];

  const canProcessInitial =
    mappingState.initialMechTypeCol ||
    mappingState.initialLocationCol ||
    mappingState.initialAreaCol;

  const canProcessUpload =
    mappingState.uploadDeviceNameCol && // MUST have device name join key
    (mappingState.uploadMechTypeCol ||
      mappingState.uploadLocationCol ||
      mappingState.uploadAreaCol);

  return (
    <>
      {/* Source selector */}
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Mapping source</FormLabel>
        <RadioGroup
          row
          value={mappingState.source}
          onChange={(e) =>
            setMappingState({
              source: e.target.value,
              // reset selections per source change
              initialMechTypeCol: "",
              initialLocationCol: "",
              initialAreaCol: "",
              uploadDf: null,
              uploadDeviceNameCol: "",
              uploadMechTypeCol: "",
              uploadLocationCol: "",
              uploadAreaCol: "",
            })
          }
        >
          <FormControlLabel value="initial" control={<Radio />} label="Initial data" />
          <FormControlLabel value="upload" control={<Radio />} label="New CSV upload" />
        </RadioGroup>
      </FormControl>

      {/* Initial source (join by SP) */}
      {mappingState.source === "initial" && (
        <MappingBox title="Select metadata columns from initial data (joined by slotpath)">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="meta-initial-mech">Mechanical Type</InputLabel>
              <Select
                labelId="meta-initial-mech"
                value={mappingState.initialMechTypeCol}
                label="Mechanical Type"
                onChange={(e) =>
                  setMappingState((s) => ({ ...s, initialMechTypeCol: e.target.value }))
                }
              >
                <MenuItem value="">— none —</MenuItem>
                {initialCols.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="meta-initial-loc">Location</InputLabel>
              <Select
                labelId="meta-initial-loc"
                value={mappingState.initialLocationCol}
                label="Location"
                onChange={(e) =>
                  setMappingState((s) => ({ ...s, initialLocationCol: e.target.value }))
                }
              >
                <MenuItem value="">— none —</MenuItem>
                {initialCols.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="meta-initial-area">Area</InputLabel>
              <Select
                labelId="meta-initial-area"
                value={mappingState.initialAreaCol}
                label="Area"
                onChange={(e) =>
                  setMappingState((s) => ({ ...s, initialAreaCol: e.target.value }))
                }
              >
                <MenuItem value="">— none —</MenuItem>
                {initialCols.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="contained"
                onClick={() => processDeviceMerge(baseDf)}
                disabled={!canProcessInitial}
              >
                Process
              </Button>
            </Box>
          </Box>
        </MappingBox>
      )}

      {/* Upload source (join by Device Name) */}
      {mappingState.source === "upload" && (
        <MappingBox title="Upload CSV & assign metadata columns (joined by Device Name)">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
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
                  Loaded {mappingState.uploadDf.shape[0]} rows •{" "}
                  {mappingState.uploadDf.columns.length} columns
                </Typography>
              )}
            </Box>

            {mappingState.uploadDf && (
              <>
                <FormControl fullWidth>
                  <InputLabel id="meta-up-devname">Device Name (join key)</InputLabel>
                  <Select
                    labelId="meta-up-devname"
                    value={mappingState.uploadDeviceNameCol}
                    label="Device Name (join key)"
                    onChange={(e) =>
                      setMappingState((s) => ({ ...s, uploadDeviceNameCol: e.target.value }))
                    }
                  >
                    <MenuItem value="">— select —</MenuItem>
                    {uploadCols.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="meta-up-mech">Mechanical Type</InputLabel>
                  <Select
                    labelId="meta-up-mech"
                    value={mappingState.uploadMechTypeCol}
                    label="Mechanical Type"
                    onChange={(e) =>
                      setMappingState((s) => ({ ...s, uploadMechTypeCol: e.target.value }))
                    }
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {uploadCols.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="meta-up-loc">Location</InputLabel>
                  <Select
                    labelId="meta-up-loc"
                    value={mappingState.uploadLocationCol}
                    label="Location"
                    onChange={(e) =>
                      setMappingState((s) => ({ ...s, uploadLocationCol: e.target.value }))
                    }
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {uploadCols.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="meta-up-area">Area</InputLabel>
                  <Select
                    labelId="meta-up-area"
                    value={mappingState.uploadAreaCol}
                    label="Area"
                    onChange={(e) =>
                      setMappingState((s) => ({ ...s, uploadAreaCol: e.target.value }))
                    }
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {uploadCols.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider />

                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button
                    variant="contained"
                    onClick={() => processDeviceMerge(baseDf)}
                    disabled={!canProcessUpload}
                  >
                    Process
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </MappingBox>
      )}
    </>
  );
}
