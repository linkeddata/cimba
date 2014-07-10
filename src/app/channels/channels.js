angular.module('Cimba.channels',[
    'ui.router',
    'Cimba.channels.view',
    'Cimba.channels.viewPost',
    'Cimba.channels.manage'
    ])

.config(function ChannelsConfig($stateProvider){
    $stateProvider
    .state('channels', {
        url:'/channels',
        views:{
            'main':{
                controller: 'ChannelsCtrl',
                templateUrl: 'channels/list.tpl.html'
            }
        },
        data:{
            pageTitle:'Channels'
        }
    });
})

.controller('ChannelsCtrl', function ChannelsController($scope, $http, $location, $sce){
    console.log("executing channels controller");
    if ($scope.$parent.userProfile.storagespace !== undefined) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        $scope.$parent.getChannels(storage, webid, true, false, false);
    } else {
        $scope.$parent.gotstorage = false;
    }

    $scope.newChannelModal = false;
    $scope.showOverlay = false;
    $scope.createbtn = "Create";

    $scope.$parent.loading = false;
    
    // set the corresponding ACLs for the given post, using the right ACL URI
    $scope.setACL = function(uri, type, defaultForNew) {
        // get the acl URI first
        $.ajax({
            type: "HEAD",
            url: uri,
            xhrFields: {
                withCredentials: true
            },
            success: function(d,s,r) {
                // acl URI
                var acl = parseLinkHeader(r.getResponseHeader('Link'));
                var aclURI = acl['acl']['href'];
                // frag identifier
                var frag = '#'+basename(uri);

                var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
                var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
                var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

                var g = $rdf.graph();
                // add document triples
                g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(''));
                g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(uri));
                g.add($rdf.sym(''), WAC('agent'), $rdf.sym(webid));
                g.add($rdf.sym(''), WAC('mode'), WAC('Read'));
                g.add($rdf.sym(''), WAC('mode'), WAC('Write'));

                // add post triples
                g.add($rdf.sym(frag), WAC('accessTo'), $rdf.sym(uri));
                // public visibility
                if (type == 'public' || type == 'friends') {
                    g.add($rdf.sym(frag), WAC('agentClass'), FOAF('Agent'));
                    g.add($rdf.sym(frag), WAC('mode'), WAC('Read'));
                } else if (type == 'private') {
                    // private visibility
                    g.add($rdf.sym(frag), WAC('agent'), $rdf.sym(webid));
                    g.add($rdf.sym(frag), WAC('mode'), WAC('Read'));
                    g.add($rdf.sym(frag), WAC('mode'), WAC('Write'));
                }
                if (defaultForNew && uri.substring(uri.length - 1) == '/') {
                    g.add($rdf.sym(frag), WAC('defaultForNew'), $rdf.sym(uri));
                }

                s = new $rdf.Serializer(g).toN3(g);
                
                if (s && aclURI) {
                    $.ajax({
                        type: "PUT", // overwrite just in case
                        url: aclURI,
                        contentType: "text/turtle",
                        data: s,
                        processData: false,
                        xhrFields: {
                            withCredentials: true
                        },
                        statusCode: {
                            200: function(data) {
                                console.log("200 Created");
                            },
                            401: function() {
                                console.log("401 Unauthorized");
                                notify('Error', 'Unauthorized! You need to authentify before posting.');
                            },
                            403: function() {
                                console.log("403 Forbidden");
                                notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                            },
                            406: function() {
                                console.log("406 Contet-type unacceptable");
                                notify('Error', 'Content-type unacceptable.');
                            },
                            507: function() {
                                console.log("507 Insufficient storage");
                                notify('Error', 'Insuffifient storage left! Check your server storage.');
                            }
                        },
                        success: function(d,s,r) {
                            console.log('Success! ACLs are now set.');
                        }
                    });
                }
            }
        });
    };

    $scope.safeUri = function (uri) {
        return uri.replace(/^https?:\/\//,'');
    };

    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';

    $scope.setAudience = function(v) {
        if (v=='public') {
            $scope.audience.icon = 'fa-globe';
            $scope.audience.range = 'public';
        } else if (v=='private') {
            $scope.audience.icon = 'fa-lock';
            $scope.audience.range = 'private';
        } else if (v=='friends') {
            $scope.audience.icon = 'fa-users';
            $scope.audience.range = 'friends';
        }
        console.log('this is the audience: '+$scope.audience.range);
    };

    $scope.newChannel = function(channelname, redirect){
        console.log("wrong function"); //debug
        $scope.loading = true;
        $scope.createbtn = 'Creating...';
        var title = 'ch';
        var churi = 'ch';
        
        var chan = {};

        if ($scope.channelname !== undefined && testIfAllEnglish($scope.channelname)) {
            // remove white spaces and force lowercase
            title = $scope.channelname;
            churi = $scope.channelname.toLowerCase().split(' ').join('_');
        } 

        chan.uri = churi;
        chan.title = title;
        chan.owner = $scope.$parent.userProfile.webid;
        chan.author = $scope.$parent.userProfile.name;

        console.log("START listing channels"); //debug
        for (var w in $scope.$parent.users[chan.owner].channels) {
            console.log("key: " + w); //debug
            console.log($scope.$parent.users[chan.owner].channels[w]); //debug
        }
        console.log("END listing channels"); //debug

        if (isEmpty($scope.$parent.users[chan.owner].channels)) {
            console.log("empty channels"); //debug
            $scope.$parent.users[chan.owner].channels = {};
        }

        console.log("$scope.$parent.users[" + chan.owner + "].channels[" + chan.uri + "] = "); //debug
        console.log($scope.$parent.users[chan.owner].channels[chan.uri]); //debug

        // TODO: let the user select the Microblog workspace too

        console.log("mbspace: " + $scope.$parent.users[chan.owner].mbspace); //debug

        console.log("START listing channels"); //debug
        for (var r in $scope.$parent.users[chan.owner].channels) {
            console.log("key: " + r); //debug
            console.log($scope.$parent.users[chan.owner].channels[r]); //debug
        }
        console.log("END listing channels"); //debug

        $.ajax({
            type: "POST",
            url: $scope.$parent.users[chan.owner].mbspace,
            processData: false,
            contentType: 'text/turtle',
            headers: {
                Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
            },
            xhrFields: {
                withCredentials: true
            },
            statusCode: {
                201: function() {
                    console.log("201 Created");
                },
                401: function() {
                    console.log("401 Unauthorized");
                    notify('Error', 'Unauthorized! You need to authentify!');
                },
                403: function() {
                    console.log("403 Forbidden");
                    notify('Error', 'Forbidden! You are not allowed to create new channels.');
                },
                406: function() {
                    console.log("406 Contet-type unacceptable");
                    notify('Error', 'Content-type unacceptable.');
                },
                507: function() {
                    console.log("507 Insufficient storage");
                    notify('Error', 'Insuffifient storage left! Check your server storage.');
                }
            },
            success: function(d,s,r) {
                console.log('Success! Created new channel "'+title+'".');
                // create the meta file
                var meta = parseLinkHeader(r.getResponseHeader('Link'));
                var metaURI = meta['meta']['href'];

                console.log("metaURI: " + metaURI);

                var chURI = r.getResponseHeader('Location');
                console.log("chURI: " + chURI);

                // got the URI for the new channel
                if (chURI && metaURI) {
                    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
                    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
                    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
                    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
                    var LDPX = $rdf.Namespace("http://ns.rww.io/ldpx#");
                    var g = $rdf.graph();

                    // add uB triple (append trailing slash since we got dir)
                    g.add($rdf.sym(chURI), RDF('type'), SIOC('Container'));
                    g.add($rdf.sym(chURI), DCT('title'), $rdf.lit(title));
                    g.add($rdf.sym(chURI), LDPX('ldprPrefix'), $rdf.lit('post'));
                    g.add($rdf.sym(chURI), SIOC('has_creator'), $rdf.sym('#author'));

                    // add author triples
                    g.add($rdf.sym('#author'), RDF('type'), SIOC('UserAccount'));
                    g.add($rdf.sym('#author'), SIOC('account_of'), $rdf.sym($scope.userProfile.webid));
                    g.add($rdf.sym('#author'), SIOC('avatar'), $rdf.sym($scope.userProfile.picture));
                    g.add($rdf.sym('#author'), FOAF('name'), $rdf.lit($scope.userProfile.name));

                    s = new $rdf.Serializer(g).toN3(g);

                    if (s.length > 0) {
                        $.ajax({
                            type: "POST",
                            url: metaURI,
                            contentType: "text/turtle",
                            data: s,
                            processData: false,
                            xhrFields: {
                                withCredentials: true
                            },
                            statusCode: {
                                201: function() {
                                    console.log("201 Created");                             
                                },
                                401: function() {
                                    console.log("401 Unauthorized");
                                    notify('Error', 'Unauthorized! You need to authentify before posting.');
                                },
                                403: function() {
                                    console.log("403 Forbidden");
                                    notify('Error', 'Forbidden! You are not allowed to create new containers.');
                                },
                                406: function() {
                                    console.log("406 Contet-type unacceptable");
                                    notify('Error', 'Content-type unacceptable.');
                                },
                                507: function() {
                                    console.log("507 Insufficient storage");
                                    notify('Error', 'Insuffifient storage left! Check your server storage.');
                                }
                            },
                            success: function(d,s,r) {
                                // set default ACLs for channel
                                $scope.setACL(chURI, $scope.audience.range, true); // set defaultForNew too
                                console.log('Success! New channel created.');
                                notify('Success', 'Your new "'+title+'" channel was succesfully created!');
                                // clear form
                                $scope.channelname = '';

                                $scope.$apply();
                                if (redirect) {
                                    $location.path('/channels');
                                }

                                console.log("$scope.defaultChannel before"); //debug
                                console.log($scope.defaultChannel); //debug
                                //set default if first channel
                                if ($scope.defaultChannel === undefined) {
                                    console.log("no default channel, setting default equal to "); //debug
                                    $scope.defaultChannel = chan;
                                    console.log(chan); //debug
                                }
                                console.log("$scope.defaultChannel after"); //debug
                                console.log($scope.defaultChannel); //debug

                                //adds the newly created channel to our list
                                chan.uri = chURI;
                                $scope.$parent.users[chan.owner].channels[chURI] = chan;
                                $scope.$parent.channels[chURI] = chan;

                                console.log("START listing channels"); //debug
                                for (var t in $scope.$parent.users[chan.owner].channels) {
                                    console.log("key: " + t); //debug
                                    console.log($scope.$parent.users[chan.owner].channels[t]); //debug
                                }
                                console.log("END listing channels"); //debug

                                // reload user profile when done
                                $scope.getInfo(chan.owner, true, false);
                            }
                        });
                    }
                }
            }
        }).always(function() {
            // revert button contents to previous state
            console.log("executing creation always");
            $scope.createbtn = 'Create';
            $scope.loading = false;
            $scope.$apply();
        });
    };

    $scope.deleteChannel = function (channeluri) {
        
    };
});