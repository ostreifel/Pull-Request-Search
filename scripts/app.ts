import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { IdentityPickerSearchControl, IIdentityPickerSearchOptions } from "VSS/Identities/Picker/Controls";
import { BaseControl } from "VSS/Controls";
import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { GitPullRequestSearchCriteria, PullRequestStatus, GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";
import { renderResults } from "./PullRequestsView";
import { IEntity } from "VSS/Identities/Picker/RestClient";

// create controls
const statusOptions: IComboOptions = {
    source: ["Active", "Abandoned", "Completed", "All"],
    value: "Active",
};
const statusControl = <Combo>BaseControl.createIn(Combo, $(".status-picker"), statusOptions);

const idOptions: IIdentityPickerSearchOptions = {
    identityType: { User: true, Group: true },
};
const creatorControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $(".creator-picker"), idOptions);
const reviewerControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $(".reviewer-picker"), idOptions);
const titleControl = <Combo>BaseControl.createIn(Combo, $(".title-box"), <IComboOptions>{ mode: "text" });
const startDateControl = <Combo>BaseControl.createIn(Combo, $(".start-date-box"), <IComboOptions>{ type: "date-time" });
const endDateControl = <Combo>BaseControl.createIn(Combo, $(".end-date-box"), <IComboOptions>{ type: "date-time" });
const repoControl = <Combo>BaseControl.createIn(Combo, $(".repo-picker"), {});


function getValue(control: IdentityPickerSearchControl): IEntity {
    const resolvedEntities = control.getIdentitySearchResult().resolvedEntities;
    if (resolvedEntities && resolvedEntities.length === 1) {
        return resolvedEntities[0];
    }
}

let repositories: GitRepository[];
getGitClient().getRepositories(VSS.getWebContext().project.id).then(
    (repos) => {
        repositories = repos.sort((a, b) => a.name.localeCompare(b.name));
        repoControl.setSource(repositories.map((r) => r.name));
    }
);
function getSelectedRepo(): string | null {
    const idx = repoControl.getSelectedIndex();
    return idx < 0 ? null : repositories[idx].id;
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
    const creator = getValue(creatorControl);
    const reviewer = getValue(reviewerControl);
    const criteria: GitPullRequestSearchCriteria = {
        creatorId: creator && creator.localId,
        reviewerId: reviewer && reviewer.localId,
        status: PullRequestStatus[statusControl.getInputText()],
        sourceRefName: null,
        targetRefName: null,
        includeLinks: false,
        repositoryId: getSelectedRepo()

    };
    const projectId = VSS.getWebContext().project.id;
    getGitClient().getPullRequestsByProject(projectId, criteria, null, append ? allPullRequests.length : 0, 100).then((pullRequests) => {
        if (append) {
            allPullRequests = allPullRequests.concat(pullRequests);
        } else {
            allPullRequests = pullRequests;
        }
        console.log(allPullRequests);
        renderResults(allPullRequests, createFilter(), () => runQuery(true));
    }, (error) => {
        console.log(error);
    });
}

// event Logic
creatorControl._bind(IdentityPickerSearchControl.VALID_INPUT_EVENT, () => runQuery());
creatorControl._bind(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => runQuery());
reviewerControl._bind(IdentityPickerSearchControl.VALID_INPUT_EVENT, () => runQuery());
reviewerControl._bind(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => runQuery());
statusControl._bind("change", () => {
    if (statusControl.getSelectedIndex() < 0) {
        return;
    }
    runQuery();
});
titleControl._bind("change", () => {
    renderResults(allPullRequests, createFilter(), () => runQuery(true));
});
startDateControl._bind("change", () => {
    renderResults(allPullRequests, createFilter(), () => runQuery(true));
});
endDateControl._bind("change", () => {
    renderResults(allPullRequests, createFilter(), () => runQuery(true));
});
repoControl._bind("change", () => {
    if (repoControl.getSelectedIndex() < 0 && repoControl.getText()) {
        return;
    }
    runQuery();
});

runQuery();


VSS.register(VSS.getContribution().id, {});