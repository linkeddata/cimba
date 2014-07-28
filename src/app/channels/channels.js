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
    console.log("executing channels controller"); //debug
    console.log($scope.userProfile.subscribedChannels);
    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';
    $scope.newChannelModal = false;
    $scope.deleteChannelStatus = false;
    $scope.showOverlay = false;
    ///--- used in deleting a channel
    $scope.noPosts = false; //boolean variable for when all posts from a channel have been deleted, used in deleting a channel
    $scope.countAndUri = [-1, ""]; //variable for holding the count of posts in a specific channel and its uri to delete when noPosts becomes true
    ///---
    $scope.createbtn = "Create";

    if (!$scope.$parent.userProfile.channels || 
         Object.keys($scope.$parent.userProfile.channels) === 0) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        $scope.$parent.getChannels(storage, webid, true, false, false);
    } else {
        $scope.$parent.gotstorage = false;
    }
    
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
        //console.log("wrong function"); //debug
        $scope.loading = true;
        $scope.createbtn = 'Creating...';
        var title = 'ch';
        var churi = 'ch';

        //console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
        //console.log("$scope.showOverlay: " + $scope.showOverlay); //debug
        
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

        /*
        console.log("START listing channels"); //debug
        for (var w in $scope.$parent.users[chan.owner].channels) {
            console.log("key: " + w); //debug
            console.log($scope.$parent.users[chan.owner].channels[w]); //debug
        }
        console.log("END listing channels"); //debug
        */

        if (isEmpty($scope.$parent.users[chan.owner].channels)) {
            //console.log("empty channels"); //debug
            $scope.$parent.users[chan.owner].channels = {};
        }
        /*
        console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
        console.log("$scope.showOverlay: " + $scope.showOverlay); //debug

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
        console.log("$scope.newChannelModal: " + $scope.newChannelModal); //debug
        console.log("$scope.showOverlay: " + $scope.showOverlay); //debug
        */

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
    $scope.destroyChannel = function (ch) {
        //loadposts first
        $scope.getPostsforDeletion(ch);
    };

    $scope.getPostsforDeletion = function(channeluri) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");

        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // get all SIOC:Post (using globbing)
        f.nowOrWhenFetched(channeluri+'*', undefined, function(){

            var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));
            var postList = [];

            if (posts.length > 0) {
                for (var p in posts) {
                    var uri = posts[p]['subject'];

                    uri = uri.value;
                    postList.push(uri);
                }
            }
            // hide spinner
            $scope.loading = false;

            var webid = $scope.userProfile.webid;
            console.log("deleting channeluri: " + channeluri); //debug
            console.log("showing var postList"); //debug
            for (var y in postList) {
                console.log("key: " + y); //debug
                console.log(postList[y]); //debug
            }
            console.log("done"); //debug
            console.log("setting countAndUri"); //debug
            $scope.countAndUri[0] = postList.length;
            $scope.countAndUri[1] = channeluri;
            console.log("countAndUri[0]: " + $scope.countAndUri[0]); //debug
            console.log("countAndUri[1]: " + $scope.countAndUri[1]); //debug
            if ($scope.countAndUri[0] > 0) {
                for (var i in postList) {
                    $scope.deletePost(postList[i]);
                }
            }
            else {
                $scope.noPosts = true;
            }
            $scope.$apply();
        });
    };

    // deletes a single post
    $scope.deletePost = function (posturi) {
        $.ajax({
            url: posturi,
            type: "delete",
            xhrFields: {
                withCredentials: true
            },
            success: function (d,s,r) {
                console.log('Deleted '+posturi);
                notify('Success', 'Your post was removed from the server!');
                $scope.$apply();

                // also remove the ACL file
                var acl = parseLinkHeader(r.getResponseHeader('Link'));
                var aclURI = acl['acl']['href'];
                $.ajax({
                    url: aclURI,
                    ype: "delete",
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (d,s,r) {
                        console.log('Deleted! ACL file was removed from the server.');
                        console.log("$scope.countAndUri[0] before: " + $scope.countAndUri[0]); //debug
                        if ($scope.countAndUri[0] > 0) {
                            $scope.countAndUri[0] = $scope.countAndUri[0] - 1;
                        }
                        console.log("$scope.countAndUri[0] after: " + $scope.countAndUri[0]); //debug
                        if ($scope.countAndUri[0] === 0) {
                            console.log("all posts were deleted successfully, $scope.noPosts before: " + $scope.noPosts); //debug
                            $scope.noPosts = true;
                            console.log("$scope.noPosts: " + $scope.noPosts); //debug
                        }
                    }
                });
            },
            failure: function (r) {
                var status = r.status.toString();
                //error handling
                console.log("ERROR: " + status + ". Cannot proceed with deleting channel.");
                notify("ERROR: " + status + ". Cannot proceed with deleting channel.");

                ///---reset
                $scope.countAndUri[0] = -1;
                $scope.countAndUri[1] = "";
                $scope.noPosts = false;
                ///---

                if (status == '403') {
                    notify('Error', 'Could not delete post, access denied!');
                }
                if (status == '404') {
                    notify('Error', 'Could not delete post, no such resource on the server!');
                }
            }
        });
    };

    $scope.$watch('noPosts', function(newVal,oldVal) {   //waits for all posts to be deleted, then proceeds to delete the channel
        if ($scope.$parent.userProfile.storagespace !== undefined && newVal === true) {
            console.log('all posts for a channel are deleted, attempting to delete channel: ' + $scope.countAndUri[1]); //debug
            $scope.deleteChannel($scope.countAndUri[1]); //delete channel       
        }
    });

    $scope.deleteChannel = function (ch) { //parameter passed in is channel uri
        $.ajax({
            url: ch,
            type: "delete",
            xhrFields: {
                withCredentials: true
            },
            success: function (d,s,r) {
                console.log('Deleted '+ch);
                notify('Success', 'Your channel was removed from the server!');
                $scope.$apply();

                // also remove the ACL file
                var acl = parseLinkHeader(r.getResponseHeader('Link'));
                var aclURI = acl['acl']['href'];
                $.ajax({
                    url: aclURI,
                    ype: "delete",
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (d,s,r) {
                        console.log('Deleted! ACL file was removed from the server.');
                        $scope.removeChannelandPosts(ch);
                        ///---reset
                        $scope.countAndUri[0] = -1;
                        $scope.countAndUri[1] = "";
                        $scope.noPosts = false;
                        ///---
                    }
                });
            },
            failure: function (r) {
                var status = r.status.toString();
                if (status == '403') {
                    notify('Error', 'Could not delete post, access denied!');
                }
                if (status == '404') {
                    notify('Error', 'Could not delete post, no such resource on the server!');
                }
                ///---reset
                $scope.countAndUri[0] = -1;
                $scope.countAndUri[1] = "";
                $scope.noPosts = false;
                ///---
            }
        });
    };

    $scope.removeChannelandPosts = function (ch) {
        var webid = $scope.userProfile.webid;
        delete $scope.users[webid].channels[ch];
        delete $scope.channels[ch];
        for (var p in $scope.posts) {
            if ($scope.posts[p].channel === ch) {
                delete $scope.posts[p];
            }
        }
        ///---reset; redundant, but I'm making sure I cover all my bases
        $scope.countAndUri[0] = -1;
        $scope.countAndUri[1] = "";
        $scope.noPosts = false;
        ///---
    };

    ///---
});