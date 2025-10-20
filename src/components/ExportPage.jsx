import React, { useState, useEffect } from 'react'
import * as dfd from 'danfojs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Box, Typography, Paper, Switch, FormControlLabel, Button, InputLabel, Select, MenuItem, FormControl, Card, CardContent, RadioGroup, FormLabel, Radio } from '@mui/material'
import MatchPanel from './MatchPanel'

// ExportPage props:
// - initialDf: final dataframe object (may be danfo DataFrame or plain array)
// - onBack: callback to return to steps
export default function ExportPage({ initialDf, onBack, originalMapping = {}, originalColumns = [] }) {
    const [includeMappings, setIncludeMappings] = useState(false)
    const [uploaded, setUploaded] = useState(null)
    const [anchorCols, setAnchorCols] = useState([])
    const [uploadedCols, setUploadedCols] = useState([])
    // mapping objects to keep anchor (initialDf) and facet (uploaded) columns separate
    const [initialDfMapping, setInitialDfMapping] = useState({
        slotpath: originalMapping && originalMapping.slotpath ? originalMapping.slotpath : '',
        deviceName: originalMapping && originalMapping.deviceName ? originalMapping.deviceName : 'deviceName',
        canonicalType: originalMapping && originalMapping.canonicalType ? originalMapping.canonicalType : 'canonicalType',
        field: originalMapping && originalMapping.field ? originalMapping.field : 'field'
    })
    const [facetDfMapping, setFacetDfMapping] = useState({ slotpath: '', facets: '' })
    const [pageStep, setPageStep] = useState(1) // 1: upload, 2: assignment
    const [mappingSource, setMappingSource] = useState('upload') // 'upload' or 'original'
    const [matchGroups, setMatchGroups] = useState({ matches: [], misses: [] })
    const [merged, setMerged] = useState(null)

    useEffect(() => {
        // derive column list from initialDf if possible
        try {
            if (!initialDf) return
            if (Array.isArray(initialDf)) {
                const first = initialDf[0] || {}
                setAnchorCols(Object.keys(first))
            } else if (initialDf && typeof initialDf.columns !== 'undefined') {
                // danfo DataFrame
                setAnchorCols(initialDf.columns || [])
            } else if (initialDf && typeof initialDf.head === 'function') {
                // danfo-like
                try {
                    setAnchorCols(initialDf.columns || [])
                } catch (e) {}
            }
        } catch (e) {}
    }, [initialDf])

    // when the originalColumns prop is provided and mappingSource is original, use those columns
    useEffect(() => {
        if (mappingSource === 'original' && Array.isArray(originalColumns) && originalColumns.length) {
            setAnchorCols(originalColumns)
            // prefill anchor slotpath from original mapping if present
            if (originalMapping && originalMapping.slotpath) setInitialDfMapping(m => ({ ...m, slotpath: originalMapping.slotpath }))
            // move to assignment step
            setPageStep(2)
        }
    }, [mappingSource, originalColumns, originalMapping])

    function handleUploadFile(file) {
        if (!file) return
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setUploaded(results.data || [])
                // set available columns to choose from uploaded file
                const first = (results.data && results.data[0]) || {}
                setUploadedCols(Object.keys(first || {}))
                setFacetDfMapping({ slotpath: '', facets: '' })
            }
        })
    }

    function handleProcessFacets() {
        // perform left join between initialDf (anchor) and the facets CSV (uploaded) or the original initialDf if mappingSource === 'original'
        if (!facetDfMapping.facets) return
        // build facetsMap from uploaded if upload source, or from initialDf if original source
        let facetsRows = uploaded || []
        const facetsMap = {}
        if (mappingSource === 'upload' && Array.isArray(uploaded) && facetDfMapping.slotpath) {
            // normalize uploaded slotpath values: strip leading 'slot:' if present and trim
            facetsRows = uploaded.map(orig => {
                const copy = { ...orig }
                const col = facetDfMapping.slotpath
                if (typeof copy[col] === 'string') {
                    let val = copy[col].trim()
                    if (val.startsWith('slot:')) val = val.replace(/^slot:/, '').trim()
                    copy[col] = val
                } else if (copy[col] !== undefined && copy[col] !== null) {
                    // coerce non-strings to string
                    let val = String(copy[col]).trim()
                    if (val.startsWith('slot:')) val = val.replace(/^slot:/, '').trim()
                    copy[col] = val
                }
                return copy
            })
        }

        facetsRows.forEach(r => {
            const key = String(r[facetDfMapping.slotpath] || '').trim()
            if (!key) return
            facetsMap[key] = r[facetDfMapping.facets]
        })
        //let facetsDf = new dfd.DataFrame(facetsRows);
        //facetsDf.rename({ mapper: { [facetDfMapping.slotpath]: "slotpath", [facetDfMapping.facets]: "facets" }, axis: 1, inplace: true });

        //let merged = new dfd.merge({ left: new dfd.DataFrame(initialDf), right: facetsDf, on: ['slotpath'], how: 'left' })
        //console.log(facetsDf.head());
        //console.log(merged.head());

        //console.log("Facets DF:", facetsDf.head());

        // derive anchor rows from initialDf (array)
        let anchorRows = []
        try {
          anchorRows = dfd.toJSON(initialDf, { format: 'column' }) || []
        } catch (e) {
          // fallback: if initialDf is already an array
          if (Array.isArray(initialDf)) anchorRows = initialDf
        }

        // perform left join: for each anchor row, look for facets in facetsMap (only if mappingSource === 'upload'); if mappingSource === 'original', assume facets are in anchorRows already (facetsCol assigned)
        const matches = []
        const misses = []
        anchorRows.forEach((r, idx) => {
            const sp = String(r[initialDfMapping.slotpath || (originalMapping && originalMapping.slotpath) || 'slotpath'] || '').trim()
            let facetsVal = null
            if (mappingSource === 'upload') {
                facetsVal = facetsMap[sp]
            } else {
                // original source: take facets from the anchor row itself
                facetsVal = r[facetDfMapping.facets]
            }
            const out = {
                slotpath: sp,
                row: idx + 1,
                deviceName: r[initialDfMapping.deviceName || (originalMapping && originalMapping.deviceName) || 'deviceName'] || r.deviceName || '',
                canonicalType: r[initialDfMapping.canonicalType || (originalMapping && originalMapping.canonicalType) || 'canonicalType'] || r.canonicalType || '',
                field: r[initialDfMapping.field || (originalMapping && originalMapping.field) || 'field'] || r.field || '',
                facets: facetsVal || ''
            }
            if (facetsVal !== undefined && facetsVal !== null && String(facetsVal).trim() !== '') matches.push(out)
            else misses.push(out)
        })

        setMatchGroups({ matches: matches, misses: misses })


    }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Export final table</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControlLabel control={<Switch checked={includeMappings} onChange={(e) => setIncludeMappings(e.target.checked)} />} label="Include point units/enum mappings?" />
      </Box>

      {includeMappings ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <FormLabel id="mapping-source-label">Source for facet mappings</FormLabel>
            <RadioGroup row aria-labelledby="mapping-source-label" value={mappingSource} onChange={(e) => {
              const val = e.target.value
              setMappingSource(val)
              // reset uploaded state when switching to upload
              if (val === 'upload') {
                setUploaded(null)
                setUploadedCols([])
                setFacetDfMapping({ slotpath: '', facets: '' })
                setPageStep(1)
              }
            }}>
              <FormControlLabel value="upload" control={<Radio />} label="Upload new CSV" />
              <FormControlLabel value="original" control={<Radio />} label="Use original uploaded sheet" />
            </RadioGroup>
          </Box>
          {/* Step 1: upload mapping CSV (only when uploading) */}
                  {mappingSource === 'upload' && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">1) Upload mapping CSV</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button variant="contained" component="label">
                    Choose CSV file
                    <input hidden type="file" accept=".csv,text/csv" onChange={(e) => { if (e.target.files && e.target.files[0]) { handleUploadFile(e.target.files[0]); setPageStep(2) } }} />
                  </Button>
                  <Button variant="text" onClick={() => { setUploaded(null); setUploadedCols([]); setFacetDfMapping({ slotpath: '', facets: '' }); setPageStep(1) }}>Clear</Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 2: assignment - only show after a file is uploaded */}
          {/* Step 2: assignment - show for both sources once we have columns to choose from */}
          {(mappingSource === 'original' || uploaded) && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">2) Column assignment</Typography>

                <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  {/* If original source, prefill slotpathCol and show it as disabled/read-only; if upload, allow selection */}
                  {mappingSource === 'upload' ? (
                    <FormControl fullWidth sx={{ minWidth: 220 }}>
                      <InputLabel id="slotpath-col-label">Facet CSV slotpath column</InputLabel>
                      <Select labelId="slotpath-col-label" value={facetDfMapping.slotpath} label="Facet CSV slotpath column" onChange={(e) => setFacetDfMapping(m => ({ ...m, slotpath: e.target.value }))}>
                        <MenuItem value="">-- select --</MenuItem>
                        {uploadedCols.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth sx={{ minWidth: 220 }}>
                      <InputLabel id="slotpath-col-label">Anchor slotpath column</InputLabel>
                      <Select labelId="slotpath-col-label" value={initialDfMapping.slotpath} label="Anchor slotpath column" onChange={(e) => setInitialDfMapping(m => ({ ...m, slotpath: e.target.value }))}>
                        <MenuItem value="">-- select --</MenuItem>
                        {anchorCols.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  <FormControl fullWidth sx={{ minWidth: 220 }}>
                    <InputLabel id="facets-col-label">Facets column</InputLabel>
                    <Select labelId="facets-col-label" value={facetDfMapping.facets} label="Facets column" onChange={(e) => setFacetDfMapping(m => ({ ...m, facets: e.target.value }))}>
                      <MenuItem value="">-- select --</MenuItem>
                      {(mappingSource === 'upload' ? uploadedCols : anchorCols).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button variant="contained" onClick={handleProcessFacets} disabled={!facetDfMapping.facets}>Process facets</Button>
                </Box>

              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>No mappings will be included — export the final CSV as-is.</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {/* navigation is now handled in the app header; only show export when mappings are NOT included */}
        {!includeMappings && (
          <Button variant="contained" color="primary" onClick={() => {
            // Build export rows with the specific 25-column schema requested when mappings are NOT included.
            // Assumptions: initialDf rows contain (or mostly contain) columns like:
            // - handle, slotpath, pointName, kode_point_type, suffix, field, deviceName, canonicalType
            // If a column is missing we fallback to empty string.
            try {
              const toRows = (df) => {
                if (!df) return []
                if (Array.isArray(df)) return df
                // prefer danfojs helper toJSON to produce array of row objects
                try {
                  if (typeof dfd !== 'undefined' && dfd && typeof dfd.toJSON === 'function') {
                    // request row format (array of objects)
                    return dfd.toJSON(df, { format: 'column' }) || []
                  }
                } catch (e) {
                  // fallthrough to other strategies
                }
                if (df && typeof df.values !== 'undefined') {
                  const colsLocal = df.columns || []
                  return df.values.map(vals => {
                    const obj = {}
                    colsLocal.forEach((c, i) => { obj[c] = vals[i] })
                    return obj
                  })
                }
                return []
              }

              const rows = toRows(initialDf)

              const exportRows = rows.map(r => {
                const fieldVal = (r[initialDfMapping.field] || r.field || '')
                const isBang = String(fieldVal).trim() === '!'
                return {
                  'Device External ID': 1,
                  'Device External Path': 'slot:/Drivers',
                  'Device Name': 'Drivers',
                  'Device Location': '',
                  'Device Canonical Type': r[initialDfMapping.canonicalType] || r.canonicalType || '',
                  'Point External ID': r.handle || r['handle'] || '',
                  'Point External Path': r[initialDfMapping.slotpath] || r.slotpath || '',
                  'Point Name': r.pointName || r['pointName'] || '',
                  'Point Unit': '',
                  'Point Enum': '',
                  'Point Writable': '',
                  'Point Kind': r.kode_point_type || r['kode_point_type'] || '',
                  'Point Min Val': '',
                  'Point Max Val': '',
                  'Point Ontology Suffix': r.suffix || r['suffix'] || '',
                  'Point Ontology Prefix': '',
                  'Point Ontology Field': isBang ? '' : (fieldVal || ''),
                  'Point Ontology Display Name': isBang ? (r.pointName || r['pointName'] || '') : '',
                  'Point Ontology Precision': '',
                  'Point Ontology Default in Graph': '',
                  'Point Ontology Unit': '',
                  'Point Ontology Cov Tolerance': '',
                  'Point Ontology Write Map': '',
                  'Point Ontology Read Map Key Values': '',
                  'Virtual Device Name': r[initialDfMapping.deviceName] || r.deviceName || ''
                }
              })

              // build a single-sheet workbook
              const ws = XLSX.utils.json_to_sheet(exportRows || [])
              const wb = XLSX.utils.book_new()
              XLSX.utils.book_append_sheet(wb, ws, 'Export')
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
              const blob = new Blob([wbout], { type: 'application/octet-stream' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'export.xlsx'
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            } catch (e) {
              console.warn('Export failed', e)
            }
          }}>Export CSV</Button>
        )}
      </Box>

      {/* Render match/miss panels after processing */}
      {matchGroups.matches && matchGroups.matches.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <MatchPanel title="Matched facets" rows={matchGroups.matches} color="green" showFacets={true} />
        </Box>
      )}
      {matchGroups.misses && matchGroups.misses.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <MatchPanel title="Unmatched rows" rows={matchGroups.misses} color="red" showFacets={false} />
        </Box>
      )}
    </Box>
  )
}
