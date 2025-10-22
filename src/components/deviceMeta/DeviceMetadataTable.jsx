import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Typography,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Fullscreen, FullscreenExit } from "@mui/icons-material";

/**
 * DeviceMetadataTable
 * - Shows a trimmed preview of the device metadata result.
 * - Non-fullscreen: always 10 rows
 * - Fullscreen: start at 100 rows, allow +1000 or View All
 */
export default function DeviceMetadataTable({
  df,
  initialMapping = {},
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [fsLimit, setFsLimit] = useState(100);

  const cols = useMemo(() => df?.columns ?? [], [df]);
  const rowCount = useMemo(() => df?.shape?.[0] ?? 0, [df]);

  // Resolve desired columns with graceful fallbacks
  const slotCol =
    (initialMapping.slotpath && cols.includes(initialMapping.slotpath)
      ? initialMapping.slotpath
      : (cols.includes("slotpath") ? "slotpath" : (cols.includes("SP") ? "SP" : null)));

  const deviceCol =
    (initialMapping.deviceName && cols.includes(initialMapping.deviceName)
      ? initialMapping.deviceName
      : (cols.includes("device") ? "device" : null));

  const canonicalTypeCol =
    (initialMapping.canonicalType && cols.includes(initialMapping.canonicalType)
      ? initialMapping.canonicalType
      : (cols.includes("canonicalType") ? "canonicalType" : null));

  const fieldCol =
    (initialMapping.field && cols.includes(initialMapping.field)
      ? initialMapping.field
      : (cols.includes("field") ? "field" : null));

  // Metadata columns (produced by metadata merge)
  const metaCols = ["Mechanical Type", "Location", "Area"].filter((c) =>
    cols.includes(c)
  );

  // Final column order
  const displayColumns = [
    slotCol,
    deviceCol,
    canonicalTypeCol,
    fieldCol,
    ...metaCols,
  ].filter(Boolean);

  const values = useMemo(() => df?.values ?? [], [df]);

  // Row slices
  const nonFsRows = useMemo(() => values.slice(0, 10), [values]);
  const fsRows = useMemo(
    () => (fsLimit >= 0 ? values.slice(0, Math.min(fsLimit, rowCount)) : values),
    [values, fsLimit, rowCount]
  );

  const Header = ({ isFullscreen = false }) => (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing {isFullscreen ? (fsLimit < 0 ? rowCount : Math.min(fsLimit, rowCount)) : 10} of {rowCount} rows
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {isFullscreen ? (
          <>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setFsLimit((n) => (n < 0 ? rowCount : Math.min(n + 1000, rowCount)))}
              disabled={fsLimit < 0 || Math.min(fsLimit, rowCount) >= rowCount}
            >
              +1000
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setFsLimit(-1)} // -1 means "all"
              disabled={fsLimit < 0}
            >
              View all rows
            </Button>
            <Tooltip title="Exit Fullscreen">
              <IconButton onClick={() => setFullscreen(false)}>
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Tooltip title="Fullscreen View">
            <IconButton onClick={() => { setFullscreen(true); setFsLimit(100); }}>
              <Fullscreen />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  const TableMarkup = ({ rows }) => (
    <Table
      size="small"
      sx={{ tableLayout: "auto", width: "max-content", borderCollapse: "collapse" }}
    >
      <TableHead>
        <TableRow>
          {displayColumns.map((c) => (
            <TableCell
              key={c}
              sx={{
                fontWeight: "bold",
                backgroundColor: "#f9f9f9",
                borderBottom: "2px solid #aaa",
                borderRight: "1px solid #ddd",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {rows.map((r, idx) => (
          <TableRow key={`dm-${idx}`}>
            {displayColumns.map((c) => {
              const colIdx = cols.indexOf(c);
              const val = colIdx >= 0 ? r[colIdx] : "";
              return (
                <TableCell
                  key={`${idx}-${c}`}
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #f0f0f0",
                    maxWidth: 360,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {String(val ?? "")}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (!df || rowCount === 0) return null;

  return (
    <>
      {/* Non-fullscreen preview */}
      <Paper
        variant="outlined"
        sx={{ p: 0, overflowX: "auto", borderColor: "#ccc", maxWidth: "100%" }}
      >
        <Header />
        <TableContainer sx={{ display: "block", overflowX: "auto" }}>
          <TableMarkup rows={nonFsRows} />
        </TableContainer>
      </Paper>

      {/* Fullscreen dialog */}
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        fullScreen
        PaperProps={{ sx: { backgroundColor: "#fafafa" } }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Header isFullscreen />
          <Box sx={{ px: 2, py: 1, overflowX: "auto" }}>
            <TableMarkup rows={fsRows} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
