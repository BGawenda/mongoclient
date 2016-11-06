import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {Session} from 'meteor/session';
import {Connections} from '/lib/imports/collections/connections';
import Helper from '/client/imports/helper';
import {connect} from '/client/imports/views/layouts/top_navbar/top_navbar';

import './add_collection/add_collection';
import './navigation.html';

var toastr = require('toastr');

Template.navigation.events({
    'click #anchorDatabaseDumpRestore'(e) {
        e.preventDefault();
        var connection = Connections.findOne({_id: Session.get(Helper.strSessionConnection)});

        if (connection.sshAddress) {
            toastr.info('Unfortunately, this feature is not usable in SSH connections');
            return;
        }

        Router.go('databaseDumpRestore');
    },

    'click #btnAddCollection' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnRefreshCollections' (e) {
        e.preventDefault();
        connect(true);
    },

    'click #btnDropCollection' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnDropAllCollections' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnDropDatabase' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },


    'click .aNavigations' () {
        handleNavigationAndSessions();
    },

    'click .navCollection' (e) {
        if (e.target.id == 'btnDropCollection') {
            return;
        }

        var name = this.name;

        $('#listCollectionNames').find('li').each(function (index, li) {
            var liObject = $(li);
            if (liObject[0].textContent.substr(1).replace('Drop', '').trim() == name) {
                liObject.addClass('active');
            }
            else {
                liObject.removeClass('active');
            }
        });

        $('#listSystemCollections').find('li').each(function (index, li) {
            var liObject = $(li);
            if (liObject[0].textContent.substr(1).replace('Drop', '').trim() == name) {
                liObject.addClass('active');
            } else {
                liObject.removeClass('active');
            }
        });


        Session.set(Helper.strSessionSelectedCollection, name);
    }
});

Template.navigation.helpers({
    initializeMetisMenu() {
        Meteor.setTimeout(function () {
            var sideMenu = $('#side-menu');
            sideMenu.removeData("mm");
            sideMenu.metisMenu();
        });
    },

    getCollectionNames () {
        var collectionNames = Session.get(Helper.strSessionCollectionNames);
        if (collectionNames != undefined) {
            var result = [];
            collectionNames.forEach(function (collectionName) {
                if (!collectionName.name.startsWith('system')) {
                    result.push(collectionName);
                }
            });

            return result;
        }

        return collectionNames;
    },

    getSystemCollectionNames () {
        var collectionNames = Session.get(Helper.strSessionCollectionNames);
        if (collectionNames != undefined) {
            var result = [];
            collectionNames.forEach(function (collectionName) {
                if (collectionName.name.startsWith('system')) {
                    result.push(collectionName);
                }
            });

            return result;
        }

        return collectionNames;
    }
});

const handleNavigationAndSessions = function () {
    $('#listCollectionNames').find('li').each(function (index, li) {
        $(li).removeClass('active');
    });

    $('#listSystemCollections').find('li').each(function (index, li) {
        $(li).removeClass('active');
    });

    Session.set(Helper.strSessionSelectedCollection, undefined);
    Session.set(Helper.strSessionSelectedQuery, undefined);
    Session.set(Helper.strSessionSelectedOptions, undefined);

    $('#cmbQueries').val('').trigger('chosen:updated');
    $('#cmbAdminQueries').val('').trigger('chosen:updated');
};

const dropCollection = function (collectionName) {
    Meteor.call('dropCollection', collectionName, function (err, result) {
        if (err || result.error) {
            Helper.showMeteorFuncError(err, result, "Couldn't drop collection");
        }
        else {
            renderCollectionNames();
            toastr.success('Successfuly dropped collection: ' + collectionName);
        }
    });
};

export const renderCollectionNames = function () {
    Meteor.call('connect', Session.get(Helper.strSessionConnection), function (err, result) {
        if (err || result.error) {
            Helper.showMeteorFuncError(err, result, "Couldn't connect");
        }
        else {
            result.result.sort(function (a, b) {
                if (a.name < b.name)
                    return -1;
                else if (a.name > b.name)
                    return 1;
                else
                    return 0;
            });

            // re-set collection names
            Session.set(Helper.strSessionCollectionNames, result.result);
            // set all session values undefined except connection
            Session.set(Helper.strSessionSelectedQuery, undefined);
            Session.set(Helper.strSessionSelectedOptions, undefined);
            Session.set(Helper.strSessionSelectedCollection, undefined);
            Router.go('databaseStats');
        }
    });
};