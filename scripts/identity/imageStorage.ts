import * as ExtensionCache from "../caching/extensionCache";
import { IImageLookup } from "./images";
import * as Q from "q";

const key = "image-lookup";
export function store(lookup: IImageLookup): Q.IPromise<void> {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);
    return ExtensionCache.store(key, lookup, expiration);
}

export function get(): Q.IPromise<IImageLookup | null> {
    return ExtensionCache.get<IImageLookup>(key);
}