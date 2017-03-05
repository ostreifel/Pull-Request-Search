import { PullRequestStatus, GitPullRequest } from "TFS/VersionControl/Contracts";

const statusDisplayMappings = {
    "Active": PullRequestStatus.Active,
    "Rejected": PullRequestStatus.Active,
    "Awaiting Author": PullRequestStatus.Active,
    "Approved with suggestions": PullRequestStatus.Active,
    "Approved": PullRequestStatus.Active,
    "Awaiting Approval": PullRequestStatus.Active,
    "Abandoned": PullRequestStatus.Abandoned,
    "Completed": PullRequestStatus.Completed,
    "All": PullRequestStatus.All
};

export function getStatusFromDisplayString(statusString: string) {
    if (statusString in statusDisplayMappings) {
        return statusDisplayMappings[statusString];
    }
    return PullRequestStatus.Active;
}

export function computeStatus(pr: GitPullRequest): string {
    if (pr.status !== PullRequestStatus.Active) {
        return PullRequestStatus[pr.status];
    }
    const reviewers = pr.reviewers;
    if ($.grep(reviewers, (reviewer) => reviewer.vote === -10).length > 0) {
        return "Rejected";
    } else if ($.grep(reviewers, (reviewer) => reviewer.vote === -5).length > 0) {
        return "Awaiting Author";
    } else if ($.grep(reviewers, (reviewer) => reviewer.vote === 5).length > 0) {
        return "Approved with suggestions";
    } else if ($.grep(reviewers, (reviewer) => reviewer.vote === 10).length > 0) {
        return "Approved";
    } else {
        return "Awaiting Approval";
    }
}