import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock3, FileUp, Link2, MapPin, RotateCcw, SearchX, ShieldCheck, X, ZoomIn, ZoomOut } from 'lucide-react'

const API = '/api'
const userId = 'user-demo'
const STORAGE_KEY = 'novelverse-timeline-v1'
const MIN_PX = 0.35 // 每年最小像素（最远缩放）
const MAX_PX = 280 // 每年最大像素（最近缩放）
const ROW_H = 26
const MAX_ROWS = 6
const TYPE_ORDER = ['movement', 'author', 'publication', 'social']
const TYPE_META = {
  movement: { label: '文学运动', color: '#758b78' },
  author: { label: '作家生平', color: '#b07a4f' },
  publication: { label: '小说出版', color: '#cc5c42' },
  social: { label: '社会事件', color: '#5b7a8c' }
}
const STATUS_META = {
  verified: { label: '已审核', icon: ShieldCheck, className: 'verified' },
  pending: { label: '待审核', icon: Clock3, className: 'pending' },
  incomplete: { label: '待补充来源', icon: AlertTriangle, className: 'incomplete' }
}
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]
const ERA_CHIPS = [['新文化运动', 1915], ['五四', 1919], ['抗战时期', 1938], ['新时期文学', 1978], ['新世纪', 2000]]

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const shortYear = e => {
  if (e.sortYear == null) return ''
  switch (e.precision) {
    case 'circa': return `约${e.year}`
    case 'decade': return `${e.year}年代`
    case 'range': return `${e.year}–${e.endYear}`
    default: return String(e.year)
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'x-user-id': userId, ...(options.headers || {}) } })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) { const err = new Error(payload.message || '请求失败'); Object.assign(err, payload, { status: res.status }); throw err }
  return payload
}

function loadSavedView() {
  const fallback = { filters: { movement: true, author: true, publication: true, social: true }, px: 8, center: 1920, selectedId: null }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!raw || typeof raw !== 'object') return fallback
    return {
      filters: { ...fallback.filters, ...(raw.filters || {}) },
      px: clamp(Number(raw.px) || fallback.px, MIN_PX, MAX_PX),
      center: Number.isFinite(Number(raw.center)) ? Number(raw.center) : fallback.center,
      selectedId: typeof raw.selectedId === 'string' ? raw.selectedId : null
    }
  } catch { return fallback }
}

export default function TimelineView({ onNotice }) {
  const saved = useMemo(loadSavedView, [])
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [skipped, setSkipped] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [filters, setFilters] = useState(saved.filters)
  const [view, setView] = useState({ px: saved.px, center: saved.center })
  const [selectedId, setSelectedId] = useState(saved.selectedId)
  const [showImport, setShowImport] = useState(false)
  const [jumpYear, setJumpYear] = useState('')
  const [jumpError, setJumpError] = useState('')
  const [width, setWidth] = useState(0)

  const viewportRef = useRef(null)
  const observerRef = useRef(null)
  const viewRef = useRef(view)
  const widthRef = useRef(0)
  const boundsRef = useRef({ min: 900, max: 2100 })
  const rafRef = useRef(0)
  const animRef = useRef(0)
  const pendingRef = useRef(null)
  const suppressClickRef = useRef(false)
  const dragRef = useRef({ pointers: new Map(), startX: 0, startCenter: 0, moved: false, pinch: null, samples: [] })

  const clampView = useCallback(v => ({ px: clamp(v.px, MIN_PX, MAX_PX), center: clamp(v.center, boundsRef.current.min, boundsRef.current.max) }), [])
  const setViewBoth = useCallback(next => {
    const v = clampView(typeof next === 'function' ? next(viewRef.current) : next)
    viewRef.current = v
    setView(v)
  }, [clampView])
  // rAF 节流：拖动期间每帧最多触发一次状态更新，保证移动端流畅
  const scheduleSet = useCallback(partial => {
    pendingRef.current = { ...(pendingRef.current || {}), ...partial }
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const p = pendingRef.current; pendingRef.current = null
      if (p) setViewBoth(v => ({ ...v, ...p }))
    })
  }, [setViewBoth])
  const cancelAnimation = useCallback(() => { cancelAnimationFrame(animRef.current); animRef.current = 0 }, [])

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const payload = await api('/timeline/events')
      setEvents(payload.events); setStats(payload.stats); setSkipped(payload.skipped || 0)
    } catch (err) { setLoadError(err.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // 根据事件范围约束可浏览边界
  useEffect(() => {
    const years = events.map(e => e.sortYear).filter(y => y != null)
    if (years.length) boundsRef.current = { min: Math.min(...years) - 60, max: Math.max(...years) + 60 }
  }, [events])

  // 视口尺寸监听（ResizeObserver），容器出现/尺寸变化时更新
  const viewportCallbackRef = useCallback(el => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
    viewportRef.current = el
    if (el) {
      const w = el.getBoundingClientRect().width
      widthRef.current = w; setWidth(w)
      const ro = new ResizeObserver(entries => { const nw = entries[0].contentRect.width; widthRef.current = nw; setWidth(nw) })
      ro.observe(el); observerRef.current = ro
    }
  }, [])
  useEffect(() => () => { observerRef.current?.disconnect(); cancelAnimationFrame(rafRef.current); cancelAnimationFrame(animRef.current) }, [])

  // 刷新后恢复筛选与定位：变更后防抖写入 localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, px: Math.round(view.px * 100) / 100, center: Math.round(view.center * 100) / 100, selectedId })) } catch { /* 存储不可用时静默降级 */ }
    }, 250)
    return () => clearTimeout(timer)
  }, [filters, view, selectedId])

  const filtered = useMemo(() => events.filter(e => filters[e.type]), [events, filters])
  const known = useMemo(() => filtered.filter(e => e.sortYear != null), [filtered])
  const unknown = useMemo(() => filtered.filter(e => e.sortYear == null), [filtered])
  const selected = useMemo(() => events.find(e => e.id === selectedId) || null, [events, selectedId])
  const typeCounts = useMemo(() => { const c = { movement: 0, author: 0, publication: 0, social: 0 }; for (const e of events) c[e.type]++; return c }, [events])

  // 视窗裁剪 + 泳道行排布：只渲染可见范围附近的事件，资料量大时保持流畅
  const layout = useMemo(() => {
    const px = view.px, w = width
    if (!w) return { lanes: [], ticks: [], totalHeight: 300 }
    const startYear = view.center - w / 2 / px
    const endYear = view.center + w / 2 / px
    const buffer = 320 / px
    const step = TICK_STEPS.find(s => s * px >= 78) || 500
    const ticks = []
    for (let y = Math.ceil(startYear / step) * step; y <= endYear; y += step) ticks.push({ year: y, x: (y - startYear) * px })
    const lanes = []
    for (const type of TYPE_ORDER) {
      if (!filters[type]) continue
      const list = known.filter(e => e.type === type && e.sortYear >= startYear - buffer && e.sortYear <= endYear + buffer)
      const rows = []
      const items = list.map(e => {
        const x = (e.sortYear - startYear) * px
        const labelPx = e.title.length * 11 + 46
        let row = rows.findIndex(end => x - end >= 8)
        if (row === -1) { rows.push(-Infinity); row = rows.length - 1 }
        if (row >= MAX_ROWS) row = MAX_ROWS - 1
        rows[row] = x + labelPx
        return { event: e, x, row }
      })
      lanes.push({ type, items, height: Math.max(1, Math.min(rows.length, MAX_ROWS)) * ROW_H + 12 })
    }
    return { lanes, ticks, totalHeight: clamp(34 + lanes.reduce((s, l) => s + l.height, 0), 240, 480) }
  }, [view, width, known, filters])

  // ---------- 交互动画 ----------
  const animateCenterTo = useCallback((target, duration = 450) => {
    cancelAnimation()
    const from = viewRef.current.center
    const delta = target - from
    if (!delta) return
    const t0 = performance.now()
    const stepFn = now => {
      const t = clamp((now - t0) / duration, 0, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setViewBoth(v => ({ ...v, center: from + delta * ease }))
      if (t < 1) animRef.current = requestAnimationFrame(stepFn)
    }
    animRef.current = requestAnimationFrame(stepFn)
  }, [setViewBoth, cancelAnimation])

  const startMomentum = useCallback(velocity => { // velocity: 年/毫秒
    cancelAnimation()
    let v = velocity
    let last = performance.now()
    const stepFn = now => {
      const dt = now - last; last = now
      const dy = v * dt
      v *= Math.pow(0.94, dt / 16.7)
      if (Math.abs(dy) < 0.004) return
      setViewBoth(cur => ({ ...cur, center: cur.center - dy }))
      animRef.current = requestAnimationFrame(stepFn)
    }
    animRef.current = requestAnimationFrame(stepFn)
  }, [setViewBoth, cancelAnimation])

  // ---------- 指针拖动（鼠标 + 触屏统一处理，支持双指捏合缩放） ----------
  const onPointerDown = useCallback(e => {
    cancelAnimation()
    const d = dragRef.current
    viewportRef.current?.setPointerCapture?.(e.pointerId)
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (d.pointers.size === 1) {
      d.startX = e.clientX; d.startCenter = viewRef.current.center; d.moved = false
      d.samples = [{ t: performance.now(), x: e.clientX }]
    } else if (d.pointers.size === 2) {
      const [a, b] = [...d.pointers.values()]
      d.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), px: viewRef.current.px, center: viewRef.current.center }
      d.moved = true
    }
  }, [cancelAnimation])

  const onPointerMove = useCallback(e => {
    const d = dragRef.current
    if (!d.pointers.has(e.pointerId)) return
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (d.pinch && d.pointers.size >= 2) {
      const [a, b] = [...d.pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist > 0 && d.pinch.dist > 0 && viewportRef.current) {
        const px = clamp(d.pinch.px * dist / d.pinch.dist, MIN_PX, MAX_PX)
        const rect = viewportRef.current.getBoundingClientRect()
        const midX = (a.x + b.x) / 2 - rect.left
        const w = widthRef.current
        const yearAtMid = d.pinch.center - w / 2 / d.pinch.px + midX / d.pinch.px
        scheduleSet({ px, center: yearAtMid - midX / px + w / 2 / px })
      }
      return
    }
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) {
      d.samples.push({ t: performance.now(), x: e.clientX })
      if (d.samples.length > 6) d.samples.shift()
      scheduleSet({ center: d.startCenter - dx / viewRef.current.px })
    }
  }, [scheduleSet])

  const endPointer = useCallback(e => {
    const d = dragRef.current
    if (!d.pointers.has(e.pointerId)) return
    d.pointers.delete(e.pointerId)
    if (d.pinch) {
      d.pinch = null
      if (d.pointers.size === 1) { const [p] = [...d.pointers.values()]; d.startX = p.x; d.startCenter = viewRef.current.center; d.samples = [] }
      return
    }
    if (d.pointers.size === 0 && d.moved) {
      suppressClickRef.current = true
      setTimeout(() => { suppressClickRef.current = false }, 120)
      const s = d.samples
      if (s.length >= 2) {
        const dt = s[s.length - 1].t - s[0].t
        if (dt > 0) { const vx = (s[s.length - 1].x - s[0].x) / dt; if (Math.abs(vx) > 0.05) startMomentum(vx / viewRef.current.px) }
      }
    }
  }, [startMomentum])

  // 滚轮缩放（以光标位置为锚点），需非 passive 监听以阻止页面缩放/滚动
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      cancelAnimation()
      const rect = el.getBoundingClientRect()
      const offsetX = e.clientX - rect.left
      const v = viewRef.current
      const px = clamp(v.px * (e.deltaY < 0 ? 1.18 : 1 / 1.18), MIN_PX, MAX_PX)
      const yearAt = v.center - widthRef.current / 2 / v.px + offsetX / v.px
      setViewBoth({ px, center: yearAt - offsetX / px + widthRef.current / 2 / px })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [loading, loadError, setViewBoth, cancelAnimation])

  const zoomBy = useCallback(factor => {
    cancelAnimation()
    setViewBoth(v => ({ ...v, px: v.px * factor }))
  }, [setViewBoth, cancelAnimation])

  const fitAll = useCallback(() => {
    const years = events.map(e => e.sortYear).filter(y => y != null)
    if (!years.length || !widthRef.current) return
    const min = Math.min(...years), max = Math.max(...years)
    cancelAnimation()
    setViewBoth({ px: (widthRef.current - 80) / Math.max(10, max - min), center: (min + max) / 2 })
  }, [events, setViewBoth, cancelAnimation])

  const onJump = useCallback(e => {
    e.preventDefault()
    const y = Number(jumpYear)
    if (!Number.isInteger(y) || y < 0 || y > 2100) { setJumpError('请输入 0–2100 之间的年份'); return }
    setJumpError('')
    animateCenterTo(clamp(y, boundsRef.current.min, boundsRef.current.max))
  }, [jumpYear, animateCenterTo])

  const selectEvent = useCallback((id, pan = false) => {
    setSelectedId(id)
    if (pan) { const e = events.find(x => x.id === id); if (e?.sortYear != null) animateCenterTo(e.sortYear) }
  }, [events, animateCenterTo])

  const navEvent = useCallback(dir => {
    if (!selected) return
    const idx = filtered.findIndex(e => e.id === selected.id)
    const next = filtered[idx + dir]
    if (next) selectEvent(next.id, true)
    else onNotice({ type: 'info', text: dir < 0 ? '已经是第一条了' : '已经是最后一条了' })
  }, [filtered, selected, selectEvent, onNotice])

  const onKeyDown = useCallback(e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); animateCenterTo(viewRef.current.center - 120 / viewRef.current.px, 200) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); animateCenterTo(viewRef.current.center + 120 / viewRef.current.px, 200) }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.25) }
    else if (e.key === '-') { e.preventDefault(); zoomBy(1 / 1.25) }
    else if (e.key === 'Escape') setSelectedId(null)
  }, [animateCenterTo, zoomBy])

  const onImported = useCallback(payload => {
    setEvents(payload.events); setStats(payload.stats); setSkipped(payload.skipped || 0)
    onNotice({ type: 'success', text: `已导入 ${payload.imported} 条事件` })
  }, [onNotice])

  if (loading) return <section className="page-section timeline-page"><div className="loading-state"><div className="spinner"></div><span>正在铺开文学史长卷…</span></div></section>
  if (loadError) return <section className="page-section timeline-page"><div className="empty-state"><div className="empty-icon"><CircleAlert size={25} /></div><h2>时间轴加载失败</h2><p>{loadError}</p><button className="primary-btn" onClick={load}>重新加载</button></div></section>

  return <section className="page-section timeline-page">
    <div className="page-heading tl-heading">
      <div>
        <span className="eyebrow">TIMELINE / 文学史</span>
        <h1>文学史事件时间轴</h1>
        <p>拖动平移 · 滚轮或双指缩放 · 点击事件查看详情</p>
      </div>
      <button className="secondary-btn" onClick={() => setShowImport(true)}><FileUp size={16} />导入资料</button>
    </div>

    {stats && <div className="tl-stats">
      共 {stats.total} 条事件
      {stats.merged > 0 && <> · 已自动合并 {stats.merged} 条重复记录</>}
      {stats.incomplete > 0 && <> · {stats.incomplete} 条待补充来源</>}
      {stats.unknownTime > 0 && <> · {stats.unknownTime} 条时间待定</>}
      {skipped > 0 && <> · <span className="tl-stats-warn">{skipped} 条源数据损坏已跳过</span></>}
    </div>}

    <div className="tl-controls">
      <div className="tl-filters" role="group" aria-label="事件类型筛选">
        {TYPE_ORDER.map(t => <button key={t} className={`tl-chip ${filters[t] ? 'active' : ''}`} style={{ '--chip': TYPE_META[t].color }} onClick={() => setFilters(f => ({ ...f, [t]: !f[t] }))} aria-pressed={filters[t]}>
          <span className="tl-chip-dot" />{TYPE_META[t].label}<em>{typeCounts[t]}</em>
        </button>)}
      </div>
      <div className="tl-tools">
        <form className="tl-jump" onSubmit={onJump}>
          <input value={jumpYear} onChange={e => { setJumpYear(e.target.value); setJumpError('') }} placeholder="跳转年份" inputMode="numeric" aria-label="跳转到年份" />
          <button type="submit" className="secondary-btn">跳转</button>
        </form>
        {ERA_CHIPS.map(([label, y]) => <button key={label} type="button" className="tl-era" onClick={() => animateCenterTo(y)}>{label}</button>)}
        <div className="tl-zoom">
          <button className="icon-btn" onClick={() => zoomBy(1 / 1.4)} aria-label="缩小时间轴"><ZoomOut size={16} /></button>
          <button className="icon-btn" onClick={() => zoomBy(1.4)} aria-label="放大时间轴"><ZoomIn size={16} /></button>
          <button className="icon-btn" onClick={fitAll} aria-label="查看全部事件"><RotateCcw size={15} /></button>
        </div>
      </div>
    </div>
    {jumpError && <p className="tl-jump-error" role="alert">{jumpError}</p>}

    {unknown.length > 0 && <div className="tl-unknown">
      <span><Clock3 size={13} />时间待定</span>
      {unknown.map(e => <button key={e.id} onClick={() => selectEvent(e.id)}>{e.title}</button>)}
    </div>}

    <div className={`tl-layout ${selected ? 'with-detail' : ''}`}>
      <div className="tl-viewport" ref={viewportCallbackRef} style={{ height: layout.totalHeight }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}
        onKeyDown={onKeyDown} tabIndex={0} role="application" aria-label="文学史时间轴，左右拖动浏览，方向键平移">
        {width > 0 && <>
          <div className="tl-axis">{layout.ticks.map(t => <div key={t.year} className="tl-tick" style={{ left: t.x }}><i /><span>{t.year}</span></div>)}</div>
          {layout.lanes.map(lane => <div key={lane.type} className="tl-lane" style={{ height: lane.height }}>
            <span className="tl-lane-label" style={{ color: TYPE_META[lane.type].color }}>{TYPE_META[lane.type].label}</span>
            {lane.items.map(({ event: e, x, row }) => <button key={e.id}
              className={`tl-event ${selectedId === e.id ? 'selected' : ''} st-${e.status}`}
              style={{ left: x, top: 6 + row * ROW_H, '--c': TYPE_META[e.type].color }}
              title={`${e.displayDate} · ${e.title}`}
              onClick={() => { if (!suppressClickRef.current) selectEvent(e.id) }}>
              <i className="tl-dot" /><span>{shortYear(e)} {e.title}</span>
            </button>)}
          </div>)}
          {known.length === 0 && <div className="tl-empty"><SearchX size={20} />当前筛选条件下暂无事件</div>}
        </>}
      </div>
      {selected && <EventDetail event={selected} onClose={() => setSelectedId(null)} onNav={navEvent} />}
    </div>

    {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={onImported} />}
  </section>
}

function EventDetail({ event, onClose, onNav }) {
  const status = STATUS_META[event.status] || STATUS_META.pending
  const StatusIcon = status.icon
  const imprecise = ['circa', 'decade', 'unknown'].includes(event.precision)
  return <aside className="tl-detail" aria-label="事件详情">
    <div className="tl-detail-head">
      <span className="tl-type" style={{ background: TYPE_META[event.type].color }}>{TYPE_META[event.type].label}</span>
      <span className={`tl-status ${status.className}`}><StatusIcon size={13} />{status.label}</span>
      <button className="icon-btn close" onClick={onClose} aria-label="关闭详情"><X size={17} /></button>
    </div>
    <h2>{event.title}</h2>
    {event.mergedCount > 1 && <p className="tl-merged">已合并 {event.mergedCount} 条重复记录，来源已汇总去重。</p>}
    <dl className="tl-meta">
      <div><dt><CalendarDays size={13} />时间</dt><dd>{event.displayDate}{imprecise && event.precision !== 'unknown' ? '（年份不精确）' : ''}</dd></div>
      <div><dt><MapPin size={13} />地点</dt><dd>{event.location || '地点待考'}</dd></div>
      <div><dt><ShieldCheck size={13} />审核状态</dt><dd>{status.label}</dd></div>
    </dl>
    <p className="tl-summary">{event.summary || '暂无摘要，等待资料补充。'}</p>
    <div className="tl-sources">
      <h3><Link2 size={13} />资料来源</h3>
      {event.sources.length > 0
        ? <ul>{event.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>)}</ul>
        : <p className="tl-no-source">来源缺失 · 该条目可信度待验证，欢迎通过「导入资料」补充。</p>}
    </div>
    <div className="tl-detail-nav">
      <button className="secondary-btn" onClick={() => onNav(-1)}><ChevronLeft size={15} />上一条</button>
      <button className="secondary-btn" onClick={() => onNav(1)}>下一条<ChevronRight size={15} /></button>
    </div>
  </aside>
}

const IMPORT_EXAMPLE = JSON.stringify([
  { title: '《示例小说》出版', type: 'publication', precision: 'year', year: 1950, location: '上海', summary: '一句话介绍这条事件。', sources: [{ title: '《中国现代文学史》' }] },
  { title: '某文学运动兴起', type: 'movement', precision: 'circa', year: 1930, location: '北京', summary: '年份不精确时 precision 可用 circa / decade / range / unknown。', sources: [] }
], null, 2)

function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('')
  const [clientError, setClientError] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setClientError(''); setResult(null)
    let data
    try { data = JSON.parse(text) } catch (err) { setClientError(`JSON 解析失败：${err.message}`); return }
    const list = Array.isArray(data) ? data : data?.events
    if (!Array.isArray(list) || list.length === 0) { setClientError('需要是事件数组，或形如 { "events": [...] } 的对象'); return }
    setBusy(true)
    try {
      const payload = await api('/timeline/import', { method: 'POST', body: JSON.stringify({ events: list }) })
      setResult(payload)
      if (payload.imported > 0) onImported(payload)
    } catch (err) {
      if (err.errors) setResult(err) // 全部行校验失败：服务端返回 400 + 行级错误
      else setClientError(err.message || '导入失败，请稍后重试')
    } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal tl-import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="modal-header">
        <div><span className="eyebrow">IMPORT / 资料</span><h2 id="import-title">导入事件资料</h2></div>
        <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={19} /></button>
      </div>
      <div className="tl-import-body">
        <p className="field-hint">粘贴 JSON 格式的事件数组。字段：title（必填）、type（movement / author / publication / social）、year、precision（exact / year / circa / decade / range / unknown）、location、summary、sources。</p>
        <textarea className="tl-import-textarea" value={text} onChange={e => setText(e.target.value)} placeholder='[{ "title": "…", "type": "publication", "year": 1950 }]' aria-label="事件 JSON 数据" />
        {clientError && <p className="field-error" role="alert">{clientError}</p>}
        {result && <div className={`tl-import-result ${result.errors?.length ? 'has-errors' : ''}`} role="status">
          <p>{result.imported > 0 ? `成功导入 ${result.imported} 条事件。` : '没有事件被导入。'}{result.errors?.length > 0 && ` ${result.errors.length} 条未通过校验：`}</p>
          {result.errors?.length > 0 && <ul>{result.errors.map((er, i) => <li key={i}>第 {er.index} 行{er.title ? `（${er.title}）` : ''}：{er.message}</li>)}</ul>}
        </div>}
        <div className="modal-actions">
          <button type="button" className="text-btn" onClick={() => setText(IMPORT_EXAMPLE)}>插入示例格式</button>
          <button type="button" className="text-btn" onClick={onClose}>{result?.imported > 0 ? '完成' : '取消'}</button>
          <button type="button" className="primary-btn" disabled={busy || !text.trim()} onClick={submit}>{busy ? '导入中…' : '校验并导入'}</button>
        </div>
      </div>
    </div>
  </div>
}
