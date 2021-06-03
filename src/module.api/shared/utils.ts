/**
 * To grab object value by key
 *
 * @param {any} obj
 * @param {string} key
 * @return {any}
 */
export function grabValueByKey (obj: any, key: string): any {
  for (const k in obj) {
    if (k === key) return obj[k]
    if (isObject(obj[k])) return grabValueByKey(obj[k], key)
  }
}

/**
 * Check if its object
 *
 * @param {any} variable
 * @return {boolean}
 */
export function isObject (variable: any): boolean {
  return typeof variable === 'object'
}
