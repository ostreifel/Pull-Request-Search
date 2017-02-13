import { getClient as getGitClient } from "TFS/VersionControl/GitRestClient";
import { 
    GitPullRequest,
    GitRepository,
    GitBaseVersionDescriptor,
    GitTargetVersionDescriptor,
    GitVersionOptions,
    GitVersionType,
    GitCommitDiffs,
    GitItemRequestData,
    GitCommitRef,
    GitObjectType,
    VersionControlChangeType,
} from "TFS/VersionControl/Contracts";
import * as ReactDom from "react-dom";
import * as React from "react";
import * as Q from "q";
import { initializeContentsSearch } from "./searchContents";
import { IPrFile } from "./contentsContracts";

function setMessage(message: string) {
    ReactDom.render(<div>{message}</div>, document.getElementById("contents-message"));
}

/**
 * Page through common diffs
 */
function getDiffItems(sourceId: string, targetId: string, repository: GitRepository, prev?: GitCommitDiffs) {
    const source = {
        version: sourceId,
        versionOptions: GitVersionOptions.None,
        versionType: GitVersionType.Commit
    } as GitBaseVersionDescriptor;
    const target = {
        version: targetId,
        versionOptions: GitVersionOptions.None,
        versionType: GitVersionType.Commit
    } as GitTargetVersionDescriptor;
    // get getGitClient().getCommitDiffs does not work because it uses the wrong params
    // uses           https://ottost.visualstudio.com/Board%20Control/_apis/git/repositories/ebdb7ac1-28ca-4ce1-bb3e-f17f7e3deaf7/diffs/commits?diffCommonCommit=false&%24top=100&%24skip=0&baseVersionDescriptor%5BbaseVersion%5D=61ef60b7701bb62d5fb9aa4eb5014854ae2b0e87&baseVersionDescriptor%5BbaseVersionOptions%5D=0&baseVersionDescriptor%5BbaseVersionType%5D=2&targetVersionDescriptor%5BtargetVersion%5D=856bdc2c75fb30cefee7b02c6ccc9bc8e73e187a&targetVersionDescriptor%5BtargetVersionOptions%5D=0&targetVersionDescriptor%5BtargetVersionType%5D=2
    // when should be https://ottost.visualstudio.com/Board%20Control/_apis/git/repositories/ebdb7ac1-28ca-4ce1-bb3e-f17f7e3deaf7/diffs/commits?diffCommonCommit=false&$top=100&$skip=0&baseVersion=61ef60b7701bb62d5fb9aa4eb5014854ae2b0e87&baseVersionType=2&targetVersion=856bdc2c75fb30cefee7b02c6ccc9bc8e73e187a&targetVersionType=2
    // basically uses targetVersionDescriptor%5BtargetVersion%5D=856bdc2c75fb30cefee7b02c6ccc9bc8e73e187a
    // instead of     targetVersion=856bdc2c75fb30cefee7b02c6ccc9bc8e73e187a
    const skip = prev ? prev.changes.length : 0;

    const host = VSS.getWebContext().host.uri;
    const path = `${repository.project.name}/_apis/git/repositories/${repository.id}/difs/commits`;
    const params = `$top=100&$skip=${skip}&baseVersion=${sourceId}&baseType=2&targetVersion=${targetId}&targetType=2`;
    return getGitClient().getCommitDiffs(repository.id,
        repository.project.name,
        false,
        100,
        prev ? prev.changes.length : 0,
        source,
        target
    ).then(diffs => {
        if (prev) {
            diffs.changes.push(...prev.changes);
        }
        if (diffs.changes.length === 100) {
            return getDiffItems(sourceId, targetId, repository, diffs);
        }
        return diffs;
    });
}

function getDiffBlobs(diffs: GitCommitDiffs, repository: GitRepository): Q.IPromise<IPrFile[]> {
    const client = getGitClient();
    const toStrArr = (buffer: ArrayBuffer) => String.fromCharCode.apply(null, new Uint8Array(buffer)).split('\n');
    return Q.all(
        diffs.changes.filter(c => c.item.gitObjectType === "blob" as any
            && (
                c.changeType === VersionControlChangeType.Add ||
                c.changeType === VersionControlChangeType.Edit ||
                c.changeType === VersionControlChangeType.Delete
            )).map(d => {
            if (d.changeType === VersionControlChangeType.Add) {
                return client.getBlobContent(repository.id, d.item.objectId, repository.project.id, false)
                .then(c => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Add,
                        text: toStrArr(c)
                    } as IPrFile
                });
            } else if (d.changeType === VersionControlChangeType.Delete) {
                return client.getBlobContent(repository.id, d.item.originalObjectId, repository.project.id, false)
                .then(c => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Delete,
                        originalText: toStrArr(c)
                    } as IPrFile
                });
            } else {
                return Q.all([
                    client.getBlobContent(repository.id, d.item.originalObjectId, repository.project.id, false),
                    client.getBlobContent(repository.id, d.item.objectId, repository.project.id, false)
                ]).then(([originalBuffer, buffer]) => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Edit,
                        originalText: toStrArr(originalBuffer),
                        text: toStrArr(buffer)
                    } as IPrFile
                });
            }
        })
    );
}

function getCommits(pullRequst: GitPullRequest, repository: GitRepository): IPromise<[string, GitCommitRef[]]> {
    return getGitClient().getPullRequestCommits(repository.id, pullRequst.pullRequestId, repository.project.id)
        .then(prCommits => {
            console.log(prCommits);
            var initialCommit = prCommits[prCommits.length - 1];
            return getGitClient().getCommit(initialCommit.commitId, repository.id, repository.project.id, 0)
                .then(commit => [commit.parents[0], prCommits]);
        })
}

export function loadAndShowContents(pullRequest: GitPullRequest, repository: GitRepository): void {
    $("#pull-request-search-container").hide();
    $("#pull-request-contents-search-container").show();
    setMessage("Loading pr commits...");
    getCommits(pullRequest, repository).then(([parentCommitId, prCommits]) => {
        setMessage("Loading diff items...");
        getDiffItems(parentCommitId, prCommits[prCommits.length - 1].commitId, repository).then(diffItems => {
            setMessage("Loading diff blobs...");
            getDiffBlobs(diffItems, repository).then(diffBlobs => {
                setMessage("");
                initializeContentsSearch(pullRequest, repository, diffBlobs)
            });
        }
        );
    });
}

