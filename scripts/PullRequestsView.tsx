import { GitPullRequest, PullRequestStatus, IdentityRefWithVote } from "TFS/VersionControl/Contracts";
import * as ReactDom from "react-dom";
import * as React from "react";
import * as Utils_Date from "VSS/Utils/Date";

function computeApprovalStatus(reviewers: IdentityRefWithVote[]): string {
    
        if ($.grep(reviewers, (reviewer) => reviewer.vote == -10).length > 0) {
            return "Rejected";
        } else if ($.grep(reviewers, (reviewer) => reviewer.vote == -5).length > 0) {
            return "Awaiting Author";
        } else if ($.grep(reviewers, (reviewer) => reviewer.vote == 5).length > 0) {
            return "Approved with suggestions";
        } else if ($.grep(reviewers, (reviewer) => reviewer.vote == 10).length > 0) {
            return "Approved";
        } else {
            return "Awaiting Approval";
        }
}

class RequestRow extends React.Component<{ pullRequest: GitPullRequest }, void> {
    render() {
        const pr = this.props.pullRequest;

        const uri = VSS.getWebContext().host.uri;
        const project = VSS.getWebContext().project.name;
        const team = VSS.getWebContext().team.name;
        const url = `${uri}${project}/${team}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`;
        const targetName = pr.targetRefName.replace('refs/heads/', '');
        const createTime = Utils_Date.friendly(pr.creationDate);

        const approvalStatus = computeApprovalStatus(pr.reviewers);

        const reviewerImages = pr.reviewers.slice(0, 8).map((reviewer) =>
            <img style={{ display: "block-inline" }} src={reviewer.imageUrl} title={reviewer.displayName}/>
        );
        return (
            <tr className="pr-row">
                <td><img src={pr.createdBy.imageUrl} /></td>
                <td>
                    <a href={url} target={'_blank'}>{pr.title}</a>
                    <div>{pr.createdBy.displayName} requested #{pr.pullRequestId} into {targetName} {createTime}</div>
                </td>
                <td className="skinny-column">
                    {pr.status == PullRequestStatus.Active ? approvalStatus : PullRequestStatus[pr.status]}
                </td>
                <td className="skinny-column">
                    {pr.repository.name}
                </td>
                <td>
                    {reviewerImages}
                </td>
            </tr>
        );
    }
}
class RequestsView extends React.Component<{ pullRequests: GitPullRequest[] }, void> {
    render() {

        const rows = this.props.pullRequests.map((pullRequest) => (
            <RequestRow pullRequest={pullRequest} />
        ));
        return (
            <table>
                <tbody>
                    {rows}
                </tbody>
            </table>
        );
    }
}

export function renderResults(pullRequests: GitPullRequest[], filter: (pr: GitPullRequest) => boolean, getMore: () => void) {
    if (pullRequests.length == 0) {
        ReactDom.render(<div>No pull requests found</div>, document.getElementById("results"));
        return;
    }

    const filtered = pullRequests.filter(filter);
    ReactDom.render(
        <div>
            <RequestsView pullRequests={filtered} />
            <div>{`${filtered.length}/${pullRequests.length} pull requests match title and date criteria.`}
                <a onClick={getMore}>
                    {pullRequests.length % 100 === 0 ? 'Search more items' : ''}
                </a>
            </div>
        </div>,
        document.getElementById("results")
    );
}