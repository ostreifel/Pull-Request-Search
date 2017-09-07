import * as Q from "q";
import { CachedValue } from "./cachedValue";

const collection = "extension-cache";
const service = new CachedValue<IExtensionDataService>(() => VSS.getService(VSS.ServiceIds.ExtensionData));

interface IExtensionCacheEntry<T> {
    id: string;
    value: T;
    formatVersion: number;
    __etag: -1;
}
const formatVersion = 1;

export function store<T>(key: string, value: T, expiration?: Date): Q.IPromise<void> {
    const entry: IExtensionCacheEntry<T> = {
        id: key,
        value,
        formatVersion,
        __etag: -1,
    };
    return service.getValue().then((dataService): Q.IPromise<void> =>
        dataService.setDocument(collection, entry).then(() => undefined)
    );
}

export function get<T>(key: string): Q.IPromise<T | null> {
    return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: IExtensionDataService) => {
        return dataService.getDocument(collection, key).then((doc: IExtensionCacheEntry<T>) => {
            return doc.formatVersion === formatVersion ? doc.value : null;
        }, (error: TfsError): T | null => {
            const status = Number(error.status);
            // If collection has not been created yet;
            if (status === 404 ||
                // User does not have permissions
                status === 401) {
                return null;
            }
            throw error;
        });
    });
}

// export function tryGet<T>(key: string, generator: () => Q.IPromise<T>, expiration?: Date): Q.IPromise<T> {
    
//     return get(identitiesKey).then(
//         (identities): Q.IPromise<IdentityRef[]> | IdentityRef[] => {
//             if (identities) {
//                 return toIdentityArr(identities);
//             }
//             return generator().then((projects) => {
//                 store(key, projects);
//                 return toIdentityArr(projects);
//             });
//         }
//     )
// }