import {configValidator as baseConfigValidator, StateProvider, StateProviderConfig} from "./types";
import z from "zod";

export interface MoonrakerStatusStateProviderConfig extends StateProviderConfig {
    baseUrl: string;
}

export const configValidator = z.intersection(z.object({
    baseUrl: z.string()
}), baseConfigValidator);

type BasePrinterInfo = {
    error: {};
} | {
    result: {
        state: "starting" | "error" | "shutdown" | "ready";
    };
}

type PrintStatsAndVirtualSDCardStatus = {
    error: {};
} | {
    result: {
        status: {
            virtual_sdcard: {
                progress: number;
            },
            print_stats: {
                filename: string;
                state: "standby" | "printing" | "paused" | "complete" | "error" | "cancelled";
            }
        }
    }
}

export class MoonrakerStatusStateProvider extends StateProvider {
    static create(config: MoonrakerStatusStateProviderConfig, dependencies: {}): MoonrakerStatusStateProvider {
        return new MoonrakerStatusStateProvider(config.name, config.description, config.baseUrl)
    }

    constructor(name: string, description: string,
                private readonly baseUrl: string) {
        super(name, description);
    }

    private async getBasePrinterInfo(): Promise<BasePrinterInfo> {
        return await (await fetch(`${this.baseUrl}/printer/info`, {
            signal: AbortSignal.timeout(500)
        })).json();
    }

    private async getPrintStatsAndVirtualSDCardStatus(): Promise<PrintStatsAndVirtualSDCardStatus> {
        return await (await fetch(`${this.baseUrl}/printer/objects/query`, {
            method: "POST",
            body: JSON.stringify({
                objects: {
                    virtual_sdcard: null,
                    print_stats: null
                }
            }),
            headers: {
                "content-type": "application/json"
            },
            signal: AbortSignal.timeout(500)
        })).json();
    }

    async getValue(): Promise<string> {
        let info: BasePrinterInfo;

        try {
            info = await this.getBasePrinterInfo();
        } catch (e) {
            return "machine is unavailable";
        }

        if ("error" in info) {
            return "machine is in error state";
        }

        switch (info.result.state) {
            case "starting": {
                return "machine starting";
            }
            case "ready": {
                const status = await this.getPrintStatsAndVirtualSDCardStatus();
                if ("error" in status) {
                    return "machine is in error state";
                }
                switch (status.result.status.print_stats.state) {
                    case "standby":
                        return "machine is ready and in standby";
                    case "printing":
                        return `machine is ready and working and is in progress of ${
                            Math.round(status.result.status.virtual_sdcard.progress * 100)}% for job '${
                            status.result.status.print_stats.filename}'`;
                    case "paused":
                        return `machine is ready and on pause for job '${
                            status.result.status.print_stats.filename}'`;
                    case "complete":
                        return `machine is ready and last job '${
                            status.result.status.print_stats.filename}' was completed successfully`;
                    case "error":
                        return "machine is ready but in error state";
                    case "cancelled":
                        return `machine is ready and last job '${
                            status.result.status.print_stats.filename}' was cancelled`;
                    default:
                        return "machine is ready but in unknown state";
                }
            }
            case "error": {
                return "machine is in error state";
            }
            case "shutdown": {
                return "machine is powered off"
            }
            default: {
                return "machine is in unknown state";
            }
        }
    }
}