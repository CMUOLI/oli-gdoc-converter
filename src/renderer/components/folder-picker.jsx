import React from 'react';
import fs from 'fs';
const {dialog} = require('electron').remote;

export default class FolderPicker extends React.Component {
    constructor() {
        super();
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e) {
        dialog.showOpenDialog({properties: ['openDirectory']}, this.handleFileNames.bind(this));
    }

    handleFileNames(fileNames) {
        if (fileNames === undefined) return;

        var fileName = fileNames[0];
        let stats = fs.statSync(fileName);

        if (stats.isFile()) {
            return;
        }
        this.props.onChange(fileName);
    }

    render() {
        return (
            <div>
                <div style={{marginBottom:"3px"}}>
                    <button onClick={this.handleClick}>{this.props.choice}</button>
                </div>
                <div style={{overflow: "scroll"}}>
                    <div style={{lineHeight: "20px"}}>
                        <span className="icontext">{this.props.folder}</span>
                    </div>
                </div>
            </div>
        );
    }
}
