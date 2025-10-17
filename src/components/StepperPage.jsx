import React, { useState, useEffect } from 'react'
import * as dfd from 'danfojs'
import { Box, Button, Typography, Grid, Select, MenuItem, FormControl, InputLabel, Paper, LinearProgress, Card, CardContent, CircularProgress, Stack } from '@mui/material'
import PreviewTable from './PreviewTable'
import ErrorPanel from './ErrorPanel'
import { decodeSlotpath } from '../utils/decode'
import Papa from 'papaparse'
import CheckCard from './CheckCard'
import { mkKey, buildErrorForCheck, getRecordsArray, exportCSV, downloadOffendingRows, downloadCleanedTable } from './stepperHelpers'
import WarningPanel from './WarningPanel'

const KODE_OPTIONS = ['Number', 'Bool', 'Str', '-']

export default function StepperPage({ initialState, onBack }) {
  // start at step 2 since point-type mapping moved to UploadPage
  const [step, setStep] = useState(2)
  const [df, setDf] = useState(initialState.df)
  const [mapping, setMapping] = useState(initialState.mapping)
  const [kodeMap, setKodeMap] = useState(null)
  const [fieldsRows, setFieldsRows] = useState([])
  const [errors, setErrors] = useState(null)
  const [warning, setWarning] = useState(null)
  const [checkStatuses, setCheckStatuses] = useState({}) // key -> { status: 'pending'|'running'|'passed'|'failed', detail }
  const [running, setRunning] = useState(false)
  const suffixUsed = initialState.suffixUsed !== undefined ? initialState.suffixUsed : true
  const totalSteps = suffixUsed ? 5 : 4

  const stepDescriptions = {
    1: 'Point type mapping — map each unique uploaded type to KODE types (Number/Bool/Str/-).',
    2: 'Uniqueness checks — ensure slotpaths and handles are unique.',
    3: 'Device canonical consistency — every device must have a single canonical type.',
    4: 'Ontology validation — canonical types, fields, and canonical+field combos must be valid.',
    5: 'Suffix rules — ensure multi=true for suffixed fields and suffix uniqueness/consistency.'
  }

  // load full ontology fields CSV from public/fields.csv at mount
  useEffect(() => {
    let cancelled = false
    Papa.parse('/fields.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (cancelled) return
        if (results && results.data) {
          const norm = results.data.map(r => ({
            canonical_type: r.canonical_type || r.canonicalType || r.canonical || r.CANONICAL_TYPE || r.canonical_type,
            field: r.field || r.Field || r.FIELD || r.field,
            supported_kinds: (r.supported_kinds || r.supportedKinds || r.SUPPORTED_KINDS || r.supported_kinds || '')
                              .split(';').map(s => s && s.trim()).filter(Boolean)
            ,
            // multi indicates whether this canonical_type+field supports suffixes (truthy values)
            multi: (() => {
              const mv = r.multi || r.Multi || r.MULTI || r.multi
              if (mv === undefined || mv === null) return false
              const s = String(mv).trim().toLowerCase()
              return s === '1' || s === 'true' || s === 'yes' || s === 'y'
            })()
          }))
          setFieldsRows(norm)
        }
      },
      error: (err) => { console.warn('Failed to load fields.csv', err) }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyBetweenSteps(kodeMapArg) {
    // operate on DataFrame; ensure we have a DataFrame
    let workingDf = df
    try {
      if (!workingDf || typeof workingDf.head !== 'function') workingDf = new dfd.DataFrame(workingDf)
      const typeCol = mapping.type
      // add kode_point_type column
      workingDf.addColumn(
        "kode_point_type",
        workingDf[typeCol].apply(original => kodeMapArg[original] || "Unknown"),
        { inplace: true }
      )

      // trim whitespace on selected columns
      Object.values(mapping).forEach(col => {
        if (!col) return
        try {
          const series = workingDf.column(col).values.map(val => (typeof val === 'string' ? val.trim() : val))
          workingDf.addColumn(col, series, { inplace: true })
        } catch (e) {
          // ignore missing columns
        }
      })

      // decode slotpaths
      const spCol = mapping.slotpath
      try {
        const dec = workingDf.column(spCol).values.map(v => v ? decodeSlotpath(v) : v)
        workingDf.addColumn(spCol, dec, { inplace: true })
      } catch (e) {}

      // filter out hyphen rows
      const filteredDf = workingDf.query(
        workingDf["kode_point_type"].ne("-")
            .and(workingDf[mapping.deviceName].ne("-"))
            .and(workingDf[mapping.canonicalType].ne("-"))
            .and(workingDf[mapping.field].ne("-"))
        )
      setDf(filteredDf)
    } catch (e) {
      // fallback: leave df unchanged
      console.warn('applyBetweenSteps failed', e)
    }
  }


  function getChecksForStep(s) {
    const checks = []
    const records = getRecordsArray(df)

    
    if (s === 2) {
      checks.push({
        key: mkKey(2, 1),
        label: 'Slotpath uniqueness',
        run: async () => {
            const spCol = mapping.slotpath
            const dup = records.reduce((acc, r, i) => {
                acc[r[spCol]] = acc[r[spCol]] || []; acc[r[spCol]].push(i+1); return acc
            }, {})
            const bad = Object.entries(dup).filter(([k, v]) => v.length > 1)
            if (bad.length) {
                return {
                    ok: false,
                    detail: bad.map(([value, idxs]) => ({
                        value,
                        rows: idxs,
                        records: idxs.map(rn => records[rn-1])
                    }))
                }
            }
            return { ok: true }
        }
      })

      checks.push({
        key: mkKey(2, 2),
        label: 'Handle uniqueness',
        run: async () => {
            const hCol = mapping.handle
            const dupH = records.reduce((acc, r, i) => {
                acc[r[hCol]] = acc[r[hCol]] || [];
                acc[r[hCol]].push(i+1);
                return acc
            },
            {})
            const badH = Object.entries(dupH).filter(([k, v]) => v.length > 1)
            if (badH.length) {
                return {
                    ok: false,
                    detail: badH.map(([val, idxs]) => ({
                        value: val,
                        rows: idxs,
                        records: idxs.map(rn => records[rn-1])
                    }))
                }
            }
            return { ok: true }
        }
      })
    }


    if (s === 3) {
      checks.push({
        key: mkKey(3, 1),
        label: 'Device canonical consistency',
        run: async () => {
            const dCol = mapping.deviceName
            const ctCol = mapping.canonicalType
            const map = {}
            const inconsistent = []
            records.forEach((r, i) => {
                const d = r[dCol]; const ct = r[ctCol]
                if (!map[d]) {
                    map[d] = ct
                } else if (map[d] !== ct) {
                    inconsistent.push({
                        device: d,
                        row: i+1,
                        expected: map[d],
                        found: ct
                    })
                }
            })
            if (inconsistent.length) {
                return {
                    ok: false,
                    detail: inconsistent
                }
            }
            return { ok: true }
        }
      })
    }


    if (s === 4) {
      // if fieldsRows not loaded yet, provide a pending check that waits
      if (!fieldsRows || !fieldsRows.length) {
        checks.push({
            key: mkKey(4, 0),
            label: 'Loading ontology fields',
            run: async () => ({
                ok: false,
                detail: 'fields-not-loaded'
            })
        })
        return checks
      }

      const canonicalSet = new Set(fieldsRows.map(r => r.canonical_type))
      const fieldSet = new Set(fieldsRows.map(r => r.field))
      const combos = new Set(fieldsRows.map(r => `${r.canonical_type}|||${r.field}`))
      // map combo -> supported kinds set
      const comboToKinds = {}
      fieldsRows.forEach(r => {
        const key = `${r.canonical_type}|||${r.field}`
        comboToKinds[key] = new Set((r.supported_kinds && Array.isArray(r.supported_kinds) ? r.supported_kinds : []).map(x => x))
      })

      checks.push({
        key: mkKey(4, 1),
        label: 'Canonical type validity',
        run: async () => {
            const ctCol = mapping.canonicalType
            const badCt = []
            records.forEach((r, i) => {
                const ct = r[ctCol];
                if (!(canonicalSet.has(ct) || ct === '-' || ct === '?')) {
                    badCt.push({
                        row: i+1,
                        ct,
                        record: r
                    }) 
                }
            })
            if (badCt.length) {
                return {
                    ok: false,
                    detail: badCt
                }
            }
            return { ok: true }
        }
      })

      checks.push({
        key: mkKey(4, 2),
        label: 'Field validity',
        run: async () => {
            const fCol = mapping.field
            const badField = []
            records.forEach((r, i) => {
                const f = r[fCol];
                if (!(fieldSet.has(f) || f === '!')) {
                    badField.push({
                        row: i+1,
                        field: f,
                        record: r
                    })
                }
            })
            if (badField.length) {
                return {
                    ok: false,
                    detail: badField
                }
            }
            return { ok: true }
        }
      })

      checks.push({
        key: mkKey(4, 3),
        label: 'Canonical+Field combo validity',
        run: async () => {
            const ctCol = mapping.canonicalType; const fCol = mapping.field
            const badCombo = []
            records.forEach((r, i) => {
                const ct = r[ctCol];
                const f = r[fCol];
                if (!(combos.has(`${ct}|||${f}`) || f === '!')) {
                    badCombo.push({
                        row: i+1,
                        ct,
                        field: f,
                        record: r
                    })
                }
            })
            if (badCombo.length) return { ok: false, detail: badCombo }
            return { ok: true }
        }
      })

      checks.push({
        key: mkKey(4, 4),
        label: 'Assigned KODE point type vs supported kinds',
        run: async () => {
            const ctCol = mapping.canonicalType;
            const fCol = mapping.field;
            const kodeCol = 'kode_point_type';
            const bad = [];
            records.forEach((r, i) => {
                const ct = r[ctCol];
                const f = r[fCol];
                const kode = r[kodeCol];
                const key = `${ct}|||${f}`;
                // if combo not present, skip here (combo check handles that)
                const allowed = comboToKinds[key];
                if (allowed && allowed.size) {
                    // allow '!' as special placeholder
                    if (kode && kode !== '!' && !allowed.has(kode)) {
                        bad.push({
                            row: i+1,
                            kode,
                            allowed: Array.from(allowed),
                            record: r
                        });
                    }
                }
            })
            if (bad.length) {
                return {
                    ok: false,
                    detail: bad
                }
            }
            return { ok: true }
        }
      })
    }


    if (s === 5) {
      // new check: suffix usage allowed only for combos with multi=true
      checks.push({ key: mkKey(5, 0), label: 'Suffix allowed for combo (multi=true)', run: async () => {
        const sCol = mapping.suffix; const ctCol = mapping.canonicalType; const fCol = mapping.field
        const comboMulti = {}
        fieldsRows.forEach(fr => { comboMulti[`${fr.canonical_type}|||${fr.field}`] = !!fr.multi })
        const bad = []
        records.forEach((r, i) => {
          const suf = r[sCol]
          if (suf && String(suf).trim() !== '') {
            const key = `${r[ctCol]}|||${r[fCol]}`
            if (!comboMulti[key]) bad.push({ row: i+1, suffix: suf, combo: key, record: r })
          }
        })
        if (bad.length) return { ok: false, detail: bad }
        return { ok: true }
      }})
      checks.push({
        key: mkKey(5, 1),
        label: 'Suffix mixed empty/filled per device+field',
        run: async () => {
            const sCol = mapping.suffix;
            const dCol = mapping.deviceName;
            const fCol = mapping.field;
            const grouped = {};
            records.forEach((r, i) => {
                const key = `${r[dCol]}|||${r[fCol]}`;
                grouped[key] = grouped[key] || [];
                grouped[key].push({
                    row: i+1,
                    suffix: r[sCol]
                });
            })
            const bads = []
            Object.entries(grouped).forEach(([k, arr]) => {
                const hasEmpty = arr.some(x => !x.suffix);
                const hasFilled = arr.some(x => x.suffix);
                if (hasEmpty && hasFilled) {
                    bads.push({
                        group: k,
                        rows: arr
                    });
                }
            })
            if (bads.length) {
                return {
                    ok: false,
                    detail: bads
                }
            }
            return { ok: true }
        }
      })

      checks.push({
        key: mkKey(5, 2),
        label: 'Suffix duplicate within device+field',
        run: async () => {
            const sCol = mapping.suffix;
            const dCol = mapping.deviceName;
            const fCol = mapping.field;
            const grouped = {};
            records.forEach((r, i) => {
                const key = `${r[dCol]}|||${r[fCol]}`;
                grouped[key] = grouped[key] || [];
                grouped[key].push({
                    row: i+1,
                    suffix: r[sCol]
                });
            });
            const bads = []
            Object.entries(grouped).forEach(([k, arr]) => {
                const suffixes = arr.map(x => x.suffix).filter(Boolean);
                const dup = suffixes.filter((v, i, a) => a.indexOf(v) !== i);
                if (dup.length) {
                    bads.push({
                        group: k,
                        duplicateSuffixes: dup
                    });
                }
            });
            if (bads.length) {
                return {
                    ok: false,
                    detail: bads
                };
            }
            return { ok: true };
        }
      })
    }


    return checks
  }

  // run a sequence of checks sequentially; stop on first failure
  async function runChecksSequence(checks) {
    setRunning(true)
    for (let i = 0; i < checks.length; i++) {
      const c = checks[i]
      setCheckStatuses(prev => ({ ...prev, [c.key]: { status: 'running' } }))
      // give UI a moment
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 150))
      // eslint-disable-next-line no-await-in-loop
      const res = await c.run()
      if (res.ok) {
        setCheckStatuses(prev => ({ ...prev, [c.key]: { status: 'passed' } }))
      } else {
        setCheckStatuses(prev => ({ ...prev, [c.key]: { status: 'failed', detail: res.detail } }))
        // build structured offendingRows where possible
        let offendingRows = null
        try {
          // res.detail may be an array of records/rows depending on check
          if (Array.isArray(res.detail)) {
            offendingRows = res.detail.slice(0, 10).map(d => {
              // normalize shapes: if d has 'rows' and 'records', use those; else if it has row/record, use them
              if (d.records && d.rows) {
                // map each offending index to a record entry
                const combined = d.rows.map((rn, i) => ({ row: rn, record: d.records[i], fields: Object.keys(d.records[i] || {}) }))
                return combined
              }
              if (d.record && d.row) return { row: d.row, record: d.record, fields: Object.keys(d.record || {}) }
              return { row: d.row || null, record: d.record || d, fields: Object.keys(d.record || d || {}) }
            }).flat().slice(0, 10)
          }
        } catch (e) {
          offendingRows = null
        }

        const message = `Check failed: ${c.label}`
        const detailObj = offendingRows ? { message, offendingRows } : { message, raw: res.detail }
        setErrors({ type: 'check-failed', detail: detailObj })
        setRunning(false)
        return false
      }
      // small delay to let UI reflect pass
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 120))
    }
    setRunning(false)
    return true
  }

  // whenever the user advances to a step, run that step's checks sequentially
  useEffect(() => {
    if (step === 1) return
    const checks = getChecksForStep(step)
    const reset = {}
    checks.forEach(c => { reset[c.key] = { status: 'pending' } })
    setCheckStatuses(prev => ({ ...prev, ...reset }))
    ;(async () => {
      // clear previous errors and warnings when starting a new set of checks
      setErrors(null)
      setWarning(null)
      const ok = await runChecksSequence(checks)
      if (ok) {
        // only compute duplicate-field warnings once we've completed the final step
        if (step === totalSteps) {
          try {
            const recordsArr = getRecordsArray(df)
            const dCol = mapping.deviceName
            const fCol = mapping.field
            const sCol = mapping.suffix
            const useSuffix = !!suffixUsed

            // group by device -> then detect duplicate fields per device
            const byDevice = {}
            recordsArr.forEach((r, i) => {
              const dev = r[dCol]
              byDevice[dev] = byDevice[dev] || []
              byDevice[dev].push({ row: i+1, record: r })
            })
            const offendingByDevice = []
            Object.entries(byDevice).forEach(([dev, arr]) => {
              // build a key that includes suffix if suffixes are used
              const map = {}
              arr.forEach(({ row, record }) => {
                const fieldVal = record[fCol]
                // '!' is never considered duplicate
                if (fieldVal === '!' || fieldVal.includes("alarm")) return
                const suffixVal = record[sCol]
                const key = useSuffix ? `${String(record[dCol] || dev)}|||${String(fieldVal || '')}|||${String(suffixVal || '')}` : `${String(record[dCol] || dev)}|||${String(fieldVal || '')}`
                map[key] = map[key] || []
                map[key].push({ row, record })
              })
              // Now find duplicates: when key has more than 1 entry OR (suffixes on and there exist two rows with same device+field and both have no suffix)
              let deviceDuplicates = []
              // If suffixes used, also need to consider duplicate across device+field when both suffix empty
              const deviceFieldGroups = {}
              arr.forEach(({ row, record }) => {
                const fieldVal = record[fCol]
                if (fieldVal === '!' || fieldVal.includes("alarm")) return
                const dkey = `${String(record[dCol] || dev)}|||${String(fieldVal || '')}`
                deviceFieldGroups[dkey] = deviceFieldGroups[dkey] || []
                deviceFieldGroups[dkey].push({ row, record })
              })

              Object.entries(map).forEach(([k, list]) => {
                if (list.length > 1) {
                  // we have duplicate key entries; extract field-based grouping for display
                  deviceDuplicates.push(...list)
                }
              })

              if (useSuffix) {
                // find device+field groups where multiple rows have empty suffix
                Object.values(deviceFieldGroups).forEach(list => {
                  const empties = list.filter(x => !x.record[sCol])
                  if (empties.length > 1) {
                    deviceDuplicates.push(...empties)
                  }
                })
              }

              if (deviceDuplicates.length) {
                // de-duplicate entries by row (preserve first occurrence order) to avoid duplicate React keys
                const seenRows = new Set()
                const deduped = []
                deviceDuplicates.forEach(it => {
                  if (!seenRows.has(it.row)) {
                    seenRows.add(it.row)
                    deduped.push(it)
                  }
                })
                // per requirement: if a device has multiple duplicate fields, display all rows with the same field in succession
                // we'll sort by field and then by row
                deduped.sort((a, b) => {
                  const fa = String(a.record[fCol] || '')
                  const fb = String(b.record[fCol] || '')
                  if (fa < fb) return -1
                  if (fa > fb) return 1
                  return a.row - b.row
                })
                offendingByDevice.push({ device: dev, rows: deduped })
              }
            })

            if (offendingByDevice.length) {
              setWarning({ type: 'duplicate-fields', detail: { message: 'Duplicate fields detected (warning only).', offendingByDevice } })
            } else {
              setWarning(null)
            }
          } catch (e) {
            // ignore duplicate detection errors
            setWarning(null)
          }
        }

        // auto-advance to next step unless we're at the last step
        if (step < totalSteps) {
          const next = step + 1
          // skip step 5 if suffixes not used
          if (next === 5 && !suffixUsed) setStep(totalSteps)
          else setStep(next)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // apply kodeAssignments provided by UploadPage and immediately run step 2 checks
  useEffect(() => {
    const assignments = initialState.kodeAssignments || {}
    if (Object.keys(assignments).length) {
      setKodeMap(assignments)
      applyBetweenSteps(assignments)
      // run step 2 checks immediately
      setTimeout(() => { setStep(2) }, 10)
    } else {
      // still apply between steps with empty mapping so df is normalized
      applyBetweenSteps({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Step {step}</Typography>
          <Typography variant="body2" color="text.secondary">{stepDescriptions[step]}</Typography>
          <LinearProgress variant="determinate" value={Math.round(((step-1)/(totalSteps-1))*100)} sx={{ my: 1 }} />
          {/* errors are now shown inside each failed check card only */}

          {/* Render all step sections on a single page; each step has its own check cards that are revealed when the user advances to that step. */}
          <Box sx={{ mt: 2 }}>
            {[2,3,4,5].filter(s => s <= totalSteps).map(s => (
              <Box key={`section-${s}`} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Step {s}: {stepDescriptions[s]}</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {getChecksForStep(s).map((c) => (
                    <CheckCard key={c.key}
                      c={c}
                      statusObj={checkStatuses[c.key]}
                      checkStatuses={checkStatuses}
                      onDownloadOffending={(check) => downloadOffendingRows(check, checkStatuses)}
                      onDownloadCleaned={(check) => downloadCleanedTable(check, checkStatuses, getRecordsArray(df))}
                    />
                  ))}
                </Stack>
              </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
              <Button variant="outlined" onClick={onBack}>Back to Upload</Button>
              <Button variant="contained" onClick={async () => {
                // allow Next only if current step's checks have all passed and none failed
                if (running) return
                const currentChecks = getChecksForStep(step)
                const anyFailed = currentChecks.some(c => checkStatuses[c.key] && checkStatuses[c.key].status === 'failed')
                const allPassed = currentChecks.every(c => checkStatuses[c.key] && checkStatuses[c.key].status === 'passed')
                if (!allPassed || anyFailed) return
                const next = Math.min(totalSteps, step+1)
                setStep(next)
              }}>Next</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

        {warning && (
          <Box sx={{ mt: 2 }}>
            <WarningPanel warning={warning} spCol={mapping.slotpath} pnCol={mapping.pointName} fCol={mapping.field} />
          </Box>
        )}

      <Box sx={{ mt: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Preview</Typography>
                  <Box sx={{ mt: 1 }}>
                    <PreviewTable rows={df} />
                  </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
