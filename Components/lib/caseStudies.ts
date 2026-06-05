export interface CaseStudy {
  name: string
  description: string
  year: string
  tags: string
}

export function parseCSV(csv: string): CaseStudy[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())

    const get = (key: string) => values[headers.indexOf(key)] ?? ''

    return {
      name: get('case_study_name'),
      description: get('case_study_description'),
      year: get('year'),
      tags: get('tags'),
    }
  })
}
