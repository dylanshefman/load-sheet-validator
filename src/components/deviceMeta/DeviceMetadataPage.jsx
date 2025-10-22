import React from "react";
import * as dfd from "danfojs";
import { Box, Paper, Button, Typography } from "@mui/material";
import DeviceMetadataMappingPanel from "./DeviceMetadataMappingPanel";
import { useDeviceMergeLogic } from "./hooks/useDeviceMergeLogic";
import DeviceMatchPanel from "./DeviceMatchPanel";

/**
 * DeviceMetadataPage
 * - Lets user skip device metadata or map Mechanical Type / Location / Area
 * - Works with either initial data or uploaded CSV
 * - baseDf is the dataset produced by the prior phase that we augment here
 * - After Process, shows Matched/Unmatched panels (like facets page)
 * - Accept Mapping → onFinish() → Export Final
 */
export default function DeviceMetadataPage({
  baseDf, // expandedDf (preferred) or mergedDf/initialDf from previous step
  initialDf, // original initial dataset
  initialMapping, // mapping info (slotpath/deviceName/canonicalType/field)
  onBackToFacets, // optional back action
  onFinish, // invoked to proceed to Export Final
}) {
  const {
    mappingState,
    setMappingState,
    handleUpload,
    processDeviceMerge,
    mergedDf: deviceDf, // result of left-join
    metadataDeviceNames,
  } = useDeviceMergeLogic(initialDf, initialMapping, baseDf);

  const initialCols = initialDf.columns;

  // -------- Helpers to robustly find the 3 metadata columns in deviceDf --------
  const findCol = (cols, candidates) => {
    // normalize: lowercase, remove spaces/underscores
    const norm = (s) =>
      typeof s === "string" ? s.toLowerCase().replace(/[\s_]+/g, "") : "";
    const set = new Map(cols.map((c) => [norm(c), c]));
    for (const cand of candidates) {
      const hit = set.get(norm(cand));
      if (hit) return hit;
    }
    return null;
  };

  const deviceCols = deviceDf?.columns ?? [];
  const slotpathCol = "SP"; // produced by the merge hook (left side standardization)
  const deviceNameCol = initialMapping?.deviceName || "deviceName";
  const canonicalTypeCol = initialMapping?.canonicalType || "canonicalType";
  const fieldCol = initialMapping?.field || "field";

  // Try to resolve metadata columns by common labels (case/format agnostic)
  const mechCol = findCol(deviceCols, [
    "Mechanical Type",
    "Mechanical_Type",
    "MECHANICAL_TYPE",
    "mechanicalType",
    "mechanical type",
    "mechanical",
  ]);
  const locCol = findCol(deviceCols, ["Location", "location", "LOC"]);
  const areaCol = findCol(deviceCols, ["Area", "area", "AREA"]);

  // -------- Device-wise aggregation --------
  const matchedDevices = [];
  const missingDevices = [];

  if (deviceDf && deviceDf.shape?.[0] > 0) {
    const deviceNameCol = initialMapping?.deviceName || "deviceName";
    const canonicalTypeCol = initialMapping?.canonicalType || "canonicalType";
    const mech = mechCol;
    const loc = locCol;
    const area = areaCol;

    const seenDevices = new Map();

    for (let i = 0; i < deviceDf.shape[0]; i++) {
      const devName = String(deviceDf.at(i, deviceNameCol) ?? "").trim();
      const canon = String(deviceDf.at(i, canonicalTypeCol) ?? "").trim();
      if (!devName) continue;

      const mt = mech ? String(deviceDf.at(i, mech) ?? "").trim() : "";
      const lc = loc ? String(deviceDf.at(i, loc) ?? "").trim() : "";
      const ar = area ? String(deviceDf.at(i, area) ?? "").trim() : "";

      if (!seenDevices.has(devName)) {
        seenDevices.set(devName, {
          deviceName: devName,
          canonicalType: canon,
          metadata: { "Mechanical Type": mt, Location: lc, Area: ar },
        });
      }
    }

    for (const dev of seenDevices.values()) {
      if (metadataDeviceNames?.has(dev.deviceName)) matchedDevices.push(dev);
      else missingDevices.push(dev);
    }
  }

  const showPanels = deviceDf && deviceDf.shape?.[0] > 0;

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5">Device Metadata</Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          {onBackToFacets && (
            <Button variant="text" onClick={onBackToFacets}>
              Back to Facet Mappings
            </Button>
          )}
          <Button
            variant="text"
            color="primary"
            onClick={onFinish}
            sx={{ textTransform: "none" }}
          >
            Skip Device Metadata
          </Button>
        </Box>
      </Box>

      {/* Mapping/processing panel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <DeviceMetadataMappingPanel
          initialCols={initialCols}
          mappingState={mappingState}
          setMappingState={setMappingState}
          processDeviceMerge={processDeviceMerge}
          handleUpload={handleUpload}
          baseDf={baseDf}
        />
      </Paper>

      {/* Matched / Unmatched panels appear only after Process */}
      {showPanels && (
        <>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <DeviceMatchPanel
              title="Matched metadata"
              rows={matchedDevices}
              color="green"
              metadataCols={[mechCol, locCol, areaCol].filter(Boolean)}
              enableFilters
            />
            <DeviceMatchPanel
              title="Devices missing in metadata upload"
              rows={missingDevices}
              color="red"
              metadataCols={[mechCol, locCol, areaCol].filter(Boolean)}
            />
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => onFinish(deviceDf)}
            >
              Accept Mapping and Proceed to Export
            </Button>
          </Box>
        </>
      )}
    </>
  );
}
