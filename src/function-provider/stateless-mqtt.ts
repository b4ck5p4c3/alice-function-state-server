import {FunctionArgument, FunctionProvider} from "./types";
import {MqttClient} from "mqtt";
import {getLogger} from "../logger";

export class StatelessMQTTFunctionProvider extends FunctionProvider {
    private readonly logger = getLogger<StatelessMQTTFunctionProvider>();

    constructor(name: string, description: string,
                private readonly mqtt: MqttClient,
                private readonly topic: string,
                private readonly value: string) {
        super(name, description, {});
    }

    async invoke(): Promise<void> {
        await this.mqtt.publishAsync(this.topic, this.value);
        this.logger.info(`Sent to '${this.topic}' '${this.value}'`);
    }
}