import {getClient as getCoreClient} from "TFS/Core/RestClient";
import {getClient as getGitClient} from "TFS/VersionControl/GitRestClient";
import * as React from "React";


const gitClient = getGitClient();
const coreClient = getCoreClient();

const projectId = VSS.getWebContext().project.id;
const teamId = VSS.getWebContext().team.id;
// limits to 100
coreClient.getTeamMembers(projectId, teamId).then((teamMembers) => {
    console.log(teamMembers);
});

VSS.register(VSS.getExtensionContext().extensionId, {});