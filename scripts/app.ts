import {Combo, IComboOptions} from "VSS/Controls/Combos";
import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {BaseControl} from "VSS/Controls";
import {getClient as getCoreClient} from "TFS/Core/RestClient";
import {getClient as getGitClient} from "TFS/VersionControl/GitRestClient";
import {GitPullRequestSearchCriteria, PullRequestStatus} from "TFS/VersionControl/Contracts";
import {renderResults} from "./PullRequestsView";

const idOptions: IComboOptions = {
    source: ['Active', 'Abandoned', 'Completed', 'All'],
    value: 'Active'
};
const statusControl = <Combo>BaseControl.createIn(Combo, $('.status-picker'), idOptions);
const creatorControl = <Combo>BaseControl.createIn(Combo, $('.creator-picker'), {});
const reviewerControl = <Combo>BaseControl.createIn(Combo, $('.reviewer-picker'), {});
$('.search-button').click(() => {})


const gitClient = getGitClient();
const projectId = VSS.getWebContext().project.id;
const teamId = VSS.getWebContext().team.id;
// limits to 100
getCoreClient().getTeamMembers(projectId, teamId).then((teamMembers) => {
    const memberNames = teamMembers.map((member) => member.displayName);
    creatorControl.setSource(memberNames);
    creatorControl.setText(memberNames[0], false);
    reviewerControl.setSource(memberNames);

    $('.search-button').click(() => {
        const creator = teamMembers[creatorControl.getSelectedIndex()]
        const reviewer = teamMembers[reviewerControl.getSelectedIndex()]
        const criteria: GitPullRequestSearchCriteria = {
            creatorId: creator && creator.id,
            reviewerId: reviewer && reviewer.id,
            status: PullRequestStatus[statusControl.getInputText()],
            sourceRefName: null,
            targetRefName: null,
            includeLinks: false,
            repositoryId: null

        };
        gitClient.getPullRequestsByProject(VSS.getWebContext().project.id, criteria).then((pullRequests) => {
            console.log(pullRequests);
            renderResults(pullRequests);
        }, (error) => {
            console.log(error);
        });

    });
});

VSS.register(VSS.getExtensionContext().extensionId, {});