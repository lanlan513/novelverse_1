// 资料导入管线：解析不规范年份 → 校验字段 → 去重合并 → 输出索引
// 设计目标：单条坏数据不能中断整批导入；所有问题都进入 report，界面可回溯。

export const EVENT_TYPES = {
  movement: { label: '文学运动', color: '#7d6b9e', glyph: '潮' },
  author: { label: '作家生平', color: '#3f7d8c', glyph: '人' },
  work: { label: '小说出版', color: '#cc5c42', glyph: '著' },
  society: { label: '社会事件', color: '#b08d3e', glyph: '世' },
}
export const TYPE_ORDER = ['movement', 'author', 'work', 'society']

export const REVIEW = {
  verified: { label: '已审核', tone: 'ok' },
  pending: { label: '待审核', tone: 'warn' },
  disputed: { label: '存疑', tone: 'risk' },
}

const CN_DIGITS = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }

function cnNumberToInt(text) {
  const chars = [...text]
  if (chars.some(c => !(c in CN_DIGITS))) return null
  let n = 0
  for (const c of chars) n = n * 10 + CN_DIGITS[c]
  return chars.length ? n : null
}

/**
 * 解析各种不规范年份表达，返回 { year, endYear, prec, approximate, raw }
 * prec: y | range | decade | century
 */
export function parseYear(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { year: Math.trunc(input), endYear: Math.trunc(input), prec: 'y', approximate: false, raw: String(input) }
  }
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  let text = raw.replace(/\s+/g, '')
  let bc = /公元[前]|公元前|BC|B\.C\.|前(?=[0-9零〇一二两三四五六七八九])/i.test(text)
  let approximate = /约|大约|大概|左右|前后|circa|ca\.?|around|about/i.test(text)
  // 注意保留"年代"二字供后续年代规则匹配，只去掉不构成"年代"的单字"年"
  text = text.replace(/约|大约|大概|左右|前后|circa|ca\.?|around|about|公元/g, '').replace(/年(?!代)/g, '')
  bc = bc || /^前/.test(text)
  text = text.replace(/^前/, '')

  // 时间段：1925-1927 / 1925～1927 / 1925至1927
  const range = text.match(/^([0-9]{2,4})\s*[-–—~～至到]\s*([0-9]{2,4})$/)
  if (range) {
    const start = Number(range[1]); let end = Number(range[2])
    if (end < start) end += Math.round(start / 100) * 100 // "1925-27" 简写
    if (end < start) return null
    return { year: bc ? -start : start, endYear: bc ? -end : end, prec: 'range', approximate, raw }
  }

  // 纯数字
  if (/^-?[0-9]{1,4}$/.test(text)) {
    const n = Number(text)
    return { year: bc ? -n : n, endYear: bc ? -n : n, prec: 'y', approximate, raw }
  }

  // 1850年代 / 1850s
  const decade = text.match(/^([0-9]{3,4})(?:年代|s)$/i)
  if (decade) {
    const n = Number(decade[1]); const start = bc ? -(n + 9) : n
    return { year: start, endYear: bc ? -n : n + 9, prec: 'decade', approximate: true, raw }
  }

  // 8世纪 / 公元前8世纪
  const century = text.match(/^([0-9]{1,2})世纪$/)
  if (century) {
    const c = Number(century[1])
    if (bc) return { year: -(c * 100), endYear: -((c - 1) * 100 + 1), prec: 'century', approximate: true, raw }
    return { year: (c - 1) * 100 + 1, endYear: c * 100, prec: 'century', approximate: true, raw }
  }

  // 中文数字：一九二三 / 二十年代
  const cnPlain = text.match(/^([零〇一二两三四五六七八九]{2,4})$/)
  if (cnPlain) {
    const n = cnNumberToInt(cnPlain[1])
    if (n !== null) return { year: bc ? -n : n, endYear: bc ? -n : n, prec: 'y', approximate, raw }
  }
  const cnDecade = text.match(/^([零〇一二两三四五六七八九]{2,4})年代$/)
  if (cnDecade) {
    const n = cnNumberToInt(cnDecade[1])
    if (n !== null) return { year: n, endYear: n + 9, prec: 'decade', approximate: true, raw }
  }

  return null
}

export function precisionLabel(ev) {
  if (ev.prec === 'range') return `${formatYear(ev.year)} – ${formatYear(ev.endYear)}`
  if (ev.prec === 'decade') return ev.year < 0 ? `公元前 ${-ev.endYear} 年代` : `${ev.year} 年代`
  if (ev.prec === 'century') return ev.year < 0 ? `公元前 ${Math.ceil(-ev.year / 100)} 世纪` : `${Math.ceil(ev.year / 100)} 世纪`
  return (ev.approximate ? '约 ' : '') + formatYear(ev.year)
}

export function formatYear(y) {
  if (y < 0) return `公元前 ${-y}`
  if (y < 100) return `公元 ${y}`
  return `${y}`
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : (value == null ? '' : String(value).trim())
}

/**
 * 规范化并导入一批原始记录。
 * @returns {{ events: Array, report: { imported:number, skipped:Array, merged:Array, missingSource:number } }}
 */
export function importEvents(rows, { sourceName = '导入资料' } = {}) {
  const skipped = []
  const accepted = []
  let missingSource = 0

  rows.forEach((row, index) => {
    const problems = []
    const id = cleanString(row.id) || `row-${sourceName}-${index}`
    const title = cleanString(row.title)
    if (!title) problems.push('缺少标题')

    const type = EVENT_TYPES[row.type] ? row.type : null
    if (!type) problems.push(`类型不合法（${cleanString(row.type) || '空'}）`)

    const parsed = parseYear(row.year)
    if (!parsed) problems.push(`年份无法解析（${cleanString(row.year) || '缺失'}）`)

    if (problems.length) {
      skipped.push({ id, index, title: title || '（无标题）', rawYear: cleanString(row.year) || '—', problems })
      return
    }

    const review = REVIEW[row.review] ? row.review : 'pending'
    const reviewNote = !REVIEW[row.review] ? '原始资料未标注审核状态，已默认置为"待审核"' : ''
    const source = cleanString(row.source)
    const sourceUrl = cleanString(row.sourceUrl)
    if (!source) missingSource += 1

    accepted.push({
      id,
      type,
      title,
      summary: cleanString(row.summary) || '暂无摘要，资料整理中。',
      location: cleanString(row.location),
      year: parsed.year,
      endYear: Math.max(parsed.endYear, parsed.year),
      prec: parsed.prec,
      approximate: parsed.approximate,
      yearRaw: parsed.raw,
      source: source || '',
      sourceUrl: /^https?:\/\//.test(sourceUrl) ? sourceUrl : '',
      review,
      reviewNote,
    })
  })

  // 去重：同类型 + 同标题 + 同年份视为重复，保留首条并合并来源
  const merged = []
  const byKey = new Map()
  for (const ev of accepted) {
    const key = `${ev.type}§${ev.title.replace(/\s+/g, '')}§${ev.year}`
    const existing = byKey.get(key)
    if (existing) {
      const extraSource = ev.source && ev.source !== existing.source ? ev.source : ''
      if (extraSource) existing.sources = [...(existing.sources || [existing.source]), extraSource]
      // 更乐观地处理审核：任一来源 verified 则保留原状态，disputed 不覆盖 verified
      if (existing.review === 'pending' && ev.review === 'verified') existing.review = 'verified'
      merged.push({ id: ev.id, keptId: existing.id, title: ev.title, extraSource })
    } else {
      ev.sources = ev.source ? [ev.source] : []
      byKey.set(key, ev)
    }
  }

  const events = [...byKey.values()].sort((a, b) => a.year - b.year || a.endYear - b.endYear || a.title.localeCompare(b.title, 'zh'))
  return { events, report: { imported: events.length, skipped, merged, missingSource, total: rows.length } }
}
