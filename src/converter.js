/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import fs from 'fs-extra';
import path from 'path';
import unzip from 'unzip';
import jsdom from 'jsdom';
import url from 'url';
import pd from 'pretty-data';

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
        this.handleDestFolderRefresh = argWrapper.handleDestFolderRefresh;
        this.handleErrors = argWrapper.handleErrors;
        this.handleprocess = this.process.bind(this);
        this.handleNode = this.handleNode.bind(this);
    }

    async convert() {
        console.log('Convert-document process initiated');
        let dFolder = this.destFolder;
        const hprocess = this.handleprocess;
        const handleErrors = this.handleErrors;
        this.srcFiles.forEach((f) => {
            let fName = path.basename(f, '.zip');
            let xFolder = path.join(dFolder, fName);
            fs.emptyDirSync(xFolder, function (err) {
                if (err) {
                    console.log('Error! creating destination unzip folder');
                    return handleErrors('Error! creating destination unzip folder ' + xFolder);
                }
                console.log('Success! creating destination unzip folder');

            });
            fs.createReadStream(f)
                .pipe(unzip.Extract({path: xFolder}))
                .on('close', function () {
                    console.log('Success! unziping content');

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
        const handleErrors = this.handleErrors;
        items.forEach((f) => {
            if (f.stats.isDirectory() && f.path.endsWith('images')) {
                //console.log("Images directory " + f.path);
                // Move images directory to webcontent
                fs.move(f.path, path.join(xFolder, 'webcontent'), function (err) {
                    if (err) {
                        console.error(err);
                        return handleErrors('Error! moving images directory to webcontent directory');
                    }
                    console.log('Success! moving images directory to webcontent directory');
                })
            } else if (f.stats.isFile() && f.path.endsWith('.html')) {
                docFile = f.path;
            }
        });
        const handelNode = this.handleNode;
        const commentOutInline = this.inlineCommentOut;
        const handleDestFolderRefresh = this.handleDestFolderRefresh;
        // Is it possible to use local copy of JQuery???
        //const jquery = fs.readFileSync(__dirname +"/assets/js/jquery.js", "utf-8");
        //const jquery = "file://"+__dirname +"/assets/js/jquery.js";

        fs.readFile(docFile, 'utf8', function (err, data) {
            jsdom.env(
                data,
                //[jquery],
                ["http://code.jquery.com/jquery.js"],
                function (err, window) {
                    console.log('Done creating jdom environment');
                    if (err) {
                        console.log('Error! parsing document to be converted ' + docFile);
                        return handleErrors('Error! parsing document to be converted ' + docFile);
                    }
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
                    $( 'span:empty' ).remove();
                    $( 'p:empty' ).remove();
                    $('body').contents().each(function () {
                        let t = $(this).prop('tagName').toLowerCase();
                        //Headings
                        if (t === 'h1' || t === 'h2' || t === 'h3' || t === 'h4' || t === 'h5' || t === 'h6') {
                            let newDoc = false;
                            if (xmlDoc === null) {
                                newDoc = true;
                                xmlDoc = $($.parseXML('<workbook_page/>'));
                                let id = path.basename(docFile, '.html');
                                if (cntWbs > 0) {
                                    id = id + cntWbs;
                                }
                                cntWbs++;
                                pages.push({id: id, doc: xmlDoc});
                                $('workbook_page', xmlDoc).attr({id: id});
                                $('workbook_page', xmlDoc).append($('<head/>', xmlDoc));
                                $('head', xmlDoc).append($('<title/>', xmlDoc).text($(this).text()));
                                let bod = $('<body/>', xmlDoc);
                                $('workbook_page', xmlDoc).append(bod);
                                xmlStack.push(bod);
                            }
                            if (xmlDoc === null) {
                                console.log("'Error! Document to be converted not well formed" + docFile);
                                return handleErrors('Error! Document to be converted not well formed ' + docFile);
                            }
                            //:TODO: refactor code for better DRY
                            if ($(this).text().toUpperCase().startsWith('OBJECTIVE:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                if (sp.length > 2) {
                                    // Create learning objective file
                                    if (ldDoc === null) {
                                        let id = path.basename(docFile, '.html') + '_LO';
                                        ldDoc = {id: id, doc: $($.parseXML('<objectives/>'))};
                                        $('objectives', ldDoc.doc).attr({id: id});
                                        $('objectives', ldDoc.doc).append($('<title/>', ldDoc.doc).text('Learning Objectives'));
                                    }
                                    let ob = $('<objective/>', ldDoc.doc);
                                    let s = sp[1];
                                    ob.attr({id: s});
                                    ob.text(sp[2]);
                                    $('objectives', ldDoc.doc).append(ob);
                                }
                                let obref = $('<objref/>', xmlDoc);
                                let s = sp[1];
                                obref.attr({idref: s});
                                $('head', xmlDoc).append(obref);
                            } else if ($(this).text().toUpperCase().startsWith('EXAMPLE:')) {
                                let example = $('<example/>', xmlDoc);
                                example.append($('<title/>', xmlDoc).text($(this).text()));
                                let el = xmlStack.pop();
                                el.append(example);
                                xmlStack.push(el);
                                xmlStack.push(example);
                            } else if ($(this).text().toUpperCase().startsWith('LEARNBYDOING:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<wb:inline idref="' + s + '" purpose="learnbydoing"/>-->');
                                } else {
                                    inline = $('<wbinline/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'learnbydoing'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('YOUTUBE:')) {
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
                            } else if ($(this).text().toUpperCase().startsWith('MANYSTUDENTSWONDER:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<wb:inline idref="' + s + '" purpose="manystudentswonder"/>-->');
                                } else {
                                    let inline = $('<wbinline/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'manystudentswonder'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('DIDIGETTHIS:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<wb:inline idref="' + s + '" purpose="didigetthis"/>-->');
                                } else {
                                    inline = $('<wbinline/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'didigetthis'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('DEFINITION:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let definition = $('<definition/>', xmlDoc);
                                if (sp.length > 2) {
                                    definition.attr({id: sp[1]});
                                    definition.append($('<term/>', xmlDoc).text(sp[2]));
                                } else {
                                    definition.append($('<term/>', xmlDoc).text(sp[1]));
                                }
                                let meaning = $('<meaning/>', xmlDoc);
                                let material = $('<material/>', xmlDoc);
                                meaning.append(material);
                                definition.append(meaning);
                                let el = xmlStack.pop();
                                el.append(definition);
                                xmlStack.push(el);
                                xmlStack.push(material);
                            } else if ($(this).text().toUpperCase().startsWith('PAGE:')) {
                                xmlStack = new Array();
                                xmlDoc = null;
                            } else if ($(this).text().toUpperCase().startsWith('NOTE:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'note'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('NOTATION:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'notation'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('OBSERVATION:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'observation'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('RESEARCH:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'research'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('TIP:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'tip'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('TOSUMUP:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let pullout = $('<pullout/>', xmlDoc);
                                pullout.attr({type: 'tosumup'});
                                if (sp.length > 1) {
                                    pullout.append($('<title/>', xmlDoc).text(sp[1]));
                                }
                                let el = xmlStack.pop();
                                el.append(pullout);
                                xmlStack.push(el);
                                xmlStack.push(pullout);
                            } else if ($(this).text().toUpperCase().startsWith('CHECKPOINT:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<activity idref="' + s + '" purpose="checkpoint"/>-->');
                                } else {
                                    inline = $('<activity/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'checkpoint'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('LAB:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<activity idref="' + s + '" purpose="lab"/>-->');
                                } else {
                                    inline = $('<activity/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'lab'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('MYRESPONSE:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<wb:inline idref="' + s + '" purpose="myresponse"/>-->');
                                } else {
                                    inline = $('<wbinline/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'myresponse'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('QUIZ:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<activity idref="' + s + '" purpose="quiz"/>-->');
                                } else {
                                    inline = $('<activity/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'quiz'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('SIMULATION:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<activity idref="' + s + '" purpose="simulation"/>-->');
                                } else {
                                    inline = $('<activity/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'simulation'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('WALKTHROUGH:')) {
                                let text = $(this).text();
                                let sp = text.split(":");
                                let s = sp[1];
                                let inline = null;
                                if (commentOutInline) {
                                    inline = $('<!--<wb:inline idref="' + s + '" purpose="walkthrough"/>-->');
                                } else {
                                    inline = $('<wbinline/>', xmlDoc);
                                    inline.attr({idref: s});
                                    inline.attr({purpose: 'walkthrough'});
                                }
                                let el = xmlStack.pop();
                                el.append(inline);
                                xmlStack.push(el);
                            } else if ($(this).text().toUpperCase().startsWith('END:')) {
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
                        } else if (t === 'div') {
                            let el = xmlStack.pop();
                            handelNode($, xmlDoc, el, $(this), handelNode);
                            xmlStack.push(el);
                        } else if (t === 'p') {
                            let el = xmlStack.pop();
                            handelNode($, xmlDoc, el, $(this), handelNode);
                            xmlStack.push(el);
                        } else if (t === 'span') {
                            if ($(this).text() && $(this).text().trim()) {
                                let t = $(this).text().replace(/\u00a0/g, " ");
                                let el = xmlStack.pop();
                                el.append(t);
                                xmlStack.push(el);
                            }
                        } else if (t === 'a') {
                            let z = $(this).text().replace(/\u00a0/g, " ");
                            if (z.trim()) {
                                let href = $(this).attr('href');
                                if (href) {
                                    if (href.startsWith('#cmnt')) {
                                        // Process Google Docs comment
                                        let commentRef = $(href);
                                        if (commentRef && commentRef.parent()) {
                                            let comment = commentRef.parent().text();
                                            let el = xmlStack.pop();
                                            el.append($('<!--' + comment + '-->'));
                                            xmlStack.push(el);
                                        }
                                    } else {
                                        //Transform from google docs encoding
                                        // (Example: https://www.google.com/url?q=http://oli.cmu.edu&amp;sa=D&amp;ust=1480606251769000&amp;usg=AFQjCNEOWmbHZbmnhO9gTDpY3QU9SBOvVQ)
                                        let pHref = url.parse(href, true);
                                        let query = pHref.query;
                                        if (query && query.q) {
                                            href = query.q;
                                        }
                                        let l = $('<a/>', xmlDoc);
                                        l.attr({href: href});
                                        l.text(z);
                                        let el = xmlStack.pop();
                                        el.append(l);
                                        xmlStack.push(el);
                                    }
                                }
                            }
                        } else if (t === 'table') {
                            let el = xmlStack.pop();
                            handelNode($, xmlDoc, el, $(this), handelNode);
                            xmlStack.push(el);
                        } else if (t === 'img') {
                            let image = $('<image/>', xmlDoc);
                            let src = $(this).attr('src');
                            let i = src.lastIndexOf("/");
                            src = '../webcontent' + src.substring(i);
                            image.attr({src: src});
                            let el = xmlStack.pop();
                            el.append(image);
                            xmlStack.push(el);
                        } else if (t === 'ol') {
                            let el = xmlStack.pop();
                            handelNode($, xmlDoc, el, $(this), handelNode);
                            xmlStack.push(el);
                        } else if (t === 'ul') {
                            let el = xmlStack.pop();
                            handelNode($, xmlDoc, el, $(this), handelNode);
                            xmlStack.push(el);
                        }
                    });
                    console.log('Document processing done');
                    fs.removeSync(docFile, function (err) {
                        if (err) {
                            console.error('Error! removing ' + docFile + ' ' + err);
                            return handleErrors("Error! removing " + docFile + ' ' + err);
                        }
                        console.log('Success! removing ' + docFile);
                    });

                    var serializeDocument = jsdom.serializeDocument;
                    const wbFolder = path.join(xFolder, 'x-oli-workbook_page');
                    fs.ensureDirSync(wbFolder, function (err) {
                        if (err) {
                            console.error('Error! creating x-oli-workbook_page folder' + err);
                            return handleErrors('Error! creating x-oli-workbook_page folder' + err);
                        }
                        console.log('Success! creating x-oli-workbook_page folder');
                    });
                    pages.forEach((d) => {
                        let wbContent = serializeDocument(d.doc.context);
                        // Do some post processing cleanup
                        wbContent = wbContent.replace(/wbinline/g, "wb:inline");
                        wbContent = wbContent.replace(/<tbody>/g, "");
                        wbContent = wbContent.replace(/<\/tbody>/g, "");
                        wbContent = wbContent.replace(/<p\/>/g, "");
                        wbContent = wbContent.replace(/<span>/g, "");
                        wbContent = wbContent.replace(/<\/span>/g, "");
                        wbContent = wbContent.replace(/<span\/>/g, "");
                        wbContent = wbContent.replace(/<a href/g, "<link href");
                        wbContent = wbContent.replace(/<\/a>/g, "</link>");
                        let fullWbContent = en + wbDocType + ss + wbContent;
                        // Pretty print the content before writing to file
                        let xml_pp = pd.pd.xml(fullWbContent);
                        //console.log("Workbook " + fullWbContent);
                        let wbFile = path.join(wbFolder, d.id + '.xml');
                        fs.outputFile(wbFile, xml_pp, function (err) {
                            if (err) {
                                handleDestFolderRefresh();
                                console.error('Error! creating workbook file ' + wbFile + ' ' + err);
                                return handleErrors('Error! creating workbook file ' + wbFile + ' ' + err);
                            }
                            console.log('Success! creating workbook file ' + wbFile);
                            handleDestFolderRefresh();
                        })
                    });

                    if (ldDoc !== null) {
                        const loFolder = path.join(xFolder, 'x-oli-learning_objectives');
                        fs.ensureDirSync(loFolder, function (err) {
                            if (err) {
                                handleDestFolderRefresh();
                                console.error('Error! creating x-oli-learning_objectives folder' + err);
                                return handleErrors('Error! creating x-oli-learning_objectives folder' + err);
                            }
                            console.log('Success! creating x-oli-learning_objectives folder');
                        });
                        let fullLoContent = en + loDocType + ss + serializeDocument(ldDoc.doc.context);
                        let xml_pp = pd.pd.xml(fullLoContent);
                        //console.log("Objectives "  +xml_pp);
                        let loFile = path.join(loFolder, ldDoc.id + '.xml');
                        fs.outputFile(loFile, xml_pp, function (err) {
                            if (err) {
                                console.error('Error! creating Learning Objectives file ' + loFile + ' ' + err);
                                return handleErrors('Error! creating Learning Objectives file ' + loFile + ' ' + err);
                            }
                            console.log('Success! creating Learning Objectives file ' + loFile);
                            handleDestFolderRefresh();
                        })
                    }
                }
            );
        });
    }

    handleNode($, xmlDoc, parentXml, childHtml, handleNode) {
        let t = childHtml.prop('tagName');
        if (!t) {
            // Assumes element without tag name is text
            let z = childHtml.text().replace(/\u00a0/g, " ");
            if (z.trim()) {
                parentXml.text(z);
            }
            return;
        }
        t = t.toLowerCase();
        if (t === 'p') {
            let p = $('<p/>', xmlDoc);
            let textOnly = true;
            $(childHtml).contents().each(function () {
                let z = $(this).prop('tagName');
                if (z) {
                    textOnly = false;
                }
                handleNode($, xmlDoc, p, $(this), handleNode);
            });
            if (textOnly && !childHtml.text().trim()) {
                return;
            }
            parentXml.append(p);

        } else if (t === 'span') {
            let s = $('<span/>', xmlDoc);
            var styleProps = childHtml.css([
                'fontStyle', 'fontWeight', 'color', 'fontFamily', 'textDecoration'
            ]);
            let fontStyle = null;//childHtml.css("fontStyle");
            let fontWeight = null;//childHtml.css("fontWeight");
            let fontColor = null;//childHtml.css("color");
            let fontFamily = null;//childHtml.css("fontFamily");
            let textDecoration = null;//childHtml.css("textDecoration");
            $.each(styleProps, function( prop, value ) {
                //console.log( prop + ": " + value );
                if(prop === 'fontStyle'){
                    fontStyle = value;
                } else if(prop === 'fontWeight'){
                    fontWeight = value;
                } else if(prop === 'fontFamily'){
                    fontFamily = value;
                } else if(prop === 'color'){
                    fontColor = value;
                } else if(prop === 'textDecoration'){
                    textDecoration = value;
                }
            });

            let em = null;
            if (fontStyle && fontStyle === 'italic') {
                //console.log("font style " + fontStyle + " " +childHtml.text());
                em = $('<em/>', xmlDoc);
                em.attr({style: 'italic'});
                s.append(em);
            }
            if (fontWeight && fontWeight === '700') {
                //console.log("font style " + fontStyle + " " +childHtml.text());
                em = $('<em/>', xmlDoc);
                em.attr({style: 'bold'});
                s.append(em);
            }
            // Red font color
            if (fontColor && fontColor === 'rgb(255, 0, 0)') {
                //console.log("color " + fontColor+ " " +childHtml.text());
                em = $('<em/>', xmlDoc);
                em.attr({style: 'highlight'});
                s.append(em);
            }
            if (textDecoration && textDecoration === 'line-through') {
                em = $('<em/>', xmlDoc);
                em.attr({style: 'line-through'});
                s.append(em);
            }
            if (fontFamily && fontFamily === '"Courier New"') {
                em = $('<var/>', xmlDoc);
                s.append(em);
            }
            if (em) {
                s = em;
            }
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, s, $(this), handleNode);
            });
            parentXml.append(s);
        } else if (t === 'a') {
            let z = childHtml.text().replace(/\u00a0/g, " ");
            if (z.trim()) {
                let href = childHtml.attr('href');
                if (href) {
                    if (href.startsWith('#cmnt')) {
                        // Process Google Docs comment
                        let commentRef = $(href);
                        if (commentRef && commentRef.parent()) {
                            let comment = commentRef.parent().text();
                            parentXml.append($('<!--' + comment + '-->'));
                        }
                    } else {
                        let pHref = url.parse(href, true);
                        let query = pHref.query;
                        if (query && query.q) {
                            href = query.q;
                        }
                        let l = $('<a/>', xmlDoc);
                        l.attr({href: href});
                        l.text(z);
                        parentXml.append(l);
                    }
                }
            }
        } else if (t === 'table') {
            let tbl = $('<table/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, tbl, $(this), handleNode);
            });
            parentXml.append(tbl);

        } else if (t === 'tr') {
            let tr = $('<tr/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, tr, $(this), handleNode);
            });
            parentXml.append(tr);
        } else if (t === 'td') {
            let td = $('<td/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, td, $(this), handleNode);
            });
            parentXml.append(td);

        } else if (t === 'img') {
            let image = $('<image/>', xmlDoc);
            let src = childHtml.attr('src');
            let i = src.lastIndexOf('/');
            src = '../webcontent' + src.substring(i);
            image.attr({src: src});
            parentXml.append(image);
        } else if (t === 'ol') {
            let ol = $('<ol/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, ol, $(this), handleNode);
            });
            parentXml.append(ol);
        } else if (t === 'ul') {
            let ul = $('<ul/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, ul, $(this), handleNode);
            });
            parentXml.append(ul);

        } else if (t === 'li') {
            let li = $('<li/>', xmlDoc);
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, li, $(this), handleNode);
            });
            parentXml.append(li);
        } else if (t === 'tbody') {
            childHtml.contents().each(function () {
                handleNode($, xmlDoc, parentXml, $(this), handleNode);
            });
        } else if (t === 'div') {
            // Assumes div content contains Google Docs specific content
            // childHtml.contents().each(function () {
            //     handleNode($, xmlDoc, parentXml, $(this), handleNode);
            // });
        } else if (t === 'sup') {
            let sup = $('<sup/>', xmlDoc);
            let com = false;
            childHtml.contents().each(function () {
                let href = $(this).attr('href');
                //Look for comment
                if (href && href.startsWith('#cmnt')) {
                    com = true;
                    handleNode($, xmlDoc, parentXml, $(this), handleNode);
                } else {
                    handleNode($, xmlDoc, sup, $(this), handleNode);
                }
            });
            if (!com) {
                parentXml.append(sup);
            }

        } else if (t === 'sub') {
            let sub = $('<sub/>', xmlDoc);
            let com = false;
            childHtml.contents().each(function () {
                let href = $(this).attr('href');
                //Look for comment
                if (href && href.startsWith('#cmnt')) {
                    com = true;
                    handleNode($, xmlDoc, parentXml, $(this), handleNode);
                } else {
                    handleNode($, xmlDoc, sub, $(this), handleNode);
                }
            });
            if (!com) {
                parentXml.append(sub);
            }
        }
    }
}
