import {FunctionArgument, FunctionArgumentValueConstraints, FunctionProvider} from "./types";
import {MqttClient} from "mqtt";
import {getLogger} from "../logger";

export class StatefulMQTTFunctionProvider extends FunctionProvider {
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