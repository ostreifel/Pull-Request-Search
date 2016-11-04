import {Combo, IComboOptions} from "VSS/Controls/Combos";
import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {BaseControl} from "VSS/Controls";
import {getClient as getCoreClient} from "TFS/Core/RestClient";
import {getClient as getGitClient} from "TFS/VersionControl/GitRestClient";

const idOptions: IComboOptions = {
    source: ['Active', 'Abandoned', 'Completed'],
    value: 'Active'
};
const statusControl = <Combo>BaseControl.createIn(Combo, $('.status-picker'), idOptions);
const creatorControl = <Combo>BaseControl.createIn(Combo, $('.creator-picker'), {});
const reviewerControl = <Combo>BaseControl.createIn(Combo, $('.reviewer-picker'), {});
$('.search-button').click(() => {})


const gitClient = getGitClient();
const coreClient = getCoreClient();
gitClient.getPullRequests
const projectId = VSS.getWebContext().project.id;
const teamId = VSS.getWebContext().team.id;
// limits to 100
coreClient.getTeamMembers(projectId, teamId).then((teamMembers) => {
    const memberNames = teamMembers.map((member) => member.displayName);
    creatorControl.setSource(memberNames);
    creatorControl.setText(memberNames[0], false);
    reviewerControl.setSource(memberNames);
    reviewerControl.setText(memberNames[0], false);

});

VSS.register(VSS.getExtensionContext().extensionId, {});