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
.controller( 'HomeCtrl', function HomeController( $scope, $http, $location, $sce) {
    $scope.hideMenu = function() {
        $scope.$parent.showMenu = false;
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
                    notify('Error', 'Unauthorized! You need to authentify!');
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
                console.log('Success! Created new uB directory at '+mburi+'/');
                // create the meta file
                var meta = parseLinkHeader(r.getResponseHeader('Link'));
                var metaURI = meta['meta']['href'];
                var ldpresource = r.getResponseHeader("Location");
                console.log("ldpresource: " + ldpresource); //debug
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
                        console.log("$scope.users[" + $scope.userProfile.webid + "].mbspace: " + $scope.users[$scope.userProfile.webid].mbspace); //debug
                        // clear form
                        $scope.mburi = '';
                        // close modal
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
});