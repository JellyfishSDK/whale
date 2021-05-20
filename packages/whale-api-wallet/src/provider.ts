import { PrevoutProvider, FeeRateProvider, Prevout } from '@defichain/jellyfish-transaction-builder'
import { WhaleApiClient } from "@defichain/whale-api-client";
import BigNumber from 'bignumber.js';

export class WhalePrevoutProvider implements PrevoutProvider {
  constructor (protected readonly client: WhaleApiClient) {
  }

  async all (): Promise<Prevout[]> {

  }

  async collect (minBalance: BigNumber): Promise<Prevout[]> {

  }
}

export class WhaleFeeRateProvider implements FeeRateProvider {
  constructor (protected readonly client: WhaleApiClient) {
  }


  async estimate (): Promise<BigNumber> {

  }
}

// TODO(fuxingloh): implement
