import { GitPullRequest, GitRepository, PullRequestStatus, PullRequestAsyncStatus } from "TFS/VersionControl/Contracts";
import * as ReactDom from "react-dom";
import * as React from "react";
import * as Utils_Date from "VSS/Utils/Date";
import { loadAndShowContents } from "./loadContents";
import { computeStatus } from "./status";
import { HostNavigationService } from "VSS/SDK/Services/Navigation";
import { ImageUrlMapper } from "./identity/ImageUrlMapper";
import { identitiesInPrs } from "./identitiesInPrs";
import * as Q from "q";

export interface ICallbacks {
    creator: (displayName: string) => void;
    reviewer: (displayName: string) => void;
}

export const PAGE_SIZE = 100;
export const PAGING_LIMIT = 1000;


class RequestRow extends React.Component<{
    pullRequest: GitPullRequest,
    repository: GitRepository,
    navigationService: HostNavigationService,
    imgUrlMapper: ImageUrlMapper,
}, {}> {
    render() {
        const { imgUrlMapper, navigationService, pullRequest: pr, repository } = this.props;

        const uri = VSS.getWebContext().host.uri;
        const project = VSS.getWebContext().project.name;
        const team = VSS.getWebContext().team.name;
        const url = `${uri}${project}/${team}/_git/${repository.name}/pullrequest/${pr.pullRequestId}`;
        const targetName = pr.targetRefName.replace("refs/heads/", "");
        const createTime = Utils_Date.friendly(pr.creationDate);

        const reviewerImages = pr.reviewers.map((reviewer) =>
            <img style={{ display: "block-inline" }} src={imgUrlMapper.getImageUrl(reviewer)} title={reviewer.displayName} />
        );
        return (
            <tr className="pr-row">
                <td><img src={imgUrlMapper.getImageUrl(pr.createdBy)} title={pr.createdBy.displayName} /></td>
                <td>
                    <a href={url} target={"_blank"} rel={"noreferrer"} onClick={(e) => {
                            navigationService.openNewWindow(url, "");
                            e.stopPropagation();
                            e.preventDefault();
                    }}>{pr.title}</a>
                    <div>{`${pr.createdBy.displayName} requested #${pr.pullRequestId} into ${targetName} ${createTime}`}</div>
                    {pr.mergeStatus === PullRequestAsyncStatus.Conflicts ? <div className="conflicts">Conflicts</div> : null}
                </td>
                <td className="bowtie column-pad-right">
                    <button
                        className="cta"
                        onClick={() => loadAndShowContents(pr, repository)}
                    >
                        {"Search Contents"}
                    </button>
                </td>
                <td className="column-pad-right">
                    {computeStatus(pr)}
                </td>
                <td className="column-pad-right">
                    {pr.repository.name}
                </td>
                <td>
                    {reviewerImages}
                </td>
            </tr>
        );
    }
}
class RequestsView extends React.Component<{
    pullRequests: GitPullRequest[],
    repositories: GitRepository[],
    navigationService: HostNavigationService,
    imgUrlMapper: ImageUrlMapper,
}, {}> {
    render() {
        const {navigationService, imgUrlMapper} = this.props;
        const repositoryMap: { [id: string]: GitRepository } = {};
        for (let repo of this.props.repositories) {
            repositoryMap[repo.id] = repo;
        }
        const rows = this.props.pullRequests.map((pullRequest) => (
            <RequestRow repository={repositoryMap[pullRequest.repository.id]} {...{navigationService, imgUrlMapper, pullRequest}} />
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

class InfoHeader extends React.Component<{}, {}> {
    render() {
        return (
            <div>
                <a href={"https://marketplace.visualstudio.com/items?itemName=ottostreifel.pull-request-search"} target={"_blank"}>
                    {"Write a review"}
                </a> {" | "}
                <a href={"https://github.com/ostreifel/Pull-Request-Search/issues"} target={"_blank"}>Report an issue</a>{" | "}
                <a href={"mailto:prsearchextension@microsoft.com"} target={"_blank"}>Feedback and questions</a>
            </div>
        );
    }
}

function inView(element: HTMLElement, fullyInView: boolean): boolean {
    const pageTop = $(window).scrollTop();
    const pageBottom = pageTop + $(window).height();
    const elementTop = $(element).offset().top;
    const elementBottom = elementTop + $(element).height();

    if (fullyInView === true) {
        return ((pageTop < elementTop) && (pageBottom > elementBottom));
    } else {
        return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
    }
}

export function renderResults(pullRequests: GitPullRequest[], repositories: GitRepository[], filter: (pr: GitPullRequest) => boolean, getMore: () => void) {
    if (pullRequests.length === 0) {
        renderMessage("No pull requests found");
    } else {
        const mapperPromise = new ImageUrlMapper({});//ImageUrlMapper.create(identitiesInPrs(pullRequests), 2000);
        Q.all([
            VSS.getService(VSS.ServiceIds.Navigation) as Q.IPromise<HostNavigationService>,
            mapperPromise
        ]).then(([navigationService, imgUrlMapper]) => {
            $(".pull-request-search-container #message").html("");
            const filtered = pullRequests.filter(filter);
            const probablyMoreAvailable = pullRequests.length % PAGE_SIZE === 0;
            const limitResults = pullRequests.length >= PAGING_LIMIT;
            window.onscroll = () => {
                if (probablyMoreAvailable && !limitResults && inView($(".show-more")[0], false)) {
                    getMore();
                    delete window.onscroll;
                }
            };
            ReactDom.render(
                <div>
                    <RequestsView pullRequests={filtered} repositories={repositories} navigationService={navigationService} imgUrlMapper={imgUrlMapper} />
                    <div className="show-more">
                        {`${filtered.length}/${pullRequests.length} pull requests match title, date and status criteria. `}
                        <span>{probablyMoreAvailable && !limitResults ? "Loading next page..." : ""}</span>
                        <a onClick={getMore}>{limitResults ? "Search more." : ""}</a>
                    </div>
                </div>,
                document.getElementById("results")!,
                () => {
                    if (probablyMoreAvailable && !limitResults && inView($(".show-more")[0], false)) {
                        getMore();
                    }
                }
            );
        });
    }

    ReactDom.render(
        <InfoHeader />,
        document.getElementById("header")!,
    );
}
export function renderMessage(message: string, clearResults = true) {
    ReactDom.render(<div>{message}</div>, document.getElementById("message")!);
    if (clearResults) {
        $("#results").html("");
    }
}
