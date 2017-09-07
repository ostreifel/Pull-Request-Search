import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { renderMessage, renderResults, PAGE_SIZE } from "./PullRequestsView";
import { GitPullRequestSearchCriteria, PullRequestStatus, GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";
import { IdentityPicker } from "./IdentityPicker";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { computeStatus } from "./status";


function cacheIdentitiesFromPr(pr: GitPullRequest) {
    const cache = (ident: IdentityRef | null) => ident && IdentityPicker.cacheIdentity(ident);
    cache(pr.autoCompleteSetBy);
    cache(pr.closedBy);
    cache(pr.createdBy);
    pr.reviewers.map(r => cache(r));
    IdentityPicker.updatePickers();
}

export interface IQueryParams {
    // Client filter params
    start?: Date;
    end?: Date;
    title?: string;

    // Rest query params
    creatorId?: string;
    reviewerId?: string;
    status?: string;
    repositoryId?: string;

}

function createFilter({title, start, end, status}: IQueryParams): (pullRequest: GitPullRequest) => boolean {
    title = title && title.toLocaleLowerCase();
    const statusEnum = status ? PullRequestStatus[status] : PullRequestStatus.Active;
    return (pullRequest: GitPullRequest) =>
        (!title || pullRequest.title.toLocaleLowerCase().indexOf(title) >= 0)
        && (!start || pullRequest.creationDate.getTime() >= start.getTime())
        && (!end || pullRequest.creationDate.getTime() <= end.getTime())
        && (statusEnum === PullRequestStatus.All || 
            (statusEnum ? pullRequest.status === statusEnum : status === computeStatus(pullRequest)));
}

let allPullRequests: GitPullRequest[] = [];
let requestedCount: number = 0;
function queryFromRest(repositories: GitRepository[], params: IQueryParams, append: boolean) {
    if (append && requestedCount > allPullRequests.length) {
        return;
    }
    const status = params.status && PullRequestStatus[params.status] || PullRequestStatus.Active;
    const {creatorId, reviewerId, repositoryId} = params;
    const criteria = {
        creatorId,
        reviewerId,
        status: status,
        includeLinks: false,
        repositoryId
    } as GitPullRequestSearchCriteria;
    const projectId = VSS.getWebContext().project.id;
    renderMessage("Loading pull requests...", false);
    getGitClient().getPullRequestsByProject(projectId, criteria, undefined, append ? allPullRequests.length : 0, PAGE_SIZE).then((pullRequests) => {
        requestedCount = append ? allPullRequests.length + PAGE_SIZE : PAGE_SIZE;
        renderMessage("", false);
        pullRequests.map(pr => cacheIdentitiesFromPr(pr));
        if (append) {
            allPullRequests = allPullRequests.concat(pullRequests);
        } else {
            allPullRequests = pullRequests;
        }
        console.log(allPullRequests);
        renderResults(allPullRequests, repositories, createFilter(params), () => queryFromRest(repositories, params, true));
    }, (error) => {
        console.log(error);
    });
}

let previousParams: IQueryParams = {};
function isOnlyFilterChange(params: IQueryParams) {
    const allKeys: {[key: string]: void} = {};
    for (let key in params) {
        allKeys[key] = void 0;
    }
    for (let key in previousParams) {
        allKeys[key] = void 0;
    }

    try {
        let restChanges = 0;
        let filterChanges = 0;
        const filterParams = ["title", "start", "end"];
        for (let key in allKeys) {
            const changed = params[key] !== previousParams[key];
            if (changed && filterParams.indexOf(key) < 0) {
                restChanges++;
            } else if (changed && filterParams.indexOf(key) >= 0) {
                filterChanges++;
            }
        }
        return restChanges === 0 && filterChanges > 0;
    } finally {
        previousParams = {...params};
    }
}
export function runQuery(repositories: GitRepository[], params: IQueryParams, append = false) {
    if (isOnlyFilterChange(params)) {
        console.log("only filter change", params)
        renderResults(allPullRequests, repositories, createFilter(params), () => queryFromRest(repositories, params, true));
    } else {
        console.log("rest param change", params);
        queryFromRest(repositories, params, append);
    }
}