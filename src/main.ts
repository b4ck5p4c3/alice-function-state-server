import express from "express";
import dotenv from "dotenv";
import {getLogger} from "./logger";
import z from "zod";
import {getFunctionProviders, getStateProviders} from "./providers";
import mqtt from "mqtt";
import fs from "fs";

const logger = getLogger();

dotenv.config({
    path: ".env.local"
});
dotenv.config();

const PORT = parseInt(process.env.PORT || "8080");

const MQTT_URL = process.env.MQTT_URL ?? "mqtts://alice:alice@mqtt.svc.bksp.in:8883";
const MQTT_CA_CERTIFICATE_PATH = process.env.MQTT_CA_CERTIFICATE_PATH ?? "ca-cert.pem";
const YNCA_NOW_PLAYING_ENDPOINT = process.env.YNCA_NOW_PLAYING_ENDPOINT ?? "http://localhost:8015/now-playing";

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

const params = {
    mqttClient,
    yncaNowPlayingEndpoint: YNCA_NOW_PLAYING_ENDPOINT
};

const stateProviders = getStateProviders(params);
const functionProviders = getFunctionProviders(params);

app.get("/state", (req, res) => {
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

app.get("/functions", (req, res) => {
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

app.post("/functions", (req, res) => {
    const body = functionCallType.parse(req.body);
    const calledFunction = functionProviders[body.name];
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