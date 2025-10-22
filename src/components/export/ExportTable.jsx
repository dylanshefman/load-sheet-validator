import React, { useMemo, useState } from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Tooltip,
  Box,
  IconButton,
  Button,
  Dialog,
  DialogContent,
} from "@mui/material";
import { Fullscreen, FullscreenExit } from "@mui/icons-material";

/**
 * ExportTable
 *
 * Shows columns in this exact order:
 *   1) slotpath
 *   2) device name
 *   3) field
 *   4) FACETS (source)
 *   5) all columns derived from facets (lighter)
 *   6) OUT (source)
 *   7) writable (derived from OUT; lighter)
 *
 * Adds a banded header row:
 *   - “Derived from facets” spanning all facet-derived columns
 *   - “Derived from out” above writable
 *
 * Coloring:
 *   - FACETS “source” is facetsColor; derived-from-facets columns are a lighter facetsColor
 *   - OUT “source” is outColor; writable is a lighter outColor
 *   - If a facet-derived column is mapped to a KODE facet, bold header + tooltip “Mapped to <kodeFacet>”
 *
 * Fullscreen:
 *   - Normal view: first 10 rows
 *   - Fullscreen: starts at 1000 rows, with “+1000” and “View all”
 */

const facetsColor = "#1565c0";                 // source (FACETS)
const facetsLight = "rgba(21, 101, 192, 0.08)"; // derived
const outColor = "#2e7d32";                    // source (OUT)
const outLight = "rgba(46, 125, 50, 0.10)";     // derived

// "Derived from out" single-line handling
const WRITABLE_MIN_CH = 16;

function resolveSlotCol(expandedDf, initialMapping) {
  const slotMapping = initialMapping?.slotpath || "slotpath";
  const cols = expandedDf?.columns || [];
  if (cols.includes(slotMapping)) return slotMapping;
  if (cols.includes("slotpath")) return "slotpath";
  if (cols.includes("SP")) return "SP";
  return null;
}

function present(cols, df) {
  const set = new Set(df?.columns || []);
  return cols.filter((c) => set.has(c));
}

function HeaderBands({
  orderedCols,
  facetDerivedAll,
  writableIdx,
  facetsLabel = "Derived from facets",
  outLabel = "Derived from out",
}) {
  const facetDerivedCount = facetDerivedAll.length;
  const facetStartIdx =
    facetDerivedCount > 0
      ? orderedCols.findIndex((c) => c === facetDerivedAll[0])
      : -1;
  const facetEndIdx =
    facetStartIdx >= 0 ? facetStartIdx + facetDerivedCount - 1 : -1;

  return (
    <TableRow>
      {orderedCols.map((c, i) => {
        // If current column is inside the facets band but not at its start, SKIP it
        if (facetStartIdx >= 0 && i > facetStartIdx && i <= facetEndIdx) {
          return null; // covered by the colSpan cell rendered at facetStartIdx
        }

        // Render the facets band at the start index
        if (facetStartIdx >= 0 && i === facetStartIdx) {
          return (
            <TableCell
              key="band-facets"
              align="center"
              colSpan={facetDerivedCount}
              sx={{
                borderBottom: "none",
                backgroundColor: facetsLight,
                color: "#000",
                fontWeight: 700,
                p: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {facetsLabel}
              </Typography>
            </TableCell>
          );
        }

        // Render the "Derived from out" band exactly at writableIdx
        if (writableIdx >= 0 && i === writableIdx) {
          return (
            <TableCell
              key="band-out"
              align="center"
              colSpan={1}
              sx={{
                borderBottom: "none",
                backgroundColor: outLight,
                color: "#000",
                fontWeight: 700,
                p: 0.5,
                whiteSpace: "nowrap",
                minWidth: `${WRITABLE_MIN_CH}ch`,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
              >
                {outLabel}
              </Typography>
            </TableCell>
          );
        }

        // For all other columns (not part of a band), render an empty placeholder
        return (
          <TableCell
            key={`band-empty-${i}-${c}`}
            sx={{
              borderBottom: "none",
              p: 0,
              backgroundColor: "transparent",
            }}
          />
        );
      })}
    </TableRow>
  );
}

export default function ExportTable({
  expandedDf,
  facetColumns,
  initialMapping = {},
  mappedFacetHeaders = {}, // { columnName: 'minVal' | 'maxVal' | 'precision' | 'covTolerance' }
}) {
  if (!expandedDf || expandedDf.shape?.[0] === 0) return null;

  const cols = expandedDf.columns;

  const slotCol = resolveSlotCol(expandedDf, initialMapping);
  const deviceCol = initialMapping?.deviceName || "device";
  const fieldCol = initialMapping?.field || "field";

  const facetsCol = "FACETS";
  const outCol = "OUT";
  const writableCol = "writable";

  // facet-derived: everything in facetColumns except "writable" and source "FACETS"
  const facetDerivedAll = useMemo(() => {
    const set = new Set(facetColumns || []);
    set.delete(writableCol);
    set.delete(facetsCol);
    return present(Array.from(set).sort((a, b) => a.localeCompare(b)), expandedDf);
  }, [facetColumns, expandedDf]);

  // Build final ordered column list
  const orderedCols = useMemo(() => {
    const order = [];
    if (slotCol) order.push(slotCol);
    if (cols.includes(deviceCol)) order.push(deviceCol);
    if (cols.includes(fieldCol)) order.push(fieldCol);
    if (cols.includes(facetsCol)) order.push(facetsCol);
    order.push(...facetDerivedAll);
    if (cols.includes(outCol)) order.push(outCol);
    if (cols.includes(writableCol)) order.push(writableCol);
    return order;
  }, [cols, slotCol, deviceCol, fieldCol, facetDerivedAll]);

  const writableIdx = orderedCols.indexOf(writableCol);

  // Styling helpers
  const isFacetSource = (c) => c === facetsCol;
  const isFacetDerived = (c) => facetDerivedAll.includes(c);
  const isOutSource = (c) => c === outCol;
  const isOutDerived = (c) => c === writableCol;

  const headerCellSxBase = (c) => {
    if (isFacetSource(c)) {
      return {
        backgroundColor: facetsColor,
        color: "#fff",
        fontWeight: 600,
      };
    }
    if (isFacetDerived(c)) {
      return {
        backgroundColor: facetsLight,
        color: "inherit",
        fontWeight: 600,
      };
    }
    if (isOutSource(c)) {
      return {
        backgroundColor: outColor,
        color: "#fff",
        fontWeight: 600,
      };
    }
    if (isOutDerived(c)) {
      return {
        backgroundColor: outLight,
        color: "inherit",
        fontWeight: 600,
      };
    }
    return {
      backgroundColor: "#f7f7f7",
      color: "inherit",
      fontWeight: 600,
    };
  };

  const bodyCellSx = (c) => {
    if (isFacetSource(c)) return { backgroundColor: "rgba(21,101,192,0.06)" };
    if (isFacetDerived(c)) return { backgroundColor: facetsLight };
    if (isOutSource(c)) return { backgroundColor: "rgba(46,125,50,0.06)" };
    if (isOutDerived(c)) return { backgroundColor: outLight };
    return {};
  };

  // ---------- Fullscreen + row limiting ----------
  const [fullscreen, setFullscreen] = useState(false);
  const [rowsToShow, setRowsToShow] = useState(10); // normal mode: 10
  const totalRows = expandedDf.shape[0];

  const visibleRows = useMemo(() => {
    const limit = fullscreen ? rowsToShow : 10;
    return expandedDf.values.slice(0, Math.min(limit, totalRows));
  }, [expandedDf.values, totalRows, fullscreen, rowsToShow]);

  const enterFullscreen = () => {
    setFullscreen(true);
    setRowsToShow(1000); // start at 1000 in fullscreen
  };
  const exitFullscreen = () => {
    setFullscreen(false);
    setRowsToShow(10);
  };
  const addThousand = () => {
    setRowsToShow((n) => Math.min(n + 1000, totalRows));
  };
  const viewAll = () => setRowsToShow(totalRows);

  const FullscreenControls = ({ isFullscreen }) => (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        backgroundColor: "#fff",
        borderBottom: "1px solid #e0e0e0",
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        justifyContent: "space-between",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {isFullscreen ? (
          <>
            Showing <strong>{visibleRows.length}</strong> of{" "}
            <strong>{totalRows}</strong> rows
          </>
        ) : (
          <>
            Showing first <strong>10</strong> rows of{" "}
            <strong>{totalRows}</strong>. Use fullscreen to see more.
          </>
        )}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {isFullscreen ? (
          <>
            <Button variant="outlined" size="small" onClick={addThousand} disabled={visibleRows.length >= totalRows}>
              +1000
            </Button>
            <Button variant="outlined" size="small" onClick={viewAll} disabled={visibleRows.length >= totalRows}>
              View all rows
            </Button>
            <IconButton
              aria-label="Exit Fullscreen"
              onClick={exitFullscreen}
              sx={{
                backgroundColor: "#f5f5f5",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.06)" },
              }}
            >
              <FullscreenExit />
            </IconButton>
          </>
        ) : (
          <IconButton
            aria-label="Fullscreen"
            onClick={enterFullscreen}
            sx={{
              backgroundColor: "#f5f5f5",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.06)" },
            }}
          >
            <Fullscreen />
          </IconButton>
        )}
      </Box>
    </Box>
  );

  const HeaderRow = () => (
    <>
      <HeaderBands
        orderedCols={orderedCols}
        facetDerivedAll={facetDerivedAll}
        writableIdx={writableIdx}
      />

      {/* Column header row */}
      <TableRow>
        {orderedCols.map((c) => {
          const baseSx = headerCellSxBase(c);
          const mappedKode = mappedFacetHeaders[c]; // if present, bold + tooltip
          const content = (() => {
            if (c === slotCol) return "slotpath";
            if (c === deviceCol) return "device name";
            if (c === fieldCol) return "field";
            if (c === "FACETS") return "facets";
            if (c === "OUT") return "out";
            if (c === "writable") return "writable";
            return c;
          })();

          const cellEl = (
            <TableCell
              key={`hdr-${c}`}
              sx={{
                ...baseSx,
                whiteSpace: "nowrap",
                ...(c === "writable" ? { minWidth: `${WRITABLE_MIN_CH}ch` } : null),
                ...(mappedKode ? { fontWeight: 800 } : null),
              }}
              title={mappedKode ? `Mapped to ${mappedKode}` : undefined}
            >
              {content}
            </TableCell>
          );

          // Prefer Tooltip for better UX (but keep title for copy fallbacks)
          if (mappedKode) {
            return (
              <Tooltip key={`hdr-tip-${c}`} title={`Mapped to ${mappedKode}`} arrow>
                {cellEl}
              </Tooltip>
            );
          }
          return cellEl;
        })}
      </TableRow>
    </>
  );

  const TableCore = ({ maxHeight }) => (
    <TableContainer
      sx={{
        width: "100%",
        overflowX: "auto",
        ...(maxHeight ? { maxHeight, overflowY: "auto" } : null),
      }}
    >
      <Table size="small" sx={{ tableLayout: "auto", minWidth: 960 }}>
        <TableHead>
          <HeaderRow />
        </TableHead>

        <TableBody>
          {visibleRows.map((row, rIdx) => (
            <TableRow key={`r-${rIdx}`}>
              {orderedCols.map((c, cIdx) => {
                const colIndex = cols.indexOf(c);
                const v = colIndex >= 0 ? row[colIndex] : "";
                return (
                  <TableCell
                    key={`c-${rIdx}-${cIdx}-${c}`}
                    sx={{
                      ...bodyCellSx(c),
                      verticalAlign: "top",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {String(v ?? "")}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
      {/* Top controls (sticky) */}
      <FullscreenControls isFullscreen={false} />

      {/* Normal (non-fullscreen) table: fixed to 10 rows */}
      <TableCore />

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onClose={exitFullscreen} fullScreen PaperProps={{ sx: { backgroundColor: "#fafafa" } }}>
        <DialogContent sx={{ p: 0 }}>
          <FullscreenControls isFullscreen />
          {/* Give the fullscreen table a tall maxHeight to keep headers visible and scroll the body */}
          <TableCore maxHeight="80vh" />
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
