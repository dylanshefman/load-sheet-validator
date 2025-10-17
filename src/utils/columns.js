function normalize(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g, '') }

function levenshtein(a, b){
  if(!a) return b.length; if(!b) return a.length;
  const matrix = Array.from({length: b.length+1}, (_, i) => Array(a.length+1).fill(0))
  for(let i=0;i<=b.length;i++) matrix[i][0]=i
  for(let j=0;j<=a.length;j++) matrix[0][j]=j
  for(let i=1;i<=b.length;i++){
    for(let j=1;j<=a.length;j++){
      matrix[i][j] = Math.min(
        matrix[i-1][j]+1,
        matrix[i][j-1]+1,
        matrix[i-1][j-1] + (b[i-1]===a[j-1] ? 0 : 1)
      )
    }
  }
  return matrix[b.length][a.length]
}

const desired = {
  slotpath: ['slotpath', 'slotpathdecoded', 'slot', 'path'],
  pointName: ['pointname', 'point', 'name'],
  handle: ['handle', 'id'],
  type: ['type', 'pointtype'],
  field: ['addtoskyspark', 'addtosky', 'field'],
  deviceName: ['devicename', 'device'],
  canonicalType: ['canonicaltype', 'canonical'],
  suffix: ['suffix']
}

export function suggestMapping(columns){
  const normalized = columns.map(c => ({ raw: c, n: normalize(c) }))
  const result = {}
  Object.entries(desired).forEach(([key, variants])=>{
    // find exact substring match
    let best = ''
    let bestScore = 1e9
    for(const col of normalized){
      for(const v of variants){
        if(col.n.includes(v)) { best = col.raw; bestScore = 0; break }
      }
      if(bestScore===0) break
    }
    if(!best){
      // use levenshtein to find closest
      for(const col of normalized){
        const dist = levenshtein(col.n, variants[0])
        if(dist < bestScore){ bestScore = dist; best = col.raw }
      }
    }
    result[key] = best || ''
  })
  return result
}
