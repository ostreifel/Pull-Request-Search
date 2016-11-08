import {Combo, IComboOptions} from "VSS/Controls/Combos";
import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {BaseControl} from "VSS/Controls";
import {getClient as getCoreClient} from "TFS/Core/RestClient";
import {getClient as getGitClient} from "TFS/VersionControl/GitRestClient";
import {GitPullRequestSearchCriteria, PullRequestStatus} from "TFS/VersionControl/Contracts";
import {renderResults} from "./PullRequestsView";

const idOptions: IComboOptions = {
    source: ['Active', 'Abandoned', 'Completed', 'All'],
    value: 'Active',
};
const statusControl = <Combo>BaseControl.createIn(Combo, $('.status-picker'), idOptions);

const creatorControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $('.creator-picker'), {});
const reviewerControl = <IdentityPickerSearchControl>BaseControl.createIn(IdentityPickerSearchControl, $('.reviewer-picker'), {});

function getValue(control: IdentityPickerSearchControl) {
    const resolvedEntities = control.getIdentitySearchResult().resolvedEntities;
    if (resolvedEntities && resolvedEntities.length === 1) {
        console.log(resolvedEntities[0]);
        return resolvedEntities[0].localId;
    }
}

function runQuery() {
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
        console.log(pullRequests);
        renderResults(pullRequests);
    }, (error) => {
        console.log(error);
    });
}
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

runQuery();

VSS.register(VSS.getContribution().id, {});