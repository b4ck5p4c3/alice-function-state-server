import z from "zod";

export interface FunctionArgumentValueMinMaxConstraints {
    type: "min-max"
    min: number;
    max: number;
}

export interface FunctionArgumentValueVariantsConstraints {
    type: "variants"
    variants: {
        value: number;
        description: string;
    }[];
}

export type FunctionArgumentValueConstraints =
    FunctionArgumentValueMinMaxConstraints
    | FunctionArgumentValueVariantsConstraints;

export interface FunctionArgument {
    description: string;
    constraints: FunctionArgumentValueConstraints;
}

export interface FunctionProviderConfig {
    name: string;
    description: string;
}

export const configValidator = z.object({
    description: z.string()
});

export abstract class FunctionProvider {
    protected constructor(private readonly name: string, private readonly description: string,
                private readonly functionArguments: Record<string, FunctionArgument>) {
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    getArguments(): Record<string, FunctionArgument> {
        return this.functionArguments;
    }

    abstract invoke(argumentValues: Record<string, number>): Promise<void>;
}