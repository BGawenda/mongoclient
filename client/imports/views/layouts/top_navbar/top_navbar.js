import {Template} from 'meteor/templating';
import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import Helper from '/client/imports/helper';
import {Connections} from '/lib/imports/collections/connections';

import '/client/imports/views/layouts/breaking_changes/breaking_changes';
import './top_navbar.html';

var toastr = require('toastr');
var Ladda = require('ladda');
require('datatables.net')(window, $);
require('datatables.net-buttons')(window, $);
require('datatables.net-responsive')(window, $);

require('datatables.net-bs')(window, $);
require('datatables.net-buttons-bs')(window, $);
require('datatables.net-responsive-bs')(window, $);
require('bootstrap-filestyle');

export const connect = function (isRefresh) {
    var connection = Connections.findOne({_id: Session.get(Helper.strSessionConnection)});
    if (!connection) {
        toastr.info('Please select a connection first !');
        Ladda.stopAll();
        return;
    }
    Meteor.call('connect', connection._id, function (err, result) {
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

            Session.set(Helper.strSessionCollectionNames, result.result);

            if (!isRefresh) {
                $('#connectionModal').modal('hide');
                $('#switchDatabaseModal').modal('hide');

                Router.go('databaseStats');
            }
            else {
                toastr.success("Successfuly refreshed collections");
            }
            Ladda.stopAll();
        }
    });
};

const clearAllFieldsOfConnectionModal = function () {
    $('#inputConnectionName').val('');
    $('#inputConnectionNameForUrl').val('');
    $('#inputUrl').val('');
    $('#inputHost').val('');
    $('#inputPort').val('27017');
    $('#inputDatabaseName').val('');
    $('#inputUser').val('');
    $('#inputPassword').val('');
    $('#inputAuthenticationDB').val('');
    $("#inputPassPhrase").val('');
    $("#inputSshHostname").val('');
    $("#inputSshPort").val('22');
    $("#inputSshUsername").val('');
    $("#cmbSshAuthType").val('').trigger('chosen:updated');
    $("#inputSshPassPhrase").val('');
    $("#inputSshPassword").val('');
    $('#inputX509Username').val('');
    $('#divX509Username').hide();
    $('#inputUseX509').iCheck('uncheck');
    $('#inputUseUrl').iCheck('uncheck');
    $('#inputUseSsh').iCheck('uncheck');
    $('#inputUseSSL').iCheck('uncheck');
    $('#inputReadFromSecondary').iCheck('uncheck');
    $('#inputAuthStandard').iCheck('check');
    $(":file").filestyle('clear');
};

const proceedSavingConnection = function (saveMethodName, connection) {
    Meteor.call(saveMethodName, connection, function (err) {
        if (err) {
            toastr.warning("Couldn't save connection: " + err.message);
        }
        else {
            populateConnectionsTable();
            toastr.success('Successfuly saved connection');
            $('#addEditConnectionModal').modal('hide');
        }

        Ladda.stopAll();
    });
};

const proceedCertificateLoading = function (saveMethodName, connection, currentConnection) {
    var certificateKeySelector = $('#inputCertificateKey');
    var fileInput = certificateKeySelector.siblings('.bootstrap-filestyle').children('input');
    if (certificateKeySelector.get(0).files.length == 0 && currentConnection && currentConnection.certificateKey && fileInput.val()) {
        connection.certificateKey = currentConnection.certificateKey;
        proceedSavingConnection(saveMethodName, connection);
    } else {
        if (certificateKeySelector.get(0).files.length != 0) {
            loadFile(function (file) {
                connection.certificateKey = convertToBuffer(file.target.result);
                proceedSavingConnection(saveMethodName, connection);
            }, certificateKeySelector[0].files[0]);
        }
        else {
            proceedSavingConnection(saveMethodName, connection);
        }
    }
};

const proceedRootCertificateLoading = function (saveMethodName, connection, currentConnection) {
    var rootCaSelector = $('#inputRootCa');
    var fileInput = rootCaSelector.siblings('.bootstrap-filestyle').children('input');

    if (rootCaSelector.get(0).files.length == 0 && currentConnection && currentConnection.rootCACertificate && fileInput.val()) {
        connection.rootCACertificate = currentConnection.rootCACertificate;
        proceedCertificateLoading(saveMethodName, connection, currentConnection);
    } else {
        if (rootCaSelector.get(0).files.length != 0) {
            loadFile(function (file) {
                connection.rootCACertificate = convertToBuffer(file.target.result);
                proceedCertificateLoading(saveMethodName, connection, currentConnection);
            }, rootCaSelector[0].files[0]);

        } else {
            proceedCertificateLoading(saveMethodName, connection, currentConnection);
        }
    }
};

const loadCertificatesAndSave = function (saveMethodName, connection, currentConnection) {
    var sshCertificateSelector = $('#inputSshCertificate');
    var fileInput = sshCertificateSelector.siblings('.bootstrap-filestyle').children('input');

    if (sshCertificateSelector.get(0).files.length == 0 && currentConnection && currentConnection.sshCertificate && fileInput.val()) {
        connection.sshCertificate = currentConnection.sshCertificate;
        proceedLoadingCertificates(saveMethodName, connection, currentConnection);
    } else {
        if (sshCertificateSelector.get(0).files.length != 0) {
            loadFile(function (file) {
                connection.sshCertificate = convertToBuffer(file.target.result);
                proceedLoadingCertificates(saveMethodName, connection, currentConnection);
            }, sshCertificateSelector[0].files[0]);

        } else {
            proceedLoadingCertificates(saveMethodName, connection, currentConnection);
        }
    }
};

const proceedLoadingCertificates = function (saveMethodName, connection, currentConnection) {
    var certificateSelector = $('#inputCertificate');
    var fileInput = certificateSelector.siblings('.bootstrap-filestyle').children('input');

    if ($('#inputAuthCertificate').iCheck('update')[0].checked && !$('#inputUseUrl').iCheck('update')[0].checked) {
        if (certificateSelector.get(0).files.length == 0 && currentConnection && currentConnection.sslCertificate && fileInput.val()) {
            connection.sslCertificate = currentConnection.sslCertificate;
            proceedRootCertificateLoading(saveMethodName, connection, currentConnection);
        }
        else {
            if (certificateSelector.get(0).files.length != 0) {
                loadFile(function (file) {
                    connection.sslCertificate = convertToBuffer(file.target.result);
                    proceedRootCertificateLoading(saveMethodName, connection, currentConnection);
                }, certificateSelector[0].files[0]);

            } else {
                proceedRootCertificateLoading(saveMethodName, connection, currentConnection);
            }
        }
    } else {
        proceedSavingConnection(saveMethodName, connection);
    }
};

const loadFile = function (callback, blob) {
    var fileReader = new FileReader();
    fileReader.onload = callback;
    fileReader.readAsArrayBuffer(blob);
};

const checkConnection = function (connection) {

    var sshAuthTypeSelector = $('#cmbSshAuthType');

    if (!connection.name) {
        toastr.error("Connection name can't be empty");
        return false;
    }

    if ($('#inputUseSsh').iCheck('update')[0].checked) {
        if (!connection.sshAddress) {
            toastr.error("Ssh hostname can't be empty");
            return false;
        }

        if (!connection.sshPort) {
            toastr.error("Ssh port can't be empty");
            return false;
        }

        if (!connection.sshUser) {
            toastr.error("Ssh user can't be empty");
            return false;
        }

        if (!sshAuthTypeSelector.find(":selected").text()) {
            toastr.error("Ssh authentication type can't be empty");
            return false;
        }

        if (sshAuthTypeSelector.find(":selected").text() == 'Password') {
            if (!connection.sshPassword) {
                toastr.error("Ssh password can't be empty");
                return false;
            }
        } else {
            if (!connection.sshCertificatePath) {
                toastr.error("Ssh certificate path can't be empty");
                return false;
            }
        }
    }


    if ($('#inputUseUrl').iCheck('update')[0].checked) {
        if (!connection.url) {
            toastr.error("Url can't be empty");
            return false;
        }

        if (!parseDatabaseNameFromUrl(connection.url)) {
            toastr.error("Url should include db name");
            return false;
        }

    } else {
        if (!connection.host) {
            toastr.error("Host can't be empty");
            return false;
        }
        if (!connection.port) {
            toastr.error("Port can't be empty");
            return false;
        }
        if (!connection.databaseName) {
            toastr.error("Database name can't be empty");
            return false;
        }

        if (!$('#inputAuthCertificate').iCheck('update')[0].checked) {
            if (connection.passPhrase) {
                connection.passPhrase = "";
                toastr.warning('Removed passPhrase, since there is no certificate');
            }
        }
    }

    return true;
};

const initChosen = function () {
    var cmb = $('#cmbSshAuthType');

    cmb.append($("<option></option>")
        .attr("value", "Password")
        .text("Password"));
    cmb.append($("<option></option>")
        .attr("value", "Key File")
        .text("Key File"));

    cmb.chosen({width: '100%'});
};

const initIChecks = function () {
    var selector = $('#divAuthType');
    selector.iCheck({
        radioClass: 'iradio_square-green'
    });

    var inputAuthStandardSelector = $('#inputAuthStandard');
    var formStandardAuthSelector = $('#formStandardAuth');
    var formCertificateAuthSelector = $('#formCertificateAuth');
    var anchorTab1Selector = $('#anchorTab1');
    var anchorTab2Selector = $('#anchorTab2');
    var inputUseUriSelector = $("#inputUseUrl");
    var inputUseSshSelector = $("#inputUseSsh");
    var inputUseX509Username = $("#inputUseX509");
    var inputReadFromSecondary = $("#inputReadFromSecondary");

    inputAuthStandardSelector.iCheck('check');

    $('#divUseSSL, #divUseSsh, #divUseUrl, #divReadFromSecondary, #divUseX509').iCheck({
        checkboxClass: 'icheckbox_square-green'
    });

    inputAuthStandardSelector.on('ifChecked', function () {
        formStandardAuthSelector.show();
        formCertificateAuthSelector.hide();
    });

    $('#inputAuthCertificate').on('ifChecked', function () {
        formStandardAuthSelector.hide();
        formCertificateAuthSelector.show();
    });

    inputReadFromSecondary.iCheck('uncheck');

    inputUseX509Username.iCheck('uncheck');
    inputUseX509Username.on('ifChanged', function (event) {
        var divX509UsernameSelector = $('#divX509Username');

        var isChecked = event.currentTarget.checked;
        if (isChecked) {
            divX509UsernameSelector.show();
        } else {
            divX509UsernameSelector.hide();
        }
    });

    inputUseUriSelector.iCheck('uncheck');
    inputUseUriSelector.on('ifChanged', function (event) {
        var inputUriSelector = $('#inputUrl');
        var inputConnectionNameForUrl = $('#inputConnectionNameForUrl');

        var isChecked = event.currentTarget.checked;
        if (isChecked) {
            inputUriSelector.prop('disabled', false);
            inputConnectionNameForUrl.prop('disabled', false);
            anchorTab1Selector.removeAttr("data-toggle");
            anchorTab2Selector.removeAttr("data-toggle");
        } else {
            inputUriSelector.prop('disabled', true);
            inputConnectionNameForUrl.prop('disabled', true);
            anchorTab1Selector.attr('data-toggle', 'tab');
            anchorTab2Selector.attr('data-toggle', 'tab');
        }
    });

    inputUseSshSelector.iCheck('uncheck');
    inputUseSshSelector.on('ifChanged', function (event) {
        var inputSshHostnameSelector = $('#inputSshHostname');
        var inputSshPortSelector = $('#inputSshPort');
        var inputSshUsernameSelector = $('#inputSshUsername');
        var comboSshAuthTypeSelector = $('#cmbSshAuthType');
        var inputSshPasswordSelector = $('#inputSshPassword');
        var inputSshCertificatePathSelector = $('#inputSshCertificatePath');
        var inputSshCertificateSelector = $('#inputSshCertificate');
        var inputSshPassPhrase = $('#inputSshPassPhrase');


        var isChecked = event.currentTarget.checked;
        if (isChecked) {
            inputSshHostnameSelector.prop('disabled', false);
            inputSshPortSelector.prop('disabled', false);
            inputSshUsernameSelector.prop('disabled', false);
            comboSshAuthTypeSelector.prop('disabled', false).trigger("chosen:updated");
            inputSshCertificatePathSelector.prop('disabled', false);
            inputSshCertificateSelector.prop('disabled', false);
            inputSshPassPhrase.prop('disabled', false);
            inputSshPasswordSelector.prop('disabled', false);
        } else {
            inputSshHostnameSelector.prop('disabled', true);
            inputSshPortSelector.prop('disabled', true);
            inputSshUsernameSelector.prop('disabled', true);
            comboSshAuthTypeSelector.prop('disabled', true).trigger("chosen:updated");
            inputSshCertificatePathSelector.prop('disabled', true);
            inputSshCertificateSelector.prop('disabled', true);
            inputSshPassPhrase.prop('disabled', true);
            inputSshPasswordSelector.prop('disabled', true);
        }

    });
};

const populateConnectionsTable = function () {
    var tblConnections = $('#tblConnection');

    if ($.fn.dataTable.isDataTable('#tblConnection')) {
        tblConnections.DataTable().destroy();
    }

    tblConnections.DataTable({
        data: Connections.find().fetch(),
        columns: [
            {data: "_id", sClass: "hide_column"},
            {data: "name"},
            {data: "url"},
            {data: "useSsl"},
            {data: "sslCertificatePath"},
            {data: "sshAddress"}
        ],
        columnDefs: [
            {
                targets: [2],
                render: function (data) {
                    if (!data) {
                        return 'false';
                    }
                    return 'true';
                }
            },
            {
                targets: [3],
                render: function (data) {
                    if (!data) {
                        return 'false';
                    }
                    return 'true';
                }
            },
            {
                targets: [4],
                render: function (data) {
                    if (!data) {
                        return 'false';
                    }
                    return 'true';
                }
            },
            {
                targets: [5],
                render: function (data) {
                    if (!data) {
                        return 'false';
                    }
                    return 'true';
                }
            },
            {
                targets: [6],
                data: null,
                bSortable: false,
                defaultContent: '<a href="" title="Edit" class="editor_edit"><i class="fa fa-edit text-navy"></i></a>'
            },
            {
                targets: [7],
                data: null,
                bSortable: false,
                defaultContent: '<a href="" title="Delete" class="editor_remove"><i class="fa fa-remove text-navy"></i></a>'
            }
        ]
    });
};

const populateSwitchDatabaseTable = function (data) {
    var tblSwitchDatabases = $('#tblSwitchDatabases');

    tblSwitchDatabases.DataTable({
        destroy: true,
        data: data,
        columns: [
            {data: "name"}
        ],
        columnDefs: []
    }).draw();
};

const parseDatabaseNameFromUrl = function (url) {
    try {
        var lastIndex = url.length;
        if (url.indexOf('?') != -1) {
            lastIndex = url.indexOf('?');
        }

        var urlSplit = url.split('//');

        if (urlSplit[1].lastIndexOf("/") == -1) {
            return "admin";
        }

        return url.substring(urlSplit[0].length + urlSplit[1].lastIndexOf("/") + 3, lastIndex);
    } catch (e) {
        return "admin";
    }
};

const convertToBuffer = function (buffer) {
    return new Uint8Array(buffer);
};

Template.topNavbar.onRendered(function () {
    var selector = $('#tblConnection');
    selector.find('tbody').on('click', 'tr', function () {
        var table = selector.DataTable();
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        }
        else {
            table.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }

        if (table.row(this).data()) {
            Session.set(Helper.strSessionConnection, table.row(this).data()._id);
            $('#btnConnect').prop('disabled', false);
        }
    });

    var selectorForSwitchDatabases = $('#tblSwitchDatabases');
    selectorForSwitchDatabases.find('tbody').on('click', 'tr', function () {

        var table = selectorForSwitchDatabases.DataTable();

        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        }
        else {
            table.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }

        if (table.row(this).data()) {
            $('#inputDatabaseNameToSwitch').val(table.row(this).data().name);
        }
    });

    // FIXED TOP NAVBAR OPTION
    // Uncomment this if you want to have fixed top navbar
    // $('body').addClass('fixed-nav');
    // $(".navbar-static-top").removeClass('navbar-static-top').addClass('navbar-fixed-top');

    $(".filestyle").filestyle({});
    initIChecks();
    initChosen();
});


Template.topNavbar.events({
    'click #btnProceedImportExport'(e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnRefreshCollections2'() {
        connect(true);
    },

    'change #inputCertificate'() {
        var inputSelector = $('#inputCertificate');
        var blob = inputSelector[0].files[0];
        var fileInput = inputSelector.siblings('.bootstrap-filestyle').children('input');

        if (blob) {
            fileInput.val(blob.name);
        } else {
            fileInput.val('');
        }
    },

    'change #inputSshCertificate' () {
        var inputSelector = $('#inputSshCertificate');
        var blob = inputSelector[0].files[0];
        var fileInput = inputSelector.siblings('.bootstrap-filestyle').children('input');

        if (blob) {
            fileInput.val(blob.name);
        } else {
            fileInput.val('');
        }
    },

    'change #inputRootCa' () {
        var inputSelector = $('#inputRootCa');
        var blob = inputSelector[0].files[0];
        var fileInput = inputSelector.siblings('.bootstrap-filestyle').children('input');

        if (blob) {
            fileInput.val(blob.name);
        } else {
            fileInput.val('');
        }
    },

    'change #inputCertificateKey' () {
        var inputSelector = $('#inputCertificateKey');
        var blob = inputSelector[0].files[0];
        var fileInput = inputSelector.siblings('.bootstrap-filestyle').children('input');

        if (blob) {
            fileInput.val(blob.name);
        } else {
            fileInput.val('');
        }
    },

    'change #cmbSshAuthType' () {
        var value = $('#cmbSshAuthType').find(":selected").text();
        var passAuth = $('#formSshPasswordAuth');
        var certificateAuth = $('#formSshCertificateAuth');
        if (value == 'Password') {
            passAuth.show();
            certificateAuth.hide();
        }
        else {
            certificateAuth.show();
            passAuth.hide();
        }
    },

    'click #btnExportMongoclient' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnImportMongoclient' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnAboutMongoclient' (e) {
        e.preventDefault();
        $('#aboutModal').modal('show');
    },

    'click #btnSwitchDatabase' (e) {
        e.preventDefault();
        $('#switchDatabaseModal').modal('show');

        var laddaButton = Ladda.create(document.querySelector('#btnConnectSwitchedDatabase'));
        laddaButton.start();

        Meteor.call('listDatabases', function (err, result) {
            if (err || result.error) {
                Helper.showMeteorFuncError(err, result, "Couldn't fetch databases");
            }
            else {
                result.result.databases.sort(function (a, b) {
                    if (a.name < b.name)
                        return -1;
                    else if (a.name > b.name)
                        return 1;
                    else
                        return 0;
                });

                populateSwitchDatabaseTable(result.result.databases);
                Ladda.stopAll();
            }
        });

    },

    'click #btnConnectSwitchedDatabase' () {
        Helper.warnDemoApp();
    },

    'click #btnCreateNewConnection' () {
        $('#addEditConnectionModalTitle').text('Add Connection');
        clearAllFieldsOfConnectionModal();
    },

    'click #btnConnectionList' () {
        if (!Session.get(Helper.strSessionConnection)) {
            populateConnectionsTable();

            $('#tblConnection').DataTable().$('tr.selected').removeClass('selected');
            $('#btnConnect').prop('disabled', true);
        }
    },

    'click .editor_remove'  () {
        Helper.warnDemoApp();
    },

    'click .editor_edit' () {
        Helper.warnDemoApp();
    },

    // Toggle left navigation
    'click #navbar-minimalize' (event) {
        event.preventDefault();

        var body = $('body');
        var sideMenu = $('#side-menu');
        // Toggle special class
        body.toggleClass("mini-navbar");

        // Enable smoothly hide/show menu
        if (!body.hasClass('mini-navbar') || body.hasClass('body-small')) {
            // Hide menu in order to smoothly turn on when maximize menu
            sideMenu.hide();
            // For smoothly turn on menu
            setTimeout(function () {
                sideMenu.fadeIn(400);
            }, 200);
        } else if (body.hasClass('fixed-sidebar')) {
            sideMenu.hide();
            setTimeout(
                function () {
                    sideMenu.fadeIn(400);
                }, 100);
        } else {
            // Remove all inline style from jquery fadeIn  to reset menu state
            sideMenu.removeAttr('style');
        }
    },

    'click #btnSaveConnection' (e) {
        e.preventDefault();
        Helper.warnDemoApp();
    },

    'click #btnConnect' () {
        // loading button

        var laddaButton = Ladda.create(document.querySelector('#btnConnect'));
        laddaButton.start();

        connect(false);
    },

    'click #btnDisconnect' (e) {
        e.preventDefault();

        Meteor.call('disconnect');
        Helper.clearSessions();

        // swal({
        //     title: "Disconnected!",
        //     text: "Successfuly disconnected",
        //     type: "success"
        // });

        Router.go('databaseStats');
    },

    'click #anchorTab1'  () {
        if (!$('#anchorTab1').attr('data-toggle')) {
            toastr.warning('Disable URI connection to use this tab');
        }
    },

    'click #anchorTab2'  () {
        if (!$('#anchorTab2').attr('data-toggle')) {
            toastr.warning('Disable URI connection to use this tab');
        }
    }
});