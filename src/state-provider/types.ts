import z from "zod";

export interface StateProviderConfig {
    name: string;
    description: string;
}

export const configValidator = z.object({
    description: z.string()
});

export abstract class StateProvider {
    protected constructor(private readonly name: string, private readonly description: string) {
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    abstract getValue(): Promise<string>;
}