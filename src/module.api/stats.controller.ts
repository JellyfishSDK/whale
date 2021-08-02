import { CACHE_MANAGER, Controller, Get, Inject } from '@nestjs/common'
import { StatsData } from "@whale-api-client/api/stats";
import { Interval } from "@nestjs/schedule";
import { Cache } from "cache-manager";

@Controller('/stats')
export class StatsController {
  constructor (@Inject(CACHE_MANAGER) protected readonly cacheManager: Cache) {
  }

  @Interval(60000)
  private async refresh (): Promise<void> {
    // TODO(fuxingloh):

  }

  @Get()
  async get (): Promise<StatsData> {
    return {}
  }
}
