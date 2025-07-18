import {HTTPJSONStateProvider, configValidator as baseConfigValidator, HTTPJSONStateProviderConfig} from "./http-json";

export type YncaNowPlayingStateProviderConfig = HTTPJSONStateProviderConfig;

export const configValidator = baseConfigValidator;

export class YncaNowPlayingStateProvider extends HTTPJSONStateProvider {
    static create(config: YncaNowPlayingStateProviderConfig, dependencies: {}): YncaNowPlayingStateProvider {
        return new YncaNowPlayingStateProvider(config.name, config.description, config.url)
    }

    constructor(name: string, description: string, url: string) {
        super(name, description, url, data => {
            if ((!data.media.album || data.media.album == "N/A") &&
                (!data.media.artist || data.media.artist == "N/A") &&
                (!data.media.title || data.media.title == "N/A")) {
                return "nothing is playing right now";
            }
            return `${data.media.artist} - ${data.media.title}`;
        });
    }
}