import { HexEncoder } from '@src/module.model/_hex.encoder'
import { RawBlock } from '../_abstract'

/**
 * Categories of implemented activity sub indexer
 * Allow each category of indexer to have independent numbering for activity
 */
type Category = 'vin' | 'vout' | 'dftx'
const categoryHexMap: { [key in Category]: string } = {
  vin: '01',
  vout: '02',
  dftx: 'ff'
}

/**
 * Construct a standardized script.activity.v2 id across all activity types for both utxo and dftx activity
 *
 * @param block
 * @param txid
 * @param n an unique serial number for each script.activity.v2 within each block/txid/category
 * @returns {string}
 */
export function mapId (block: RawBlock, txid: string, category: Category, n: number): string {
  const height = HexEncoder.encodeHeight(block.height)
  const index = HexEncoder.encodeHeight(n) // to convert single number into 4 bytes long
  return `${height}${txid}${categoryHexMap[category]}${index}`
}
