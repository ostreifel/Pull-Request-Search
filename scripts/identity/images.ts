import * as Lz from "lz-string";
import * as Q from "q";
import { throttlePromises } from "../caching/throttlePromises";
import { callApi, binaryCall } from "../RestCall";
import { IdentitiesSearchRequestModel, QueryTokenResultModel } from "VSS/Identities/Picker/RestClient";
import { CommonIdentityPickerHttpClient, IEntity } from "VSS/Identities/Picker/RestClient"
import { IdentityService } from "VSS/Identities/Picker/Services";
import { CachedValue } from "../caching/cachedValue";
import * as Service from "VSS/Service";
import * as defaultImages from "../identity/defaultImages";

const client = Service.getService(IdentityService)
const uri = VSS.getWebContext().collection.uri;
function getEntityId(searchName: string): Q.IPromise<IEntity> {
    const match = searchName.match(/\[.*\]\\(.*)/);
    const query = match ? match[1] : searchName;
    const promises = client.getIdentities(query, {AAD: true, IMS: true, Source: true}, {User: true, Group: true});
    const [key] = Object.keys(promises);
    return promises[key].then((queryResult) => 
        queryResult.identities.find(i => !match || i.displayName === searchName) as IEntity
    );
}

/** get the avatar as a dataurl */
function getAvatar(entity: IEntity): Q.IPromise<string> {
    const url = `${uri}_apis/IdentityPicker/Identities/${entity.entityId}/avatar`;
    
    const deferred = Q.defer<any>();
    binaryCall(url, "GET", (response, contentType) => {
        if (response.length === 0) {
            if (entity.entityType === "Group") {
                deferred.resolve(defaultImages.groupImage);
                return;
            } else {
                deferred.resolve(defaultImages.userImage);
                return;
            }
        }
        const mimeType = contentType.match(/image\/\w+/)![0]
        const base64 = btoa(Array.prototype.map.call(response, (ch) =>
            String.fromCharCode(ch)
        ).join(''));
        const dataurl = `data:${mimeType};base64,${base64}`;
        deferred.resolve(dataurl);
    });
    return deferred.promise;
}

function resizeImage(dataUrl: string): Q.IPromise<string> {
    const deferred = Q.defer<string>();
    var canvas = document.createElement("canvas");
    canvas.width = 44;
    canvas.height = 44;
    var img = document.createElement("img");
    img.src = dataUrl;
    img.onload = () => {
        canvas.getContext("2d")!.drawImage(img, 0, 0, 44, 44);
        const resized = canvas.toDataURL();
        deferred.resolve(resized);
    }


    return deferred.promise;
}

export interface IImageUrl {
    dataUrl: string;
    cachedDate: string;
}

/** Unique name (or display name if unique is unavailable) to dataurl */
export interface IImageLookup {
    [uniqueName: string]: IImageUrl;
}
export function createLookup(uniqueNames: string[]): Q.IPromise<IImageLookup> {
    return throttlePromises(
        uniqueNames,
        (uniqueName) => {
            return getEntityId(uniqueName).then(getAvatar).then(resizeImage).then((dataUrl) => [uniqueName, dataUrl]);
        },
        6
    ).then((entries): IImageLookup => {
        const map: IImageLookup = {};
        for (const [uniqueName, dataUrl] of entries) {
            map[uniqueName] = {dataUrl, cachedDate: new Date().toJSON()};
        }
        return map;
    }) as Q.IPromise<IImageLookup>;
}
