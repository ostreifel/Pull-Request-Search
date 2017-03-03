export interface IParams {
    [name: string]: string
}
function parseHash(hash: string): IParams {
    const paramObject = {};
    for (let param of hash.split("&")) {
        const [encodedKey, encodedValue] = param.split("=");
        const key = decodeURIComponent(encodedKey);
        const value = decodeURIComponent(encodedValue);
        // Omit empty values, don't turn "" => {"": undefined}
        if (key && value) {
            paramObject[key] = value;
        }
    }
    return paramObject;
}

export function getParameters(): IPromise<IParams> {
    return VSS.getService(VSS.ServiceIds.Navigation).then((service: IHostNavigationService) =>
        service.getHash().then(hash => parseHash(hash))
    );
}
export function updateParameter(name: string, value: string): IPromise<void> {
    return getParameters().then(parameters =>
        VSS.getService(VSS.ServiceIds.Navigation).then((service: IHostNavigationService) => {
            if (value) {
                parameters[name] = value;
            } else {
                delete parameters[name];
            }
            let hash = "";
            for (let key in parameters) {
                hash += `${key}=${encodeURIComponent(parameters[key])}&`
            }
            service.setHash(hash);
            return void 0;
        })
    );
}
export function registerHashCallback(callback: (params: IParams) => void): IPromise<void> {
    return getParameters().then(parameters =>
        VSS.getService(VSS.ServiceIds.Navigation).then((service: IHostNavigationService) => {
            service.onHashChanged(hash => callback(parseHash(hash)))
            return void 0;
        })
    );

}