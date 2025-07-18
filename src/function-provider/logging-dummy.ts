import {FunctionArgument, FunctionProvider} from "./types";
import {getLogger} from "../logger";

export class LoggingDummyFunctionProvider extends FunctionProvider {
    private readonly logger = getLogger<LoggingDummyFunctionProvider>();

    constructor(name: string, description: string,
                functionArguments: Record<string, FunctionArgument>) {
        super(name, description, functionArguments);
    }

    async invoke(argumentValues: Record<string, number>): Promise<void> {
        this.logger.info(`function '${this.getName()}' was called with ${JSON.stringify(argumentValues)}`)
    }
}
