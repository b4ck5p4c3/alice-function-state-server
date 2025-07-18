import {StateProvider} from "./types";
import {MqttClient} from "mqtt";
import {getLogger} from "../logger";

export class MQTTStateProvider extends StateProvider {
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