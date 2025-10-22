import { useState, useEffect } from "react";
import * as dfd from "danfojs";
import Papa from "papaparse";
import { decodeSlotpath } from "../../../utils/decode";

export function useMergeLogic(initialDf, initialMapping) {
  const [mappingState, setMappingState] = useState({
    source: "initial",

    // Initial-data mode
    initialFacetsCol: "",
    initialOutCol: "",

    // Upload mode
    uploadDf: null,
    uploadSlotpathCol: "",
    uploadFacetsCol: "",
    uploadOutCol: "",
  });

  const [mergedDf, setMergedDf] = useState(null);
  const [acceptDisabled, setAcceptDisabled] = useState(true);
  const [matchedRows, setMatchedRows] = useState([]);
  const [missingRows, setMissingRows] = useState([]);

  const initialCols = initialDf.columns;
  const getInitialSlotCol = () =>
    initialMapping.slotpath && initialCols.includes(initialMapping.slotpath)
      ? initialMapping.slotpath
      : "slotpath";

  const preprocessSlotSeries = (series) =>
    series
      .apply((v) => (typeof v === "string" ? v.replace(/^slot:/, "") : v))
      .apply((v) => decodeSlotpath(v));

  const handleUpload = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setMappingState((s) => ({ ...s, uploadDf: new dfd.DataFrame(rows) }));
      },
    });
  };

  const processToMerged = () => {
    const {
      source,
      uploadDf,
      uploadSlotpathCol,
      uploadFacetsCol,
      uploadOutCol,
      initialFacetsCol,
      initialOutCol,
    } = mappingState;

    const slotCol = getInitialSlotCol();
    if (!initialCols.includes(slotCol)) {
      setMergedDf(new dfd.DataFrame([]));
      return;
    }

    // Start with initial data ("left")
    const left = initialDf.copy();
    left.addColumn("SP", preprocessSlotSeries(left[slotCol]), { inplace: true });

    if (source === "initial") {
      // FACETS
      if (!initialFacetsCol || !initialCols.includes(initialFacetsCol)) {
        setMergedDf(new dfd.DataFrame([]));
        return;
      }
      left.addColumn("FACETS", left[initialFacetsCol], { inplace: true });

      // OUT (optional)
      if (initialOutCol && initialCols.includes(initialOutCol)) {
        left.addColumn("OUT", left[initialOutCol], { inplace: true });
      } else {
        left.addColumn("OUT", new dfd.Series(Array(left.shape[0]).fill("")), {
          inplace: true,
        });
      }

      // writable = OUT contains "@"
      const writableSeries = left["OUT"].apply((v) => {
        const s = v == null ? "" : String(v);
        return s.includes("@");
      });
      left.addColumn("writable", writableSeries, { inplace: true });

      setMergedDf(left);
      return;
    }

    // Upload mode: need upload df + selected columns
    if (!uploadDf || !uploadSlotpathCol || !uploadFacetsCol) {
      setMergedDf(new dfd.DataFrame([]));
      return;
    }

    const right = uploadDf.copy();

    // Guard missing columns on right
    const rightCols = right.columns;
    if (!rightCols.includes(uploadSlotpathCol) || !rightCols.includes(uploadFacetsCol)) {
      setMergedDf(new dfd.DataFrame([]));
      return;
    }

    // SP, FACETS, OUT on right
    right.addColumn("SP", preprocessSlotSeries(right[uploadSlotpathCol]), { inplace: true });
    right.addColumn("FACETS", right[uploadFacetsCol], { inplace: true });

    if (uploadOutCol && rightCols.includes(uploadOutCol)) {
      right.addColumn("OUT", right[uploadOutCol], { inplace: true });
    } else {
      right.addColumn("OUT", new dfd.Series(Array(right.shape[0]).fill("")), {
        inplace: true,
      });
    }

    // Only bring over normalized columns from right
    const slimRight = right.loc({ columns: ["SP", "FACETS", "OUT"] });
    const merged = dfd.merge({
      left,
      right: slimRight,
      on: ["SP"],
      how: "left",
    });

    // writable = OUT contains "@"
    const writableSeries = merged["OUT"].apply((v) => {
      const s = v == null ? "" : String(v);
      return s.includes("@");
    });
    merged.addColumn("writable", writableSeries, { inplace: true });

    setMergedDf(merged);
  };

  useEffect(() => {
    if (!mergedDf || mergedDf.shape[0] === 0) return;

    // "matched" if FACETS non-empty (same behavior as before)
    const has = mergedDf["FACETS"].apply((v) => (v ?? "").toString().trim().length > 0);
    const matched = dfd.toJSON(mergedDf.loc({ rows: has }), { format: "column" });
    const notHas = has.apply((b) => !b);
    const missing = dfd.toJSON(mergedDf.loc({ rows: notHas }), { format: "column" });

    setMatchedRows(matched);
    setMissingRows(missing);
  }, [mergedDf]);

  return {
    mergedDf,
    matchedRows,
    missingRows,
    acceptDisabled,
    setAcceptDisabled,
    handleUpload,
    processToMerged,
    mappingState,
    setMappingState,
  };
}
