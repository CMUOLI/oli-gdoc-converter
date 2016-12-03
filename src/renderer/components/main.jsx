import React from 'react';
import fs from 'fs-extra';
import path from 'path';
import {shell} from 'electron';
import FolderPicker from './folder-picker';
import SourceFiles from './source-list';
import DestFiles from './dest-list';
import Converter from '../../converter';

export default class Main extends React.Component {
    constructor() {
        super();
        this.handleSourceFolder = this.handleSourceFolder.bind(this);
        this.handleDestFolder = this.handleDestFolder.bind(this);
        this.handleSelection = this.handleSelection.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.handleRefreshSourceFolder = this.handleRefreshSourceFolder.bind(this);
        this.handleConvert = this.handleConvert.bind(this);
        this.handleRefreshDestFolder = this.handleRefreshDestFolder.bind(this);
        this.handleCommentOut = this.handleCommentOut.bind(this);
        this.handleErrors = this.handleErrors.bind(this);
        this.handleShowProgress = this.handleShowProgress.bind(this);
        this.state = {
            sourceFolder: 'none',
            destFolder: 'none',
            sourceFiles: [],
            destFiles: [],
            inlineCommentOut: true,
            selectAll: false,
            showProgress: false,
            error: null
        };
    }

    handleSourceFolder(folder) {
        let s = this.state;
        s.sourceFolder = folder;
        fs.readdirSync(folder).forEach((name) => {
            let fullName = path.join(folder, name);
            let stats = fs.statSync(fullName);
            if (stats.isFile() && name.endsWith(".zip")) {
                let source = {selected: false, filename: name};
                s.sourceFiles.push(source);
            }
        });
        this.setState(s);
    }

    handleDestFolder(folder) {
        let s = this.state;
        s.destFolder = folder;
        s.destFiles = [];
        let setState = this.setState.bind(this);
        fs.walk(folder)
            .on('data', function (item) {
                if (item.stats.isFile() && item.path.endsWith(".xml")) {
                    let name = path.basename(item.path);
                    if (!s.destFiles.includes(name)) {
                        s.destFiles.push(name);
                    }
                }
            })
            .on('end', function () {
                setState(s);
            });

    }

    handleRefreshDestFolder() {
        let s = this.state;
        s.destFiles = [];
        s.showProgress = false;
        let setState = this.setState.bind(this);
        fs.walk(s.destFolder)
            .on('data', function (item) {
                if (item.stats.isFile() && item.path.endsWith(".xml")) {
                    let name = path.basename(item.path);
                    if (!s.destFiles.includes(name)) {
                        s.destFiles.push(name);
                    }
                }
            })
            .on('end', function () {
                setState(s);
            });
    }

    handleSelection(selection) {
        const list = this.state.sourceFiles;
        let allSelected = true;
        list.forEach((f) => {
            if (f.filename === selection.filename) {
                f.selected = selection.selected;
            }
            if (!f.selected && allSelected) {
                allSelected = false;
            }
        });
        let s = this.state;
        s.sourceFiles = list;
        s.selectAll = allSelected;
        this.setState(s);
    }

    handleRefreshSourceFolder() {
        let s = this.state;
        if (s.sourceFolder === "none") {
            return;
        }
        s.sourceFiles = [];
        fs.readdirSync(s.sourceFolder).forEach((name) => {
            let fullName = path.join(s.sourceFolder, name);
            let stats = fs.statSync(fullName);
            if (stats.isFile() && name.endsWith(".zip")) {
                let source = {selected: false, filename: name};
                s.sourceFiles.push(source);
            }
        });
        this.setState(s);
    }

    handleSelectAll(select) {
        const list = this.state.sourceFiles;
        list.forEach((f) => {
            f.selected = select;
        });
        let s = this.state;
        s.sourceFiles = list;
        s.selectAll = select;
        this.setState(s);
    }

    handleConvert() {
        let s = this.state;
        const handleErrors = this.handleErrors;
        if (s.sourceFolder === "none" || s.destFolder === "none") {
            return handleErrors("Error! Both Source and Destination folders must be selected first");
        }
        if(s.showProgress){
            return handleErrors("Error! Previous request still in progress");
        }
        const hErrors = this.handleErrors;
        hErrors(null);
        const sProgress = this.handleShowProgress;
        let sFolder = s.sourceFolder;
        let dFolder = s.destFolder;
        let commentOut = s.inlineCommentOut;
        let sourceList = [];
        const list = s.sourceFiles;
        list.forEach((f) => {
            if (f.selected === true) {
                let fullName = path.join(sFolder, f.filename);
                sourceList.push(fullName);
            }
        });
        // No source files selected
        if (sourceList.length === 0) {
            return handleErrors("Error! At least one source file must be selected");
        }
        const convert = new Converter({
            srcFiles: sourceList,
            destFolder: dFolder,
            inlineCommentOut: commentOut,
            handleDestFolderRefresh: this.handleRefreshDestFolder,
            handleErrors: handleErrors
        });
        sProgress(true);
        convert.convert();
    }

    handleCommentOut(e) {
        let s = this.state;
        s.inlineCommentOut = e.target.checked;
        this.setState(s);
    }

    handleErrors(err) {
        let s = this.state;
        s.error = err;
        this.setState(s);
    }

    handleShowProgress(progress){
        let s = this.state;
        s.showProgress = progress;
        this.setState(s);
    }

    render() {
        const sourceFolder = this.state.sourceFolder;
        const destFolder = this.state.destFolder;
        const sourceFiles = this.state.sourceFiles;
        const destFiles = this.state.destFiles;
        const selectAll = this.state.selectAll;

        return (
            <div style={{
                border: "1px solid #c4c0c0",
                minWidth: "800px",
                padding: "10px",
                margin: "35px 20px 20px 20px"
            }}>
                <h4 style={{textAlign: "center", margin: "2px"}}>OLI Google Docs Converter</h4>
                <div className="group">
                    <div style={{float: "left", width: "49%"}}>
                        <div style={{marginBottom:"5px"}}>
                            <FolderPicker choice="Choose Source Folder" folder={sourceFolder}
                                          onChange={this.handleSourceFolder}/>
                        </div>
                        <div>
                            <SourceFiles sourceFiles={sourceFiles} selectAll={selectAll} onChange={this.handleSelection}
                                         onSelectAll={this.handleSelectAll} onRefresh={this.handleRefreshSourceFolder}/>
                        </div>
                    </div>
                    <div style={{float: "right", width: "49%"}}>
                        <div style={{marginBottom:"5px"}}>
                            <FolderPicker choice="Choose Destination Folder" folder={destFolder}
                                          onChange={this.handleDestFolder}/>
                        </div>
                        <div>
                            <DestFiles destFiles={destFiles}/>
                        </div>
                    </div>
                </div>
                {this.state.showProgress && <div style={{margin: "auto"}} className="three-bounce">
                    <div className="bounce1"/>
                    <div className="bounce2"/>
                    <div className="bounce3"/>
                </div>}

                <div style={{textAlign: "center", margin: "10px"}}>
                    <button onClick={this.handleConvert}>Convert to OLI Workbook Pages</button>
                </div>
                <div >
                    <h5 style={{margin: "2px", textDecoration: "underline"}}>Options</h5>
                    <input type="checkbox" name="opt" checked={this.state.inlineCommentOut}
                           onChange={this.handleCommentOut}/>
                    <label>comment-out inline assessment tags</label>
                </div>
                {this.state.error && <div style={{color: "red"}}>
                    {this.state.error}
                </div>}
            </div>
        );
    }
}

