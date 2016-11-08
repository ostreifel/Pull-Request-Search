import {Combo, IComboOptions} from "VSS/Controls/Combos";
import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {BaseControl} from "VSS/Controls";
import {getClient as getCoreClient} from "TFS/Core/RestClient";
import {getClient as getGitClient} from "TFS/VersionControl/GitRestClient";
import {GitPullRequestSearchCriteria, PullRequestStatus, GitPullRequest} from "TFS/VersionControl/Contracts";
import {renderResults} from "./PullRequestsView";

//Create controls
const idOptions: IComboOptions = {
    source: ['Active', 'Abandoned', 'Completed', 'All'],
    value: 'Active',
};
const statusControl = <Combo>BaseControl.createIn(Combo, $('.status-picker'), idOptions);

const creatorControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $('.creator-picker'), {});
const reviewerControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $('.reviewer-picker'), {});
const titleControl = <Combo>BaseControl.createIn(Combo, $(".title-box"), <IComboOptions>{mode: "text"});
const startDateControl = <Combo>BaseControl.createIn(Combo, $(".start-date-box"), <IComboOptions>{type: "date-time"});
const endDateControl = <Combo>BaseControl.createIn(Combo, $(".end-date-box"), <IComboOptions>{type: "date-time"});

function getValue(control: IdentityPickerSearchControl) {
    const resolvedEntities = control.getIdentitySearchResult().resolvedEntities;
    if (resolvedEntities && resolvedEntities.length === 1) {
        return resolvedEntities[0].localId;
    }
}


//Query Logic
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
function runQuery(append = false) {
    const creatorId = getValue(creatorControl);
    const reviewerId = getValue(reviewerControl);
    const criteria: GitPullRequestSearchCriteria = {
        creatorId: creatorId,
        reviewerId: reviewerId,
        status: PullRequestStatus[statusControl.getInputText()],
        sourceRefName: null,
        targetRefName: null,
        includeLinks: false,
        repositoryId: null

    };
    
    const projectId = VSS.getWebContext().project.id;
    getGitClient().getPullRequestsByProject(projectId, criteria).then((pullRequests) => {
        if (append) {
            allPullRequests = allPullRequests.concat(pullRequests);
        } else {
            allPullRequests = pullRequests;
        }
        console.log(allPullRequests);
        renderResults(allPullRequests, createFilter());
    }, (error) => {
        console.log(error);
    });
}

//Event Logic
creatorControl._bind(IdentityPickerSearchControl.VALID_INPUT_EVENT, runQuery);
creatorControl._bind(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, runQuery);
reviewerControl._bind(IdentityPickerSearchControl.VALID_INPUT_EVENT, runQuery);
reviewerControl._bind(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, runQuery);
statusControl._bind("change", () => {
    if (statusControl.getSelectedIndex() < 0) {
        return;
    }
    runQuery();
})
titleControl._bind("change", () => {
    renderResults(allPullRequests, createFilter());
})
startDateControl._bind("change", () => {
    renderResults(allPullRequests, createFilter());
})
endDateControl._bind("change", () => {
    renderResults(allPullRequests, createFilter());
})

runQuery();

VSS.register(VSS.getContribution().id, {});