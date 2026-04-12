import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import type { SighTableRow } from '@/modules/sigh/types'

interface SighDailyMatrixBlockProps {
  title: string
  days: string[]
  rows: SighTableRow[]
  firstColumnLabel?: string
  firstColumnKeys?: string[]
  secondColumnLabel?: string
  secondColumnKeys?: string[]
}

export function SighDailyMatrixBlock({
  title,
  days,
  rows,
  firstColumnLabel = 'Consultorio',
  firstColumnKeys = ['consultorio', 'especialidad'],
  secondColumnLabel = 'Turno',
  secondColumnKeys = ['turno'],
}: SighDailyMatrixBlockProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
          <table className="min-w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#eef5fb] text-[#123B63]">
                <th className="border-b border-border px-2 py-1 text-left font-semibold uppercase">{firstColumnLabel}</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">{secondColumnLabel}</th>
                {days.map((day) => (
                  <th key={day} className="border-b border-border px-2 py-1 text-center font-semibold uppercase">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, rowIndex) => (
                  <tr key={`${title}-${rowIndex}`} className="odd:bg-white even:bg-[#f8fbff]">
                    <td className="border-b border-border/70 px-2 py-1">
                      {resolveRowText(row, firstColumnKeys[0], firstColumnKeys.slice(1)) || '-'}
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      {resolveRowText(row, secondColumnKeys[0], secondColumnKeys.slice(1)) || '-'}
                    </td>
                    {days.map((day, index) => {
                      const rawByIndex = resolveRowText(row, String(index + 1))
                      const rawByDay = resolveRowText(row, day)
                      const normalizedRaw = rawByIndex || rawByDay
                      const numericValue = resolveRowNumber(row, String(index + 1), [day])

                      if (!normalizedRaw) {
                        return (
                          <td key={`${title}-${rowIndex}-${day}`} className="border-b border-border/70 bg-[#A1A2A1] px-2 py-1 text-center text-white">
                            -
                          </td>
                        )
                      }

                      if (numericValue <= 0) {
                        return (
                          <td key={`${title}-${rowIndex}-${day}`} className="border-b border-border/70 bg-[#99D799] px-2 py-1 text-center">
                            -
                          </td>
                        )
                      }

                      return (
                        <td key={`${title}-${rowIndex}-${day}`} className="border-b border-border/70 px-2 py-1 text-center">
                          {numericValue}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={days.length + 2} className="px-3 py-5 text-center text-xs text-muted">
                    No se encuentran registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
