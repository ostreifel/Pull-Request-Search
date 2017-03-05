import {
    VersionControlChangeType,
} from "TFS/VersionControl/Contracts";

export interface IPrFile {
    path: string;
    changeType: VersionControlChangeType;
    text: string[];
    originalText: string[];
}

export interface ILineResult {
    line: number;
    text: string;
}

export interface ISearchedFile {
    path: string;
    source: ILineResult[];
    target: ILineResult[];
}
