import ReactECharts from 'echarts-for-react'
import type { MetricChartData } from '@/modules/centro-obstetrico/types'

interface MetricLineChartProps {
  data: MetricChartData
  isPercentage?: boolean
}

export function MetricLineChart({ data, isPercentage }: MetricLineChartProps) {
  return (
    <ReactECharts
      style={{ height: 300 }}
      option={{
        animationDuration: 350,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          borderWidth: 0,
          backgroundColor: 'rgba(15,23,42,0.94)',
          textStyle: {
            color: '#f8fafc',
          },
          valueFormatter: (value: number | string) =>
            typeof value === 'number' ? `${value.toFixed(2)}${isPercentage ? '%' : ''}` : String(value),
        },
        legend: {
          top: 0,
          right: 0,
          itemWidth: 12,
          itemHeight: 8,
          textStyle: {
            color: '#5d6c7f',
            fontSize: 11,
          },
        },
        grid: {
          left: 12,
          right: 12,
          top: 38,
          bottom: 8,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: data.categories,
          axisLine: {
            lineStyle: {
              color: '#cfd8e3',
            },
          },
          axisLabel: {
            color: '#5d6c7f',
            fontSize: 11,
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
            fontSize: 11,
            formatter: (value: number) => `${value}${isPercentage ? '%' : ''}`,
          },
        },
        series: data.series.map((serie, index) => ({
          name: serie.name,
          type: 'line',
          data: serie.data,
          smooth: index === 0,
          symbolSize: index === 0 ? 8 : 0,
          lineStyle: {
            width: index === 0 ? 3 : 2,
            type: index === 0 ? 'solid' : 'dashed',
            color: index === 0 ? '#0f766e' : index === 1 ? '#ea580c' : '#475569',
          },
          itemStyle: {
            color: index === 0 ? '#0f766e' : index === 1 ? '#ea580c' : '#475569',
          },
        })),
      }}
    />
  )
}
