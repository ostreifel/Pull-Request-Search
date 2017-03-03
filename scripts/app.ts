import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { BaseControl } from "VSS/Controls";
import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { GitPullRequestSearchCriteria, PullRequestStatus, GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { renderResults, renderMessage, PAGE_SIZE } from "./PullRequestsView";
import { IdentityPicker } from "./IdentityPicker";
import { registerHashCallback, updateParameter, getParameters } from "./hashChange";
import { runQuery } from "./runQuery";

function runQueryFromParams() {
    getParameters().then(params => runQuery(repositories, params));
}

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
        
        runQueryFromParams();
    }
);
function getSelectedRepo(): string | null {
    const idx = repoControl.getSelectedIndex();
    return idx < 0 ? null : repositories[idx].id;
}

// event Logic
creatorControl._bind("change", () => {
    if (creatorControl.getSelectedIndex() >= 0 || !creatorControl.getText()) {
        updateParameter("creator", creatorControl.getValue() as string);
    }
});
reviewerControl._bind("change", () => {
    if (reviewerControl.getSelectedIndex() >= 0 || !reviewerControl.getText()) {
        updateParameter("reviewer", reviewerControl.getValue() as string);
    }
});
statusControl._bind("change", () => {
    if (statusControl.getSelectedIndex() < 0) {
        return;
    }
    updateParameter("status", statusControl.getValue() as string);
});
titleControl._bind("change", () => {
    updateParameter("title", titleControl.getValue() as string);
});
startDateControl._bind("change", () => {
    const value = startDateControl.getValue() ? startDateControl.getValue().toString() : "";
    updateParameter("start", value);
});
endDateControl._bind("change", () => {
    const value = endDateControl.getValue() ? endDateControl.getValue().toString() : "";
    updateParameter("end", value);
});
repoControl._bind("change", () => {
    if (repoControl.getSelectedIndex() >= 0 || !repoControl.getText()) {
        updateParameter("repo", repoControl.getValue() as string);
    }
});
$(".refresh").click(() => runQueryFromParams());
registerHashCallback(params => runQuery(repositories, params));

VSS.register(VSS.getContribution().id, {});