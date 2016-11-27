/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export default class Converter {
  /**
   * Creates an instance, usually used for testing only.
   *
   * @param  {string} cachePath  The root directory to use as a cache path
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   */
  constructor(argWrapper) {
    this.srcFiles = argWrapper.srcFiles;
    this.destFolder = argWrapper.destFolder;
    this.inlineCommentOut = argWrapper.inlineCommentOut;
  }
  
  convert(){
      
  }
  
}
