import React, { useState, useEffect } from "react";
import { Box, Paper, Button } from "@mui/material";
import Papa from "papaparse";
import { useMergeLogic } from "./hooks/useMergeLogic";
import { useFacetsProcessor } from "./hooks/useFacetsProcessor.jsx";
import ExportHeader from "./ExportHeader";
import ExportMappingPanel from "./ExportMappingPanel";
import ExportTable from "./ExportTable";
import UnitsMappingCard from "./UnitsMappingCard";
import EnumsMappingCard from "./EnumsMappingCard";
import FacetNamesMappingCard from "./FacetNamesMappingCard";

export default function ExportPage({
  initialDf,
  onBack,
  initialMapping = {},
  onProceedToDeviceMeta, // <- NEW optional prop
}) {
  const [includeMappings, setIncludeMappings] = useState(true);

  // Units (by category) and enums map
  const [units, setUnits] = useState({});
  const [enums, setEnums] = useState({});

  useEffect(() => {
    // Load units.csv → category -> array of unit IDs
    try {
      Papa.parse("/units.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          const categoryMap = {};
          rows.forEach((r) => {
            const id = r.ID ?? r.Id ?? r.id;
            const category = r.Category ?? r.category ?? "Uncategorized";
            if (!id) return;
            if (!categoryMap[category]) categoryMap[category] = [];
            categoryMap[category].push(id);
          });
          Object.keys(categoryMap).forEach((k) => categoryMap[k].sort());
          setUnits(categoryMap);
        },
        error: () => setUnits({}),
      });
    } catch {
      setUnits({});
    }

    // Load enums.csv → { Field: { trueKey, falseKey } }
    try {
      Papa.parse("/enums.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          const map = {};
          rows.forEach((r) => {
            const field = r.Field ?? r.field;
            if (!field) return;
            const trueKey =
              r["Required Enum TRUE"] ??
              r["Required Enum True"] ??
              r["Required_Enum_TRUE"] ??
              "";
            const falseKey =
              r["Required Enum FALSE"] ??
              r["Required Enum False"] ??
              r["Required_Enum_FALSE"] ??
              "";
            map[field] = { trueKey, falseKey };
          });
          setEnums(map);
        },
        error: () => setEnums({}),
      });
    } catch {
      setEnums({});
    }
  }, []);

  // Merge phase (slotpath join, etc.)
  const {
    mergedDf,
    matchedRows,
    missingRows,
    acceptDisabled,
    processToMerged,
    setAcceptDisabled,
    handleUpload,
    mappingState,
    setMappingState,
  } = useMergeLogic(initialDf, initialMapping);

  // Facets + mapping workflow with progressive steps
  const {
    // step control: 0=hidden, 1=units, 2=enums, 3=facet-name mapping
    mappingStep,
    beginUnitsPhase,
    beginEnumsPhase,
    beginFacetNamesPhase,
    finalizeWithMappings,

    // extracted unique inputs
    uniqueUnitsFromFacets,
    uniqueEnumTriples,
    uniqueOtherFacetNames,

    // mapping state
    unitMapping,
    setUnitMapping,
    enumMapping,
    setEnumMapping,
    facetNameMapping,
    setFacetNameMapping,

    // helpers/options
    suggestEnumForTriple,

    // final table
    expandedDf,
    facetColumns,
    facetMappedKodeByColumn,
  } = useFacetsProcessor(mergedDf, units, enums, initialMapping);

  const exportInitialAsXlsx = () => {
    import("./utils/fileUtils").then(({ exportAsXlsx }) =>
      exportAsXlsx(initialDf, "export.xlsx")
    );
  };

  return (
    <>
      <ExportHeader
        includeMappings={includeMappings}
        setIncludeMappings={setIncludeMappings}
        exportInitialAsXlsx={exportInitialAsXlsx}
      />

      {includeMappings && (
        <>
          {/* Source/config panel always visible */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <ExportMappingPanel
              mappingState={mappingState}
              setMappingState={setMappingState}
              processToMerged={processToMerged}
              setAcceptDisabled={setAcceptDisabled}
              handleUpload={handleUpload}
              mergedDf={mergedDf}
              initialMapping={initialMapping}
              matchedRows={matchedRows}
              missingRows={missingRows}
              acceptDisabled={acceptDisabled}
              onProceedToMappings={beginUnitsPhase} // start progressive mapping at Units
            />
          </Paper>

          {/* Progressive mapping cards stacked vertically */}
          {mappingStep >= 1 && (
            <Box sx={{ mb: 2 }}>
              <UnitsMappingCard
                uniqueUnits={uniqueUnitsFromFacets}
                unitsByCategory={units}
                mapping={unitMapping}
                onChange={setUnitMapping}
                showContinue
                onContinue={beginEnumsPhase} // reveal enums next
              />
            </Box>
          )}

          {mappingStep >= 2 && (
            <Box sx={{ mb: 2 }}>
              <EnumsMappingCard
                uniqueTriples={uniqueEnumTriples}
                enumsMap={enums}
                mapping={enumMapping}
                onChange={setEnumMapping}
                suggestEnumForTriple={suggestEnumForTriple}
                showContinue
                onContinue={beginFacetNamesPhase} // reveal facet-name mapping next
              />
            </Box>
          )}

          {mappingStep >= 3 && (
            <Box sx={{ mb: 2 }}>
              <FacetNamesMappingCard
                facetNames={uniqueOtherFacetNames}
                mapping={facetNameMapping}
                onChange={setFacetNameMapping}
                showContinue
                onContinue={finalizeWithMappings} // build table after facet-name mapping
              />
            </Box>
          )}

          {/* Table appears after finalizing mappings */}
          {expandedDf && expandedDf.shape?.[0] > 0 && (
            <>
              <ExportTable
                expandedDf={expandedDf}
                facetColumns={facetColumns}
                initialMapping={initialMapping}
                mappedFacetHeaders={facetMappedKodeByColumn}
              />

              {/* Proceed to Device Metadata */}
              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => {
                    if (onProceedToDeviceMeta) {
                      onProceedToDeviceMeta(expandedDf);
                    } else {
                      // Fallback if not wired yet
                      console.warn(
                        "[ExportPage] onProceedToDeviceMeta prop not provided."
                      );
                    }
                  }}
                >
                  Proceed to Device Metadata
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </>
  );
}
