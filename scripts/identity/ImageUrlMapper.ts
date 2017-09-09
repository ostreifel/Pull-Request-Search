import * as Q from "q";
import { IImageLookup } from "./images";
import { getIdentities } from "./getIdentities";
import * as ImageStorage from "./imageStorage";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { CachedValue } from "../caching/cachedValue";

const imageMappers: {[projName: string]: CachedValue<ImageUrlMapper>} = {};
export class ImageUrlMapper {
    public static create(timeout: string, project?: { id: string, name: string }): Q.IPromise<ImageUrlMapper> {
        const key = project ? project.name : "";
        if (!(key in imageMappers)) {
            imageMappers[key] = new CachedValue(() =>
                getIdentities(project).then((identities) => {
                    const uniqueNames = identities.map(i => i.uniqueName || i.displayName).filter(n => !!n);
                    return ImageStorage.get(uniqueNames).then((lookup) => 
                        new ImageUrlMapper(lookup),
                    );
                })
            );
        }
        const deferred = Q.defer<ImageUrlMapper>();
        imageMappers[key].getValue().then((mapper) => {
            deferred.resolve(mapper);
        });
        // fallback if getting identities is taking too long
        setTimeout(() => {
            deferred.resolve(new ImageUrlMapper({}))
        }, timeout);
        return deferred.promise;
    }
    private constructor(
        private readonly lookup: IImageLookup,
    ) {
    }
    getImageUrl(identity: IdentityRef): string {
        const lookupKey = identity.isContainer ? identity.displayName : identity.uniqueName;
        return this.lookup[lookupKey] || identity.imageUrl;
    }
}