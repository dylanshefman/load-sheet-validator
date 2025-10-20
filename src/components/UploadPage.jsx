import React, { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import * as dfd from 'danfojs'
import { Box, Button, Grid, MenuItem, Select, FormControl, InputLabel, Switch, FormControlLabel, Typography, Divider, Card, CardContent } from '@mui/material'
import PreviewTable from './PreviewTable'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { suggestMapping } from '../utils/columns'

const REQUIRED_KEYS = [
  'slotpath',
  'pointName',
  'handle',
  'type',
  'field',
  'deviceName',
  'canonicalType',
  'suffix',
]

export default function UploadPage({ onNext }) {
  const [rawData, setRawData] = useState(null)
  const [columns, setColumns] = useState([])
  const [mapping, setMapping] = useState({})
  // default suffixUsed to OFF as requested
  const [suffixUsed, setSuffixUsed] = useState(false)
  const [siteFilterColumn, setSiteFilterColumn] = useState('')
  const [siteFilterValue, setSiteFilterValue] = useState('')
  const [siteUniqueValues, setSiteUniqueValues] = useState([])
  const [siteFilterEnabled, setSiteFilterEnabled] = useState(false)
  // single-page walkthrough only; no proceed mode option
  const [pageStep, setPageStep] = useState(1) // 1: upload only, 2: mapping, 3: point-type mapping
  const [kodeAssignments, setKodeAssignments] = useState({})
  const mappingRef = useRef(null)
  const siteFilterRef = useRef(null)
  const pointTypeRef = useRef(null)

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const arr = results.data
        setRawData(arr)
        try {
          const df = new dfd.DataFrame(arr)
          setColumns(df.columns)
        } catch (e) {
          setColumns(Object.keys(arr[0] || {}))
        }
        // reveal column mapping immediately after upload
        setPageStep(2)
      }
    })
  }

  useEffect(() => {
    if (columns.length) {
      const suggested = suggestMapping(columns)
      setMapping(suggested)
    }
  }, [columns])

  useEffect(() => {
    if (!siteFilterColumn || !rawData) return
    try {
      const df = new dfd.DataFrame(rawData)
      const vals = Array.from(new Set(df.column(siteFilterColumn).values.filter(Boolean)))
      setSiteUniqueValues(vals)
      setSiteFilterValue(vals[0] || '')
    } catch (e) {
      const vals = Array.from(new Set(rawData.map(r => r[siteFilterColumn]).filter(Boolean)))
      setSiteUniqueValues(vals)
      setSiteFilterValue(vals[0] || '')
    }
  }, [siteFilterColumn, rawData])

  // compute unique uploaded types from the selected type column
  const uniqueTypes = mapping.type && rawData ? (() => {
    try {
      const df = new dfd.DataFrame(rawData)
      return Array.from(new Set(df.column(mapping.type).values.filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => v)))
    } catch (e) {
      return Array.from(new Set(rawData.map(r => r[mapping.type] || '').filter(Boolean)))
    }
  })() : []

  // when we reveal the point-type mapping step, prefill kodeAssignments using inference
  // populate kodeAssignments when we reach the point-type mapping step (pageStep === 4)
  useEffect(() => {
    if (pageStep !== 4) return
    const base = {}
    uniqueTypes.forEach(t => { base[t] = inferKodeForType(t) })
    setKodeAssignments(base)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageStep, mapping.type, rawData])

  function handleNext() {
    if (pageStep === 1) {
      setPageStep(2)
      return
    }

    if (pageStep === 2) {
      // reveal optional site filter
      setPageStep(3)
      return
    }

    if (pageStep === 3) {
      // reveal point-type mapping
      setPageStep(4)
      return
    }

    // pageStep === 3 -> final Next: prepare df (danfo DataFrame) and pass mapping + kodeAssignments
    let outDf = null
    try {
      outDf = new dfd.DataFrame(rawData)
      if (siteFilterColumn && siteFilterValue) outDf = outDf.query(row => row[siteFilterColumn] === siteFilterValue)
    } catch (e) {
      let arr = rawData
      if (siteFilterColumn && siteFilterValue) arr = arr.filter(r => r[siteFilterColumn] === siteFilterValue)
      outDf = new dfd.DataFrame(arr)
    }
    onNext({ df: outDf, columns, mapping, suffixUsed, kodeAssignments })
  }

  // auto-scroll to the header for the current pageStep whenever it changes
  useEffect(() => {
    const refMap = {
      2: mappingRef,
      3: siteFilterRef,
      4: pointTypeRef,
    }
    const ref = refMap[pageStep]
    if (ref && ref.current) {
      // smooth scroll so the header is at the top of the viewport
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pageStep])

  function inferKodeForType(t) {
    if (!t && t !== 0) return '-'
    const s = String(t).toLowerCase()
    if (s.includes('kit')) return '-'
    if (s.includes('numeric')) return 'Number'
    if (s.includes('bool')) return 'Bool'
    if (s.includes('string') || s.includes('enum')) return 'Str'
    return '-'
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">1) Upload CSV</Typography>
              <Box sx={{ mt: 1 }}>
                <Button variant="contained" component="label">
                  Choose CSV file
                  <input hidden type="file" accept=".csv" onChange={(e) => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]) }} />
                </Button>
              </Box>

              {/* Only show mapping + options after a file is uploaded */}
              {rawData && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" ref={mappingRef}>2) Column mapping</Typography>
                  {REQUIRED_KEYS.map(key => (
                    key === 'suffix' ? (
                      // special handling for suffix: switch position and selector visibility depend on suffixUsed
                      <Box key={key} sx={{ mt: 1 }}>
                        {/* When suffixes are NOT used: show only the switch left-aligned with the other selectors */}
                        {!suffixUsed ? (
                          // no label shown when suffix selector is hidden; add a slight left margin for spacing
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 1 }}>
                              <FormControlLabel control={<Switch checked={suffixUsed} onChange={(_, v) => setSuffixUsed(v)} />} label="Suffixes used?" />
                            </Box>
                          </Box>
                        ) : (
                          // When suffixes are used: show the switch (left) and the suffix selector below as a full-width control
                          <>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <FormControlLabel control={<Switch checked={suffixUsed} onChange={(_, v) => setSuffixUsed(v)} />} label="Suffixes used?" />
                            </Box>
                            <FormControl fullWidth sx={{ mt: 1 }}>
                              <InputLabel>{key}</InputLabel>
                              <Select value={mapping[key] || ''} label={key} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })} sx={{ flex: 1 }}>
                                <MenuItem value="">-- select --</MenuItem>
                                {columns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </>
                        )}
                      </Box>
                    ) : (
                      <FormControl fullWidth sx={{ mt: 1 }} key={key}>
                        <InputLabel>{key}</InputLabel>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Select value={mapping[key] || ''} label={key} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })} sx={{ flex: 1 }}>
                            <MenuItem value="">-- select --</MenuItem>
                            {columns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                          </Select>
                        </Box>
                      </FormControl>
                    )
                  ))}

                  {pageStep >= 3 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" ref={siteFilterRef}>3) Optional site filter</Typography>
                        <FormControlLabel
                          control={<Switch checked={siteFilterEnabled} onChange={(_, v) => {
                            setSiteFilterEnabled(v)
                            if (!v) {
                              setSiteFilterColumn('')
                              setSiteFilterValue('')
                              setSiteUniqueValues([])
                            }
                          }} />}
                          label="Filter by site"
                        />
                      </Box>

                      {siteFilterEnabled && (
                        <>
                          <FormControl fullWidth sx={{ mt: 1 }}>
                            <InputLabel>site column</InputLabel>
                            <Select value={siteFilterColumn} label="site column" onChange={(e) => setSiteFilterColumn(e.target.value)}>
                              <MenuItem value="">-- none --</MenuItem>
                              {columns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                          </FormControl>

                          {siteUniqueValues.length > 0 && (
                            <FormControl fullWidth sx={{ mt: 1 }}>
                              <InputLabel>site value</InputLabel>
                              <Select value={siteFilterValue} label="site value" onChange={(e) => setSiteFilterValue(e.target.value)}>
                                {siteUniqueValues.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                              </Select>
                            </FormControl>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Point type mapping revealed after pressing Next twice (pageStep === 4) */}
                  {pageStep >= 4 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" ref={pointTypeRef}>4) Point type mapping</Typography>
                      <Box sx={{ mt: 1 }}>
                        {(() => {
                          const items = uniqueTypes.slice()
                          const control = items.filter(t => String(t || '').toLowerCase().startsWith('control')).sort((a, b) => a.localeCompare(b))
                          const rest = items.filter(t => !String(t || '').toLowerCase().startsWith('control')).sort((a, b) => a.localeCompare(b))
                          const ordered = [...control, ...rest]
                          return ordered.map(t => {
                            const warn = !String(t || '').toLowerCase().startsWith('control')
                            return (
                              <Grid container spacing={1} key={t} sx={{ p: 1, alignItems: 'center' }}>
                                <Grid item xs={7} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, display: 'inline-flex', justifyContent: 'center' }}>
                                    {warn ? <WarningAmberIcon color="error" fontSize="small" /> : null}
                                  </Box>
                                  <Typography>{t}</Typography>
                                </Grid>
                                <Grid item xs={5}>
                                  <FormControl fullWidth>
                                    <InputLabel>KODE type</InputLabel>
                                    <Select value={kodeAssignments[t] || inferKodeForType(t)} label="KODE type" onChange={(e) => setKodeAssignments({ ...kodeAssignments, [t]: e.target.value })}>
                                      <MenuItem value="">-- select --</MenuItem>
                                      <MenuItem value="Number">Number</MenuItem>
                                      <MenuItem value="Bool">Bool</MenuItem>
                                      <MenuItem value="Str">Str</MenuItem>
                                      <MenuItem value="-">-</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Grid>
                              </Grid>
                            )
                          })
                        })()}
                      </Box>
                    </>
                  )}

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={handleNext} disabled={!rawData}>Next</Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
