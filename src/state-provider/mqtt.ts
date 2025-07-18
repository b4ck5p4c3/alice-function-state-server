import {StateProvider, StateProviderConfig} from "./types";
import {MqttClient} from "mqtt";
import {getLogger} from "../logger";
import z from "zod";
import {configValidator as baseConfigValidator} from "./types";

export interface MQTTStateProviderConfig extends StateProviderConfig {
    topic: string;
}

export interface MQTTStateProviderDependencies {
    mqtt: MqttClient;
}

export const configValidator = z.intersection(z.object({
    topic: z.string()
}), baseConfigValidator);

export class MQTTStateProvider extends StateProvider {
    static create(config: MQTTStateProviderConfig,
                  dependencies: MQTTStateProviderDependencies): MQTTStateProvider {
        return new MQTTStateProvider(config.name, config.description, dependencies.mqtt, config.topic);
    }

    private readonly logger = getLogger<MQTTStateProvider>();

    private state: string = "unknown";

    constructor(name: string, description: string,
                private readonly mqtt: MqttClient,
                private readonly topic: string) {
        super(name, description);
        mqtt.subscribe(this.topic);
        mqtt.on("message", (topic, payload) => {
            if (topic !== this.topic) {
                return;
            }
            const value = payload.toString("utf8")
            this.logger.info(`Received from '${this.topic}' '${value}'`);
            this.state = value;
        });
    }

    async getValue(): Promise<string> {
        return this.state;
    }
}