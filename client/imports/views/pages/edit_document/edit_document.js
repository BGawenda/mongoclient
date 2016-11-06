import {Template} from 'meteor/templating';
import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import Helper from '/client/imports/helper';
import {getSelectorValue} from '/client/imports/views/query_templates_common/selector/selector';

import './edit_document.html';

var toastr = require('toastr');
var CodeMirror = require("codemirror");

require("/node_modules/codemirror/mode/javascript/javascript.js");
require("/node_modules/codemirror/addon/fold/brace-fold.js");
require("/node_modules/codemirror/addon/fold/comment-fold.js");
require("/node_modules/codemirror/addon/fold/foldcode.js");
require("/node_modules/codemirror/addon/fold/foldgutter.js");
require("/node_modules/codemirror/addon/fold/indent-fold.js");
require("/node_modules/codemirror/addon/fold/markdown-fold.js");
require("/node_modules/codemirror/addon/fold/xml-fold.js");
require("/node_modules/codemirror/addon/hint/javascript-hint.js");
require("/node_modules/codemirror/addon/hint/show-hint.js");

var Ladda = require('ladda');

/**
 * Created by RSercan on 15.2.2016.
 */
Template.editDocument.onRendered(function () {
    if (Session.get(Helper.strSessionCollectionNames) == undefined) {
        Router.go('databaseStats');
        return;
    }

    initializeCollectionsCombobox();
    Session.set(Helper.strSessionEasyEditID, undefined);

    $('[data-toggle="tooltip"]').tooltip({trigger: 'hover'});
});

Template.editDocument.events({
    'click #btnInsertDocument'  (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnFetchDocument' (e) {
        e.preventDefault();
        fetchDocument();
    },

    'click #btnSaveDocument'  (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnDeleteDocument'  (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    }

});

const initializeCollectionsCombobox = function () {
    var cmb = $('#cmbCollections');
    cmb.append($("<optgroup id='optGroupCollections' label='Collections'></optgroup>"));
    var cmbOptGroupCollection = cmb.find('#optGroupCollections');

    var collectionNames = Session.get(Helper.strSessionCollectionNames);
    $.each(collectionNames, function (index, value) {
        cmbOptGroupCollection.append($("<option></option>")
            .attr("value", value.name)
            .text(value.name));
    });
    cmb.chosen();

    cmb.on('change', function (evt, params) {
        var selectedCollection = params.selected;
        if (selectedCollection) {
            Helper.getDistinctKeysForAutoComplete(selectedCollection);
        }
    });
};

const initializeResultArea = function (result) {
    var divResult = $('#divResult');

    if (divResult.css('display') == 'none') {
        divResult.show();
        $('#divFooter').show();
    }

    var codeMirror;
    if (!divResult.data('editor')) {
        codeMirror = CodeMirror.fromTextArea(document.getElementById('txtDocument'), {
            mode: "javascript",
            theme: "neat",
            styleActiveLine: true,
            lineNumbers: true,
            lineWrapping: false,
            extraKeys: {
                "Ctrl-Q": function (cm) {
                    cm.foldCode(cm.getCursor());
                }
            },
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        });
        codeMirror.setSize('%100', 400);
        divResult.data('editor', codeMirror);
    } else {
        codeMirror = divResult.data('editor');
    }

    codeMirror.getDoc().setValue(result);
};

const deleteDocument = function () {

    var l = Ladda.create(document.querySelector('#btnDeleteDocument'));
    l.start();

    var collectionName = $('#cmbCollections').find(":selected").text();
    var idQuery = {_id: Session.get(Helper.strSessionEasyEditID)};

    Meteor.call('delete', collectionName, idQuery, function (err, result) {
        if (err) {
            toastr.error("Couldn't delete: " + err.message);
        }
        else if (result.result.result.ok == 1) {
            toastr.success('Successfuly deleted!');
            var divResult = $('#divResult');
            if (divResult.css('display') != 'none') {
                divResult.hide();
                $('#divFooter').hide();
            }

        }
        else {
            toastr.error("Couldn't delete: " + JSON.stringify(result));
        }


        Ladda.stopAll();
    });
};

const saveDocument = function () {

    var l = Ladda.create(document.querySelector('#btnSaveDocument'));
    l.start();

    var collectionName = $('#cmbCollections').find(":selected").text();
    var setValue = $('#divResult').data('editor').getValue();

    setValue = Helper.convertAndCheckJSON(setValue);
    if (setValue["ERROR"]) {
        toastr.error("Syntax error on document: " + setValue["ERROR"]);

        Ladda.stopAll();
        return;
    }

    if (Session.get(Helper.strSessionEasyEditID)) {
        // remove id just in case
        delete setValue._id;
        setValue = {"$set": setValue};
        var idQuery = {_id: Session.get(Helper.strSessionEasyEditID)};

        Meteor.call('updateOne', collectionName, idQuery, setValue, {}, function (err) {
                if (err) {
                    toastr.error("Couldn't update: " + err.message);
                } else {
                    toastr.success('Successfuly updated !');
                }

                Ladda.stopAll();
            }
        );
    } else {
        if (!(setValue instanceof Array)) {
            var newArray = [];
            newArray.push(setValue);
            setValue = newArray;
        }

        Meteor.call('insertMany', collectionName, setValue, function (err) {
                if (err) {
                    toastr.error("Couldn't insert: " + err.message);
                } else {
                    toastr.success('Successfuly inserted !');
                }

                Ladda.stopAll();
            }
        );
    }
};

const fetchDocument = function () {

    var l = Ladda.create(document.querySelector('#btnFetchDocument'));
    l.start();

    var collectionName = $('#cmbCollections').find(":selected").text();
    var selector = getSelectorValue();

    if (!collectionName) {
        toastr.warning('Please select a collection first !');

        Ladda.stopAll();
        return;
    }

    selector = Helper.convertAndCheckJSON(selector);
    if (selector["ERROR"]) {
        toastr.error("Syntax error on query: " + selector["ERROR"]);
        Ladda.stopAll();
        return;
    }

    Meteor.call("findOne", collectionName, selector, {}, function (err, result) {
            var divResult = $('#divResult');

            if (err || result.error) {
                Helper.showMeteorFuncError(err, result, "Couldn't fetch document");
                if (divResult.css('display') != 'none') {
                    divResult.hide();
                    $('#divFooter').hide();
                }
            }
            else if (!result.result) {
                toastr.info("There's no matched document, you can insert one (array of documents are applicable) !");
                Session.set(Helper.strSessionEasyEditID, undefined);
                initializeResultArea('{}');
                $('#btnDeleteDocument').prop('disabled', true);
            }
            else {
                initializeResultArea(JSON.stringify(result.result, null, '\t'));
                Session.set(Helper.strSessionEasyEditID, result.result._id);
                $('#btnDeleteDocument').prop('disabled', false);
            }

            Ladda.stopAll();
        }
    );

};

