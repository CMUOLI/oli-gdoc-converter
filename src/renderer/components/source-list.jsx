import React from 'react';

export default class SourceFiles extends React.Component {
    constructor() {
        super();
        this.handleSelection = this.handleSelection.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
    }

    handleSelection(selection) {
        this.props.onChange(selection);
    }

    handleSelectAll(e) {
        this.props.onSelectAll(e.target.checked);
    }

    handleRefresh() {
        this.props.onRefresh();
    }

    render() {
        const files = this.props.sourceFiles;
        const selectAll = this.props.selectAll;
        return (
            <div style={{border: "1px solid #c4c0c0", padding: "5px"}}>
                <div className="group">
                    <div style={{float: "left", width: "50%"}}>
                        <input type="checkbox" name="selectall" checked={selectAll} onChange={this.handleSelectAll}/>
                        <label>Select All</label>
                    </div>
                    <div style={{float: "right", width: "50%",textAlign: "right"}}>
                        <button onClick={this.handleSelectAll}>Refresh</button>
                    </div>
                </div>
                <div style={{
                    border: "1px solid #000",
                    marginTop: "5px",
                    padding: "3px",
                    height: "350px",
                    overflow: "scroll"
                }}>
                    <ul>
                        {files.map((file) => <Item key={file.filename} selected={file.selected} filename={file.filename}
                                                   onChange={this.handleSelection}/>)}
                    </ul>
                </div>
            </div>
        );
    }
}

export class Item extends React.Component {
    constructor() {
        super();
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e) {
        this.props.onChange({filename: e.target.value, selected: e.target.checked});
    }

    render() {
        const selected = this.props.selected;
        const filename = this.props.filename;
        return (
            <li><input type="checkbox" value={filename} checked={selected} onChange={this.handleChange}/>{filename}</li>
        );
    }
}
