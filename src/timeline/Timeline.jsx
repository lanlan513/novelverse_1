import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock, ExternalLink, FileWarning, Filter, LocateFixed, MapPin, Milestone, Minus, Plus, RotateCcw, ScrollText, ShieldQuestion, X, ZoomIn } from 'lucide-react'
import { RAW_EVENTS, generateStressEvents } from './data'
import { EVENT_TYPES, TYPE_ORDER, REVIEW, importEvents, parseYear, precisionLabel, formatYear } from './normalize'

const STORAGE_KEY = 'novelverse-timeline-v1'
const DOMAIN_MIN = -650
const DOMAIN_MAX = 2050
const MIN_WIDTH = 15
const MAX_WIDTH = 2900
const CLUSTER_PX = 26

const ERAS = [
  { id: 'pre-qin', label: '先秦', center: -350, width: 450 },
  { id: 'han-tang', label: '汉唐', center: 380, width: 900 },
  { id: 'song-yuan', label: '宋元', center: 1150, width: 500 },
  { id: 'ming-qing', label: '明清', center: 1600, width: 560 },
  { id: 'modern', label: '近代', center: 1880, width: 120 },
  { id: 'may-fourth', label: '五四前后', center: 1930, width: 55 },
  { id: 'postwar', label: '战后', center: 1975, width: 70 },
  { id: 'contemp', label: '当代', center: 1995, width: 80 },
]

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function fitViewport(center, width) {
  const w = clamp(width, MIN_WIDTH, MAX_WIDTH)
  const span = DOMAIN_MAX - DOMAIN_MIN
  if (w >= span) return { center: (DOMAIN_MIN + DOMAIN_MAX) / 2, width: w }
  const pad = w * 0.12
  const minCenter = DOMAIN_MIN - pad + w / 2
  const maxCenter = DOMAIN_MAX + pad - w / 2
  return { center: clamp(center, minCenter, maxCenter), width: w }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed) return null
    return parsed
  } catch { return null }
}

export default function Timeline({ onNotice }) {
  const prefs = useRef(loadPrefs()).current

  const [stressOn, setStressOn] = useState(() => Boolean(prefs?.stressOn))
  const [activeTypes, setActiveTypes] = useState(() => Array.isArray(prefs?.types) && prefs.types.length ? prefs.types.filter(t => EVENT_TYPES[t]) : TYPE_ORDER)
  const [reviewFilter, setReviewFilter] = useState(() => REVIEW[prefs?.review] ? prefs.review : 'all')
  const [viewport, setViewport] = useState(() => {
    const start = fitViewport(Number.isFinite(prefs?.center) ? prefs.center : 1250, Number.isFinite(prefs?.width) ? prefs.width : 1400)
    return start
  })
  const [selectedId, setSelectedId] = useState(() => typeof prefs?.selectedId === 'string' ? prefs.selectedId : null)
  const [showReport, setShowReport] = useState(false)
  const [yearInput, setYearInput] = useState('')

  // 导入（含异常数据与压测包），用 useMemo 缓存，切换资料包不丢报告
  const importResult = useMemo(() => {
    const rows = [...RAW_EVENTS, ...(stressOn ? generateStressEvents(1600) : [])]
    return importEvents(rows, { sourceName: 'literary-timeline' })
  }, [stressOn])
  const { events, report } = importResult

  // 持久化筛选 / 视口 / 选中项：刷新后恢复
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ types: activeTypes, review: reviewFilter, center: viewport.center, width: viewport.width, selectedId, stressOn }))
    } catch { /* 存储不可用时静默降级 */ }
  }, [activeTypes, reviewFilter, viewport, selectedId, stressOn])

  const trackRef = useRef(null)
  const [trackWidth, setTrackWidth] = useState(900)
  useEffect(() => {
    if (!trackRef.current) return
    const el = trackRef.current
    const update = () => setTrackWidth(Math.max(320, el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ppy = trackWidth / viewport.width
  const leftYear = viewport.center - viewport.width / 2
  const yearToX = useCallback(year => (year - leftYear) * ppy, [leftYear, ppy])

  const filtered = useMemo(() => events.filter(ev => activeTypes.includes(ev.type) && (reviewFilter === 'all' || ev.review === reviewFilter)), [events, activeTypes, reviewFilter])
  const pointEvents = useMemo(() => filtered.filter(ev => ev.prec === 'y'), [filtered])
  const rangeEvents = useMemo(() => filtered.filter(ev => ev.prec !== 'y'), [filtered])
  const selected = events.find(ev => ev.id === selectedId) || null

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(TYPE_ORDER.map(t => [t, 0]))
    for (const ev of events) counts[ev.type] += 1
    return counts
  }, [events])

  // 平滑动画跳转（拖动以外的操作都走这里）
  const animRef = useRef(null)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const animateTo = useCallback((targetCenter, targetWidth) => {
    const target = fitViewport(targetCenter, targetWidth)
    cancelAnimationFrame(animRef.current)
    const from = viewportRef.current
    const t0 = performance.now()
    const dur = 280
    const tick = now => {
      const t = clamp((now - t0) / dur, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setViewport(fitViewport(from.center + (target.center - from.center) * eased, from.width + (target.width - from.width) * eased))
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }, [])
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  const zoomAt = useCallback((anchorYear, factor) => {
    setViewport(v => {
      const width = clamp(v.width * factor, MIN_WIDTH, MAX_WIDTH)
      const center = anchorYear - (anchorYear - v.center) * (width / v.width)
      return fitViewport(center, width)
    })
  }, [])

  // 滚轮缩放（非 passive，阻止页面滚动）
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      cancelAnimationFrame(animRef.current)
      const rect = el.getBoundingClientRect()
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const anchor = leftYear + ratio * viewport.width
      const factor = Math.exp(e.deltaY * 0.0014)
      zoomAt(anchor, factor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [leftYear, viewport.width, zoomAt])

  // ---------- 拖动 / 惯性 / 双指缩放（指针事件，统一鼠标与触摸） ----------
  const drag = useRef({ pointers: new Map(), mode: null, moved: false })
  const momentumRAF = useRef(0)
  const momentumFrames = useRef(0)
  const trackWidthRef = useRef(trackWidth)
  trackWidthRef.current = trackWidth

  const stopMomentum = () => { cancelAnimationFrame(momentumRAF.current) }
  const startMomentum = velocityPxPerMs => {
    stopMomentum()
    const step = () => {
      // px/ms → 年/帧：用当前视口宽度换算，缩放中途也不跳变
      const yearVelocity = velocityPxPerMs * 16.7 / (trackWidthRef.current / viewportRef.current.width)
      setViewport(v => fitViewport(v.center + yearVelocity * Math.pow(0.93, momentumFrames.current), v.width))
      momentumFrames.current += 1
      if (Math.abs(velocityPxPerMs * Math.pow(0.93, momentumFrames.current)) > 0.02) momentumRAF.current = requestAnimationFrame(step)
    }
    momentumFrames.current = 0
    momentumRAF.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(momentumRAF.current), [])

  const onPointerDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    stopMomentum(); cancelAnimationFrame(animRef.current)
    drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current.moved = false
    if (drag.current.pointers.size === 2) {
      const [a, b] = [...drag.current.pointers.values()]
      const rect = trackRef.current.getBoundingClientRect()
      drag.current.mode = 'pinch'
      drag.current.pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        midRatio: clamp(((a.x + b.x) / 2 - rect.left) / rect.width, 0, 1),
        width: viewport.width, center: viewport.center,
      }
    } else {
      drag.current.mode = 'pan'
      drag.current.pan = { startX: e.clientX, startCenter: viewport.center, lastX: e.clientX, lastT: performance.now(), v: 0 }
    }
  }

  const onPointerMove = e => {
    const d = drag.current
    if (!d.pointers.has(e.pointerId)) return
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (d.mode === 'pinch' && d.pointers.size >= 2) {
      const [a, b] = [...d.pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const { dist: d0, midRatio, width: w0, center: c0 } = d.pinch
      const width = clamp(w0 * (d0 / Math.max(dist, 1)), MIN_WIDTH, MAX_WIDTH)
      const anchor = c0 - w0 / 2 + midRatio * w0
      const center = anchor - (anchor - c0) * (width / w0)
      setViewport(fitViewport(center, width))
      d.moved = true
    } else if (d.mode === 'pan') {
      const dx = e.clientX - d.pan.startX
      if (Math.abs(e.clientX - d.pan.lastX) > 1.5 || Math.abs(dx) > 6) d.moved = true
      const now = performance.now()
      const dt = now - d.pan.lastT
      if (dt > 0) {
        const instantV = (e.clientX - d.pan.lastX) / dt
        d.pan.v = d.pan.v * 0.6 + instantV * 0.4
      }
      d.pan.lastX = e.clientX; d.pan.lastT = now
      setViewport(v => fitViewport(d.pan.startCenter - dx / (trackWidthRef.current / v.width), v.width))
    }
  }

  const onPointerUp = e => {
    const d = drag.current
    const wasTouch = e.pointerType === 'touch'
    d.pointers.delete(e.pointerId)
    if (d.mode === 'pinch' && d.pointers.size === 1) {
      // 双指抬起一根：剩下的手指无缝转为平移
      const [p] = [...d.pointers.values()]
      d.mode = 'pan'
      d.pan = { startX: p.x, startCenter: viewportRef.current.center, lastX: p.x, lastT: performance.now(), v: 0 }
    } else if (d.mode === 'pan' && d.pointers.size === 0) {
      if (!d.moved) d.mode = null
      else if (wasTouch && Math.abs(d.pan.v) > 0.5) startMomentum(d.pan.v)
      d.mode = null
    }
  }

  // 阻止拖动结束后的误触点击（鼠标与触摸统一处理）
  const clickGuard = e => {
    if (!drag.current.moved) return
    e.stopPropagation()
    e.preventDefault()
    drag.current.moved = false
  }

  // ---------- 视口内聚合：距离过近的点事件合并为簇，簇外点事件参与标签泳道分配 ----------
  const { clusters, lanes } = useMemo(() => {
    const bufferYears = viewport.width * 0.08
    const minY = leftYear - bufferYears
    const maxY = leftYear + viewport.width + bufferYears
    const visible = []
    for (const ev of pointEvents) {
      if (ev.year < minY) continue
      if (ev.year > maxY) break
      visible.push(ev)
    }
    const result = []
    for (const ev of visible) {
      const x = yearToX(ev.year)
      const last = result[result.length - 1]
      if (last && Math.abs(x - last.x) < CLUSTER_PX) {
        if (!last.cluster) {
          // 把普通点升级为簇
          const prevEvent = last.event
          result[result.length - 1] = { cluster: true, x: last.x, events: [prevEvent], count: 1 }
        }
        const target = result[result.length - 1]
        target.count += 1
        target.events.push(ev)
        target.x = (target.x * (target.count - 1) + x) / target.count
      } else {
        result.push({ cluster: false, x, event: ev })
      }
    }
    // 标签泳道：全部排在主轴下方，避免与顶部时间段条带重叠；放不下就只留圆点
    const laneEnds = []
    const labelMap = new Map()
    result.forEach(item => {
      if (item.cluster) return
      const ev = item.event
      const labelW = clamp(ev.title.length * 13 + 8, 48, 190)
      const start = item.x - labelW / 2
      let lane = laneEnds.findIndex(end => end < start - 12)
      if (lane === -1 && laneEnds.length < 3) lane = laneEnds.length
      if (lane !== -1 && lane < 3) {
        laneEnds[lane] = start + labelW
        labelMap.set(ev.id, { side: 'down', lane })
      }
    })
    return { clusters: result, lanes: labelMap }
  }, [pointEvents, viewport.width, viewport.center, yearToX, leftYear, trackWidth])

  // 跨时间段事件（运动/年代/世纪）打包成横向条带
  const rangeBars = useMemo(() => {
    const bufferYears = viewport.width * 0.05
    const laneEnds = []
    const bars = []
    const sorted = [...rangeEvents].sort((a, b) => a.year - b.year)
    for (const ev of sorted) {
      if (ev.endYear < leftYear - bufferYears || ev.year > leftYear + viewport.width + bufferYears) continue
      let lane = laneEnds.findIndex(end => end <= ev.year - 2)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0) }
      laneEnds[lane] = ev.endYear
      const x = yearToX(ev.year)
      const w = Math.max(3, yearToX(ev.endYear) - x)
      bars.push({ ev, x, w, lane })
    }
    return { bars, laneCount: Math.min(4, laneEnds.length || 1) }
  }, [rangeEvents, leftYear, viewport.width, yearToX])

  // 年份刻度
  const ticks = useMemo(() => {
    if (!(ppy > 0) || !Number.isFinite(ppy)) return []
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]
    const step = steps.find(s => s * ppy >= 92) || 2000
    const out = []
    const start = Math.ceil(leftYear / step) * step
    for (let y = start; y <= leftYear + viewport.width; y += step) out.push({ year: y, x: yearToX(y) })
    return out
  }, [ppy, leftYear, viewport.width, yearToX])

  const selectEvent = id => setSelectedId(id)

  const toggleType = t => setActiveTypes(list => list.includes(t) ? (list.length === 1 ? list : list.filter(x => x !== t)) : [...list, t])

  const jumpEra = era => { animateTo(era.center, era.width) }
  const jumpYear = e => {
    e.preventDefault()
    const parsed = parseYear(yearInput)
    if (!parsed) { onNotice?.({ type: 'error', text: `无法识别年份：${yearInput}（试试"前221""约1750""1850年代"）` }); return }
    animateTo(parsed.year, Math.min(viewport.width, 200))
    setYearInput('')
  }

  const onDoubleClick = e => {
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    zoomAt(leftYear + ratio * viewport.width, 0.5)
  }

  const onKeyDown = e => {
    if (e.target.tagName === 'INPUT') return
    if (e.key === 'ArrowLeft') { setViewport(v => fitViewport(v.center - v.width * 0.12, v.width)) }
    else if (e.key === 'ArrowRight') { setViewport(v => fitViewport(v.center + v.width * 0.12, v.width)) }
    else if (e.key === '+' || e.key === '=') { zoomAt(viewport.center, 0.7) }
    else if (e.key === '-') { zoomAt(viewport.center, 1.4) }
    else if (e.key === 'Escape') setSelectedId(null)
  }

  const rangeBandH = rangeBars.laneCount * 30 + 14
  const skippedCount = report.skipped.length

  return (
    <section className="page-section timeline-page" onKeyDown={onKeyDown} tabIndex={-1}>
      <div className="page-heading timeline-heading">
        <div>
          <span className="eyebrow">LITERARY HISTORY / 时间轴</span>
          <h1>文学史事件时间轴</h1>
          <p>按年代穿行文学运动、作家生平、小说出版与社会事件——双指或滚轮缩放，拖动浏览。</p>
        </div>
        <div className="timeline-count">
          <Milestone size={15} />
          共 <strong>{events.length}</strong> 条 · 视口内 <strong>{clusters.length}</strong> 组
        </div>
      </div>

      {/* 工具条 */}
      <div className="tl-toolbar">
        <div className="tl-filters" role="group" aria-label="类型筛选">
          {TYPE_ORDER.map(t => {
            const meta = EVENT_TYPES[t]
            const on = activeTypes.includes(t)
            return <button key={t} className={`tl-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleType(t)}>
              <span className="tl-chip-dot" style={{ background: on ? meta.color : '#c9c5bc' }}>{meta.glyph}</span>
              {meta.label}<em>{typeCounts[t]}</em>
            </button>
          })}
        </div>
        <div className="tl-toolbar-right">
          <label className="tl-review-select">
            <Filter size={13} />
            <select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} aria-label="审核状态筛选">
              <option value="all">全部审核状态</option>
              <option value="verified">已审核</option>
              <option value="pending">待审核</option>
              <option value="disputed">存疑</option>
            </select>
          </label>
          <button className={`tl-icon-toggle ${stressOn ? 'on' : ''}`} onClick={() => setStressOn(v => !v)} title="载入或卸载 1600 条模拟资料，用于验证大数据量流畅度">
            <ScrollText size={14} />{stressOn ? '卸载压测资料' : '压测资料 ×1600'}
          </button>
          <button className="tl-report-btn" onClick={() => setShowReport(true)}>
            <FileWarning size={14} />导入报告
            {skippedCount > 0 && <span className="tl-badge">{skippedCount}</span>}
          </button>
        </div>
      </div>

      {/* 快速跳转 + 缩放 */}
      <div className="tl-quickbar">
        <div className="tl-eras">
          <span className="tl-quick-label"><LocateFixed size={12} />跳转</span>
          {ERAS.map(era => <button key={era.id} className="tl-era-btn" onClick={() => jumpEra(era)}>{era.label}</button>)}
        </div>
        <form className="tl-year-form" onSubmit={jumpYear}>
          <input value={yearInput} onChange={e => setYearInput(e.target.value)} placeholder="输入年份，如 1919 / 前221 / 约1750" aria-label="跳转到年份" />
          <button type="submit"><ZoomIn size={14} />定位</button>
        </form>
        <div className="tl-zoom">
          <button onClick={() => zoomAt(viewport.center, 1.45)} aria-label="缩小"><Minus size={15} /></button>
          <span className="tl-zoom-readout">{Math.round(viewport.width)} 年</span>
          <button onClick={() => zoomAt(viewport.center, 0.69)} aria-label="放大"><Plus size={15} /></button>
          <button className="tl-fit-btn" onClick={() => animateTo((DOMAIN_MIN + DOMAIN_MAX) / 2, MAX_WIDTH)} title="总览全部年代"><RotateCcw size={13} /></button>
        </div>
      </div>

      {/* 时间轴画布 */}
      <div
        ref={trackRef}
        className={`tl-track ${drag.current.mode === 'pan' ? 'dragging' : ''}`}
        style={{ '--range-band-h': `${rangeBandH}px`, height: rangeBandH + 316 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={clickGuard}
        onDoubleClick={onDoubleClick}
        role="application"
        aria-label="可缩放拖动的文学史时间轴"
      >
        {/* 年份刻度 */}
        <div className="tl-ruler" style={{ height: rangeBandH + 70 }}>
          {ticks.map(t => (
            <div key={t.year} className="tl-tick" style={{ left: t.x }}>
              <span className="tl-tick-line" />
              <span className="tl-tick-label">{formatYear(t.year)}</span>
            </div>
          ))}
        </div>

        {/* 跨时间段条带（运动 / 年代 / 世纪） */}
        <div className="tl-ranges" style={{ height: rangeBandH }}>
          {rangeBars.bars.map(({ ev, x, w, lane }) => (
            <button
              key={`bar-${ev.id}`}
              className="tl-range-bar"
              style={{ left: x, width: w, top: 8 + lane * 30, borderColor: EVENT_TYPES[ev.type].color, color: EVENT_TYPES[ev.type].color }}
              title={`${ev.title}（${precisionLabel(ev)}）`}
              onClick={e => { if (drag.current.moved) return; selectEvent(ev.id) }}
            >
              <span className="tl-range-glyph" style={{ background: EVENT_TYPES[ev.type].color }}>{EVENT_TYPES[ev.type].glyph}</span>
              {w > 70 && <span className="tl-range-text">{ev.title}</span>}
            </button>
          ))}
        </div>

        {/* 主轴 */}
        <div className="tl-axis" />

        {/* 点事件与簇（仅渲染视口内节点 —— 虚拟渲染） */}
        <div className="tl-events">
          {clusters.map((item, ci) => item.cluster ? (
            <button
              key={`c-${ci}-${item.events[0].id}`}
              className="tl-cluster"
              style={{ left: item.x, width: 22 + Math.min(26, item.count * 1.4), height: 22 + Math.min(26, item.count * 1.4) }}
              title={`${item.count} 个事件，点击放大`}
              onClick={e => { e.stopPropagation(); zoomAt(item.year, 0.35) }}
            >{item.count}</button>
          ) : (
            <EventDot key={item.event.id} ev={item.event} x={item.x} label={lanes.get(item.event.id)} active={item.event.id === selectedId} onSelect={selectEvent} />
          ))}
        </div>

        <div className="tl-hint">滚轮/双指缩放 · 左右拖动平移 · ← → 键移动</div>
        {filtered.length === 0 && <div className="tl-track-empty"><CircleHelp size={20} /><span>当前筛选组合下没有事件，试试放宽类型或审核状态</span></div>}
      </div>

      {/* 事件详情：桌面右侧抽屉，手机底部弹层 */}
      {selected && <EventDetail ev={selected} onClose={() => setSelectedId(null)} onNav={id => setSelectedId(id)} onLocate={ev => animateTo(ev.year, Math.min(viewport.width, 120))} events={filtered} />}

      {showReport && <ImportReport report={report} stressOn={stressOn} onClose={() => setShowReport(false)} />}
    </section>
  )
}

function EventDot({ ev, x, label, active, onSelect }) {
  const meta = EVENT_TYPES[ev.type]
  const style = { left: x, '--dot-color': meta.color }
  return (
    <button className={`tl-dot-wrap ${active ? 'active' : ''}`} style={style} onClick={e => { e.stopPropagation(); onSelect(ev.id) }} aria-label={`${ev.title}，${precisionLabel(ev)}`}>
      {label && <span className={`tl-dot-label ${label.side} lane-${label.lane}`}>{ev.title}</span>}
      <span className="tl-dot" style={{ borderColor: meta.color, background: ev.review === 'verified' ? meta.color : '#fffdfa' }}>
        {ev.review !== 'verified' && <i className="tl-dot-inner" style={{ background: meta.color }} />}
      </span>
    </button>
  )
}

function EventDetail({ ev, onClose, onNav, onLocate, events }) {
  const meta = EVENT_TYPES[ev.type]
  const review = REVIEW[ev.review]
  const idx = events.findIndex(e => e.id === ev.id)
  const prev = events[idx - 1]
  const next = events[idx + 1]
  const sources = ev.sources?.length ? ev.sources : (ev.source ? [ev.source] : [])

  return (
    <div className="tl-detail-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="tl-detail" role="dialog" aria-modal="true" aria-label={ev.title}>
        <div className="tl-detail-head" style={{ background: `linear-gradient(135deg, ${meta.color}14, transparent)` }}>
          <span className="tl-detail-type" style={{ color: meta.color }}><span className="tl-chip-dot" style={{ background: meta.color }}>{meta.glyph}</span>{meta.label}</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭详情"><X size={18} /></button>
        </div>
        <h2>{ev.title}</h2>
        <div className={`tl-review-pill ${review.tone}`}>
          {ev.review === 'verified' ? <CheckCircle2 size={13} /> : ev.review === 'disputed' ? <ShieldQuestion size={13} /> : <CircleHelp size={13} />}
          {review.label}
        </div>
        <p className="tl-detail-summary">{ev.summary}</p>
        <dl className="tl-detail-meta">
          <dt><Clock size={13} />时间</dt>
          <dd>
            {precisionLabel(ev)}
            {ev.yearRaw && ev.yearRaw !== String(ev.year) && <em className="tl-raw-year">原始记录：{ev.yearRaw}</em>}
            {ev.approximate && <em className="tl-approx">年份为约数</em>}
          </dd>
          <dt><MapPin size={13} />地点</dt>
          <dd>{ev.location || <span className="tl-missing">地点待考</span>}</dd>
          <dt><ScrollText size={13} />资料来源</dt>
          <dd>
            {sources.length === 0 ? <span className="tl-missing"><AlertTriangle size={12} />来源缺失，待补录</span> : (
              <ul className="tl-source-list">
                {sources.map((s, i) => <li key={`${s}-${i}`}>{s}{i === 0 && ev.sourceUrl && <a href={ev.sourceUrl} target="_blank" rel="noreferrer noopener">查阅<ExternalLink size={11} /></a>}</li>)}
              </ul>
            )}
          </dd>
        </dl>
        {ev.reviewNote && <p className="tl-review-note">{ev.reviewNote}</p>}
        <button className="tl-locate-btn" onClick={() => onLocate(ev)}><LocateFixed size={13} />在时间轴上定位</button>
        <div className="tl-detail-nav">
          <button disabled={!prev} onClick={() => prev && onNav(prev.id)}><ChevronLeft size={14} />{prev ? prev.title : '已是最早'}</button>
          <button disabled={!next} onClick={() => next && onNav(next.id)}>{next ? next.title : '已是最晚'}<ChevronRight size={14} /></button>
        </div>
      </aside>
    </div>
  )
}

function ImportReport({ report, stressOn, onClose }) {
  return (
    <div className="tl-report-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="tl-report" role="dialog" aria-modal="true" aria-label="资料导入报告">
        <div className="modal-header">
          <div><span className="eyebrow">IMPORT REPORT</span><h2>资料导入报告</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        <div className="tl-report-stats">
          <div className="tl-stat ok"><strong>{report.imported}</strong><span>成功导入</span></div>
          <div className={`tl-stat ${report.skipped.length ? 'bad' : ''}`}><strong>{report.skipped.length}</strong><span>跳过的坏记录</span></div>
          <div className={`tl-stat ${report.merged.length ? 'warn' : ''}`}><strong>{report.merged.length}</strong><span>重复已合并</span></div>
          <div className={`tl-stat ${report.missingSource ? 'warn' : ''}`}><strong>{report.missingSource}</strong><span>来源缺失</span></div>
        </div>
        <p className="tl-report-tip">导入管线会跳过无法定位时间轴的记录，但不会中断整批资料；{stressOn ? '压测包中约 1% 为故意损坏记录。' : '可开启"压测资料 ×1600"观察大体量导入。'}</p>
        {report.merged.length > 0 && (
          <details className="tl-report-section" open>
            <summary>合并的重复事件（{report.merged.length}）</summary>
            <ul>{report.merged.slice(0, 30).map(m => <li key={m.id}><strong>{m.title}</strong> · 重复记录 {m.id} 已并入 {m.keptId}{m.extraSource && `，补充来源：${m.extraSource}`}</li>)}</ul>
          </details>
        )}
        {report.skipped.length > 0 && (
          <details className="tl-report-section" open>
            <summary>跳过记录明细（{report.skipped.length}）</summary>
            <ul className="tl-skipped-list">
              {report.skipped.slice(0, 60).map(r => <li key={r.id}><code>{r.id}</code><strong>{r.title}</strong><span className="tl-skipped-year">年份：{r.rawYear}</span><span className="tl-skipped-reason">{r.problems.join('；')}</span></li>)}
            </ul>
          </details>
        )}
        <div className="modal-actions"><button className="primary-btn" onClick={onClose}>知道了</button></div>
      </div>
    </div>
  )
}
