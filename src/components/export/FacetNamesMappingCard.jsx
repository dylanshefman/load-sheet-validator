import React from "react";
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
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

const KODE_FACET_OPTIONS = ["-", "minVal", "maxVal", "precision", "covTolerance"];

export default function FacetNamesMappingCard({
  facetNames = [],                 // array of strings (uploaded facet names excluding units/trueText/falseText)
  mapping = {},                    // { [facetName]: '-' | 'minVal' | 'maxVal' | 'precision' | 'covTolerance' }
  onChange,
  showContinue = true,
  onContinue,
}) {
  const handleChange = (name, value) => {
    const next = { ...mapping, [name]: value ?? "-" };
    onChange?.(next);
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title="Facet Names Mapping"
        subheader="Map remaining facet names to KODE facets (one-to-one). Use “–” to skip."
      />
      <CardContent>
        {facetNames.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No additional facet names were found to map. You can continue.
          </Typography>
        ) : (
          <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "60%" }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>Uploaded Facet Name</TableCell>
                <TableCell>KODE Facet</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {facetNames.map((name) => {
                const val = mapping[name] ?? "-";
                return (
                  <TableRow key={name}>
                    <TableCell
                      sx={{
                        overflowWrap: "anywhere",
                        whiteSpace: "normal",
                        verticalAlign: "top",
                      }}
                    >
                      {name}
                    </TableCell>
                    <TableCell sx={{ minWidth: 0 }}>
                      <Autocomplete
                        disablePortal
                        size="small"
                        options={KODE_FACET_OPTIONS}
                        value={val}
                        onChange={(_, newVal) => handleChange(name, newVal)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="KODE facet"
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
        )}

        {showContinue && (
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onContinue}
            >
              Accept Facet Name Mapping and Continue
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
