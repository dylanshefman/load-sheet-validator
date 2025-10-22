import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
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

// --- helpers -------------------------------------------------------------

const normalize = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Sørensen–Dice coefficient on bigrams
function dice(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;

  const bigrams = (str) => {
    const arr = [];
    for (let i = 0; i < str.length - 1; i++) arr.push(str.slice(i, i + 2));
    return arr;
  };
  const a2 = bigrams(A);
  const b2 = bigrams(B);
  if (a2.length === 0 || b2.length === 0) return A === B ? 1 : 0;

  const map = new Map();
  for (const g of a2) map.set(g, (map.get(g) || 0) + 1);
  let inter = 0;
  for (const g of b2) {
    const c = map.get(g) || 0;
    if (c > 0) {
      inter++;
      map.set(g, c - 1);
    }
  }
  return (2 * inter) / (a2.length + b2.length);
}

const singularize = (w) =>
  w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w;

// Alias map (extend as needed)
const UNIT_SYMBOLS = {
  amperes: ["a", "amp", "amps", "ampere", "amperes"],
  milliamperes: ["ma", "milliamp", "milliamps", "milliampere", "milliamperes"],
  btu: ["btu", "btus"],
  "btus per hour": ["btu/h", "btuh", "btu per hour", "btus per hour"],
  kilobtus_per_hour: ["kbtu/h", "kbtuh", "kbtu per hour"],
  megabtus_per_hour: ["mbtu/h", "mbtuh", "mbtu per hour"],
  watt: ["w", "watt", "watts"],
  kilowatt: ["kw", "kilowatt", "kilowatts"],
  megawatt: ["mw", "megawatt", "megawatts"],
  horsepower: ["hp", "horsepower"],
  "gallons per minute": ["gpm", "gal/min", "gallons per minute"],
  "gallons per hour": ["gph", "gal/hr", "gallons per hour"],
  "cubic feet per minute": ["cfm", "cubic feet per minute"],
  "cubic feet per hour": ["cfh", "cubic feet per hour"],
  "air changes per hour": ["acph", "air changes per hour"],
  hertz: ["hz", "hertz"],
  kilohertz: ["khz", "kilohertz"],
  megahertz: ["mhz", "megahertz"],
  gigahertz: ["ghz", "gigahertz"],
  percent: ["%", "percent", "percentage"],
  percent_relative_humidity: ["%rh", "rh", "relative humidity"],
  fahrenheit: ["f", "°f", "deg f", "fahrenheit"],
  celsius: ["c", "°c", "deg c", "celsius", "centigrade"],
  kelvin: ["k", "kelvin"],
  volt: ["v", "volt", "volts"],
  kilovolt: ["kv", "kilovolt", "kilovolts"],
  megavolt: ["mv", "megavolt", "megavolts"],
  milli_volt: ["mv", "millivolt", "millivolts"],
  "liters per minute": ["l/min", "lpm", "liters per minute"],
  "liters per second": ["l/s", "liters per second"],
  "liters per hour": ["l/h", "liters per hour"],
  "cubic meters per hour": ["m3/h", "m³/h", "cubic meters per hour"],
  "cubic meters per second": ["m3/s", "m³/s", "cubic meters per second"],
  "meters per second": ["m/s", "meters per second"],
  "feet per minute": ["ft/min", "fpm", "feet per minute"],
  "feet per second": ["ft/s", "fps", "feet per second"],
  "miles per hour": ["mph", "miles per hour"],
  "pounds per square inch": ["psi", "pounds per square inch"],
  pascal: ["pa", "pascal", "pascals"],
  kilopascal: ["kpa", "kilopascal", "kilopascals"],
  inches_of_water: ["in wc", "in/wc", "inch water", "inches of water"],
  inches_of_mercury: ["inhg", "in hg", "inches of mercury"],
  watt_hour: ["wh", "watt hour", "watt-hour"],
  kilowatt_hour: ["kwh", "kilowatt hour", "kilowatt-hour"],
  megawatt_hour: ["mwh", "megawatt hour", "megawatt-hour"],
  joule: ["j", "joule", "joules"],
  gigajoule: ["gj", "gigajoule", "gigajoules"],
  joules_per_hour: ["j/h", "joules per hour"],
  gigajoule_per_hour: ["gj/h", "gigajoules per hour"],
  volt_ampere: ["va", "volt ampere"],
  kilovolt_ampere: ["kva", "kilovolt ampere"],
  megavolt_ampere: ["mva", "megavolt ampere"],
  volt_ampere_reactive: ["var", "volt ampere reactive"],
  kilovolt_ampere_reactive: ["kvar", "kilovolt ampere reactive"],
  megavolt_ampere_reactive: ["mvar", "megavolt ampere reactive"],
  powerfactor: ["pf", "power factor"],
  lux: ["lx", "lux"],
  watt_per_square_meter: ["w/m2", "w/m²", "w per m2", "w per m²"],
  footcandle: ["fc", "ftcd", "footcandle"],
  ohm: ["ohm", "Ω"],
  kiloohm: ["kΩ", "kohm", "kiloohm"],
  siemens_per_meter: ["s/m", "siemens per meter"],
  rpm: ["rpm", "revolutions per minute"],
  parts_per_million: ["ppm", "parts per million"],
  parts_per_billion: ["ppb", "parts per billion"],
  mg_per_liter: ["mg/l", "mg per liter"],
  ug_per_cubic_meter: ["ug/m3", "µg/m3", "microgram per cubic meter"],
};

function defaultAliasesForId(id) {
  const base = id.replace(/_/g, " ");
  const simple = [
    id,
    base,
    base.replace(/\bper\b/g, "/"),
    base.replace(/\s+/g, ""),
    singularize(base),
    singularize(id),
  ];
  return Array.from(new Set(simple.map(normalize)));
}

function buildAliasesForUnitId(unitId) {
  const custom = UNIT_SYMBOLS[unitId] || [];
  const merged = [...defaultAliasesForId(unitId), ...custom.map(normalize)];
  return Array.from(new Set(merged));
}

function scoreUnitMatch(input, unitId) {
  const aliases = buildAliasesForUnitId(unitId);
  const nIn = normalize(input);
  let best = 0;
  for (const alias of aliases) {
    if (!alias) continue;
    if (alias === nIn) return 1;
    const s = dice(nIn, alias);
    const boost =
      nIn.startsWith(alias) || alias.startsWith(nIn)
        ? 0.05
        : nIn.includes(alias) || alias.includes(nIn)
        ? 0.03
        : 0;
    best = Math.max(best, Math.min(1, s + boost));
  }
  return best;
}

// color helpers -----------------------------------------------------------

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
function gradientBaseRGB(pct) {
  // 50→75: red → yellow, 75→100: yellow → green
  const red = [244, 67, 54];
  const yellow = [255, 235, 59];
  const green = [76, 175, 80];

  let c;
  if (pct <= 75) {
    const t = (pct - 50) / 25;
    c = [
      lerp(red[0], yellow[0], t),
      lerp(red[1], yellow[1], t),
      lerp(red[2], yellow[2], t),
    ];
  } else {
    const t = (pct - 75) / 25;
    c = [
      lerp(yellow[0], green[0], t),
      lerp(yellow[1], green[1], t),
      lerp(yellow[2], green[2], t),
    ];
  }
  return c;
}
const rgbStr = (r, g, b) => `rgb(${r}, ${g}, ${b})`;
function darkColor(pct) {
  const [r, g, b] = gradientBaseRGB(pct);
  return rgbStr(r, g, b);
}
function lightColor(pct, lighten = 0.7) {
  const [r, g, b] = gradientBaseRGB(pct);
  const rl = lerp(r, 255, lighten);
  const gl = lerp(g, 255, lighten);
  const bl = lerp(b, 255, lighten);
  return rgbStr(rl, gl, bl);
}

// --- component -----------------------------------------------------------

export default function UnitsMappingCard({
  uniqueUnits,
  unitsByCategory, // { category: [unitIds] }
  mapping, // { inputUnit: { category, unitId } }
  onChange,
  showContinue = false,
  onContinue,
}) {
  const categories = useMemo(
    () => [
      "-",
      ...Object.keys(unitsByCategory).sort((a, b) => a.localeCompare(b)),
    ],
    [unitsByCategory]
  );

  // confidence for first-pass suggestions
  const [confidenceByUnit, setConfidenceByUnit] = useState({});
  const didSuggestRef = useRef(false);
  // store initial suggestions to detect overrides (for styling only)
  const suggestedRef = useRef({}); // { [inputUnit]: { category, unitId } }

  // One-time suggestions on mount
  useEffect(() => {
    if (didSuggestRef.current) return;
    if (!uniqueUnits?.length) return;

    const nextMapping = { ...mapping };
    const nextConf = {};
    const nextSuggested = {};

    uniqueUnits.forEach((inputUnit) => {
      const sel = nextMapping[inputUnit] || { category: "", unitId: "" };
      if (sel.category || sel.unitId) return;

      let best = { unitId: "", category: "", score: 0 };
      for (const [cat, unitIds] of Object.entries(unitsByCategory)) {
        for (const uid of unitIds) {
          const score = scoreUnitMatch(inputUnit, uid);
          if (score > best.score) best = { unitId: uid, category: cat, score };
        }
      }

      const pct = Math.round(best.score * 100);
      if (pct >= 50 && best.unitId && best.category) {
        nextMapping[inputUnit] = {
          category: best.category,
          unitId: best.unitId,
        };
        nextConf[inputUnit] = pct;
        nextSuggested[inputUnit] = {
          category: best.category,
          unitId: best.unitId,
        };
      }
    });

    didSuggestRef.current = true;
    if (Object.keys(nextConf).length) setConfidenceByUnit(nextConf);
    if (Object.keys(nextSuggested).length) suggestedRef.current = nextSuggested;
    if (Object.keys(nextMapping).length) onChange(nextMapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueUnits, unitsByCategory]);

  const setCategory = (u, cat) => {
    const next = { ...mapping };
    next[u] = next[u] || { category: "", unitId: "" };
    next[u].category = cat || "";
    next[u].unitId = cat === "-" ? "-" : "";
    onChange(next);
  };

  const setUnitId = (u, id) => {
    const next = { ...mapping };
    next[u] = next[u] || { category: "", unitId: "" };
    next[u].unitId = (id ?? "").toString().trim();
    onChange(next);
  };

  // ✅ Sort: "no suggestion" first, then ascending confidence.
  const sortedUnits = useMemo(() => {
    const rows = uniqueUnits.map((u) => {
      const pct = confidenceByUnit[u] ?? 0;
      return { u, pct };
    });
    rows.sort((a, b) => {
      const aHas = a.pct >= 50 ? 1 : 0;
      const bHas = b.pct >= 50 ? 1 : 0;
      if (aHas !== bHas) return aHas - bHas; // 0 (no suggestion) first
      return a.pct - b.pct; // then by ascending confidence
    });
    return rows.map((r) => r.u);
  }, [uniqueUnits, confidenceByUnit]);

  const canContinue = !!showContinue;

  return (
    <Card variant="outlined">
      <CardHeader
        title="Units Mapping"
        subheader="Map input units to KODE categories & units"
      />
      <CardContent sx={{ p: 0 }}>
        {/* prevent any horizontal cut-off */}
        <Box sx={{ overflowX: "auto" }}>
          <Table
            size="small"
            sx={{ tableLayout: "fixed", width: "100%", minWidth: 560 }}
          >
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>

            <TableHead>
              <TableRow>
                <TableCell>Input Unit</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Unit</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedUnits.map((u) => {
                const sel = mapping[u] || { category: "", unitId: "" };

                const unitChoicesRaw =
                  sel.category && sel.category !== "-"
                    ? unitsByCategory[sel.category] || []
                    : [];
                const unitChoices = unitChoicesRaw.map((x) => String(x).trim());

                const desiredValue = (sel.unitId ?? "").toString().trim();
                const valueInOptions =
                  sel.category === "-"
                    ? desiredValue === "-"
                    : desiredValue === "" || unitChoices.includes(desiredValue);
                const safeValue = valueInOptions ? desiredValue : "";

                const unitKey = `${u}-${sel.category}-${unitChoices.join("|")}`;
                const pct = confidenceByUnit[u] ?? 0;

                // For styling: show attached borders/badge ONLY if user is still following the initial suggestion.
                const suggested = suggestedRef.current[u];
                const isFollowingSuggestion =
                  suggested &&
                  pct >= 50 &&
                  sel.category === suggested.category &&
                  sel.unitId === suggested.unitId;

                const dark = isFollowingSuggestion ? darkColor(pct) : undefined;
                const light = isFollowingSuggestion
                  ? lightColor(pct)
                  : undefined;
                const neutral = "rgba(0,0,0,0.23)";

                const unitInputSx = isFollowingSuggestion
                  ? {
                      "& .MuiOutlinedInput-root": {
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: dark,
                        borderWidth: 1,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: dark,
                        borderWidth: 1,
                      },
                      "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: dark,
                        borderWidth: 1,
                      },
                    }
                  : {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: neutral,
                      },
                    };

                return (
                  <TableRow key={u}>
                    <TableCell
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={u}
                    >
                      {u}
                    </TableCell>

                    <TableCell sx={{ minWidth: 0 }}>
                      <Autocomplete
                        disablePortal
                        size="small"
                        options={[
                          "-",
                          ...Object.keys(unitsByCategory).sort((a, b) =>
                            a.localeCompare(b)
                          ),
                        ]}
                        value={sel.category || null}
                        onChange={(_, newVal) => setCategory(u, newVal ?? "")}
                        isOptionEqualToValue={(opt, val) =>
                          String(opt) === String(val)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Category"
                            placeholder="Search categories…"
                            fullWidth
                          />
                        )}
                      />
                    </TableCell>

                    <TableCell sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "stretch",
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {sel.category === "-" ? (
                            <TextField
                              size="small"
                              label="Unit"
                              value="-"
                              disabled
                              fullWidth
                              sx={unitInputSx}
                            />
                          ) : (
                            <Autocomplete
                              key={unitKey}
                              disablePortal
                              size="small"
                              options={unitChoices}
                              value={safeValue || null}
                              onChange={(_, newVal) => setUnitId(u, newVal)}
                              isOptionEqualToValue={(opt, val) =>
                                String(opt) === String(val)
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Unit"
                                  placeholder={
                                    !sel.category
                                      ? "Pick a category first…"
                                      : "Search units…"
                                  }
                                  fullWidth
                                  sx={unitInputSx}
                                />
                              )}
                              disabled={!sel.category}
                            />
                          )}
                        </Box>

                        {isFollowingSuggestion ? (
                          <Box
                            sx={{
                              ml: "-1px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              px: 1,
                              minWidth: 60,
                              backgroundColor: light,
                              border: `1px solid ${dark}`,
                              borderTopLeftRadius: 0,
                              borderBottomLeftRadius: 0,
                              borderTopRightRadius: 6,
                              borderBottomRightRadius: 6,
                              fontWeight: 700,
                              color: "#000",
                              userSelect: "none",
                              flexShrink: 0,
                            }}
                            title={`Confidence ${pct}%`}
                          >
                            {pct}%
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              ml: "-1px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              px: 1,
                              minWidth: 60,
                              border: "none",
                              color: "text.secondary",
                              flexShrink: 0,
                            }}
                          >
                            —
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {showContinue && (
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!showContinue}
              onClick={onContinue}
            >
              Accept Unit Mapping and Continue
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
