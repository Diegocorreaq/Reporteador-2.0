import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CriticalCareChartBlockConfig } from '@/modules/critical-care/types'
import {
  MONTH_KEYS,
  MONTH_LABELS,
  resolveMonthValue,
  resolveRowValue,
  toNumberValue,
} from '@/modules/critical-care/components/critical-care-utils'

interface CriticalCareChartBlockProps {
  block: CriticalCareChartBlockConfig
  rows: Array<Record<string, unknown>>
}

const DEFAULT_HEIGHT = 300

function sliceSeries<T>(list: T[], start?: number, max?: number) {
  const initial = typeof start === 'number' && start > 0 ? list.slice(start) : [...list]
  return typeof max === 'number' && max > 0 ? initial.slice(0, max) : initial
}

function filterRows(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
) {
  if (!block.filterField || !block.filterEquals) {
    return rows
  }

  return rows.filter((row) => {
    const value = resolveRowValue(row, block.filterField!, block.filterAliases ?? [])
    const matches = String(value ?? '').trim() === block.filterEquals
    return block.invertFilter ? !matches : matches
  })
}

function buildLineSeries(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
) {
  const sourceRows = sliceSeries(filterRows(rows, block), block.startSeriesIndex, block.maxSeries)
  const seriesField = block.seriesField ?? 'tipo'
  const seriesAliases = block.seriesAliases ?? []

  return sourceRows.map((row, index) => {
    const nameValue = resolveRowValue(row, seriesField, seriesAliases)
    const name = String(nameValue ?? `Serie ${index + 1}`)
    const data = MONTH_KEYS.map((monthKey) => resolveMonthValue(row, monthKey))

    return {
      name,
      type: 'line' as const,
      smooth: true,
      data,
    }
  })
}

function buildStackedBarSeries(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
) {
  const sourceRows = sliceSeries(filterRows(rows, block), block.startSeriesIndex, block.maxSeries)
  const seriesField = block.seriesField ?? 'tipo'
  const seriesAliases = block.seriesAliases ?? []

  return sourceRows.map((row, index) => {
    const nameValue = resolveRowValue(row, seriesField, seriesAliases)
    const name = String(nameValue ?? `Serie ${index + 1}`)
    const data = MONTH_KEYS.map((monthKey) => resolveMonthValue(row, monthKey))

    return {
      name,
      type: 'bar' as const,
      stack: 'total',
      emphasis: { focus: 'series' as const },
      data,
    }
  })
}

function buildBarSeries(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
) {
  const sourceRows = filterRows(rows, block)
  const categoryField = block.categoryField ?? 'nmess'
  const categoryAliases = block.categoryAliases ?? ['nmes', 'mes']
  const valueField = block.valueField ?? 'indicador'
  const valueAliases = block.valueAliases ?? []

  return {
    categories: sourceRows.map((row, index) => {
      const value = resolveRowValue(row, categoryField, categoryAliases)
      return String(value ?? `Serie ${index + 1}`)
    }),
    values: sourceRows.map((row) => toNumberValue(resolveRowValue(row, valueField, valueAliases)) ?? 0),
  }
}

function buildPieSeries(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
) {
  const sourceRows = filterRows(rows, block)
  const categoryField = block.categoryField ?? 'prioridad'
  const categoryAliases = block.categoryAliases ?? []
  const valueField = block.valueField ?? 'total'
  const valueAliases = block.valueAliases ?? []

  return sourceRows.map((row, index) => {
    const nameValue = resolveRowValue(row, categoryField, categoryAliases)
    const value = toNumberValue(resolveRowValue(row, valueField, valueAliases)) ?? 0
    return {
      name: String(nameValue ?? `Item ${index + 1}`),
      value,
    }
  })
}

function getChartOption(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareChartBlockConfig,
): EChartsOption {
  if (block.chartType === 'pie') {
    const pieData = buildPieSeries(rows, block)
    return {
      animationDuration: 350,
      tooltip: { trigger: 'item' },
      legend: {
        type: 'scroll',
        bottom: 0,
      },
      series: [
        {
          name: block.title ?? 'Distribucion',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          data: pieData,
        },
      ],
    }
  }

  if (block.chartType === 'bar') {
    const { categories, values } = buildBarSeries(rows, block)
    return {
      animationDuration: 350,
      tooltip: { trigger: 'axis' },
      grid: { top: 24, left: 18, right: 10, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: block.title ?? 'Indicador',
          type: 'bar',
          itemStyle: { color: '#2c6e99' },
          data: values,
        },
      ],
    }
  }

  if (block.chartType === 'stacked_bar') {
    const stackedSeries = buildStackedBarSeries(rows, block)
    return {
      animationDuration: 350,
      tooltip: { trigger: 'axis' },
      legend: {
        type: 'scroll',
        bottom: 0,
      },
      grid: { top: 28, left: 16, right: 12, bottom: 56, containLabel: true },
      xAxis: {
        type: 'category',
        data: Array.from(MONTH_LABELS),
      },
      yAxis: {
        type: 'value',
      },
      series: stackedSeries,
    }
  }

  const lineSeries = buildLineSeries(rows, block)
  return {
    animationDuration: 350,
    tooltip: { trigger: 'axis' },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    grid: { top: 28, left: 16, right: 12, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      data: Array.from(MONTH_LABELS),
    },
    yAxis: {
      type: 'value',
    },
    series: lineSeries,
  }
}

export function CriticalCareChartBlock({ block, rows }: CriticalCareChartBlockProps) {
  const option = useMemo(() => getChartOption(rows, block), [rows, block])

  return (
    <div className="rounded-md border border-border/60 bg-white px-2 py-2">
      {block.title ? <h4 className="px-2 pb-2 text-xs font-semibold text-[#1f4b6e]">{block.title}</h4> : null}
      <ReactECharts option={option} style={{ height: block.height ?? DEFAULT_HEIGHT }} />
    </div>
  )
}
