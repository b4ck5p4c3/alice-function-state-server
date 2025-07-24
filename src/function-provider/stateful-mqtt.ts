import {
    configValidator as baseConfigValidator,
    FunctionArgument,
    FunctionProvider,
    FunctionProviderConfig
} from "./types";
import {MqttClient} from "mqtt";
import {getLogger} from "../logger";
import z from "zod";

export interface StatefulMQTTFunctionProviderConfig extends FunctionProviderConfig {
    topic: string;
    stateArgument: FunctionArgument;
}

export interface StatefulMQTTFunctionProviderDependencies {
    mqtt: MqttClient;
}

export const configValidator = z.intersection(z.object({
    topic: z.string(),
    stateArgument: z.object({
        description: z.string(),
        constraints: z.discriminatedUnion("type", [
            z.object({
                type: z.literal("number-min-max"),
                argumentType: z.literal("number"),
                min: z.number(),
                max: z.number()
            }),
            z.object({
                type: z.literal("number-variants"),
                argumentType: z.literal("number"),
                variants: z.array(z.object({
                    description: z.string(),
                    value: z.number()
                }))
            })
        ])
    })
}), baseConfigValidator);

export class StatefulMQTTFunctionProvider extends FunctionProvider {
    static create(config: StatefulMQTTFunctionProviderConfig,
                  dependencies: StatefulMQTTFunctionProviderDependencies): StatefulMQTTFunctionProvider {
        return new StatefulMQTTFunctionProvider(config.name, config.description,
            config.stateArgument, dependencies.mqtt, config.topic);
    }

    private readonly logger = getLogger<StatefulMQTTFunctionProvider>();

    constructor(name: string, description: string,
                stateArgument: FunctionArgument,
                private readonly mqtt: MqttClient,
                private readonly topic: string) {
        super(name, description, {
            state: stateArgument
        });
    }

    async invoke(argumentValues: Record<string, number>): Promise<void> {
        if (argumentValues["state"] === undefined) {
            this.logger.warn(`Called '${this.getName()}' but without state`);
            return;
        }
        const value = argumentValues["state"].toString();
        await this.mqtt.publishAsync(this.topic, value);
        this.logger.info(`Sent to '${this.topic}' '${value}'`);
    }
}