import { NavState } from "../state";
import { MultiStateTransition, toMulti, followEach } from "./multistep";
import { StateTransition, reduceEach, follow, MultiStep, SingleStep } from "../steps";
import { MultiResponse } from "./multiresp";
import { getRequest } from "../requests";
import { Config } from "../config";

/**
 * The MultiNav class is not one a user would generally instantiate themselves.
 * Instead, it is created in response to certain steps in a chain that cause the
 * set of resources to "fan out".  The main example of this is when you follow a
 * relation and there are multiple instances of that relation.
 *
 * @export
 * @class MultiNav
 */
export class MultiNav {
    constructor(private start: Promise<NavState[]>, private steps: MultiStep[], private baseConfig: Config) {}
    get(): MultiResponse {
        let state = reduceEach(this.start, this.steps, []);
        let resp = state.then(s => Promise.all(s.map(x => getRequest(x))));
        return MultiResponse.create(resp);
    }
    do(description: string, transition: StateTransition): MultiNav {
        const step: SingleStep = {
            persistent: false,
            description: description,
            transition: transition,
        };
        return new MultiNav(this.start, [...this.steps, toMulti(step)], this.baseConfig);
    }
    doMulti(description: string, transition: MultiStateTransition): MultiNav {
        const step: MultiStep = {
            persistent: false,
            description: description,
            transition: transition,
        };
        return new MultiNav(this.start, [...this.steps, step], this.baseConfig);
    }

    follow(rel: string, parameters?: {}, which?: (states: NavState[]) => NavState): MultiNav {
        return this.do(`Follow one relation of type ${rel}`, follow(rel, this.baseConfig, parameters, which));
    }

    followEach(rel: string, parameters?: {}): MultiNav {
        return this.doMulti(`Follow all relations of type ${rel}`, followEach(rel, this.baseConfig, parameters));
    }
}
