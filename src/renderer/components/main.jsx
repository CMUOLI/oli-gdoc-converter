import React from 'react';
import fs from 'fs';
import path from 'path';
import {shell} from 'electron';
import FolderPicker from './folder-picker';
import SourceFiles from './source-list';
import DestFiles from './dest-list';

export default class Main extends React.Component {
  constructor() {
    super();
    this.handleSourceFolder = this.handleSourceFolder.bind(this);
    this.handleDestFolder = this.handleDestFolder.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handleRefreshSourceFolder = this.handleRefreshSourceFolder.bind(this);
    this.handleConvert = this.handleConvert.bind(this);
    this.state = {
      sourceFolder: 'none',
      destFolder: 'none',
      sourceFiles: [],
      destFiles: [],
      inlineCommentOut: "true"
    };
  }

  handleSourceFolder(folder){
      let s = this.state;
      s.sourceFolder = folder;
      fs.readdirSync(folder).forEach((name) => {
        let fullName = path.join(folder, name);
        let stats = fs.statSync(fullName);
        if (stats.isFile() && name.endsWith(".zip")) {
            let source = {selected:false, filename:name};
            s.sourceFiles.push(source);
        }
      });
      this.setState(s);
  }
  
  handleDestFolder(folder){
      let s = this.state;
      s.destFolder = folder;
      fs.readdirSync(folder).forEach((name) => {
        let fullName = path.join(folder, name);
        let stats = fs.statSync(fullName);
        if (stats.isFile()) {
            s.destFiles.push(name);
        }
      });
      this.setState(s);
  }
  
  handleSelection(selection){
      const list = this.state.sourceFiles;
      list.map((f) => {
          if(f.filename === selection.filename){
            f.selected = selection.selected;
          }
      });
      let s = this.state;
      s.sourceFiles = list;
      this.setState(s);
  }
  
  handleRefreshSourceFolder(){
      let s = this.state;
      if(s.sourceFolder === "none"){
          return;
      }
      s.sourceFiles = [];
      fs.readdirSync(s.sourceFolder).forEach((name) => {
        let fullName = path.join(s.sourceFolder, name);
        let stats = fs.statSync(fullName);
        if (stats.isFile() && name.endsWith(".zip")) {
            let source = {selected:false, filename:name};
            s.sourceFiles.push(source);
        }
      });
      this.setState(s);
  }
  
  handleSelectAll(select){
      const list = this.state.sourceFiles;
      list.map((f) => {
        f.selected = select;
      });
      let s = this.state;
      s.sourceFiles = list;
      this.setState(s);
  }
  
  handleConvert(){
      
  }
  
  handleCommentOut(e){
      let s = this.state;
      s.inlineCommentOut = e.target.checked;
      this.setState(s);
  }

  render() {
    const sourceFolder = this.state.sourceFolder;
    const destFolder = this.state.destFolder;
    const sourceFiles = this.state.sourceFiles;
    const destFiles = this.state.destFiles;
    return (
      <div style={{border: "1px solid #c4c0c0",width:"800px",padding:"10px",margin:"35px 20px 20px 20px"}}>
        <h4 style={{textAlign:"center",margin:"2px"}}>OLI Google Docs Converter</h4>
        <div className="group">
          <div style={{float:"left",width:"49%"}}>
            <FolderPicker choice="Choose Source Folder" folder={sourceFolder} onChange={this.handleSourceFolder}/>  
            <SourceFiles sourceFiles={sourceFiles} onChange={this.handleSelection} onSelectAll={this.handleSelectAll} onRefresh={this.handleRefreshSourceFolder}/>
          </div>
          <div style={{float:"right",width:"49%"}}>
            <FolderPicker choice="Choose Destination Folder" folder={destFolder} onChange={this.handleDestFolder}/>  
            <DestFiles destFiles={destFiles}/>
          </div>
        </div>
        <div style={{textAlign:"center",margin:"10px"}}>
          <button onClick={this.handleConvert}>Convert to OLI Workbook Pages</button>
        </div>
        <div style={{border:"1px solid #c4c0c0"}}>
          <h5 style={{margin:"2px",textDecoration:"underline"}}>Options</h5>
          <input type="checkbox" name="opt" onChange={this.handleCommentOut}/>
          <label>comment-out inline assessment tags</label>
        </div>
      </div>
    );
  }
}

