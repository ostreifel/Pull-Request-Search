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
    const skip = prev ? prev.changes.length : 0;
    return getGitClient().getCommitDiffs(repository.id,
        repository.project.name,
        false,
        100,
        skip,
        source,
        target
    ).then(diffs => {
        const page = diffs.changes.length === 100;
        if (prev) {
            diffs.changes.push(...prev.changes);
        }
        if (page) {
            return getDiffItems(sourceId, targetId, repository, diffs);
        }
        return diffs;
    });
}

function getDiffBlobs(diffs: GitCommitDiffs, repository: GitRepository): Q.IPromise<IPrFile[]> {
    const client = getGitClient();
    const toStrArr = (buffer: ArrayBuffer) => {
        var file = '';
        var bytes = new Uint8Array( buffer );
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            file += String.fromCharCode( bytes[ i ] );
        }
        return file.split('\n');
    };
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
            return getGitClient().getCommit(pullRequst.lastMergeCommit.commitId, repository.id, repository.project.id, 0)
                .then(commit => {
                    const baseCommit = commit.parents[0] === prCommits[0].commitId ?
                        commit.parents[1] : commit.parents[0];
                    return [commit.parents[0], prCommits]
                });
        });
}

export function loadAndShowContents(pullRequest: GitPullRequest, repository: GitRepository): void {
    $("#pull-request-search-container").hide();
    $("#pull-request-contents-search-container").show();
    setMessage("Loading pr commits...");
    getCommits(pullRequest, repository).then(([parentCommitId, prCommits]) => {
        setMessage("Loading diff items...");
        getDiffItems(parentCommitId, prCommits[0].commitId, repository).then(diffItems => {
            setMessage("Loading diff blobs...");
            getDiffBlobs(diffItems, repository).then(diffBlobs => {
                setMessage("");
                initializeContentsSearch(pullRequest, repository, diffBlobs)
            });
        }
        );
    });
}

