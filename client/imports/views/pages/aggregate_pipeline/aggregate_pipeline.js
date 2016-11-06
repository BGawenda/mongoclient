import {Template} from 'meteor/templating';
import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import Helper from '/client/imports/helper';
import {setResult} from './aggregate_result_modal/aggregate_result_modal';

import './aggregate_pipeline.html';

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
 * Created by RSercan on 14.5.2016.
 */
var stageNumbers;
Template.aggregatePipeline.onRendered(function () {
    if (Session.get(Helper.strSessionCollectionNames) == undefined) {
        Router.go('databaseStats');
        return;
    }

    $("#stages").sortable({
        connectWith: ".connectList"
    });

    $('#cmbStageQueries').chosen();

    stageNumbers = 0;

    initializeCollectionsCombobox();
});

Template.aggregatePipeline.events({
    'click #btnExecuteAggregatePipeline' () {
        Helper.warnDemoApp();
    },

    'change #cmbStageQueries'(e) {
        var cmb = $("#cmbStageQueries");
        var query = cmb.chosen().val();
        if (query) {
            query = '$' + query;
            var liElement = '<li class="success-element" id="stage' + stageNumbers + '">' + query + '<div id="wrapper' + stageNumbers + '" class="agile-detail">' +
                '<a id="remove-stage-element" href="#" data-number="' + stageNumbers + '" class="pull-right btn btn-xs btn-white"><i class="fa fa-remove"></i> Remove</a>';

            var initCodeMirror;
            switch (query) {
                case '$limit':
                    liElement += '<input id="inputNumberStage' + stageNumbers + '" min="0" type="number" class="form-control">';
                    break;
                case '$skip':
                    liElement += '<input id="inputNumberStage' + stageNumbers + '" min="0" type="number" class="form-control">';
                    break;
                case '$out':
                    liElement += '<input type="text" class="form-control" id="txtStringStage' + stageNumbers + '"/>';
                    break;
                default:
                    initCodeMirror = true;
                    liElement += '<textarea id="txtObjectStage' + stageNumbers + '" class="form-control"></textarea>';
                    break;
            }

            liElement += '</div> </li>';
            $('#stages').append(liElement);

            if (initCodeMirror) {
                initCodeMirrorStage();
            }

            cmb.val('').trigger('chosen:updated');
            stageNumbers++;
        }
    },

    'click #remove-stage-element' (e) {
        e.preventDefault();
        var stageId = '#stage' + $(e.target).data('number');
        $(stageId).remove();
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

const initCodeMirrorStage = function () {
    var divSelector = $('#wrapper' + stageNumbers);

    if (!divSelector.data('editor')) {
        var codeMirror = CodeMirror.fromTextArea(document.getElementById('txtObjectStage' + stageNumbers), {
            mode: "javascript",
            theme: "neat",
            styleActiveLine: true,
            lineNumbers: true,
            lineWrapping: false,
            extraKeys: {
                "Ctrl-Q": function (cm) {
                    cm.foldCode(cm.getCursor());
                },
                "Ctrl-Space": "autocomplete"
            },
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        });

        codeMirror.setSize('%100', 100);
        divSelector.data('editor', codeMirror);
    }
};

const createPipeline = function (stageListElements) {
    var pipeline = [];
    stageListElements.each(function (index) {
        var stage = {};

        var liElement = $(this);
        var queryName = liElement.text().split(' ')[0].trim();
        if (liElement.find('[id^=inputNumberStage]').length != 0) {
            stage[queryName] = parseInt(liElement.find('[id^=inputNumberStage]').val());
        } else if (liElement.find('[id^=wrapper]').data('editor')) {
            var jsonValue = liElement.find('[id^=wrapper]').data('editor').getValue();
            jsonValue = Helper.convertAndCheckJSON(jsonValue);
            if (jsonValue["ERROR"]) {
                throw queryName + " error: " + jsonValue["ERROR"];
            }
            stage[queryName] = jsonValue;
        }
        else if (liElement.find('[id^=txtStringStage]').length != 0) {
            stage[queryName] = liElement.find('[id^=txtStringStage]').val();
        } else {
            throw queryName;
        }

        pipeline.push(stage);
    });

    return pipeline;
};