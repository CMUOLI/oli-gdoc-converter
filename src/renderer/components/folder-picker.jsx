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
  
  handleFileNames(fileNames){
    if (fileNames === undefined) return;

    var fileName = fileNames[0];
    console.log("testing console output handleFileNames " +fileName);
    let stats = fs.statSync(fileName);
      
    if (stats.isFile()) {
      return;
    }
    this.props.onChange(fileName);
  }

  render() {
    return (
      <div>
        <div>
          <button onClick={this.handleClick}>{this.props.choice}</button>
        </div>
        <div>
          <div style={{lineHeight:"20px"}}>
            <img src="../assets/images/folder.svg" style={{verticalAlign: "middle", height:"20px", width:"20px"}} />&nbsp;{this.props.folder}
          </div>
        </div>
      </div>
    );
  }
}
