
import * as ReactDom from "react-dom";
import * as React from "react";
import { BaseControl } from "VSS/Controls";
import { Combo, IComboOptions } from "VSS/Controls/Combos";
import {
    GitPullRequest,
    GitRepository,
} from "TFS/VersionControl/Contracts";
import { IPrFile, ISearchedFile } from "./contentsContracts";
import { renderSearchResults } from "./renderContentSearch";

const contentsSearchBox = BaseControl.createIn(Combo, $(".contents-search"), { mode: "text", onKeyDown: (e) => {
    if (e.keyCode === 13) {
        search();
    }
} } as IComboOptions) as Combo;
let prFiles: IPrFile[] = null;
let prUrl: string = null;

export function initializeContentsSearch(pr: GitPullRequest, repository: GitRepository, prFileContents: IPrFile[]) {
    prFiles = prFileContents;
    
    const uri = VSS.getWebContext().host.uri;
    const project = VSS.getWebContext().project.name;
    const team = VSS.getWebContext().team.name;
    prUrl = pr.repository.name ?
        `${uri}${project}/${team}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`
        :
        `${uri}_git/${this.props.repository.project.name}/pullrequest/${pr.pullRequestId}`;
    search();
}


function containsString(target: string, search: string): boolean {
    target = target.toLocaleLowerCase();
    search = search.toLocaleLowerCase();
    return target.indexOf(search) >= 0;
}

function search(): void {
    const searchString = contentsSearchBox.getInputText();
    const searchResults: ISearchedFile[] = [];
    if (searchString) {

    for (let file of prFiles) {
        const searchedFile = {path: file.path, source: [], target: []};
        if (file.originalText) {
            for (let linenumber in file.originalText) {
                const line = file.originalText[linenumber];
                if (containsString(line, searchString)) {
                    searchedFile.source.push({line: Number(linenumber) + 1, text: line});
                }
            }
        }
        if (file.text) {
            for (let linenumber in file.text) {
                const line = file.text[linenumber];
                if (containsString(line, searchString)) {
                    searchedFile.target.push({line: Number(linenumber) + 1, text: line});
                }
            }
        }
        if (searchedFile.source.length > 0 ||
                searchedFile.target.length > 0 ||
                containsString(searchedFile.path, searchString)) {
            searchResults.push(searchedFile);
        }
    }
    } else {
        searchResults.push(...prFiles.map(f => {return {path: f.path, source: [], target: []}}));
    }
    renderSearchResults(searchResults, prUrl);
}

function backToPullRequestSearch() {
    $("#pull-request-contents-search-container").hide();
    $("#pull-request-search-container").show();
    $("#contents-results").html("");
}

$(".search-button").click(search);
$(".back-button").click(backToPullRequestSearch);
