/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */
angular.module( 'Cimba.home', [
  'ui.router'
])

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
.config(function HomeConfig( $stateProvider ) {
  $stateProvider.state( 'home', {
    url: '/home',
    views: {
      "main": {
        controller: 'HomeCtrl',
        templateUrl: 'home/home.tpl.html'
      }
    },
    data:{ pageTitle: 'Home' }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'HomeCtrl', function HomeController( $scope, $http, $location, $sce, $rootScope) {
    //defaults for creating a new channel
    $scope.audience = {};
    $scope.audience.range = 'public';
    $scope.audience.icon = 'fa-globe';

    $scope.hideMenu = function() {
        $scope.$parent.showMenu = false;
    };

    //defaults
    $scope.$parent.newChannelModal = false;
    $scope.newMBModal = false;
    $scope.newStorageModal = false;
    $scope.showOverlay = false;
    for (var c in $scope.$parent.userProfile.subscribedChannels) {
        var channel = $scope.$parent.userProfile.subscribedChannels[c];
        $scope.$parent.getPosts(channel.uri, channel.title);
    }
    $scope.showPopup = function (p) {
        console.log("ex show");
        if (p == "ch") {
            $scope.$parent.newChannelModal = true;
        }
        else if (p == "mb") {
            $scope.newMBModal = true;
        }
        else if (p == "st") {
            $scope.newStorageModal = true;
        }
        $scope.showOverlay = true;
    };

    $scope.hidePopup = function (p) {
        console.log("ex hide");
        $scope.newChannelModal = false;
        $scope.newMBModal = false;
        $scope.newStorageModal = false;
        $scope.showOverlay = false;
    };

    $scope.$watch('$parent.getInfoDone', function(newVal,oldVal){   //waits for getInfo to be done to call getChannels
        console.log('getInfo is done');
        if ($scope.$parent.userProfile.storagespace !== undefined && newVal === true) {
            console.log('close');
            var storage = $scope.$parent.userProfile.storagespace;
            var webid = $scope.$parent.userProfile.webid;
            $scope.$parent.getChannels(storage, webid, true, false, true); //get channels and posts        
        }
    });

    $scope.createbtn = 'Create'; //create button for newMBModal

    $scope.newChannel = function(channelname, redirect){
        console.log(channelname);
        $scope.loading = true;
        $scope.createbtn = 'Creating...';
        var title = 'ch';
        var churi = 'ch';
        
        var chan = {};

        if (channelname !== undefined && testIfAllEnglish(channelname)) {
            // remove white spaces and force lowercase
            title = channelname;
            churi = channelname.toLowerCase().split(' ').join('_');
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

                                $scope.hidePopup();

                                //set default if first channel
                                if ($scope.defaultChannel === undefined) {
                                    //console.log("no default channel, setting default equal to "); //debug
                                    $scope.defaultChannel = chan;
                                    //console.log(chan); //debug
                                }

                                //adds the newly created channel to our list
                                chan.uri = chURI;
                                $scope.$parent.users[chan.owner].channels[chURI] = chan;
                                $scope.$parent.channels[chURI] = chan;
                                //hide window
                                $scope.hidePopup();

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


    // prepare the triples for new storage
    // do not actually create the space, we just point to it
    $scope.newStorage = function(express) {
        $scope.loading = true;
        $scope.addstoragebtn = 'Adding...';

        var storage = ($scope.storageuri)?$scope.storageuri:'shared/';
        // replace whitespaces and force lowercase
        storage = storage.toLowerCase().split(' ').join('_');

        // add trailing slash since we have dir
        if (storage.substring(storage.length - 1) != '/') {
          storage = storage+'/';
        }

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var g = $rdf.graph();
        
        // add storage triple
        g.add($rdf.sym($scope.userProfile.webid), SPACE('storage'), $rdf.sym(storage));

        var s = new $rdf.Serializer(g).toN3(g);
        console.log(s);
        if (s.length > 0) {
            $.ajax({
                type: "POST",
                url: $scope.userProfile.webid,
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
                    console.log('Success! Added a new storage relation to your profile.');
                    notify('Success', 'Your profile was succesfully updated!');

                    // clear form
                    $scope.storageuri = '';
                    $scope.addstoragebtn = 'Add';
                    $scope.users[$scope.userProfile.webid].storagespace = storage;
                    // close modal
                    $scope.hidePopup();
                    //$('#newStorageModal').modal('hide');
                    // reload user profile when done
                    if (express && express === true) {
                        $scope.mburi = "mb";
                        $scope.newMB(express);
                    }
                    else {
                        $scope.getInfo($scope.userProfile.webid, true, false);
                        // revert button contents to previous state
                        $scope.addstoragebtn = 'Add';
                        $scope.loading = false;
                        $scope.$apply();
                    }
                },
                error: function() {
                    // revert button contents to previous state
                    $scope.addstoragebtn = 'Add';
                    $scope.loading = false;
                    $scope.$apply();
                }
            });
        }
    };

    // prepare the triples for new storage
    $scope.newMB = function(mbname, express) {
        $scope.loading = true;
        $scope.createbtn = 'Creating...';

        $scope.mburi = mbname;
        var mburi = ($scope.mburi)?$scope.mburi:'mb';
        // replace whitespaces and force lowercase
        mburi = mburi.toLowerCase().split(' ').join('_');

        $.ajax({
            type: "POST",
            url: $scope.userProfile.storagespace,
            processData: false,
            headers: {
                Slug: mburi,
                Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
            },
            contentType: 'text/turtle',
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
                    notify('Error', 'Forbidden! You are not allowed to create new resources.');
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
                console.log('Success! Created new uB directory at '+mburi+'/');
                // create the meta file
                var meta = parseLinkHeader(r.getResponseHeader('Link'));
                var metaURI = meta['meta']['href'];
                var ldpresource = r.getResponseHeader("Location");
                //console.log("ldpresource: " + ldpresource); //debug
                var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
                var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
                var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
                var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
                var LDPX = $rdf.Namespace("http://ns.rww.io/ldpx#");
                var g = $rdf.graph();
                
                // add uB triple (append trailing slash since we got dir)
                g.add($rdf.sym(mburi+'/'), RDF('type'), SIOC('Space'));
                g.add($rdf.sym(mburi+'/'), DCT('title'), $rdf.lit("Microblogging workspace"));
                g.add($rdf.sym(mburi+'/'), LDPX('ldprPrefix'), $rdf.lit("ch"));
                var k = new $rdf.Serializer(g).toN3(g);         
                if (k.length > 0) {
                $.ajax({
                    type: "POST",
                    url: metaURI,
                    contentType: "text/turtle",
                    data: k,
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
                            notify('Error', 'Forbidden! You are not allowed to create new resources.');
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
                        console.log('Success! Microblog space created.');
                        notify('Success', 'Microblog space created.');
                        $scope.users[$scope.userProfile.webid].mbspace = ldpresource;
                        
                        $scope.userProfile.mbspace = ldpresource;
                        //console.log("$scope.users[" + $scope.userProfile.webid + "].mbspace: " + $scope.users[$scope.userProfile.webid].mbspace); //debug

                        // clear form
                        $scope.mburi = '';
                        // close modal
                        $scope.hidePopup();
                        //$('#newMBModal').modal('hide');
                        this.newMBModal = false; //debug, testing
                        if (express && express === true) {
                            $scope.channelname = "main";
                            $scope.newChannel();
                        }
                        else {
                        // reload user profile when done
                            $scope.getInfo($scope.userProfile.webid, true, false);
                            // revert button contents to previous state
                            $scope.createbtn = 'Create';
                            $scope.loading = false;
                            $scope.$apply();
                            }
                        },
                        error: function() {
                            // revert button contents to previous state
                            $scope.createbtn = 'Create';
                            $scope.loading = false;
                            $scope.$apply();
                        }             
                    });
                }
            },
            error: function() {
                // revert button contents to previous state
                $scope.createbtn = 'Create';
                $scope.loading = false;
                $scope.$apply();
            }
        });
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
                g.add($rdf.sym(''), WAC('agent'), $rdf.sym($scope.userProfile.webid));
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
    ///---

});
