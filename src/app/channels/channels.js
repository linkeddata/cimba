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

.controller('ChannelsCtrl', function ChannelsController($scope, $http, $location, $sce, $rootScope, noticesData){
    //console.log("executing channels controller"); //debug

    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';
    $scope.newChannelModal = false;
    $scope.deleteChannelStatus = false;
    $scope.channelToDelete = ""; //variable to hold the uri of the channel to remove from $scope.userProfile.channels and $scope.users[<webid>].channels
    $scope.safeToRemove = true; //variable to determine if safe to remove channels because of 404 Not Found error
    $scope.showOverlay = false;
    $scope.createbtn = "Create";

    if (!$scope.$parent.userProfile.channels || Object.keys($scope.$parent.userProfile.channels) === 0) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        //console.log("channels controller calling getChannels"); //debug
        $scope.$parent.getChannels(storage, webid, true, false, false);
    } else {
        //console.log("else executed"); //debug
        $scope.$parent.gotstorage = false;
        $scope.$parent.loading = false;
    }


    $scope.showPopup = function (arg1, arg2) {
        /*
        console.log("ex show 1"); //debug
        console.log("$scope.newChannelModal before: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus before: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay before: " + $scope.showOverlay); //debug
        */
        if (arg1 === "new") {
            $scope.newChannelModal = true;
        }
        else if (arg1 === "del") {
            $scope.deleteChannelStatus = true;
            $scope.channelToDelete = arg2;
        }
        $scope.showOverlay = true;
        /*
        console.log("$scope.newChannelModal after: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus after: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay after: " + $scope.showOverlay); //debug
        */
    };

    $scope.hidePopup = function () {
        /*
        console.log("ex hide 1"); //debug
        console.log("$scope.newChannelModal before: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus before: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay before: " + $scope.showOverlay); //debug
        */
        //reset
        $scope.newChannelModal = false;
        $scope.deleteChannelStatus = false;
        $scope.showOverlay = false;
        /*
        console.log("$scope.newChannelModal after: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus after: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay after: " + $scope.showOverlay); //debug
        */
    };

    $scope.channelTog = function(channel){
        $scope.$parent.channelToggle(channel);
    };

    // set the corresponding ACLs for the given post, using the right ACL URI
    $scope.setACL = function(uri, type, defaultForNew) {
        // get the acl URI first

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var g = $rdf.graph();
        var s = new $rdf.Serializer(g).toN3(g);

        $.ajax({
            type: "POST",
            url: uri,
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
                    notify('Error', 'Unauthorized! You need to authenticate before posting.');
                },
                403: function() {
                    console.log("403 Forbidden");
                    notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                },
                406: function() {
                    console.log("406 Content-type unacceptable");
                    notify('Error', 'Content-type unacceptable.');
                },
                507: function() {
                    console.log("507 Insufficient storage");
                    notify('Error', 'Insufficient storage left! Check your server storage.');
                }
            },
            success: function(d,s,r) {
                console.log('Created ACL File'); //debug
                $.ajax({
                    type: "HEAD",
                    url: uri,
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function(d,s,r) {
                        console.log("success 1"); //debug
                        // acl URI
                        var acl = parseLinkHeader(r.getResponseHeader('Link'));
                        var aclURI = acl['acl']['href'];
                        console.log("aclURI: " + aclURI); //debug
                        // frag identifier
                        var frag = '#'+basename(uri);

                        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
                        var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
                        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

                        var g = $rdf.graph();
                        // add document triples
                        g.add($rdf.sym(''), RDF('type'), WAC('Authorization'));
                        g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(''));
                        g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(uri));
                        g.add($rdf.sym(''), WAC('agent'), $rdf.sym(webid));
                        g.add($rdf.sym(''), WAC('mode'), WAC('Read'));
                        g.add($rdf.sym(''), WAC('mode'), WAC('Write'));

                        // add post triples
                        g.add($rdf.sym(frag), RDF('type'), WAC('Authorization'));
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
                                        notify('Error', 'Unauthorized! You need to authenticate before posting.');
                                    },
                                    403: function() {
                                        console.log("403 Forbidden");
                                        notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                                    },
                                    406: function() {
                                        console.log("406 Content-type unacceptable");
                                        notify('Error', 'Content-type unacceptable.');
                                    },
                                    507: function() {
                                        console.log("507 Insufficient storage");
                                        notify('Error', 'Insufficient storage left! Check your server storage.');
                                    }
                                },
                                success: function(d,s,r) {
                                    console.log('Success! ACLs are now set.');
                                }
                            });
                        }
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown) {
                        //error handling
                        console.log("ERROR: Could set acl '" + uri + "'. Reason: " + errorThrown);
                        noticesData.add("error", "ERROR: Could not set " + uri + " . Reason: " + errorThrown);
                    }
                });
            }
        });
    };

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
        /*
        console.log("wrong newchannel function if called from home"); //debug
        console.log('start channels'); //debug
        console.log($scope.$parent.userProfile.channels); //debug
        console.log($scope.userProfile.channels); //debug
        console.log($scope.$parent.users[$scope.userProfile.webid].channels); //debug
        console.log($scope.users[$scope.userProfile.webid].channels); //debug
        console.log("end channels"); //debug
        */
        $scope.loading = true;
        $scope.createbtn = 'Creating...';
        var title = 'ch';
        var churi = 'ch';
        
        var chan = {};

        //console.log("$scope.channelname: " + $scope.channelname); //debug
        if ($scope.channelname !== undefined && testIfAllEnglish($scope.channelname)) {
            // remove white spaces and force lowercase
            //console.log("setting title, before: " + title); //debug
            title = $scope.channelname;
            //console.log("title is now: " + title); //debug
            churi = $scope.channelname.toLowerCase().split(' ').join('_');
        } 

        chan.uri = churi;
        //console.log("setting title, before: " + chan.title); //debug
        chan.title = title;
        //console.log("title is now: " + chan.title); //debug
        chan.owner = $scope.$parent.userProfile.webid;
        chan.author = $scope.$parent.userProfile.name;

        if (isEmpty($scope.$parent.users[chan.owner].channels)) {
            $scope.$parent.users[chan.owner].channels = {};
        }
        if (isEmpty($scope.$parent.userProfile.channels)) {
            $scope.$parent.userProfile.channels = {};
        }

        $.ajax({
            type: "POST",
            url: $scope.$parent.userProfile.mbspace,
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
                    noticesData.add('Error', 'Unauthorized! You need to authenticate!');
                },
                403: function() {
                    console.log("403 Forbidden");
                    noticesData.add('Error', 'Forbidden! You are not allowed to create new channels.');
                },
                406: function() {
                    console.log("406 Content-type unacceptable");
                    noticesData.add('Error', 'Content-type unacceptable.');
                },
                507: function() {
                    console.log("507 Insufficient storage");
                    noticesData.add('Error', 'Insufficient storage left! Check your server storage.');
                }
            },
            success: function(d,s,r) {
                // create the meta file
                var meta = parseLinkHeader(r.getResponseHeader('Link'));
                var aclURI = meta['acl']['href'];
                var metaURI = meta['meta']['href'];

                var chURI = r.getResponseHeader('Location');
                
                // got the URI for the new channel
                if (chURI && aclURI) {
                    $scope.setACL(aclURI, $scope.audience.range, true); //set default ACLs for the channel
                }

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
                                    noticesData.add('Error', 'Unauthorized! You need to authenticate before posting.');
                                },
                                403: function() {
                                    console.log("403 Forbidden");
                                    noticesData.add('Error', 'Forbidden! You are not allowed to create new containers.');
                                },
                                406: function() {
                                    console.log("406 Content-type unacceptable");
                                    noticesData.add('Error', 'Content-type unacceptable.');
                                },
                                507: function() {
                                    console.log("507 Insufficient storage");
                                    noticesData.add('Error', 'Insufficient storage left! Check your server storage.');
                                }
                            },
                            success: function(d,s,r) {
                                console.log('Success! Created new channel "'+title+'".');
                                notify('Success', 'Your new "'+title+'" channel was succesfully created!');
                                // clear form
                                $scope.channelname = '';

                                $scope.$apply();

                                $location.path('/channels/view/' + chURI.slice(chURI.indexOf(":")+3,chURI.length));

                                //adds the newly created channel to our list
                                chan.uri = chURI;
                                $scope.$parent.users[chan.owner].channels[chURI] = chan;
                                $scope.$parent.userProfile.channels[chan.uri] = chan;
                                $scope.$parent.channels[chURI] = chan; //is this one necessary?

                                // reload user profile when done
                                $scope.getInfo(chan.owner, true, false);
                            }
                        });
                    }
                }
            }
        }).always(function() {
            // revert button contents to previous state
            $scope.hidePopup(); //hide modal
            $scope.createbtn = 'Create';
            channelname = "";
            $scope.loading = false;
            $scope.$apply();
        });
    };

    ///--- everything within these ///--- is used in deleting a channel
    $scope.deleteChannel = function () {
        var ch = $scope.channelToDelete;

        //manual way to create .meta and .acl uri
        var chn = ch.slice(0,ch.lastIndexOf("/"));
        var chnumber = chn.slice(chn.lastIndexOf("/") + 1, chn.length);
        var head = chn.slice(0,chn.lastIndexOf("/") + 1);
        var metauri = head + ".meta." + chnumber;
        var acluri = head + ".acl." + chnumber;

        $scope.delList = [metauri, acluri, ch]; // file uris are strings, directory uris are arrays
        $scope.delCounter = 3; //counter for number of deleted files
        $scope.delStack = []; // holds the directories in queue to check
        $scope.mapTree(ch); //enumerates the channel directory first
    };

    $scope.mapTree = function(uri) { //creates a flat map structure of the uri passed in
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var rdfschema = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
        var posix = $rdf.Namespace("http://www.w3.org/ns/posix/stat#");

        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // get all SIOC:Post (using globbing)
        f.nowOrWhenFetched(uri, undefined, function(){
            //console.log("fetching for uri: " + uri); //debug
            var directories = g.statementsMatching(undefined, RDF('type'), posix('Directory'));
            var resources = g.statementsMatching(undefined, RDF('type'), rdfschema('Resource'));

            /*
            console.log("directories, length: " + directories.length); //debug
            console.log(directories); //debug
            console.log("resources, length: " + resources.length); //debug
            console.log(resources); //debug
            */

            if (resources.length > 0) {
                for (var r in resources) {
                    var ruri = resources[r]['subject']['value'];
                    $scope.delCounter = $scope.delCounter + 1;
                    $scope.delList.push(ruri);
                    //console.log("adding to delList: " + ruri); //debug
                }
            }

            if (directories.length > 1) { //directories[0] always references the uri itself
                for (var d in directories) {
                    var nuri = directories[d]['subject']['value'];
                    if (nuri !== uri) { //makeshift way of preventing loopback
                        //console.log("directories length: " + directories.length); //debug
                        //console.log("d at: " + d); //debug
                        if (d == 1) { //if first one (not uri itself), add to delList, otherwise, add to delStack
                            //console.log(4); //debug
                            $scope.delCounter = $scope.delCounter + 1;
                            $scope.delList.push(nuri);
                            //console.log("adding to delList: " + nuri); //debug
                        }
                        else {
                            $scope.delStack.push(nuri);
                            //console.log("adding to delStack: " + nuri); //debug
                        }
                    }
                }
                //console.log("attempting to fetch: " + directories[1]['subject']['value']); //debug
                $scope.mapTree(directories[1]['subject']['value']);
            }
            else if ($scope.delStack.length > 0) {
                $scope.delCounter = $scope.delCounter + 1;
                var suri = $scope.delStack.pop();
                $scope.delList.push(suri);
                $scope.mapTree(suri);
            }
            else {
                $scope.deleteContent(); //we finished mapping the directory uri, now we need to delete the content
            }
        });
    };

    // recursively deletes everything in $scope.delList[] from high to low index (most recent to earliest)
    $scope.deleteContent = function () {
        var uri = $scope.delList.pop();
        //console.log("Attempting to delete: " + uri); //debug
        $.ajax({
            url: uri,
            type: "delete",
            xhrFields: {
                withCredentials: true
            },
            statusCode: {
                201: function() {
                    console.log("201 Created");
                },
                401: function() {
                    console.log("401 Unauthorized");
                    noticesData.add('Error', 'Unauthorized! You need to authentificate!');
                },
                403: function() {
                    console.log("403 Forbidden");
                    noticesData.add('Error', 'Forbidden! You are not allowed to create new channels.');
                },
                406: function() {
                    console.log("406 Content-type unacceptable");
                    noticesData.add('Error', 'Content-type unacceptable.');
                },
                507: function() {
                    console.log("507 Insufficient storage");
                    noticesData.add('Error', 'Insufficient storage left! Check your server storage.');
                }
            },
            success: function (d,s,r) {
                console.log('Successfully deleted: ' + uri); //leave this here
                $scope.$apply();
                if ($scope.delList.length > 0) {
                    $scope.deleteContent();
                }
                else {
                    $scope.removeChannel(); //we're done deleting files on server-side, now we need to clean up our local channel variables
                }
            },
            failure: function (r) {
                var status = r.status.toString();
                //error handling
                console.log("ERROR: Could not delete " + uri + ". Reason: " + status);
                noticesData.add("error", "ERROR: Could not delete " + uri + ". Reason: " + status);

                console.log("What's left in the map tree:");
                for (var c in $scope.mapTree) {
                    console.log($scope.mapTree[c]);
                }

                if (status == '403') {
                    noticesData.add('Error', 'Could not delete file, access denied!');
                }
                if (status == '404') {
                    noticesData.add('Error', 'Could not delete file, no such resource on the server!');
                }

                //attempt to proceed with deleting the next item on the agenda
                if ($scope.delList.length > 0) {
                    $scope.deleteContent();
                }
                else { //we already popped it, if there's nothing else left that we can delete, then reset $scope.channelToDelete
                    $scope.channelToDelete = "";
                    $scope.removeChannel();
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                //error handling
                console.log("ERROR: Could not delete '" + uri + "'. Reason: " + errorThrown);
                noticesData.add("error", "ERROR: Could not delete " + uri + " . Reason: " + errorThrown);

                if (errorThrown !== "Not Found") { //if the error is something fatal and not "not found", it is not safe to remove channels locally
                    $scope.safeToRemove = false;
                }

                console.log("$scope.safeToRemove: " + $scope.safeToRemove); //debug

                //attempt to proceed with deleting the next item on the agenda
                if ($scope.delList.length > 0) {
                    $scope.deleteContent();
                }
                else { //we already popped it, if there's nothing else left that we can delete, then reset $scope.channelToDelete
                    if ($scope.safeToRemove) {
                        console.log("safe to remove channels locally"); //debug
                        $scope.removeChannel();
                    }
                    else {
                        $scope.channelToDelete = "";
                    }
                }
            }
        });
    };

    $scope.removeChannel = function () {
        if ($scope.channelToDelete !== "") {
            var uri = $scope.channelToDelete;
            //console.log("removing channel from $scope.userProfile.channels and $scope.users[<webid>].channels"); //debug
            //remove channel from arrays
            //TODO, figure out whether to delete parent or child channels array or both
            var webid = $scope.userProfile.webid;

            /*
            console.log('start channels'); //debug
            console.log($scope.$parent.userProfile.channels); //debug
            console.log($scope.userProfile.channels); //debug
            console.log($scope.$parent.users[webid].channels); //debug
            console.log($scope.users[webid].channels); //debug
            console.log("end channels"); //debug
            */

            console.log("attempting to delete local storage"); //debug
            if ($scope.$parent.userProfile.channels !== undefined) {
                console.log(1); //debug
                delete $scope.$parent.userProfile.channels[uri];
            }
            if ($scope.userProfile.channels !== undefined) {
                console.log(2); //debug
                delete $scope.userProfile.channels[uri];
            }
            if ($scope.$parent.users[webid].channels !== undefined) {
                console.log(3); //debug
                delete $scope.$parent.users[webid].channels[uri];
            }
            if ($scope.users[webid].channels !== undefined) {
                console.log(4); //debug
                delete $scope.users[webid].channels[uri];
            }
            if ($scope.$parent.channels !== undefined) {
                console.log(5); //debug
                delete $scope.$parent.channels[uri]; //just to be sure
            }
            if ($scope.channels !== undefined) {
                console.log(6); //debug
                delete $scope.channels[uri]; //just to be sure
            }

            console.log("abc"); //debug

            for (var p in $scope.$parent.posts) {
                if ($scope.$parent.posts[p].channel === uri) {
                    delete $scope.$parent.posts[p];
                }
            }
            for (var q in $scope.posts) {
                if ($scope.posts[q].channel === uri) {
                    delete $scope.posts[q];
                }
            }

            //reset
            $scope.channelToDelete = "";
            $scope.safeToRemove = true;
            console.log("calling parent saveCredentials"); //debug
            $scope.$parent.saveCredentials();
            $scope.$apply();
            //

            /*
            console.log('start channels'); //debug
            console.log($scope.$parent.userProfile.channels); //debug
            console.log($scope.userProfile.channels); //debug
            console.log($scope.$parent.users[webid].channels); //debug
            console.log($scope.users[webid].channels); //debug
            console.log("end channels"); //debug
            */
        }
    };

})

.directive('newChannel', function() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'channels/new_channel.tpl.html'
    };
});