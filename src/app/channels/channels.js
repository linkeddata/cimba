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
    $scope.channelKeys = [];
    if ($scope.$parent.userProfile.storagespace !== undefined) {        
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;

        $scope.channelKeys = $scope.$parent.getChannels(storage, webid, true, false, false);

    } else {
        $scope.$parent.gotstorage = false;
    }
    $scope.$parent.loading = false;
    

    $scope.newChannel = function(channelname){
        $scope.loading = true;
        $scope.createbtn = 'Creating...';
        var title = 'ch';
        var churi = 'ch';
        

        if ($scope.channelname !== undefined && testIfAllEnglish($scope.channelname)) {
            console.log("test");
            // remove white spaces and force lowercase
            title = $scope.channelname;
            churi = $scope.channelname.toLowerCase().split(' ').join('_');
        } 
        // TODO: let the user select the Microblog workspace too

        $.ajax({
            type: "POST",
            url: $scope.users[webid].mbspace,
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

                var chURI = r.getResponseHeader('Location');
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
                                // reload user profile when done
                                $scope.getInfo($scope.users[webid], true);
                            }
                        });
                    }
                }
            }
        }).always(function() {
            // revert button contents to previous state
            $scope.createbtn = 'Create';
            $scope.loading = false;
            $scope.$apply();
        });channelname='';
    };
});