import React, { useMemo } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import * as dfd from "danfojs";
import { exportAsXlsx, exportAsCsv } from "../export/utils/fileUtils";

/**
 * ExportFinalPage
 * Builds export-ready DataFrame with all required columns,
 * shows preview table, and provides CSV/XLSX export buttons.
 */
export default function ExportFinalPage({
  df, // enriched dataframe (after device metadata phase)
  suffixUsed = false,
}) {
  // --- Build export-ready dataframe ---
  const exportDf = useMemo(() => {
    if (!df || df.shape?.[0] === 0) return new dfd.DataFrame([]);

    const rows = df.values.map((_, i) => {
      const get = (col) =>
        df.columns.includes(col) ? df.at(i, col) ?? "" : "";

      const fieldVal = String(get("field"));
      const trueKeyKode = String(get("trueKeyKode"));
      const falseKeyKode = String(get("falseKeyKode"));
      const trueText = String(get("trueText"));
      const falseText = String(get("falseText"));
      const unitKode = String(get("unitKode"));
      const writable = String(get("writable"));
      const kodePointType = String(get("kode_point_type"));
      const suffix = suffixUsed && df.columns.includes("suffix") ? get("suffix") : "";
      const deviceName = String(get("deviceName"));
      const canonicalType = String(get("canonicalType"));
      const handle = String(get("handle"));
      const slotpath = String(get("SP"));
      const pointName = String(get("pointName"));
      const location = df.columns.includes("Location") ? get("Location") : "";

      const minVal = df.columns.includes("minVal") ? get("minVal") : "";
      const maxVal = df.columns.includes("maxVal") ? get("maxVal") : "";
      const precision = df.columns.includes("precision") ? get("precision") : "";
      const covTolerance = df.columns.includes("covTolerance") ? get("covTolerance") : "";

      const pointEnum =
        trueKeyKode && falseKeyKode ? `${trueKeyKode},${falseKeyKode}` : "";

      // Ontology write/read maps
      let writeMap = "";
      let readMap = "";
      if (trueKeyKode && falseKeyKode && trueText && falseText) {
        writeMap = JSON.stringify({
          [trueKeyKode]: trueText,
          [falseKeyKode]: falseText,
        });
        readMap = JSON.stringify([
          { k: trueText, v: trueKeyKode },
          { k: falseText, v: falseKeyKode },
        ]);
      }

      const ontologyField =
        fieldVal !== "!" && fieldVal.length > 0 ? fieldVal : "";
      const ontologyDisplayName = fieldVal === "!" ? pointName : "";

      return {
        "Device External ID": "Drivers1",
        "Device External Path": "slot:/Drivers",
        "Device Name": "Drivers",
        "Device Location": location,
        "Device Canonical Type": canonicalType,
        "Point External ID": handle,
        "Point External Path": slotpath,
        "Point Name": pointName,
        "Point Unit": df.columns.includes("units") ? get("units") : "",
        "Point Enum": pointEnum,
        "Point Writable": writable,
        "Point Kind": kodePointType,
        "Point Min Val": minVal,
        "Point Max Val": maxVal,
        "Point Ontology Suffix": suffix,
        "Point Ontology Prefix": "",
        "Point Ontology Field": ontologyField,
        "Point Ontology Display Name": ontologyDisplayName,
        "Point Ontology Precision": precision,
        "Point Ontology Default In Graph": "",
        "Point Ontology Unit": unitKode,
        "Point Ontology Cov Tolerance": covTolerance,
        "Point Ontology Write Map": writeMap,
        "Point Ontology Read Map Key Values": readMap,
        "Virtual Device Name": deviceName,
      };
    });

    return new dfd.DataFrame(rows);
  }, [df, suffixUsed]);

  // --- Export actions ---
  const handleExportCsv = () => {
    if (!exportDf || exportDf.shape?.[0] === 0) return;
    exportAsCsv(exportDf, "export_final.csv");
  };

  const handleExportXlsx = () => {
    if (!exportDf || exportDf.shape?.[0] === 0) return;
    exportAsXlsx(exportDf, "export_final.xlsx");
  };

  // --- Render ---
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Final Export</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" color="primary" onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button variant="contained" color="primary" onClick={handleExportXlsx}>
            Export XLSX
          </Button>
        </Box>
      </Box>

      {exportDf && exportDf.shape?.[0] > 0 ? (
        <Box sx={{ maxHeight: 500, overflow: "auto" }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Preview ({exportDf.shape[0]} rows)
          </Typography>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 13,
              border: "1px solid #ddd",
            }}
          >
            <thead>
              <tr>
                {exportDf.columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      borderBottom: "1px solid #ccc",
                      textAlign: "left",
                      padding: "4px 8px",
                      background: "#f9f9f9",
                      fontWeight: "600",
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportDf.head(10).values.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "4px 8px",
                      }}
                    >
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      ) : (
        <Typography color="text.secondary">
          No data available for export.
        </Typography>
      )}
    </Paper>
  );
}
