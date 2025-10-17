import * as dfd from 'danfojs'
import Papa from 'papaparse'

export function mkKey(s, i) { return `s${s}-c${i}` }

export function buildErrorForCheck(detail, label) {
  try {
    if (!detail) return { type: 'check-failed', detail: { message: label } }
    if (detail.offendingRows) return { type: 'check-failed', detail: { message: detail.message || label, offendingRows: detail.offendingRows } }
    if (Array.isArray(detail)) {
      const offendingRows = detail.map(d => {
        if (d.records && d.rows) return d.rows.map((rn, i) => ({ row: rn, record: d.records[i], fields: Object.keys(d.records[i] || {}) }))
        if (d.record && d.row) return { row: d.row, record: d.record, fields: Object.keys(d.record || {}) }
        if (d.row || d.record) return { row: d.row || null, record: d.record || d, fields: Object.keys(d.record || d || {}) }
        return { row: null, record: d, fields: [] }
      }).flat()
      return { type: 'check-failed', detail: { message: label, offendingRows } }
    }
    if (typeof detail === 'string') return { type: 'check-failed', detail: { message: `${label}: ${detail}` } }
    return { type: 'check-failed', detail: { message: label, raw: detail } }
  } catch (e) {
    return { type: 'check-failed', detail: { message: label, raw: detail } }
  }
}

export function getRecordsArray(df) {
  try {
    if (!df) return []
    if (Array.isArray(df)) return df
    if (typeof dfd.toJSON === 'function') {
      const json = dfd.toJSON(df, { format: 'column' })
      if (Array.isArray(json)) return json
    }
    if (df.values && Array.isArray(df.values) && Array.isArray(df.columns)) {
      return df.values.map(row => Object.fromEntries(df.columns.map((c, i) => [c, row[i]])))
    }
  } catch (e) { console.warn('getRecordsArray failed', e) }
  return []
}

export function exportCSV(filename, rows) {
  try {
    if (!rows || !rows.length) return
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) { console.warn('exportCSV failed', e) }
}

export function downloadOffendingRows(check, checkStatuses) {
  try {
    const status = checkStatuses[check.key]
    if (!status) return
    const built = buildErrorForCheck(status.detail, check.label)
    const offending = (built && built.detail && built.detail.offendingRows) || []
    const records = offending.map(o => o && o.record).filter(Boolean)
    if (!records.length) return
    const fname = `${check.label.replace(/\s+/g, '_')}_offending.csv`
    exportCSV(fname, records)
  } catch (e) { console.warn('downloadOffendingRows failed', e) }
}

export function downloadCleanedTable(check, checkStatuses, records) {
  try {
    const status = checkStatuses[check.key]
    if (!status) return
    const built = buildErrorForCheck(status.detail, check.label)
    const offending = (built && built.detail && built.detail.offendingRows) || []
    const offendingSet = new Set(offending.map(o => o && o.row))
    const cleaned = (records || []).filter((r, i) => !offendingSet.has(i+1))
    if (!cleaned.length) return
    const fname = `cleaned_table_without_${check.label.replace(/\s+/g, '_')}.csv`
    exportCSV(fname, cleaned)
  } catch (e) { console.warn('downloadCleanedTable failed', e) }
}
