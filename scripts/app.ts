import { Combo, IComboOptions, ComboDateBehavior } from "VSS/Controls/Combos";
import { BaseControl } from "VSS/Controls";
import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { IdentityPicker } from "./IdentityPicker";
import { registerHashCallback, updateParameter, getParameters } from "./hashChange";
import { runQuery, IQueryParams } from "./runQuery";

function runQueryFromParams() {
    getParameters().then(hashCallback);
}

function hashCallback(params: IQueryParams) {
    updateControlsFromHash(params);
    if (repositories) {
        runQuery(repositories, params);
    } else {
        repositoryCallbacks.push(() => runQuery(repositories, params));
    }
}

function updateControlsFromHash({
                                    creatorId,
                                    reviewerId,
                                    start,
                                    end,
                                    title,
                                    repositoryId,
                                    status
                                }: IQueryParams) {
    function isFocused(combo: Combo) {
        return combo.getElement().find(":focus").length > 0;
    }
    identityCallback = () => {
        if (!isFocused(creatorControl)) {
            creatorControl.setByIdentityId(creatorId, false);
        }
        if (!isFocused(reviewerControl)) {
            reviewerControl.setByIdentityId(reviewerId, false);
        }
        identityCallback = null;
    };
    if (identitiesLoaded) {
        identityCallback();
    }

    if (!isFocused(startDateControl)) {
        if (start) {
            (startDateControl.getBehavior() as ComboDateBehavior).setSelectedDate(new Date(start), false);
        } else {
            startDateControl.setInputText("");
        }
    }
    if (!isFocused(endDateControl)) {
        if (end) {
            (endDateControl.getBehavior() as ComboDateBehavior).setSelectedDate(new Date(end), false);
        } else {
            endDateControl.setInputText("", false);
        }
    }
    if (!isFocused(titleControl)) {
        titleControl.setInputText(title);
    }
    // const fireRepo = repositories === undefined;
    const repoCallback = () => {
        if (!isFocused(repoControl)) {
            const [repo] = repositories.filter(r => r.id === repositoryId);
            const repoName = (repo && repo.name) || "";
            if (repoName !== repoControl.getInputText()) {
                repoControl.setInputText(repoName, false);
            }
        }
    };
    if (repositories) {
        repoCallback();
    } else {
        repositoryCallbacks.push(repoCallback);
    }
    if (!isFocused(statusControl)) {
        statusControl.setInputText(status || "Active", false);
    }
    // Start first query
    runQueryFromParams();
}

// create controls
const statusOptions: IComboOptions = {
    source: [
        "Active",
        "Abandoned",
        "Completed",
        "All",
        "Awaiting Approval",
        "Awaiting Author",
        "Approved with suggestions",
        "Approved",
        "Rejected",
    ],
    value: "Active",
    dropOptions: {
        maxRowCount: 20
    }
};
const statusControl = <Combo>BaseControl.createIn(Combo, $(".status-picker"), statusOptions);

const creatorControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".creator-picker"), {});
const reviewerControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".reviewer-picker"), {});
const titleControl = <Combo>BaseControl.createIn(Combo, $(".title-box"), <IComboOptions>{ mode: "text" });
const startDateControl = <Combo>BaseControl.createIn(Combo, $(".start-date-box"), <IComboOptions>{ type: "date-time" });
const endDateControl = <Combo>BaseControl.createIn(Combo, $(".end-date-box"), <IComboOptions>{ type: "date-time" });
const repoControl = <Combo>BaseControl.createIn(Combo, $(".repo-picker"), <IComboOptions>{});

let repositories: GitRepository[];
const repositoryCallbacks: (() => void)[] = [];
getGitClient().getRepositories(VSS.getWebContext().project.id).then(
    (repos) => {
        repositories = repos.sort((a, b) => a.name.localeCompare(b.name));
        repoControl.setSource(repositories.map((r) => r.name));
        while (repositoryCallbacks.length > 0) {
            const callback = repositoryCallbacks.pop();
            callback();
        }
    }
);

let identityCallback: () => void;
let identitiesLoaded: boolean = false;

IdentityPicker.cacheAllIdentitiesInProject(VSS.getWebContext().project).then(() => {
    IdentityPicker.updatePickers();
    if (identityCallback) {
        identityCallback();
        identitiesLoaded = true;
    }
});

function getSelectedRepositoryId(): string | null {
    const idx = repoControl.getSelectedIndex();
    return idx < 0 ? null : repositories[idx].id;
}

// event Logic
creatorControl._bind("change", () => {
    if (creatorControl.getSelectedIndex() >= 0 || !creatorControl.getText()) {
        updateParameter("creatorId", creatorControl.selectedIdentityId());
    }
});
reviewerControl._bind("change", () => {
    if (reviewerControl.getSelectedIndex() >= 0 || !reviewerControl.getText()) {
        updateParameter("reviewerId", reviewerControl.selectedIdentityId());
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
    const value = startDateControl.getValue() ? (startDateControl.getValue() as Date).toLocaleDateString() : "";
    updateParameter("start", value);
});
endDateControl._bind("change", () => {
    const value = endDateControl.getValue() ? (endDateControl.getValue() as Date).toLocaleDateString() : "";
    updateParameter("end", value);
});
repoControl._bind("change", () => {
    if (repoControl.getSelectedIndex() >= 0 || !repoControl.getText()) {
        updateParameter("repositoryId", getSelectedRepositoryId());
    }
});
$(".refresh").click(() => runQueryFromParams());
registerHashCallback(hashCallback);

VSS.register(VSS.getContribution().id, {});
