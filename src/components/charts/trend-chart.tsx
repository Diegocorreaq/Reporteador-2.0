import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ChartSeriesConfig } from '@/types/report'

echarts.use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, LineChart, BarChart, CanvasRenderer])

interface TrendChartProps {
  title: string
  subtitle: string
  categories: string[]
  series: ChartSeriesConfig[]
}

export function TrendChart({ title, subtitle, categories, series }: TrendChartProps) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      style={{ height: 360 }}
      option={{
        backgroundColor: 'transparent',
        title: {
          text: title,
          subtext: subtitle,
          textStyle: {
            color: '#0f172a',
            fontFamily: 'Manrope',
            fontSize: 18,
            fontWeight: 700,
          },
          subtextStyle: {
            color: '#5d6c7f',
            fontFamily: 'Manrope',
            fontSize: 12,
          },
        },
        tooltip: {
          trigger: 'axis',
          borderWidth: 0,
          backgroundColor: 'rgba(15,23,42,0.92)',
          textStyle: {
            color: '#f8fafc',
          },
        },
        legend: {
          right: 16,
          top: 8,
          textStyle: {
            color: '#5d6c7f',
          },
        },
        grid: {
          left: 16,
          right: 16,
          top: 84,
          bottom: 16,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLine: {
            lineStyle: {
              color: '#cfd8e3',
            },
          },
          axisLabel: {
            color: '#5d6c7f',
          },
        },
        yAxis: {
          type: 'value',
          axisLine: {
            show: false,
          },
          splitLine: {
            lineStyle: {
              color: '#e2e8f0',
            },
          },
          axisLabel: {
            color: '#5d6c7f',
          },
        },
        series: series.map((serie, index) => ({
          ...serie,
          smooth: serie.type === 'line',
          barMaxWidth: 18,
          lineStyle: {
            width: 3,
          },
          itemStyle: {
            color: index === 0 ? '#14b8a6' : '#f59e0b',
          },
          areaStyle:
            serie.type === 'line'
              ? {
                  color: 'rgba(20,184,166,0.12)',
                }
              : undefined,
        })),
      }}
    />
  )
}
