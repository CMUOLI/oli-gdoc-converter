/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import fs from 'fs-extra';
import path from 'path';
import unzip from 'unzip';
import jsdom from 'jsdom';

export default class Converter {
    /**
     * Creates a converter instance.
     *
     *
     * @param  {argWrapper}  wrapper for user supplied variables to converter
     */
    constructor(argWrapper) {
        this.srcFiles = argWrapper.srcFiles;
        this.destFolder = argWrapper.destFolder;
        this.inlineCommentOut = argWrapper.inlineCommentOut;
        this.handleprocess = this.process.bind(this);
        this.handleN = this.handleNode.bind(this);
    }

    convert() {
        console.log('convert');
        let dFolder = this.destFolder;
        const hprocess = this.handleprocess;
        this.srcFiles.forEach((f) => {
            let fName = path.basename(f, '.zip');
            let xFolder = path.join(dFolder, fName);
            fs.emptyDirSync(xFolder, function (err) {
                if (!err) {
                    console.log('success! creating destination unzip folder');
                } else {
                    console.log('error! creating destination unzip folder');
                    return;
                }
            });
            fs.createReadStream(f)
                .pipe(unzip.Extract({path: xFolder}))
                .on('close', function () {
                    console.log('success! unziping content');

                    let items = []; // files, directories, symlinks, etc
                    fs.walk(xFolder)
                        .on('data', function (item) {
                            items.push(item);
                        })
                        .on('end', function () {
                            items.forEach((f) => {
                                console.log(f.path);
                            });
                            hprocess(xFolder, items);
                        });
                });
        });
    }

    process(xFolder, items) {
        let docFile = null;
        items.forEach((f) => {
            if (f.stats.isDirectory() && f.path.endsWith("images")) {
                console.log("Images directory " + f.path);
                // Move images directory to webcontent
                fs.move(f.path, path.join(xFolder, "webcontent"), function (err) {
                    if (err)
                        return console.error(err)
                    console.log("success!")
                })
            } else if (f.stats.isFile() && f.path.endsWith(".html")) {
                docFile = f.path;
            }
        });
        const handleN = this.handleN;
        fs.readFile(docFile, 'utf8', function (err, data) {
            jsdom.env(
                data,
                ["http://code.jquery.com/jquery.js"],
                function (err, window) {
                    const $ = window.$;
                    let en = '<?xml version="1.0" encoding="UTF-8"?>';
                    let wbDocType = '<!DOCTYPE workbook_page PUBLIC "-//Carnegie Mellon University//DTD Workbook Page 3.8//EN" "http://oli.cmu.edu/dtd/oli_workbook_page_3_8.dtd">';
                    let ss = '<?xml-stylesheet type="text/css" href="http://oli.cmu.edu/authoring/oxy-author/oli_workbook_page_3_8.css"?>'
                    let loDocType = '<!DOCTYPE objectives PUBLIC "-//Carnegie Mellon University//DTD Learning Objectives 2.0//EN" "http://oli.cmu.edu/dtd/oli_learning_objectives_2_0.dtd">'
                    const pages = new Array();
                    let xmlStack = new Array();
                    let xmlDoc = null;
                    let ldDoc = null;
                    let cntWbs = 0;
                    $("body").contents().each(function () {
                        let t = $(this).prop("tagName").toLowerCase();
                        //Headings
                        if (t === "h1" || t === "h2" || t === "h3" || t === "h4" || t === "h5" || t === "h6") {
                            let newDoc = false;
                            if (xmlDoc === null) {
                                newDoc = true;
                                xmlDoc = $($.parseXML(en+wbDocType+ss+'<workbook_page/>'));
                                pages.push(xmlDoc);
                                let id = path.basename(docFile, '.html');
                                if (cntWbs > 0) {
                                    id = id + cntWbs;
                                }
                                $('workbook_page', xmlDoc).attr({id: id});
                                $('workbook_page', xmlDoc).append($('<head/>', xmlDoc));
                                $('head', xmlDoc).append($('<title/>', xmlDoc).text($(this).text()));
                                let bod = $('<body/>', xmlDoc);
                                $('workbook_page', xmlDoc).append(bod);
                                xmlStack.push(bod);
                            }
                            if (xmlDoc === null) {
                                console.log("Document to be converted not well formed");
                                return false;
                            }
                            if ($(this).text().toUpperCase().startsWith("OBJECTIVE:")) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                if (sp.length > 2) {
                                    // Create an learning objective file
                                    if (ldDoc === null) {
                                        ldDoc = $($.parseXML('<?xml version="1.0" encoding="UTF-8"?><objectives/>'));
                                        let id = path.basename(docFile, '.html') + "_LO";
                                        $('objectives', ldDoc).attr({id: id});
                                        $('objectives', ldDoc).append($('<title/>', ldDoc).text("Learning Objectives"));
                                        let ob = $('<objective/>', ldDoc);
                                        let s = sp[1];
                                        ob.attr({id: s});
                                        ob.text(sp[2]);
                                        $('objectives', ldDoc).append(ob);
                                    }
                                }
                                let obref = $('<objref/>', xmlDoc);
                                let s = sp[1];
                                obref.attr({idref: s});
                                $('head', xmlDoc).append(obref);
                            } else if ($(this).text().toUpperCase().startsWith("EXAMPLE:")) {
                                let example = $('<example/>', xmlDoc);
                                example.append($('<title/>', xmlDoc).text($(this).text()));
                                let el = xmlStack.pop();
                                el.append(example);
                                xmlStack.push(el);
                                xmlStack.push(example);
                            } else if ($(this).text().toUpperCase().startsWith("LEARNBYDOING:")) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let inline = $('<wb:inline/>', xmlDoc);
                                let s = sp[1];
                                inline.attr({idref: s});
                                inline.attr({purpose: "learnbydoing"});
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith("YOUTUBE:")) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let youtube = $('<youtube/>', xmlDoc);
                                let s = sp[1];
                                youtube.attr({src: s});
                                if (sp.length > 2) {
                                    youtube.append($('<title/>', xmlDoc).text(sp[2]));
                                }
                                let el = xmlStack.pop();
                                el.append(youtube);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith("MANYSTUDENTSWONDER:")) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let inline = $('<wb:inline/>', xmlDoc);
                                let s = sp[1];
                                inline.attr({idref: s});
                                inline.attr({purpose: "manystudentswonder"});
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith("DIDIGETTHIS:")) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let inline = $('<wb:inline/>', xmlDoc);
                                let s = sp[1];
                                inline.attr({idref: s});
                                inline.attr({purpose: "didigetthis"});
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith("DEFINITION:")) {

                            } else if ($(this).text().toUpperCase().startsWith("PAGE:")) {
                                xmlStack = new Array();
                                xmlDoc = null;
                            } else if ($(this).text().toUpperCase().startsWith("NOTE:")) {

                            } else if ($(this).text().toUpperCase().startsWith("CHECKPOINT:")) {

                            } else if ($(this).text().toUpperCase().startsWith("LAB:")) {

                            } else if ($(this).text().toUpperCase().startsWith("MYRESPONSE:")) {

                            } else if ($(this).text().toUpperCase().startsWith("QUIZ:")) {

                            } else if ($(this).text().toUpperCase().startsWith("SIMULATION:")) {

                            } else if ($(this).text().toUpperCase().startsWith("WALKTHROUGH:")) {

                            } else if ($(this).text().toUpperCase().startsWith("END:")) {
                                xmlStack.pop();
                            } else if (!newDoc) {
                                let section = $('<section/>', xmlDoc);
                                section.append($('<title/>', xmlDoc).text($(this).text()));
                                let el = xmlStack.pop();
                                el.append(section);
                                xmlStack.push(el);
                                let sBod = $('<body/>', xmlDoc);
                                section.append(sBod);
                                xmlStack.push(sBod);
                            }
                        } else if (t === "p") {
                            let el = xmlStack.pop();
                            handleN($, xmlDoc, el, $(this), handleN);
                            xmlStack.push(el);
                        } else if (t === "span") {
                            if ($(this).text() && $(this).text().trim()) {
                                let t = $(this).text().replace(/\u00a0/g, " ");
                                let el = xmlStack.pop();
                                el.append(t.trim());
                                xmlStack.push(el);
                            }
                        } else if (t === "a") {
                            let t = $(this).text().replace(/\u00a0/g, " ");
                            if (t.trim()) {
                                let href = $(this).attr('href');
                                if (href) {
                                    let link = $('<link/>', xmlDoc);
                                    link.attr({href: href});
                                    link.text(t);
                                    let el = xmlStack.pop();
                                    el.append(link);
                                    xmlStack.push(el);
                                }
                            }
                        } else if (t === "table") {
                            let el = xmlStack.pop();
                            handleN($, xmlDoc, el, $(this), handleN);
                            xmlStack.push(el);
                        } else if (t === "img") {
                            let image = $('<image/>', xmlDoc);
                            let src = $(this).attr('src');
                            let i = src.lastIndexOf("/");
                            src = "../webcontent" + src.substring(i);
                            image.attr({src: src});
                            let el = xmlStack.pop();
                            el.append(image);
                            xmlStack.push(el);
                        } else if (t === "ol") {
                            let el = xmlStack.pop();
                            handleN($, xmlDoc, el, $(this), handleN);
                            xmlStack.push(el);
                        } else if (t === "ul") {
                            let el = xmlStack.pop();
                            handleN($, xmlDoc, el, $(this), handleN);
                            xmlStack.push(el);
                        }
                    });
                    var serializeDocument = jsdom.serializeDocument;
                    pages.forEach((d) => {
                        console.log("Workbook " +en+wbDocType+ss+serializeDocument(d.context));
                    });
                    if (ldDoc !== null) {
                        console.log("Objectives "  +en+loDocType+ss+serializeDocument(ldDoc.context));
                    }
                }
            );
        });
    }

    handleNode($, xmlDoc, parentXml, childHtml, handleN) {
        //console.log("Node Type " + childHtml.nodeType);
        // if (childHtml.nodeType === 3){
        //     console.log("Text Node " + childHtml.text());
        //     parentXml.text(childHtml.text());
        //     return;
        // }
        let t = childHtml.prop("tagName");
        if (!t) {
            let t = childHtml.text().replace(/\u00a0/g, " ");
            if (t.trim()) {
                parentXml.text(t.trim());
            }
            return;
        }
        t = t.toLowerCase();
        if (t === "p") {
            let p = $('<p/>', xmlDoc);
            $(childHtml).contents().each(function () {
                handleN($, xmlDoc, p, $(this), handleN);
            });
            parentXml.append(p);
        } else if (t === "span") {
            childHtml.contents().each(function () {
                let t = $(this).prop("tagName");
                console.log("Span tags " + t);
                handleN($, xmlDoc, parentXml, $(this), handleN);
            });
        } else if (t === "a") {
            let t = childHtml.text().replace(/\u00a0/g, " ");
            if (t.trim()) {
                let href = childHtml.attr('href');
                if (href) {
                    let link = $('<link/>', xmlDoc);
                    link.attr({href: href});
                    link.text(t);
                    parentXml.append(link);
                }
            }
        } else if (t === "table") {
            let tbl = $('<table/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, tbl, $(this), handleN);
            });
            parentXml.append(tbl);

        } else if (t === "tr") {
            let tr = $('<tr/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, tr, $(this), handleN);
            });
            parentXml.append(tr);
        } else if (t === "td") {
            let td = $('<td/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, td, $(this), handleN);
            });
            parentXml.append(td);

        } else if (t === "img") {
            let image = $('<image/>', xmlDoc);
            let src = childHtml.attr('src');
            let i = src.lastIndexOf("/");
            src = "../webcontent" + src.substring(i);
            image.attr({src: src});
            parentXml.append(image);
        } else if (t === "ol") {
            let ol = $('<ol/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, ol, $(this), handleN);
            });
            parentXml.append(ol);
        } else if (t === "ul") {
            let ul = $('<ul/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, ul, $(this), handleN);
            });
            parentXml.append(ul);

        } else if (t === "li") {
            let li = $('<li/>', xmlDoc);
            childHtml.contents().each(function () {
                handleN($, xmlDoc, li, $(this), handleN);
            });
            parentXml.append(li);
        } else if (t === "tbody") {
            childHtml.contents().each(function () {
                handleN($, xmlDoc, parentXml, $(this), handleN);
            });
        }
    }
}
