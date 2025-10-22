import React from "react";
import { Box, Button, Typography } from "@mui/material";

export default function ExportHeader({
  onSkipFacetMappings, // NEW
}) {
  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="h5">Facet Mapping</Typography>

      <Button
        variant="text"
        color="primary"
        onClick={onSkipFacetMappings}
        sx={{ textTransform: "none" }}
      >
        Skip Facet Mappings
      </Button>
    </Box>
  );
}
