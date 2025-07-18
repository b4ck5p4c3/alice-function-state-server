import {StateProvider, StateProviderConfig, configValidator as baseConfigValidator} from "./types";
import z from "zod";

export interface HTTPJSONStateProviderConfig extends StateProviderConfig {
    url: string;
}

export const configValidator = z.intersection(z.object({
    url: z.string()
}), baseConfigValidator);

export class HTTPJSONStateProvider extends StateProvider {
    constructor(name: string, description: string,
                private readonly url: string,
                private readonly extractor: (data: any) => string) {
        super(name, description);
    }

    async getValue(): Promise<string> {
        return this.extractor(await (await fetch(this.url)).json());
    }
}