import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { BaseControl } from "VSS/Controls";
import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { GitPullRequestSearchCriteria, PullRequestStatus, GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { renderResults, renderMessage } from "./PullRequestsView";
import { IdentityPicker } from "./IdentityPicker";

IdentityPicker.cacheAllIdentitiesInProject(VSS.getWebContext().project).then(() => IdentityPicker.updatePickers());

// create controls
const statusOptions: IComboOptions = {
    source: ["Active", "Abandoned", "Completed", "All"],
    value: "Active",
};
const statusControl = <Combo>BaseControl.createIn(Combo, $(".status-picker"), statusOptions);

const creatorControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".creator-picker"), {});
const reviewerControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".reviewer-picker"), {});
const titleControl = <Combo>BaseControl.createIn(Combo, $(".title-box"), <IComboOptions>{ mode: "text" });
const startDateControl = <Combo>BaseControl.createIn(Combo, $(".start-date-box"), <IComboOptions>{ type: "date-time" });
const endDateControl = <Combo>BaseControl.createIn(Combo, $(".end-date-box"), <IComboOptions>{ type: "date-time" });
const repoControl = <Combo>BaseControl.createIn(Combo, $(".repo-picker"), <IComboOptions>{});

let repositories: GitRepository[];
getGitClient().getRepositories(VSS.getWebContext().project.id).then(
    (repos) => {
        repositories = repos.sort((a, b) => a.name.localeCompare(b.name));
        repoControl.setSource(repositories.map((r) => r.name));

        runQuery();
    }
);
function getSelectedRepo(): string | null {
    const idx = repoControl.getSelectedIndex();
    return idx < 0 ? null : repositories[idx].id;
}


function cacheIdentitiesFromPr(pr: GitPullRequest) {
    const cache = (ident: IdentityRef | null) => ident && IdentityPicker.cacheIdentity(ident);
    cache(pr.autoCompleteSetBy);
    cache(pr.closedBy);
    cache(pr.createdBy);
    pr.reviewers.map(r => cache(r));
    IdentityPicker.updatePickers();
}


// query Logic
function createFilter(): (pullRequest: GitPullRequest) => boolean {
    const title = titleControl.getValue<string>().toLowerCase();
    const start = startDateControl.getValue<Date>();
    const end = endDateControl.getValue<Date>();

    return (pullRequest: GitPullRequest) =>
        (!title || pullRequest.title.toLowerCase().indexOf(title) >= 0)
        && (!start || pullRequest.creationDate.getTime() >= start.getTime())
        && (!end || pullRequest.creationDate.getTime() <= end.getTime());
}

let allPullRequests: GitPullRequest[] = [];
function runQuery(append: boolean = false) {
    const criteria: GitPullRequestSearchCriteria = {
        creatorId: creatorControl.selectedIdentityId(),
        reviewerId: reviewerControl.selectedIdentityId(),
        status: PullRequestStatus[statusControl.getInputText()],
        sourceRefName: null,
        targetRefName: null,
        includeLinks: false,
        repositoryId: getSelectedRepo()

    };
    const projectId = VSS.getWebContext().project.id;
    renderMessage("Loading pull requests...", false);
    getGitClient().getPullRequestsByProject(projectId, criteria, null, append ? allPullRequests.length : 0, 100).then((pullRequests) => {
        pullRequests.map(pr => cacheIdentitiesFromPr(pr));
        if (append) {
            allPullRequests = allPullRequests.concat(pullRequests);
        } else {
            allPullRequests = pullRequests;
        }
        console.log(allPullRequests);
        renderResults(allPullRequests, repositories, createFilter(), () => runQuery(true));
    }, (error) => {
        console.log(error);
    });
}

// event Logic
creatorControl._bind("change", () => {
    if (creatorControl.getSelectedIndex() >= 0 || !creatorControl.getText()) {
        runQuery();
    }
});
reviewerControl._bind("change", () => {
    if (reviewerControl.getSelectedIndex() >= 0 || !reviewerControl.getText()) {
        runQuery();
    }
});
statusControl._bind("change", () => {
    if (statusControl.getSelectedIndex() < 0) {
        return;
    }
    runQuery();
});
titleControl._bind("change", () => {
    renderResults(allPullRequests, repositories, createFilter(), () => runQuery(true));
});
startDateControl._bind("change", () => {
    renderResults(allPullRequests, repositories, createFilter(), () => runQuery(true));
});
endDateControl._bind("change", () => {
    renderResults(allPullRequests, repositories, createFilter(), () => runQuery(true));
});
repoControl._bind("change", () => {
    if (repoControl.getSelectedIndex() >= 0 || !repoControl.getText()) {
        runQuery();
    }
});
$(".refresh").click(() => runQuery());

VSS.register(VSS.getContribution().id, {});