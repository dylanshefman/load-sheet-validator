import React, { useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Button,
  TextField,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

const keyOf = (t) => `${t.field ?? ""}||${t.trueText ?? ""}||${t.falseText ?? ""}`;

export default function EnumsMappingCard({
  uniqueTriples,          // [{ field, trueText, falseText }]
  enumsMap,               // { Field: { trueKey, falseKey } }
  mapping,                // { [key]: { trueKey, falseKey } }
  onChange,
  suggestEnumForTriple,   // (triple) => { trueKey, falseKey }
  showContinue = false,
  onContinue,
}) {
  const options = useMemo(() => {
    const set = new Set();
    Object.values(enumsMap).forEach(({ trueKey, falseKey }) => {
      if (trueKey) set.add(trueKey);
      if (falseKey) set.add(falseKey);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enumsMap]);

  // Seed suggestions once triples change
  useEffect(() => {
    const next = { ...mapping };
    uniqueTriples.forEach((t) => {
      const k = keyOf(t);
      if (!next[k]) next[k] = suggestEnumForTriple(t);
    });
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueTriples]);

  const changeTrue = (k, val) => {
    const next = { ...mapping };
    next[k] = next[k] || { trueKey: "", falseKey: "" };
    next[k].trueKey = val ?? "";
    onChange(next);
  };

  const changeFalse = (k, val) => {
    const next = { ...mapping };
    next[k] = next[k] || { trueKey: "", falseKey: "" };
    next[k].falseKey = val ?? "";
    onChange(next);
  };

  const canContinue = showContinue;

  return (
    <Card variant="outlined">
      <CardHeader title="Enums Mapping" subheader="Map (field, trueText, falseText) to keys" />
      <CardContent>
        <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} /> {/* gap with vertical divider */}
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell>Field</TableCell>
              <TableCell>trueText</TableCell>
              <TableCell>falseText</TableCell>
              <TableCell /> {/* gap header empty */}
              <TableCell>trueKey</TableCell>
              <TableCell>falseKey</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {uniqueTriples.map((t) => {
              const k = keyOf(t);
              const sel = mapping[k] || { trueKey: "", falseKey: "" };

              return (
                <TableRow key={k}>
                  <TableCell
                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={t.field || ""}
                  >
                    {t.field || ""}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={t.trueText || ""}
                  >
                    {t.trueText || ""}
                  </TableCell>

                  <TableCell
                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={t.falseText || ""}
                  >
                    {t.falseText || ""}
                  </TableCell>

                  {/* Gap with centered vertical divider */}
                  <TableCell sx={{ position: "relative", p: 0 }}>
                    <Box
                      aria-hidden
                      sx={{
                        position: "absolute",
                        top: 8,
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-0.5px)",
                        width: "1px",
                        backgroundColor: "divider",
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ minWidth: 0 }}>
                    <Autocomplete
                      disablePortal
                      size="small"
                      options={options}
                      value={sel.trueKey || null}
                      onChange={(_, newVal) => changeTrue(k, newVal)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="trueKey"
                          placeholder="Search…"
                          fullWidth
                        />
                      )}
                    />
                  </TableCell>

                  <TableCell sx={{ minWidth: 0 }}>
                    <Autocomplete
                      disablePortal
                      size="small"
                      options={options}
                      value={sel.falseKey || null}
                      onChange={(_, newVal) => changeFalse(k, newVal)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="falseKey"
                          placeholder="Search…"
                          fullWidth
                        />
                      )}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {showContinue && (
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!canContinue}
              onClick={onContinue}
            >
              Accept Enum Mapping and Continue
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
