/**
 * rounding timestamp minutes
 * example in ISO: 2021-05-01T23:29:56 -> 2021-05-01T23:20:56
 *
 * @param {number} timestamp
 * @return {number} rounded timestamp
 */
export function roundTimestampMinutes (timestamp: number): number {
  const ts = String(timestamp).length === 10 ? timestamp * 1000 : timestamp
  const round = 1000 * 60 * 10
  // round every 10 mins
  return new Date(Math.floor(ts / round) * round).valueOf()
}
