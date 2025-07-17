import {FunctionArgument, FunctionProvider} from "./types";
import {MqttClient} from "mqtt";

export class StatelessMQTTFunctionProvider extends FunctionProvider {
    constructor(name: string, description: string,
                private readonly mqtt: MqttClient,
                private readonly topic: string,
                private readonly value: string) {
        super(name, description, {});
    }

    async invoke(): Promise<void> {
        await this.mqtt.publishAsync(this.topic, this.value);
    }
}