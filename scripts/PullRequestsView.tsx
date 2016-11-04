import {GitPullRequest} from "TFS/VersionControl/Contracts";
import * as ReactDom from "react-dom";
import * as React from "react";

class RequestRow extends React.Component<{pullRequest: GitPullRequest}, void> {
    render() {
        const pr = this.props.pullRequest;
        return (<div>{pr.title}</div>);
    }
}
class RequestsView extends React.Component<{pullRequests: GitPullRequest[]}, void> {
    render() {
        const rows = this.props.pullRequests.map((pullRequest) => (
            <RequestRow pullRequest={pullRequest}/>
        ));
        return (
            <div>
                {rows}
            </div>
        );
    }
}

export function renderResults(pullRequests: GitPullRequest[]) {
    const view = (<div></div>);
    ReactDom.render(
        <RequestsView pullRequests={pullRequests}/>,
        document.getElementById("results")
    )
}