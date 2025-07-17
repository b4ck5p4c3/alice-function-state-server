import {StateProvider} from "./types";
import {MqttClient} from "mqtt";

export class MQTTStateProvider extends StateProvider {
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
            this.state = payload.toString("utf8");
        });
    }

    async getValue(): Promise<string> {
        return this.state;
    }
}