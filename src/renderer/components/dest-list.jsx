import React from 'react';

export default class DestFiles extends React.Component {
    constructor() {
        super();
    }

    render() {
        const files = this.props.destFiles;
        return (
            <div style={{border: "1px solid #c4c0c0", padding: "5px"}}>
                <div style={{
                    border: "1px solid #000",
                    marginTop: "23px",
                    padding: "3px",
                    height: "300px",
                    overflow: "scroll"
                }}>
                    <ul>
                        {files.map((file) => <li key={file}>{file}</li>)}
                    </ul>
                </div>
            </div>
        );
    }
}
