export type Hour = '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' |
'08' | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' |
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
    hours: hours as Hour,
    minutes,
    seconds: seconds.substr(0, seconds.length - 1) // remove the 'Z'
  }
}

/**
 * Set a date by given year, month and day
 *
 * @param {number} year
 * @param {number} month default month is started from 0, eg: 0 is JAN
 * @param {number} day
 * @return {string} eg: '2021-01-15'
 */
export function getDateInString (year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month + 1, day)).toISOString().split('T')[0]
}

interface DateTime {
  date: string
  hours: Hour
  minutes: string
  seconds: string
}
