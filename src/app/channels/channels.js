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
    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';
    $scope.newChannelModal = false;
    $scope.deleteChannelStatus = false;
    $scope.channelToDelete = ""; //variable to hold the uri of the channel to remove from $scope.channels and $scope.users[<webid>].channels
    $scope.showOverlay = false;
    $scope.createbtn = "Create";

    console.log("$scope.parent.userprofile"); //debug
    console.log($scope.$parent.userProfile); //debug
    console.log("$scope.userprofile"); //debug
    console.log($scope.userProfile); //debug
    console.log("$scope.users"); //debug
    console.log($scope.users); //debug
    console.log("$scope.parent.users"); //debug
    console.log($scope.$parent.users); //debug

    if (!$scope.$parent.userProfile.channels || Object.keys($scope.$parent.userProfile.channels) === 0) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        console.log("channels controller calling getChannels"); //debug
        $scope.$parent.getChannels(storage, webid, true, false, false);
    } else {
        console.log("else executed");
        $scope.$parent.gotstorage = false;
        $scope.$parent.loading = false;
    }
    
    console.log("listing $scope.$parent.userProfile.channels"); //debug
    for (var a in $scope.$parent.userProfile.channels) {
        console.log("key: " + a); //debug
        console.log($scope.$parent.userProfile.channels[a]); //debug
    }

    console.log("listing $scope.userProfile.channels"); //debug
    for (var aa in $scope.userProfile.channels) {
        console.log("key: " + aa); //debug
        console.log($scope.userProfile.channels[aa]); //debug
    } 

    $scope.showPopup = function (arg) {
        /*
        console.log("ex show 1"); //debug
        console.log("$scope.newChannelModal before: " + $scope.newChannelModal); //debug
        console.log("$scope.deleteChannelStatus before: " + $scope.deleteChannelStatus); //debug
        console.log("$scope.showOverlay before: " + $scope.showOverlay); //debug
        */
        if (arg === "new") {
            $scope.newChannelModal = true;
        }
        else if (arg === "del") {
            $scope.deleteChannelStatus = true;
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

        console.log("$scope.channelname: " + $scope.channelname); //debug
        if ($scope.channelname !== undefined && testIfAllEnglish($scope.channelname)) {
            // remove white spaces and force lowercase
            console.log("setting title, before: " + title); //debug
            title = $scope.channelname;
            console.log("title is now: " + title); //debug
            churi = $scope.channelname.toLowerCase().split(' ').join('_');
        } 

        chan.uri = churi;
        console.log("setting title, before: " + chan.title); //debug
        chan.title = title;
        console.log("title is now: " + chan.title); //debug
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

                                console.log("listing $scope.$parent.users[" + chan.owner + "].channels"); //debug
                                for (var k in $scope.$parent.users[chan.owner].channels) {
                                    console.log("key: " + k); //debug
                                    console.log($scope.$parent.users[chan.owner].channels[k]); //debug
                                }
                                console.log("listing $scope.$parent.channels"); //debug
                                for (var kk in $scope.$parent.channels) {
                                    console.log("key: " + kk); //debug
                                    console.log($scope.$parent.channels[kk]); //debug
                                }

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

        //manual way to create .meta and .acl uri
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
            console.log("fetching for uri: " + uri); //debug
            console.log("$scope.delList is"); //debug
            for (var l in $scope.delList) {
                console.log($scope.delList[l]); //debug
            }
            console.log("done");


            console.log(posix('Directory')); //debug
            console.log(rdfschema('Resource')); //debug
            console.log(SIOC('Post')); //debug
            var directories = g.statementsMatching(undefined, RDF('type'), posix('Directory'));
            var resources = g.statementsMatching(undefined, RDF('type'), rdfschema('Resource'));

            console.log("directories, length: " + directories.length); //debug
            console.log(directories); //debug
            console.log("resources, length: " + resources.length); //debug
            console.log(resources); //debug

            if (resources.length > 0) {
                for (var r in resources) {
                    var ruri = resources[r]['subject']['value'];
                    $scope.delCounter = $scope.delCounter + 1;
                    $scope.delList.push(ruri);
                    console.log("adding to delList: " + ruri); //debug
                    console.log("$scope.delList is now"); //debug
                    for (var le in $scope.delList) {
                        console.log($scope.delList[le]); //debug
                    }
                    console.log("done");
                }
            }

            if (directories.length > 1) { //directories[0] always references the uri itself
                console.log(1); //debug
                for (var d in directories) {
                    console.log(2); //debug
                    var nuri = directories[d]['subject']['value'];
                    if (nuri !== uri) { //makeshift way of preventing loopback
                        console.log(3); //debug
                        console.log("directories length: " + directories.length); //debug
                        console.log("d at: " + d); //debug
                        if (d == 1) { //if first one (not uri itself), add to delList, otherwise, add to delStack
                            console.log(4); //debug
                            $scope.delCounter = $scope.delCounter + 1;
                            $scope.delList.push(nuri);
                            console.log("adding to delList: " + nuri); //debug
                            console.log("$scope.delList is now"); //debug
                            for (var ll in $scope.delList) {
                                console.log($scope.delList[ll]); //debug
                            }
                            console.log("done");
                        }
                        else {
                            $scope.delStack.push(nuri);
                            console.log("adding to delStack: " + nuri); //debug
                        }
                    }
                }
                console.log("attempting to fetch: " + directories[1]['subject']['value']); //debug
                $scope.mapTree(directories[1]['subject']['value']);
            }
            else if ($scope.delStack.length > 0) {
                $scope.delCounter = $scope.delCounter + 1;
                var suri = $scope.delStack.pop();
                $scope.delList.push(suri);
                console.log("$scope.delList is now"); //debug
                for (var li in $scope.delList) {
                    console.log($scope.delList[li]); //debug
                }
                console.log("done");
                $scope.mapTree(suri);
            }
            else {
                console.log("is this order right? counter: " + $scope.delCounter); //debug
                console.log("$scope.delList is now"); //debug
                for (var ly in $scope.delList) {
                    console.log($scope.delList[ly]); //debug
                }
                console.log("done");
                $scope.deleteContent(); //we finished mapping the directory uri, now we need to delete the content
            }

            /*
            ////---- specific to channel
            console.log("is " + uri + " equal to " + $scope.channelToDelete + "?"); //debug
            if (uri === $scope.channelToDelete && $scope.channelToDelete !== "") {
                console.log("removing channel from $scope.channels and $scope.users[<webid>].channels"); //debug

                //remove channel from arrays
                //TODO, figure out if i shud delete parent or child channels array
                var webid = $scope.userProfile.webid;
                delete $scope.$parent.userProfile.channels[uri];
                delete $scope.userProfile.channels[uri];
                delete $scope.$parent.users[webid].channels[uri];
                delete $scope.users[webid].channels[uri];
                delete $scope.$parent.channels[uri];
                delete $scope.channels[uri];
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
            }*/
        });
    };

    // recursively deletes everything in $scope.delList[] from high to low index (most recent to earliest)
    $scope.deleteContent = function () {
        var uri = $scope.delList.pop();
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
                console.log("ERROR: " + status + ". Cannot proceed with deleting the file.");
                console.log("What's left in mapTree: ");
                for (var c in $scope.mapTree) {
                    console.log($scope.mapTree[c]);
                }
                notify("ERROR: " + status + ". Cannot proceed with deleting the file.");

                if (status == '403') {
                    notify('Error', 'Could not delete file, access denied!');
                }
                if (status == '404') {
                    notify('Error', 'Could not delete file, no such resource on the server!');
                }
                //attempt to proceed with deleting the next item on the agenda
                if ($scope.delList.length > 0) {
                    $scope.deleteContent();
                }
                else { //we already popped it, if there's nothing else left that we can delete, then reset $scope.channelToDelete
                    $scope.channelToDelete = "";
                }
            }
        });
    };

    $scope.removeChannel = function () {
        if ($scope.channelToDelete !== "") {
            var uri = $scope.channelToDelete;
            console.log("removing channel from $scope.channels and $scope.users[<webid>].channels"); //debug
            //remove channel from arrays
            //TODO, figure out if i shud delete parent or child channels array
            var webid = $scope.userProfile.webid;
            delete $scope.$parent.userProfile.channels[uri];
            delete $scope.userProfile.channels[uri];
            delete $scope.$parent.users[webid].channels[uri];
            delete $scope.users[webid].channels[uri];
            delete $scope.$parent.channels[uri];
            delete $scope.channels[uri];
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
        }
    };
    ///---
});