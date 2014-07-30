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

.controller('ChannelsCtrl', function ChannelsController($scope, $http, $location, $sce, $rootScope){
    console.log("executing channels controller"); //debug
    console.log($scope.userProfile);
    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';
    $scope.newChannelModal = false;
    $scope.deleteChannelStatus = false;
    $scope.channelToDelete = ""; //variable to hold the uri of the channel to remove from $scope.channels and $scope.users[<webid>].channels
    $scope.showOverlay = false;
    $scope.createbtn = "Create";

    if (!$scope.$parent.userProfile.channels || 
         Object.keys($scope.$parent.userProfile.channels) === 0) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        $scope.$parent.getChannels(storage, webid, true, false, false);
    } else {
        console.log("else executed");
        $scope.$parent.gotstorage = false;
        $scope.$parent.loading = false;
    }
    
    $scope.$on('newChannel', function(event, data) {
        console.log('received');
        $scope.newChannel(data.chname, data.redirect);
    });

    $rootScope.$on("rootScope:broadcast", function(event, data) {
        console.log(data);
    });

    $scope.showPopup = function (arg) {
        console.log("ex show 1");
        console.log("$scope.newChannelModal before: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus before: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay before: " + $scope.showOverlay); //debug
        if (arg === "new") {
            $scope.newChannelModal = true;
        }
        else if (arg === "del") {
            $scope.deleteChannelStatus = true;
        }
        $scope.showOverlay = true;
        console.log("$scope.newChannelModal after: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus after: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay after: " + $scope.showOverlay); //debug
    };

    $scope.hidePopup = function () {
        console.log("ex hide 1");
        console.log("$scope.newChannelModal before: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus before: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay before: " + $scope.showOverlay); //debug
        $scope.newChannelModal = false;
        $scope.deleteChannelStatus = false;
        $scope.showOverlay = false;
        console.log("$scope.newChannelModal after: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus after: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay after: " + $scope.showOverlay); //debug
    };

    $scope.channelTog = function(channel){
        $scope.$parent.channelToggle(channel);
    };

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
        console.log("wrong newchannel function if called from home"); //debug
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

        if (isEmpty($scope.$parent.users[chan.owner].channels)) {
            $scope.$parent.users[chan.owner].channels = {};
        }

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
                    notify('Error', 'Unauthorized! You need to authentificate!');
                },
                403: function() {
                    console.log("403 Forbidden");
                    notify('Error', 'Forbidden! You are not allowed to create new channels.');
                },
                406: function() {
                    console.log("406 Content-type unacceptable");
                    notify('Error', 'Content-type unacceptable.');
                },
                507: function() {
                    console.log("507 Insufficient storage");
                    notify('Error', 'Insuffifient storage left! Check your server storage.');
                }
            },
            success: function(d,s,r) {
                console.log('Success! Created new channel "'+title+'".');
                //console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                //console.log("$scope.showOverlay: " + $scope.showOverlay); //debug
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
                    //console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                    //console.log("$scope.showOverlay: " + $scope.showOverlay); //debug

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
                                    notify('Error', 'Unauthorized! You need to authenticate before posting.');
                                },
                                403: function() {
                                    console.log("403 Forbidden");
                                    notify('Error', 'Forbidden! You are not allowed to create new containers.');
                                },
                                406: function() {
                                    console.log("406 Content-type unacceptable");
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
                                    //gets rid of the https:// or http:// in chURI and appends it to the path
                                    $location.path('/channels/view/' + chURI.slice(chURI.indexOf(":")+3,chURI.length));
                                }
                                else {
                                    $scope.hidePopup();
                                }

                                /*
                                console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                                console.log("$scope.showOverlay: " + $scope.showOverlay); //debug

                                console.log("$scope.defaultChannel before"); //debug
                                console.log($scope.defaultChannel); //debug
                                */
                                //set default if first channel
                                if ($scope.defaultChannel === undefined) {
                                    //console.log("no default channel, setting default equal to "); //debug
                                    $scope.defaultChannel = chan;
                                    //console.log(chan); //debug
                                }
                                /*
                                console.log("$scope.defaultChannel after"); //debug
                                console.log($scope.defaultChannel); //debug
                                */

                                //adds the newly created channel to our list
                                chan.uri = chURI;
                                $scope.$parent.users[chan.owner].channels[chURI] = chan;
                                $scope.$parent.channels[chURI] = chan;
                                /*
                                console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                                console.log("$scope.showOverlay: " + $scope.showOverlay); //debug

                                console.log("START listing channels"); //debug
                                for (var t in $scope.$parent.users[chan.owner].channels) {
                                    console.log("key: " + t); //debug
                                    console.log($scope.$parent.users[chan.owner].channels[t]); //debug
                                }
                                console.log("END listing channels"); //debug
                                */

                                //console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                                //console.log("$scope.showOverlay: " + $scope.showOverlay); //debug
                                //hide window
                                $scope.hidePopup();
                                /*
                                console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
                                console.log("$scope.showOverlay: " + $scope.showOverlay); //debug
                                console.log("1"); //debug
                                */

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

    ///--- everything within these ///--- is used in deleting a channel
    // delete a single post
    $scope.deleteChannel = function (ch) {
        $scope.channelToDelete = ch;
        $scope.deleteDirectory(ch);
        
        if (status === 0) {
            console.log("status 0, success"); //debug
            //manual way to remove .meta and .acl
            var chn = ch.slice(0,ch.lastIndexOf("/"));
            console.log("chn: " + chn); //debug
            var chnumber = chn.slice(chn.lastIndexOf("/") + 1, chn.length);
            console.log("chnumber: " + chnumber); //debug
            var head = chn.slice(0,chn.lastIndexOf("/") + 1);
            console.log("head: " + head); //debug
            var metauri = head + ".meta." + chnumber;
            console.log("metauri: " + metauri); //debug
            var acluri = head + ".acl." + chnumber;
            console.log("acluri: " + acluri); //debug
            $scope.deleteFile(metauri);
            $scope.deleteFile(acluri);

            //remove channel from arrays
            var webid = $scope.userProfile.webid;
            delete $scope.users[webid].channels[ch];
            delete $scope.channels[ch];
            for (var p in $scope.posts) {
                if ($scope.posts[p].channel === ch) {
                    delete $scope.posts[p];
                }
            }

            ///debug
            console.log("proof of deletion by showing whats left"); //debug
            console.log("$scope.users[" + webid + "].channels"); //debug
            for (var weew in $scope.users[webid].channels) {
                console.log("key: " + weew); //debug
                console.log($scope.users[webid].channels[weew]); //debug
            }
            console.log("done"); //debug
            console.log("$scope.channels"); //debug
            for (var wee in $scope.channels) {
                console.log("key: " + wee); //debug
                console.log($scope.channels[wee]); //debug
            }
            console.log("done"); //debug
            ///
        }
    };

    $scope.deleteDirectory = function(uri) {
        console.log("deleteDirectory uri: " + uri); //debug
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
            console.log("newuri: " + uri); //debug

            console.log(posix('Directory')); //debug
            console.log(rdfschema('Resource')); //debug
            console.log(SIOC('Post')); //debug
            var directories = g.statementsMatching(undefined, RDF('type'), posix('Directory'));
            var resources = g.statementsMatching(undefined, RDF('type'), rdfschema('Resource'));
            var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));

            console.log("directories"); //debug
            console.log(directories); //debug
            console.log("resources"); //debug
            console.log(resources); //debug
            console.log("posts"); //debug
            console.log(posts); //debug

            if (directories.length > 0) {
                for (var d in directories) {
                    var nuri = directories[d]['subject']['value'];
                    if (nuri !== uri) { //makeshift way of preventing loopback
                        console.log("going recursively into: " + nuri); //debug
                        $scope.remChannel(nuri);
                    }
                }
            }
            if (resources.length > 0) {
                for (var r in resources) {
                    var ruri = resources[r]['subject']['value'];
                    console.log("deleting uri: " + ruri); //debug
                    $scope.deleteFile(ruri);
                }
            }

            console.log("finished emptying, now deleting: " + uri); //debug
            $scope.deleteFile(uri);

            ////---- specific to channel
            console.log("is " + uri + " equal to " + $scope.channelToDelete + "?"); //debug
            if (uri === $scope.channelToDelete && $scope.channelToDelete !== "") {
                console.log("removing channel from $scope.channels and $scope.users[<webid>].channels"); //debug
                //manual way to remove .meta and .acl
                var chn = uri.slice(0,uri.lastIndexOf("/"));
                console.log("chn: " + chn); //debug
                var chnumber = chn.slice(chn.lastIndexOf("/") + 1, chn.length);
                console.log("chnumber: " + chnumber); //debug
                var head = chn.slice(0,chn.lastIndexOf("/") + 1);
                console.log("head: " + head); //debug
                var metauri = head + ".meta." + chnumber;
                console.log("metauri: " + metauri); //debug
                var acluri = head + ".acl." + chnumber;
                console.log("acluri: " + acluri); //debug
                $scope.deleteFile(metauri);
                $scope.deleteFile(acluri);

                //remove channel from arrays
                var webid = $scope.userProfile.webid;
                delete $scope.$parent.users[webid].channels[uri];
                delete $scope.$parent.channels[uri];
                for (var p in $scope.$parent.posts) {
                    if ($scope.$parent.posts[p].channel === uri) {
                        delete $scope.$parent.posts[p];
                    }
                }

                $scope.$apply();

                //reset
                $scope.channelToDelete = "";

                ///debug
                console.log("proof of deletion by showing whats left"); //debug
                console.log("$scope.users[" + webid + "].channels"); //debug
                for (var weew in $scope.users[webid].channels) {
                    console.log("key: " + weew); //debug
                    console.log($scope.users[webid].channels[weew]); //debug
                }
                console.log("done"); //debug
                console.log("$scope.channels"); //debug
                for (var wee in $scope.channels) {
                    console.log("key: " + wee); //debug
                    console.log($scope.channels[wee]); //debug
                }
                console.log("done"); //debug
                ///
            }
        });
    };

    // deletes a single post
    $scope.deleteFile = function (uri) {
        console.log("Attempting to delete: " + uri); //debug
        $.ajax({
            url: uri,
            type: "delete",
            xhrFields: {
                withCredentials: true
            },
            success: function (d,s,r) {
                console.log('Deleted: ' + uri);
                notify('Success', 'Your file was removed from the server!');
                $scope.$apply();
            },
            failure: function (r) {
                var status = r.status.toString();
                //error handling
                console.log("ERROR: " + status + ". Cannot proceed with deleting the file.");
                notify("ERROR: " + status + ". Cannot proceed with deleting the file.");

                if (status == '403') {
                    notify('Error', 'Could not delete file, access denied!');
                }
                if (status == '404') {
                    notify('Error', 'Could not delete file, no such resource on the server!');
                }
                //reset, specific to deleting a channel
                if ($scope.channelToDelete !== "") {
                    $scope.channelToDelete = "";
                }
            }
        });
    };
    console.log($scope.newChannelModal);
})

.directive('newChannel', function() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'channels/new_channel.tpl.html'
    };
});