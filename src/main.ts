import express from "express";
import dotenv from "dotenv";
import {getLogger} from "./logger";
import z from "zod";
import mqtt, {MqttClient} from "mqtt";
import fs from "fs";
import {StateProvider} from "./state-provider/types";
import {MQTTStateProvider, configValidator as mqttStateProviderConfigValidator} from "./state-provider/mqtt";
import {
    YncaNowPlayingStateProvider,
    configValidator as yncaNowPlayingStateProviderConfigValidator
} from "./state-provider/ynca-now-playing";
import {FunctionProvider} from "./function-provider/types";
import {
    StatelessMQTTFunctionProvider,
    configValidator as statelessMqttFunctionProviderConfigValidator
} from "./function-provider/stateless-mqtt";
import {
    StatefulMQTTFunctionProvider,
    configValidator as statefulMqttFunctionProviderConfigValidator
} from "./function-provider/stateful-mqtt";
import {parse} from "yaml";

const logger = getLogger();

dotenv.config({
    path: ".env.local"
});
dotenv.config();

const PORT = parseInt(process.env.PORT || "8080");

const MQTT_URL = process.env.MQTT_URL ?? "mqtts://alice:alice@mqtt.svc.bksp.in:8883";
const MQTT_CA_CERTIFICATE_PATH = process.env.MQTT_CA_CERTIFICATE_PATH ?? "ca-cert.pem";

const CONFIG_PATH = process.env.CONFIG_PATH ?? "config.yaml";

interface AllDependencies {
    mqtt: MqttClient;
}

const stateProviderFactories: Record<string, [z.ZodType,
    (config: any, dependencies: AllDependencies) => StateProvider]> = {
    "mqtt": [mqttStateProviderConfigValidator, MQTTStateProvider.create],
    "ynca-now-playing": [yncaNowPlayingStateProviderConfigValidator, YncaNowPlayingStateProvider.create]
};

const functionProviderFactories: Record<string, [z.ZodType,
    (config: any, dependencies: AllDependencies) => FunctionProvider]> = {
    "stateless-mqtt": [statelessMqttFunctionProviderConfigValidator, StatelessMQTTFunctionProvider.create],
    "stateful-mqtt": [statefulMqttFunctionProviderConfigValidator, StatefulMQTTFunctionProvider.create]
};

const stateProviderConfigs = z.union(Object.entries(stateProviderFactories).map((
    [key, [configValidator, factory]]) => {
    return z.intersection(z.object({
        type: z.literal(key)
    }), configValidator);
}));

const functionProviderConfigs = z.union(Object.entries(functionProviderFactories).map((
    [key, [configValidator, factory]]) => {
    return z.intersection(z.object({
        type: z.literal(key)
    }), configValidator);
}));

const configType = z.object({
    stateProviders: z.record(z.string(), stateProviderConfigs),
    functionProviders: z.record(z.string(), functionProviderConfigs)
});

const config = configType.parse(parse(fs.readFileSync(CONFIG_PATH).toString("utf8")));

const mqttClient = mqtt.connect(MQTT_URL, {
    ca: [fs.readFileSync(MQTT_CA_CERTIFICATE_PATH)]
});
mqttClient.on("connect", () => {
    logger.info("Connected to MQTT");
});
mqttClient.on("error", e => {
    logger.error(`MQTT error: ${e}`);
});

const app = express();
app.use(express.json());

const dependencies: AllDependencies = {
    mqtt: mqttClient
};

const stateProviders: Record<string, StateProvider> = {};
for (const [name, providerConfig] of Object.entries(config.stateProviders)) {
    const [configValidator, factory] = stateProviderFactories[providerConfig.type];
    stateProviders[name] = factory({
        ...(configValidator.parse(providerConfig) as object),
        name
    }, dependencies);
    logger.info(`Registered '${name}' state provider`);
}

const functionProviders: Record<string, FunctionProvider> = {};
for (const [name, providerConfig] of Object.entries(config.functionProviders)) {
    const [configValidator, factory] = functionProviderFactories[providerConfig.type];
    functionProviders[name] = factory({
        ...(configValidator.parse(providerConfig) as object),
        name
    }, dependencies);
    logger.info(`Registered '${name}' function provider`);
}

app.post("/state", (req, res) => {
    (async () => {
        const promises: Promise<[string, {
            description: string,
            value: string;
        }]>[] = [];
        for (const [name, provider] of Object.entries(stateProviders)) {
            promises.push((async () => {
                try {
                    const result = await provider.getValue();
                    return [name, {
                        description: provider.getDescription(),
                        value: result
                    }]
                } catch (e) {
                    logger.warn(`Failed to get '${name}' state: ${e}`);
                    return [name, {
                        description: provider.getDescription(),
                        value: "not available"
                    }];
                }
            })());
        }
        res.status(200).json(Object.fromEntries(await Promise.all(promises)));
    })().catch((err) => {
        res.status(500).json({
            error: err.toString()
        });
    })
});

app.post("/functions", (req, res) => {
    res.status(200).json(Object.fromEntries(Object.entries(functionProviders)
        .map(([name, provider]) => {
            return [name, {
                description: provider.getDescription(),
                arguments: provider.getArguments()
            }];
        })));
});

const functionCallType = z.object({
    name: z.string(),
    parameters: z.record(z.string(), z.number())
});

app.patch("/functions", (req, res) => {
    const body = functionCallType.parse(req.body);
    const calledFunction = functionProviders[body.name];
    logger.info(`Called function '${body.name}' with ${JSON.stringify(body)}`);
    calledFunction.invoke(body.parameters)
        .then(() => {
            res.status(200).json({})
        })
        .catch(e => {
            res.status(500).json({
                error: e.toString()
            });
        });
});

app.listen(PORT, error => {
    if (error) {
        logger.fatal(`Failed to start on :${PORT}: ${error}`);
        return;
    }
    logger.info(`Started on :${PORT}`);
});