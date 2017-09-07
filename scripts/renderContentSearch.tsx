import * as ReactDom from "react-dom";
import * as React from "react";
import { 
    ISearchedFile,
    ILineResult
} from "./contentsContracts";

class Lines extends React.Component<{lines: ILineResult[]}, void> {
    render() {
        const lineElems: JSX.Element[] = [];
        for (let line of this.props.lines) {
            lineElems.push(
                <div className="row">
                    <div className="cell line-number">{line.line}</div>
                    <div className="cell file-text">{line.text}</div>
                </div>
            );
        }
        return (
            <div className="table search-file">
                {lineElems}
            </div>
        );
    }
}

class SearchedFile extends React.Component<{file: ISearchedFile, prUrl: string}, void> {
    render() {
        const files: JSX.Element[] = [];
        if (this.props.file.source.length > 0) {
            files.push(
                <div>
                    <div className="file-type">Previus version</div>
                    <Lines lines={this.props.file.source}/>
                </div>
            );
        }
        if (this.props.file.target.length > 0) {
            files.push(
                <div>
                    <div className="file-type">New Version</div>
                    <Lines lines={this.props.file.target}/>
                </div>
            );
        }
        const fileUrl = `${this.props.prUrl}?path=${encodeURI(this.props.file.path)}&_a=files`;
        return (
            <div>
                <a
                    className="file-name"
                    href={fileUrl}
                    rel="noreferrer"
                    target="_blank"
                >{this.props.file.path}</a>
                {files}
            </div>
        );
    }
}

export function renderSearchResults(searchResults: ISearchedFile[], prUrl: string) {
    console.log(`Rendering ${searchResults.length} files`);
    const fileElems: JSX.Element[] = [];
    for (let file of searchResults) {
        fileElems.push(<SearchedFile file={file} prUrl={prUrl}/>);
    }
    if (fileElems.length === 0) {
        fileElems.push(<div>{"No matches found"}</div>);
    }
    ReactDom.render(
        <div>
            {fileElems}
        </div>, document.getElementById("contents-results")!);
}
