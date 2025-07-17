import {StateProvider} from "./state-provider/types";
import {FunctionProvider} from "./function-provider/types";
import {add} from "./utils";
import {MqttClient} from "mqtt";
import {StatelessMQTTFunctionProvider} from "./function-provider/stateless-mqtt";
import {StatefulMQTTFunctionProvider} from "./function-provider/stateful-mqtt";
import {MQTTStateProvider} from "./state-provider/mqtt";

interface ProvidersParams {
    mqttClient: MqttClient
}

export function getStateProviders(params: ProvidersParams): Record<string, StateProvider> {
    const providers: Record<string, StateProvider> = {};

    add(providers, new MQTTStateProvider("current_main_lights_state",
        "current state of lights (on or off)", params.mqttClient, "bus/services/alice/state/main_lights"));

    return providers;
}

export function getFunctionProviders(params: ProvidersParams): Record<string, FunctionProvider> {
    const providers: Record<string, FunctionProvider> = {};

    add(providers, new StatelessMQTTFunctionProvider("open_door", "opens the door",
        params.mqttClient, "bus/services/alice/function/open_door", "1"));
    add(providers, new StatefulMQTTFunctionProvider("set_main_lights_state", "set state of main lights (on or off)", {
        description: "lights state",
        constraints: {
            type: "variants",
            variants: [{
                description: "off",
                value: 0
            }, {
                description: "on",
                value: 1
            }]
        }
    }, params.mqttClient, "bus/services/alice/function/set_main_lights"));

    return providers;
}