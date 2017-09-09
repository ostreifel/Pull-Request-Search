import * as ExtensionCache from "../caching/extensionCache";
import { IImageLookup, createLookup } from "./images";
import * as Q from "q";
import * as LZString from "lz-string";

interface IImageDocument {
    compressedLookup: string;
    version: number;
    /** JSON date */
    expiration: string;
}
const key = "image-lookup";
const validDays = 30;
function store(lookup: IImageDocument): Q.IPromise<void> {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + validDays);
    return ExtensionCache.store(key, lookup, expiration);
}

const version = 1;
function fromDocument(doc: IImageDocument): IImageLookup | null {
    if (doc.version !== version) {
        return null;
    }
    const json = LZString.decompress(doc.compressedLookup);
    const lookup = JSON.parse(json);
    return lookup;
}
function toDocument(lookup: IImageLookup, expiration: Date | null) {
    if (!expiration) {
        expiration = new Date();
        expiration.setDate(expiration.getDate() + validDays);
    }
    const document: IImageDocument = {
        compressedLookup: LZString.compress(JSON.stringify(lookup)),
        version,
        expiration: expiration.toJSON(),
    };
    return document;
}

function findMissingIds(lookup: IImageLookup, uniquenames: string[]): string[] {
    return uniquenames.filter(name => !(name in lookup));
}

export function get(uniquenames: string[]): Q.IPromise<IImageLookup> {
    return ExtensionCache.get<IImageDocument>(key).then((images): IImageLookup | Q.IPromise<IImageLookup> => {
        const lookup: IImageLookup | null = images ? fromDocument(images) : null;
        const missingIds = lookup ? findMissingIds(lookup, uniquenames) : uniquenames;
        if (missingIds.length === 0) {
            return lookup || {};
        }
        return createLookup(missingIds).then((missingLookups) => {
            const newLookup: IImageLookup = {
                ...(lookup || {}),
                ...missingLookups,
            };
            // store(toDocument(newLookup, lookup && new Date(lookup.expiration)));
            const str = JSON.stringify(newLookup);
            const compressed = LZString.compress(str);
            console.log("raw: ", str.length);
            console.log("compressed: ", compressed.length);
            return newLookup;
        });
    });
}