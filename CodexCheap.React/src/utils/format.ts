export function money(value?: number | null, digits = 4) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

export function cost(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return value.toFixed(4)
}

export function expireText(days: number) {
  return days === 0 ? '永不过期' : `${days} 天`
}

export function packageDurationText(days: number) {
  if (days === 7) return '周卡'
  if (days === 30) return '月卡'
  return `${days} 天`
}
