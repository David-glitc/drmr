import type { BurnEvent } from "../types";

export interface BurnPayload {
  countdown: string;
  events: BurnEvent[];
}

export class BurnService {
  async fetchBurnData(): Promise<BurnPayload> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      countdown: "04 : 18 : 52",
      events: [
        { month: "Nov", amount: "1,000,000 DRMR", hash: "9fd3...12a" },
        { month: "Oct", amount: "1,000,000 DRMR", hash: "73ab...c19" },
        { month: "Sep", amount: "750,000 DRMR", hash: "58de...9f1" },
      ],
    };
  }
}

