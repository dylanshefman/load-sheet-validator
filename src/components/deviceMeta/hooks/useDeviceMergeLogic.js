import { useState } from "react";
import * as dfd from "danfojs";
import Papa from "papaparse";
import { decodeSlotpath } from "../../../utils/decode";

/**
 * Device metadata merge logic (kept separate on purpose).
 *
 * Fields to map/merge:
 *  - Mechanical Type
 *  - Location
 *  - Area
 *
 * Source modes:
 *  - initial: join on SP (slotpath) derived from initialDf
 *  - upload:  join on Device Name (one CSV row -> many base rows)
 */
export function useDeviceMergeLogic(initialDf, initialMapping) {
  const [mappingState, setMappingState] = useState({
    source: "initial",
    // initial source column picks (from initialDf)
    initialMechTypeCol: "",
    initialLocationCol: "",
    initialAreaCol: "",
    // upload source
    uploadDf: null,
    uploadDeviceNameCol: "", // join key for upload (right)
    uploadMechTypeCol: "",
    uploadLocationCol: "",
    uploadAreaCol: "",
  });

  const [mergedDf, setMergedDf] = useState(null);
  const [metadataDeviceNames, setMetadataDeviceNames] = useState(new Set());

  const initialCols = initialDf.columns;

  const getInitialSlotCol = () =>
    initialMapping?.slotpath && initialCols.includes(initialMapping.slotpath)
      ? initialMapping.slotpath
      : "slotpath";

  const getInitialDeviceNameCol = () =>
    initialMapping?.deviceName &&
    (initialCols.includes(initialMapping.deviceName) || true)
      ? initialMapping.deviceName
      : "device";

  const preprocessSlotSeries = (series) =>
    series
      .apply((v) => (typeof v === "string" ? v.replace(/^slot:/, "") : v))
      .apply((v) => decodeSlotpath(v));

  const handleUpload = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const strippedRows = rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, value.trim()])
          )
        );
        setMappingState((s) => ({
          ...s,
          uploadDf: new dfd.DataFrame(strippedRows),
        }));
      },
    });
  };

  /**
   * Process and merge device metadata into baseDf.
   * - baseDf should be the latest DF (expandedDf → mergedDf → initialDf).
   */
  const processDeviceMerge = (baseDf) => {
    const {
      source,
      // initial
      initialMechTypeCol,
      initialLocationCol,
      initialAreaCol,
      // upload
      uploadDf,
      uploadDeviceNameCol,
      uploadMechTypeCol,
      uploadLocationCol,
      uploadAreaCol,
    } = mappingState;

    if (!baseDf || baseDf.shape?.[0] === 0) {
      setMergedDf(new dfd.DataFrame([]));
      return;
    }

    const left = baseDf.copy();

    if (source === "initial") {
      // Join by SP (slotpath) derived from initialDf
      const slotCol = getInitialSlotCol();
      if (!initialCols.includes(slotCol)) {
        // Cannot derive SP from initialDf
        setMergedDf(left);
        return;
      }

      // Ensure LEFT has SP to join on
      if (!left.columns.includes("SP")) {
        // Best-effort: if initialDf row order == left row order, add SP from initialDf
        // Otherwise, left should already have SP from previous phase.
        const spSeries = preprocessSlotSeries(initialDf[slotCol]);
        if (
          spSeries &&
          spSeries.values &&
          spSeries.values.length === left.shape[0]
        ) {
          left.addColumn("SP", spSeries, { inplace: true });
        }
      }

      if (!left.columns.includes("SP")) {
        setMergedDf(left);
        return;
      }

      // Build RIGHT from initialDf: SP + selected columns
      const right = initialDf.copy();
      right.addColumn("SP", preprocessSlotSeries(right[slotCol]), {
        inplace: true,
      });

      const cols = ["SP"];
      const mechOk =
        initialMechTypeCol && initialCols.includes(initialMechTypeCol);
      const locOk =
        initialLocationCol && initialCols.includes(initialLocationCol);
      const areaOk = initialAreaCol && initialCols.includes(initialAreaCol);
      if (mechOk) cols.push(initialMechTypeCol);
      if (locOk) cols.push(initialLocationCol);
      if (areaOk) cols.push(initialAreaCol);

      const slimRight = right.loc({ columns: cols });

      const merged = dfd.merge({
        left,
        right: slimRight,
        on: ["SP"],
        how: "left",
      });

      // Normalize into canonical output headers
      const out = merged.copy();
      out.addColumn(
        "Mechanical Type",
        mechOk && out.columns.includes(initialMechTypeCol)
          ? out[initialMechTypeCol]
          : new Array(out.shape[0]).fill(""),
        { inplace: true }
      );
      out.addColumn(
        "Location",
        locOk && out.columns.includes(initialLocationCol)
          ? out[initialLocationCol]
          : new Array(out.shape[0]).fill(""),
        { inplace: true }
      );
      out.addColumn(
        "Area",
        areaOk && out.columns.includes(initialAreaCol)
          ? out[initialAreaCol]
          : new Array(out.shape[0]).fill(""),
        { inplace: true }
      );

      setMergedDf(out);

      // track which devices exist in this metadata source
      const deviceNameCol = getInitialDeviceNameCol();
      const names = new Set();
      if (initialCols.includes(deviceNameCol)) {
        initialDf[deviceNameCol].values.forEach((v) => {
          if (v) names.add(String(v).trim());
        });
      }
      setMetadataDeviceNames(names);

      return;
    }

    // Upload mode: one CSV row -> many left rows based on Device Name
    const deviceNameColLeft = getInitialDeviceNameCol();
    if (!left.columns.includes(deviceNameColLeft)) {
      // Can't join without a device name on the left
      setMergedDf(left);
      return;
    }
    if (!uploadDf || !uploadDeviceNameCol) {
      setMergedDf(left);
      return;
    }

    const right = uploadDf.copy();
    if (!right.columns.includes(uploadDeviceNameCol)) {
      setMergedDf(left);
      return;
    }

    // For a simple join, align the right's device name column to left's device name header
    if (uploadDeviceNameCol !== deviceNameColLeft) {
      try {
        right.rename(
          { columns: [uploadDeviceNameCol], to: [deviceNameColLeft] },
          { inplace: true }
        );
      } catch (_) {
        // Fallback: create a copy column
        right.addColumn(deviceNameColLeft, right[uploadDeviceNameCol], {
          inplace: true,
        });
      }
    }

    const cols = [deviceNameColLeft];
    const rCols = right.columns;
    if (uploadMechTypeCol && rCols.includes(uploadMechTypeCol))
      cols.push(uploadMechTypeCol);
    if (uploadLocationCol && rCols.includes(uploadLocationCol))
      cols.push(uploadLocationCol);
    if (uploadAreaCol && rCols.includes(uploadAreaCol))
      cols.push(uploadAreaCol);

    const slimRight = right.loc({ columns: cols });

    const merged = dfd.merge({
      left,
      right: slimRight,
      on: [deviceNameColLeft], // one -> many mapping will naturally apply where names match
      how: "left",
    });

    // Normalize to canonical headers
    const out = merged.copy();
    out.addColumn(
      "Mechanical Type",
      uploadMechTypeCol && out.columns.includes(uploadMechTypeCol)
        ? out[uploadMechTypeCol]
        : new Array(out.shape[0]).fill(""),
      { inplace: true }
    );
    out.addColumn(
      "Location",
      uploadLocationCol && out.columns.includes(uploadLocationCol)
        ? out[uploadLocationCol]
        : new Array(out.shape[0]).fill(""),
      { inplace: true }
    );
    out.addColumn(
      "Area",
      uploadAreaCol && out.columns.includes(uploadAreaCol)
        ? out[uploadAreaCol]
        : new Array(out.shape[0]).fill(""),
      { inplace: true }
    );

    setMergedDf(out);

    const names = new Set();
    if (
      uploadDf &&
      uploadDeviceNameCol &&
      uploadDf.columns.includes(uploadDeviceNameCol)
    ) {
      uploadDf[uploadDeviceNameCol].values.forEach((v) => {
        if (v) names.add(String(v).trim());
      });
    }
    setMetadataDeviceNames(names);
  };

  return {
    mappingState,
    setMappingState,
    handleUpload,
    processDeviceMerge,
    mergedDf,
    metadataDeviceNames,
  };
}

export default useDeviceMergeLogic;
