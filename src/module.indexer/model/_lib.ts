import {
  isDeFiScript,
  OP_DEFI_TX,
  CUtxosToAccount,
  CAccountToUtxos,
  CAccountToAccount,
  CAnyAccountToAccount,
  CSetGovernance,
  CCreateMasterNode,
  CResignMasterNode,
  CAutoAuthPrep,
  CAppointOracle,
  CRemoveOracle,
  CUpdateOracle,
  CSetOracleData,
  CPoolSwap,
  CPoolAddLiquidity,
  CPoolRemoveLiquidity,
  CPoolCreatePair,
  CPoolUpdatePair,
  CTokenMint,
  CTokenCreate,
  CTokenUpdate,
  CTokenUpdateAny,
  CDeFiOpUnmapped
} from '@defichain/jellyfish-transaction'
import { ComposableBuffer } from '@defichain/jellyfish-transaction/dist/buffer/buffer_composer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'

const OP_CODE_DFTX_MAP: { [key: number]: new (...arg: any) => ComposableBuffer<any> } = {
  // account
  [CUtxosToAccount.OP_CODE]: CUtxosToAccount,
  [CAccountToUtxos.OP_CODE]: CAccountToUtxos,
  [CAccountToAccount.OP_CODE]: CAccountToAccount,
  [CAnyAccountToAccount.OP_CODE]: CAnyAccountToAccount,

  // governance
  [CSetGovernance.OP_CODE]: CSetGovernance,

  // masternode
  [CCreateMasterNode.OP_CODE]: CCreateMasterNode,
  [CResignMasterNode.OP_CODE]: CResignMasterNode,

  // misc
  [CAutoAuthPrep.OP_CODE]: CAutoAuthPrep,

  // oracle
  [CAppointOracle.OP_CODE]: CAppointOracle,
  [CRemoveOracle.OP_CODE]: CRemoveOracle,
  [CUpdateOracle.OP_CODE]: CUpdateOracle,
  [CSetOracleData.OP_CODE]: CSetOracleData,

  // lm pool
  [CPoolSwap.OP_CODE]: CPoolSwap,
  [CPoolAddLiquidity.OP_CODE]: CPoolAddLiquidity,
  [CPoolRemoveLiquidity.OP_CODE]: CPoolRemoveLiquidity,
  [CPoolCreatePair.OP_CODE]: CPoolCreatePair,
  [CPoolUpdatePair.OP_CODE]: CPoolUpdatePair,

  // token
  [CTokenMint.OP_CODE]: CTokenMint,
  [CTokenCreate.OP_CODE]: CTokenCreate,
  [CTokenUpdate.OP_CODE]: CTokenUpdate,
  [CTokenUpdateAny.OP_CODE]: CTokenUpdateAny
}

export interface DecodedDfTx {
  isDfTx: boolean
  type?: number
  object?: any
}

export function bufferToDfTx (hex: string | Buffer | SmartBuffer): DecodedDfTx {
  let smartBuffer: string | Buffer | SmartBuffer = hex

  if (!(hex instanceof SmartBuffer)) {
    if (typeof hex === 'string') {
      smartBuffer = Buffer.from(hex, 'hex')
    }
    smartBuffer = SmartBuffer.fromBuffer(smartBuffer as Buffer)
  }

  const opCodes = toOPCodes(smartBuffer as SmartBuffer)
  if (!isDeFiScript(opCodes)) {
    return {
      isDfTx: false
    }
  }

  const dfTx = (opCodes[1] as OP_DEFI_TX).tx

  let mapped
  if (Object.keys(OP_CODE_DFTX_MAP).includes(`${dfTx.type}`)) {
    mapped = new OP_CODE_DFTX_MAP[dfTx.type]().toObject()
  } else {
    mapped = new CDeFiOpUnmapped(smartBuffer as SmartBuffer)
  }

  return {
    isDfTx: mapped !== undefined,
    type: dfTx.type,
    object: mapped
  }
}
