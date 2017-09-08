import * as Lz from "lz-string";
import * as Q from "q";
import { throttlePromises } from "./caching/throttlePromises";
import { callApi, binaryCall } from "./RestCall";
import { IdentitiesSearchRequestModel, QueryTokenResultModel } from "VSS/Identities/Picker/RestClient";
import { CommonIdentityPickerHttpClient } from "VSS/Identities/Picker/RestClient"
import { IdentityService } from "VSS/Identities/Picker/Services";
import { CachedValue } from "./caching/cachedValue";
import * as Service from "VSS/Service";

const client = Service.getService(IdentityService)
const uri = VSS.getWebContext().collection.uri;
function getEntityId(uniqueName: string): Q.IPromise<string> {
    const promises = client.getIdentities(uniqueName, {AAD: true, IMS: true, Source: true}, {User: true, Group: true});
    const [key] = Object.keys(promises);
    return promises[key].then((queryResult) => queryResult.identities[0].entityId);
}

/** get the avatar as a dataurl */
function getAvatar(entityId: string): Q.IPromise<string> {
    const url = `${uri}_apis/IdentityPicker/Identities/${entityId}/avatar`;
    
    const deferred = Q.defer<any>();
    binaryCall(url, "GET", (response, contentType) => {
        const mimeType = contentType.match(/image\/\w+/)![0]
        const base64 = btoa(Array.prototype.map.call(response, function (ch) {
            return String.fromCharCode(ch);
        }).join(''));
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

export function createLookup(uniqueNames: string[]):
Q.IPromise<{[uniqueNames: string]: string}>
{
    return throttlePromises(
        uniqueNames,
        (uniqueName) => {
            return getEntityId(uniqueName).then(getAvatar).then(resizeImage).then((dataUrl) => [uniqueName, dataUrl]);
        },
        6
    ).then((entries): {[uniqueNames: string]: string} => {
        const map: {[uniqueNames: string]: string} = {};
        for (const [uniqueName, dataUrl] of entries) {
            map[uniqueName] = dataUrl;
        }
        return map;
    }) as Q.IPromise<{[uniqueNames: string]: string}>;
}
