import { Siren } from 'siren-types'

export type Config = Axios.AxiosXHRConfigBase<any>;

export class NavState {
    constructor(public cur: string, public root: string, public config: Config, public value: Siren | null) {
    }
}
