export type Hour = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' |
'8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' |
'18' | '19' | '20' | '21' | '22' | '23'

/**
 * Convert timestamp to date time
 *
 * @param {number} timestamp 13 digit
 * @return
 */
export function tsToDateTime (timestamp: number): DateTime {
  const dateTime = new Date(timestamp).toISOString()
  const [date, time] = dateTime.split('T')
  const [hours, minutes, seconds] = time.split(':')
  return {
    date,
    hours: parseInt(hours).toString() as Hour,
    minutes,
    seconds: seconds.substr(0, seconds.length - 1) // remove the 'Z'
  }
}

interface DateTime {
  date: string
  hours: Hour
  minutes: string
  seconds: string
}

/**
 * Generate random string
 *
 * @param {number} length of string
 * @return {string}
 */
export function randomString (length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var result = ''
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

/**
 * Generate timestamp in seconds
 *
 * @param {number} [year=0]
 * @param {number} [month=1]
 * @param {number} [date=0]
 * @param {number} [hours=0]
 * @param {number} [minutes=0]
 * @param {number} [seconds=0]
 * @return {number} 10 digits timestamp
 */
export function generateTimestamp (
  year: number = 0, month: number = 1, date: number = 0,
  hours: number = 0, minutes: number = 0, seconds: number = 0
): number {
  return new Date(Date.UTC(year, month - 1, date, hours, minutes, seconds)).valueOf() / 1000
}
