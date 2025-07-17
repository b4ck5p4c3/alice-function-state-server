import {StateProvider} from "./types";

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