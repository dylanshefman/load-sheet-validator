import { useMemo, useState } from "react";
import * as dfd from "danfojs";

const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
const tripleKey = ({ field, trueText, falseText }) =>
  `${field ?? ""}||${trueText ?? ""}||${falseText ?? ""}`;

const EXCLUDED_FACET_NAMES = new Set(["units", "truetext", "falsetext"]);
export const KODE_FACET_OPTIONS = ["-", "minVal", "maxVal", "precision", "covTolerance"];

/**
 * Facet processing + progressive mapping hook
 *
 * mappingStep:
 *   0 = none
 *   1 = units
 *   2 = enums
 *   3 = facet name mapping (other facets -> KODE facets)
 * Finalize to produce table.
 */
export function useFacetsProcessor(
  mergedDf,
  unitsByCategory = {},
  enums = {},
  initialMapping = {}
) {
  // progressive step
  const [mappingStep, setMappingStep] = useState(0);

  // extracted for mapping
  const [uniqueUnitsFromFacets, setUniqueUnitsFromFacets] = useState([]);
  const [uniqueEnumTriples, setUniqueEnumTriples] = useState([]);
  const [uniqueOtherFacetNames, setUniqueOtherFacetNames] = useState([]); // NEW

  // user selections
  const [unitMapping, setUnitMapping] = useState({}); // { inputUnit: { category, unitId } }
  const [enumMapping, setEnumMapping] = useState({}); // { key: { trueKey, falseKey } }
  const [facetNameMapping, setFacetNameMapping] = useState({}); // { facetName: '-' | 'minVal' | ... }

  // final output
  const [expandedDf, setExpandedDf] = useState(null);
  const [facetColumns, setFacetColumns] = useState(
    new Set(["unitKode", "trueKeyKode", "falseKeyKode", "writable"])
  );

  // mapped labels per derived facet column for tooltip/bold in table
  const [facetMappedKodeByColumn, setFacetMappedKodeByColumn] = useState({}); // { columnName: 'minVal' | ... }

  // Resolve column names from initialMapping (with safe fallbacks)
  const fieldCol = initialMapping?.field || "field";
  const facetsCol = initialMapping?.facets || "FACETS";

  // All enum values as options for the Autocomplete in Enums card
  const enumOptionValues = useMemo(() => {
    const vals = new Set();
    Object.values(enums).forEach(({ trueKey, falseKey }) => {
      if (trueKey) vals.add(trueKey);
      if (falseKey) vals.add(falseKey);
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b));
  }, [enums]);

  const suggestEnumForTriple = (triple) => {
    const tnorm = {
      field: norm(triple.field),
      trueText: norm(triple.trueText),
      falseText: norm(triple.falseText),
    };

    // 1) direct lookup by field
    const direct = enums[triple.field];
    if (direct) return { trueKey: direct.trueKey ?? "", falseKey: direct.falseKey ?? "" };

    // 2) fuzzy fallback across all enum entries
    const entry = Object.entries(enums).find(([_, v]) => {
      const tk = norm(v.trueKey);
      const fk = norm(v.falseKey);
      return (
        (tnorm.trueText && (tk === tnorm.trueText || tk.includes(tnorm.trueText))) ||
        (tnorm.falseText && (fk === tnorm.falseText || fk.includes(tnorm.falseText)))
      );
    });
    if (entry) {
      const [, v] = entry;
      return { trueKey: v.trueKey ?? "", falseKey: v.falseKey ?? "" };
    }
    return { trueKey: "", falseKey: "" };
  };

  const parseFacetsObject = (facetsStr) => {
    const obj = {};
    const raw = String(facetsStr ?? "");
    const tokens = raw
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("="));
    for (const token of tokens) {
      const idx = token.indexOf("=");
      if (idx === -1) continue;
      const name = token.slice(0, idx).trim();
      let val = token.slice(idx + 1).trim();
      // strip single-letter prefix like "A:" or "b:"
      val = val.replace(/^[A-Za-z]:/, "").trim();
      if (!name) continue;
      obj[name] = val;
    }
    return obj;
  };

  // Step 1: show Units
  const beginUnitsPhase = () => {
    if (!mergedDf || mergedDf.shape?.[0] === 0) return;

    const rows = dfd.toJSON(mergedDf, { format: "column" });
    const unitsSet = new Set();
    const triplesSet = new Map();
    const otherFacetNames = new Set();

    rows.forEach((row) => {
      const facets = parseFacetsObject(row[facetsCol]);

      // collect unique units from 'units' facet
      const u = facets.units;
      if (u) unitsSet.add(u);

      // collect unique triples by (field, trueText, falseText)
      const fieldVal = row[fieldCol] ?? "";
      const trueText = facets.trueText ?? "";
      const falseText = facets.falseText ?? "";
      if (fieldVal && trueText && falseText && fieldVal !== "!") {
        const t = { field: fieldVal, trueText, falseText };
        triplesSet.set(tripleKey(t), t);
      }

      // collect other facet names (exclude units/trueText/falseText)
      Object.keys(facets).forEach((k) => {
        if (!EXCLUDED_FACET_NAMES.has(k.trim().toLowerCase())) {
          otherFacetNames.add(k);
        }
      });
    });

    const unitList = Array.from(unitsSet).sort((a, b) => a.localeCompare(b));
    const tripleList = Array.from(triplesSet.values()).sort((a, b) =>
      tripleKey(a).localeCompare(tripleKey(b))
    );
    const otherFacetsList = Array.from(otherFacetNames).sort((a, b) =>
      a.localeCompare(b)
    );

    const unitMapInit = {};
    unitList.forEach((u) => (unitMapInit[u] = { category: "", unitId: "" }));

    const enumMapInit = {};
    tripleList.forEach((t) => {
      enumMapInit[tripleKey(t)] = suggestEnumForTriple(t);
    });

    const facetNameMapInit = {};
    otherFacetsList.forEach((name) => {
      facetNameMapInit[name] = "-"; // default to no mapping
    });

    setUniqueUnitsFromFacets(unitList);
    setUniqueEnumTriples(tripleList);
    setUniqueOtherFacetNames(otherFacetsList);
    setUnitMapping(unitMapInit);
    setEnumMapping(enumMapInit);
    setFacetNameMapping(facetNameMapInit);
    setMappingStep(1);
  };

  // Step 2: reveal Enums (keep Units visible)
  const beginEnumsPhase = () => {
    if (mappingStep < 1) return;
    setMappingStep(2);
  };

  // Step 3: reveal facet-name mapping (keep previous visible)
  const beginFacetNamesPhase = () => {
    if (mappingStep < 2) return;
    setMappingStep(3);
  };

  // Finalize and build table
  const finalizeWithMappings = () => {
    if (!mergedDf || mergedDf.shape?.[0] === 0) return;

    const rows = dfd.toJSON(mergedDf, { format: "column" });
    const expandedRows = [];
    const newFacetCols = new Set(["unitKode", "trueKeyKode", "falseKeyKode", "writable"]);
    const mappedDecorations = {}; // { columnName: 'minVal' | ... }

    rows.forEach((row) => {
      const newRow = { ...row };
      const facets = parseFacetsObject(row[facetsCol]);

      // materialize facets as columns
      Object.entries(facets).forEach(([k, v]) => {
        newRow[k] = v;
        newFacetCols.add(k);
      });

      // unit mapping (only if 'units' facet exists)
      const inUnit = facets.units;
      if (inUnit && unitMapping[inUnit]) {
        const sel = unitMapping[inUnit];
        if (sel.category === "-") {
          newRow.unitKode = "-";
        } else if (sel.category && sel.unitId) {
          newRow.unitKode = sel.unitId;
        } else {
          newRow.unitKode = "";
        }
      } else {
        newRow.unitKode = "";
      }

      // enum mapping
      const fieldVal = newRow[fieldCol] ?? "";
      const trueText = facets.trueText ?? "";
      const falseText = facets.falseText ?? "";
      const key = tripleKey({ field: fieldVal, trueText, falseText });
      const sel = enumMapping[key];
      newRow.trueKeyKode = sel?.trueKey ?? "";
      newRow.falseKeyKode = sel?.falseKey ?? "";

      expandedRows.push(newRow);
    });

    // Build mappedDecorations from facetNameMapping (only where != '-')
    Object.entries(facetNameMapping).forEach(([facetName, kodeFacet]) => {
      if (kodeFacet && kodeFacet !== "-") {
        mappedDecorations[facetName] = kodeFacet;
      }
    });

    const allColumns = [...mergedDf.columns, ...Array.from(newFacetCols)];
    const normalized = expandedRows.map((r) => {
      const obj = {};
      for (const col of allColumns) obj[col] = r[col] ?? "";
      return obj;
    });

    const newDf = new dfd.DataFrame(normalized);
    setExpandedDf(newDf);
    setFacetColumns(newFacetCols);
    setFacetMappedKodeByColumn(mappedDecorations);
    // keep step as-is; table renders below
  };

  return {
    // progressive step
    mappingStep,
    beginUnitsPhase,
    beginEnumsPhase,
    beginFacetNamesPhase,
    finalizeWithMappings,

    // extracted inputs
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
    enumOptionValues,
    KODE_FACET_OPTIONS,
    suggestEnumForTriple,

    // final table
    expandedDf,
    facetColumns,
    facetMappedKodeByColumn,
  };
}

export default useFacetsProcessor;
