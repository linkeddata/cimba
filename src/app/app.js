// Globals
var PROXY = "https://rww.io/proxy?uri={uri}";
var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
var TIMEOUT = 90000;
var DEBUG = true;

// Angular
angular.module( 'Cimba', [
  'templates-app',
  'templates-common',
  'Cimba.tab',
  'Cimba.posts',
  'Cimba.home',
  'Cimba.login',
  'Cimba.about',
  'Cimba.channels',
  'Cimba.find',
  'ui.router',
  'ngProgress'
])

.config( function CimbaConfig ( $stateProvider, $urlRouterProvider ) {
  $urlRouterProvider.otherwise('/login');
})

// replace dates with moment's "time ago" style
.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  };
})

// parse markdown text to html
.filter('markdown', function ($sce) {
    var converter = new Showdown.converter();
  return function (str) {
        return converter.makeHtml(str);
    };
})

// turn http links in text to hyperlinks
.filter('makeLinks', function ($sce) {
    return function (str) {
        return $sce.trustAsHtml(str.
                                replace(/</g, '&lt;').
                                replace(/>/g, '&gt;').
                                replace(/(http[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
                               );
    };
})

// order function for ng-repeat using lists instead of arrays
.filter('orderObjectBy', function(){
 return function(input, attribute) {
    if (!angular.isObject(input)) {
      return input;
    }

    var array = [];
    for(var objectKey in input) {
        array.push(input[objectKey]);
    }

  array.sort(function(a, b){
    var alc = a[attribute].toLowerCase();
    var blc = b[attribute].toLowerCase();
    return alc > blc ? 1 : alc < blc ? -1 : 0;
  });
  return array;
 };
})

// filter array of objects by property
.filter('unique', function() {
  return function(collection, keyname) {
    var output = [], 
    keys = [];

    angular.forEach(collection, function(item) {
      var key = item[keyname];
      if(keys.indexOf(key) === -1) {
        keys.push(key);
        output.push(item);
      }
    });

    return output;
  };
})

// get subarray 
.filter('slice', function() {
    return function(arr, start, end) {        
        return (arr || []).slice(start, Math.floor(end));
    };
})

.controller( 'MainCtrl', function MainCtrl ($scope, $window, $rootScope, $location, $timeout, ngProgress, $http, noticesData ) {
    // Some default values

    var emptyUser = {
        'name': "Anonymous",
        'picture': 'assets/generic_photo.png',
        'storagespace': ''
    };

    $scope.appuri = window.location.hostname+window.location.pathname;
    $scope.users={};
    $scope.loginSuccess = false;
    $scope.userProfile = {
        'webid': undefined,
        'name': undefined,
        'picture': 'assets/generic_photo.png',
        'storagespace': undefined,
        'mbspace': true,
        'chspace': true,
        'gotposts': true,
        'channels': {}
    };
    // $scope.userProfile.picture = 'assets/generic_photo.png'; //default
    $scope.channels = {};
    $scope.posts = {}; //aggregate list of all posts (flat list)
    $scope.search = {};
    $scope.loadChannels = {};
    $scope.loadSubscriptions = {}; 
    // $scope.gotErrorMessage = true; 
    $rootScope.notices = [];

    $scope.login = function () {
        $location.path('/login');
    };

    $scope.hideMenu = function(){
      $scope.showMenu = false;
    };

    $scope.closeNotice = function(nId){
        noticesData.close(nId);
    };

    // for debuging the notices
    $scope.addMessage = function() {
        noticesData.add("error", "helloworld");
    };

    $scope.logout = function () {
        // Logout WebID (only works in Firefox and IE)
        if (document.all == null) {
            if (window.crypto) {
                try {
                    window.crypto.logout(); //firefox ok -- no need to follow the link
                } catch (err) {//Safari, Opera, Chrome -- try with tis session breaking
               
                }
            }
        } else { // MSIE 6+dsd
            document.execCommand('ClearAuthenticationCache');
        }

        // clear sessionStorage
        $scope.clearLocalCredentials();
        $scope.userProfile = {};        

        //reset data so that it doesn't carry over to next login
        $scope.users = {};
        $scope.channels = {};
        $scope.posts = {};
        $scope.search = {}; 
        $scope.loggedin = false;

        $location.path('/login');
    };

    // cache user credentials in sessionStorage to avoid double sign in
    $scope.saveCredentials = function () {
        var cimba = {};
        var _user = {};
        cimba.userProfile = $scope.userProfile;
        sessionStorage.setItem($scope.appuri, JSON.stringify(cimba));
    };

    // retrieve from sessionStorage
    $scope.loadCredentials = function () {
        console.log("load credentials executed");
        if (sessionStorage.getItem($scope.appuri)) {
            // console.log("found session stored info");
            var cimba = JSON.parse(sessionStorage.getItem($scope.appuri));
            if (cimba.userProfile) {
                if (!$scope.userProfile) {
                    $scope.userProfile = {};                    
                }
                $scope.userProfile = cimba.userProfile;
                // $scope.users[cimba.userProfile.webid] = cimba.userProfile;
                $scope.loggedin = true;
                // console.log($scope.userProfile.channels);

                if ($scope.userProfile.channels) {
                    for (var w in $scope.userProfile.channels) {
                        if (!$scope.defaultChannel) {
                            $scope.defaultChannel = $scope.userProfile.channels[w];
                        }
                    }
                }
                // console.log($scope.userProfile.mbspace);
                // load from PDS (follows)
                console.log($scope.users);
                if ($scope.userProfile.mbspace && (!$scope.users || Object.keys($scope.users).length === 0)) {
                    // console.log("found user mbspace");
                    console.log("no scope.users");
                    $scope.getUsers();
                }
                // refresh data
                $scope.getInfo(cimba.userProfile.webid, true);                
            } else {
                // clear sessionStorage in case there was a change to the data structure
                sessionStorage.removeItem($scope.appuri);
                // $scope.loggedin = false;
            }
        }        
    };

    // clear sessionStorage
    $scope.clearLocalCredentials = function () {
        sessionStorage.removeItem($scope.appuri);
    };

    $scope.$watch('loginSuccess', function(newVal, oldVal) {        
        if (newVal === true && $scope.userProfile.webid) {
            $scope.getInfo($scope.userProfile.webid, true, false);
        }
    });

    // get relevant info for a webid
    $scope.getInfo = function(webid, mine, update) {
        if (DEBUG) {
            console.log("Getting user info for: "+webid);
        }
        $scope.getInfoDone=false; //callback for home page loading channels and posts

        // start progress bar
        ngProgress.start();
        console.log("ng 1: start"); //debug

        if (mine) {
            $scope.loading = true;
            console.log("loading 0: true"); //debug
        }

        $scope.found = true;

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
        var ACL = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);
        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        var docURI = webid.slice(0, webid.indexOf('#'));
        var webidRes = $rdf.sym(webid);

        // fetch user data
        f.nowOrWhenFetched(docURI,undefined,function(ok, body) {
            // console.log("listing $scope.users"); //debug
            for (var k in $scope.users) {
                // console.log("key: " + k); //debug
                // console.log($scope.users[k]); //debug
            }

            if (!ok) {
                if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                  notify('Warning', 'WebID profile not found.');
                  $scope.found = false;
                  $scope.searchbtn = 'Search';
                  // reset progress bar
                  ngProgress.reset();
                  console.log("ng 2: reset"); //debug
                  $scope.$apply();
                }
            } 

            // get some basic info
            var name = g.any(webidRes, FOAF('name'));
            var pic = g.any(webidRes, FOAF('img'));
            var depic = g.any(webidRes, FOAF('depiction'));

            // get storage endpoints
            var storage = g.any(webidRes, SPACE('storage')).value;

            // get list of delegatees
            var delegs = g.statementsMatching(webidRes, ACL('delegatee'), undefined);

            // Clean up name
            name = (name) ? name.value : 'No name found';

            // set avatar picture
            if (pic) {
                pic = pic.value;
                console.log("picture found at " + pic); //debug
            } else {
                if (depic) {
                    pic = depic.value;
                    console.log("depiction found at " + pic); //debug
                } else {
                    pic = 'assets/generic_photo.png';
                    console.log("no image found: loading from " + pic); //debug
                }
            }

            /*
            var _user = {
                webid: webid,
                name: name,
                picture: pic,
                storagespace: storage
            };
            */

            // add to search object if it was the object of a search
            if ($scope.search && $scope.search.webid && $scope.search.webid === webid) {
                $scope.search.name = name;
                $scope.search.picture = pic;
            }

            if (!$scope.users[webid]) {
                // console.log("$scope.users[" + webid + "] doesn't exist, initializing it"); //debug
                $scope.users[webid] = {};
            }
            $scope.users[webid].mine = mine;

            if (update) {
                $scope.refreshinguser = true;
                $scope.users[webid].name = name;
                $scope.users[webid].picture = pic;
                $scope.users[webid].storagespace = storage;
                $scope.$apply();
            }

            if (storage === undefined) { 
                $scope.gotstorage = false;
            }

            if (mine) { // mine
                $scope.userProfile.webid = webid;
                $scope.userProfile.name = name;
                $scope.userProfile.picture = pic;
                $scope.userProfile.storagespace = storage;
                // $scope.users[webid].name = name; //for displaying delete button in posts.tpl.html
                // $scope.users[webid].picture = pic; //resolves issue of not displaying profile picture that the above line creates
                // $scope.users[webid].storagespace = storage; //not inherently necessary since we could just call $scope.userProfile.storagespace
                $scope.users[webid] = $scope.userProfile;
                    //but it's nice to have just in case

                // console.log("$scope.users[" + webid + "]"); //debug
                // console.log($scope.users[webid]); //debug
                // console.log(webid); //debug

                if (!$scope.userProfile.subscribedChannels) {
                    $scope.userProfile.subscribedChannels = {};
                }
                //

                // find microblogging feeds/channels
                if (!storage) {
                  $scope.loading = false; // hide spinner
                  console.log("loading 1: false"); //debug
                }

                // cache user credentials in sessionStorage
                $scope.saveCredentials();

                // update DOM
                $scope.loggedin = true;
                $scope.profileloading = false;
                // ngProgress.complete();
                // console.log("ng 3: complete");

                $scope.$apply();
            }
            // if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
            //     $scope.getChannels(storage, webid, false, update, false);
            // }

            // Load Channels 
            if ($scope.loadChannels[webid]) {                
                $scope.getChannels(storage, webid, mine, update, false);                
                $scope.$apply();

            } else {
                ngProgress.complete();
            }

            $scope.getInfoDone = true;
             //done getting info, home page can now load channels and posts
            // console.log("at getinfo, $scope.users[" + $scope.userProfile.webid + "] has channels"); //debug
            // for (var y in $scope.users[webid].channels) {
            //     console.log($scope.users[webid].channels[y]); //debug
            // }
            // console.log("has subscribed channels"); //debug
            // for (var w in $scope.userProfile.subscribedChannels) {
            //     console.log($scope.userProfile.subscribedChannels[w]); //debug
            // }

        });
        // if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
        //     $scope.searchbtn = 'Search';
        // }

        return $scope.channels;
    };

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
        if ( angular.isDefined( toState.data.pageTitle ) ) {
            $scope.pageTitle = toState.data.pageTitle + ' | Cimba' ;
        }
    });

    // returns the channel object for 
    $scope.getChannel = function (uri) {
        console.log("getting channel");
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // fetch user data: SIOC:Space -> SIOC:Container -> SIOC:Post
        f.nowOrWhenFetched(uri,undefined,function(){            
            var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));                        
            if (chs.length > 0) {
                var churi = chs[0]['subject']['value'];
                // console.log(churi);
                var channel = {};
                if (!$scope.channels[churi]) {
                    $scope.channels[churi] = channel;
                } else {
                    channel = $scope.channels[churi];
                }
                channel['uri'] = chs[0]['subject']['value'];

                var title = g.any(chs[0]['subject'], DCT('title'));

                if (title) {
                    channel['title'] = title.value;
                } else {
                    channel['title'] = channeluri;
                }
                // console.log("got here");
                ownerObj = g.any(chs[0]['subject'], SIOC('has_creator'));
                // console.log(ownerObj);
                // console.log(g.any(ownerObj, FOAF('name')));
                if (g.any(ownerObj, SIOC('account_of'))) {
                    channel["owner"] = g.any(ownerObj, SIOC('account_of')).value;                    
                    console.log("channel owner found: " + channel.owner);
                }  else if ($scope.userProfile.channels && 
                    $scope.userProfile.channels[channel.uri]) {
                    channel["owner"] = $scope.userProfile.webid;
                }
                console.log("owner: " + channel.owner);

                // $scope.channels[channel.uri] = channel;
                
                $scope.loading = true;
                $scope.defaultChannel = $scope.channels[churi];
                console.log("loading 2: true"); //debug
                $scope.$apply();
                $scope.getPosts(channel.uri, channel.title);

                //console.log("channel in getCHannel"); //debug
                //console.log(channel); //debug
            }

            // console.log($scope.channels);
        });
    };

    $scope.getChannels = function(uri, webid, mine, update, loadposts) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);
        
        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // fetch user data: SIOC:Space -> SIOC:Container -> SIOC:Post
        f.nowOrWhenFetched(uri,undefined,function(){
            // find all SIOC:Container
            var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Space'));

            if (ws.length > 0) {
                /*
                console.log("at getChannels, webid is " + webid); //debug
                console.log("at getChannels, users are"); //debug
                for (var l in $scope.users) {
                    console.log("key: " + l); //debug
                    console.log($scope.users[l]); //debug
                    console.log("that user has channels"); //debug
                    for (var tu in $scope.users[l].channels) {
                        console.log("key: " + tu); //debug
                        console.log($scope.users[l].channels[tu]); //debug
                    }
                }
                */

                if (!$scope.users[webid]) {
                    //console.log("$scope.users[" + webid + "] doesn't exist (which doesn't make sense since i need the webid to call this function), initializing it"); //debug
                    $scope.users[webid] = {};
                }
                if (mine && !$scope.users[webid].mbspace) {
                    // set default Microblog space
                    $scope.users[webid].mbspace = ws[0]['subject']['value'];
                    $scope.userProfile.mbspace = ws[0]['subject']['value'];
                    // console.log("at getChannels, looking for .mbspace $scope.users[" + webid + "] is"); //debug
                    // console.log($scope.users[webid]); //debug

                    $scope.getUsers(true); // get the list of people I'm following + channels + posts
                }

                var func = function() {
                    var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
                    // console.log("got Channels!"); //debug

                    // console.log("pre: $scope.users[" + webid + "] has channels"); //debug
                    // for (var r in $scope.users[webid].channels) {
                    //     console.log("key: " + r); //debug
                    //     console.log($scope.users[webid].channels[r]); //debug
                    // }

                    if (chs.length > 0) {
                        if (!$scope.channels) {
                            // console.log("$scope.channels is undefined, initializing empty list"); //debug
                            $scope.channels = {};
                        }
                        if (!$scope.users[webid].channels) {
                            // console.log("$scope.users[" + webid + "].channels is undefined, initializing empty list"); //debug

                            $scope.users[webid].channels = {};
                        }
                        if (!$scope.userProfile.channels) {
                            $scope.userProfile.channels = {};
                        }

                        for (var ch in chs) {
                            var channel = {};
                            channel['uri'] = chs[ch]['subject']['value'];

                            var title = g.any(chs[ch]['subject'], DCT('title')).value;

                            if (title) {
                                channel['title'] = title;
                            } else {
                                channel['title'] = channeluri;
                            }

                            channel["owner"] = webid;
                            channel["author"] = webid; //default
                            if ($scope.users[webid]) {
                                channel["author"] = $scope.users[webid].name;
                            }
                            var authorlink = g.any(chs[ch]['subject'], SIOC('has_creator'));
                            // console.log(authorlink);
                            var author = g.any(authorlink, FOAF('name'));
                            // console.log(author);
                            if (author) {
                                channel["author"] = author.value;
                            }
                            
                            if (!$scope.channels[channel.uri]) {
                                $scope.channels[channel.uri] = channel;
                            }
                            
                            if ($scope.users[webid].channels && !$scope.users[webid].channels[channel.uri]) {
                                // console.log("$scope.users[" + webid + "].channels doesn't contain " + channel.uri + ". setting it equal to"); //debug
                                //console.log(channel); //debug
                                $scope.users[webid].channels[channel.uri] = channel;
                            }
                
                            if (mine) {
                                $scope.userProfile.channels[channel.uri] = channel;    
                            }
                            
                            $scope.$apply();

                            // mine
                            if (mine) {
                                //get posts for my channel
                                if (loadposts === true) {
                                    $scope.getPosts(channel.uri, channel.title);
                                }

                                //this dictionary pairs channels with their owner and the posts they contain
                                $scope.users[webid].chspace = true;
                            }

                            // update
                            if (update) {
                                /*
                                var exists = findWithAttr($scope.users[webid].channels, 'uri', channel.uri);
                                if (exists === undefined) {
                                    $scope.users[webid].channels[channel.uri] = channel;
                                }*/
                                $scope.users[webid].chspace = true;
                                $scope.$apply();
                            }
                        }

                        // set a default channel for the logged user
                        if (mine) {
                            for (var u in $scope.users[webid].channels) {
                                if (!$scope.defaultChannel) {
                                    $scope.defaultChannel = $scope.users[webid].channels[u];
                                    $scope.userProfile.channel_size = Object.keys($scope.users[$scope.userProfile.webid].channels).length; //not supported in IE8 and below
                                    break;
                                }
                            }
                        }

                        // done refreshing user information -> update view
                        if (update) {
                            $scope.addChannelStyling(webid, $scope.users[webid].channels);
                            delete $scope.users[webid].refreshing;
                            $scope.$apply();
                        }
                    } else {
                        console.log('No channels found!');
                        if (mine) {
                            // hide loader
                            $scope.loading = false;
                            console.log("loading 3: false"); //debug
                            $scope.users[webid].chspace = false;
                        }
                    }

                    // also save updated users & channels list
                    if (update) { 
                        // $scope.saveUsers();
                    }


                    if ($scope.loadChannels[webid]) {
                        // console.log(webid);
                        delete $scope.loadChannels[webid];
                        $scope.addChannelStyling(webid, $scope.users[webid].channels);
                        ngProgress.complete();
                        // console.log("ng 4: complete"); //debug
                        $scope.$apply();
                    }

                    // if we were called by search
                    // if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                    //     console.log("in getChannels, called by search: $scope.users[" + $scope.search.webid + "].channels");
                    //     for (var y in $scope.users[$scope.search.webid].channels) {
                    //         console.log("key: " + y); //debug
                    //         console.log($scope.users[$scope.search.webid].channels[y]); //debug
                    //     }
                    //     console.log("in getChannels, called by search: $scope.search.channels");
                    //     for (var ee in $scope.search.channels) {
                    //         console.log("key: " + ee); //debug
                    //         console.log($scope.search.channels[ee]); //debug
                    //     }
                    //     $scope.search.channels = $scope.flattenObject($scope.users[$scope.search.webid].channels);
                    //     //$scope.search.channels = $scope.users[$scope.search.webid].channels;
                    //     $scope.search.channel_size = $scope.search.channels.length; //not supported in IE8 and below
                    //     // $scope.drawSearchResults(webid);
                    //     ngProgress.complete();
                    //     $scope.searchbtn = 'Search';
                    //     $scope.search.loading = false;
                    //     $scope.$apply();
                    //     //
                    // }                    
                    if (mine) {
                        $scope.saveCredentials();
                        $scope.$apply();
                    }
                };

                for (var i in ws) {
                    w = ws[i]['subject']['value'];

                    //console.log("$scope.users[" + webid + "] has channels"); //debug
                    for (var ty in $scope.users[webid].channels) {
                        //console.log("key: " + ty); //debug
                        //console.log($scope.users[webid].channels[ty]); //debug
                    }

                    // find the channels info for the user (from .meta files)
                    f.nowOrWhenFetched(w+'.*', undefined,func);
                }

            } else { // no Microblogging workspaces found!

                // we were called by search
                // if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                //     $scope.drawSearchResults(webid);
                // }

                if ($scope.loadChannels[webid]) {
                    delete $scope.loadChannels[webid];
                    // $scope.addChannelStyling(webid, $scope.users[webid].channels);
                    ngProgress.complete();
                    console.log("ng 4 alt: complete"); //debug
                    $scope.$apply();
                }

                if (mine) {
                    // console.log('No microblog found!');
                    $scope.gotmb = false;
                    $scope.users[webid].mbspace = false;
                    $scope.users[webid].chspace = false;
                    $scope.users[webid].channels = {};
                    $scope.saveCredentials();

                    // hide loader
                    $scope.loading = false;
                    console.log("loading 4: false"); //debug

                    $scope.$apply();
                }
            }
        });
        
    };

    $scope.getPosts = function(channeluri, title) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();

        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // get all SIOC:Post (using globbing)
        f.nowOrWhenFetched(channeluri+'*', undefined, function(){

            var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));
            // console.log("got Posts!"); //debug

            if (posts.length > 0) {

                for (var p in posts) {

                    var uri = posts[p]['subject'];
                    var useraccount = g.any(uri, SIOC('has_creator'));
                    var post = g.statementsMatching(posts[p]['subject']);
                    var body = ''; //default 
                    var username = ''; //default
                    var userpic = 'assets/generic_photo.png'; //default
                    var userwebid; //default
                    var date = ''; //default

                    if (g.any(uri, DCT('created'))) {
                        var d = g.any(uri, DCT('created')).value;
                        date = moment(d).zone('00:00');
                    }

                    if (g.any(useraccount, SIOC('account_of'))) {
                        userwebid = g.any(useraccount, SIOC('account_of')).value;
                    } else {
                        userwebid = undefined;
                    }

                    // try using the picture from the WebID first

                    if (userwebid && $scope.users[userwebid]) {
                        console.log("tried loading from webid first"); //debug
                        userpic = $scope.users[userwebid].picture;
                        console.log("userpic: " + userpic); //debug
                    }
                    else if (g.any(useraccount, SIOC('avatar'))) {
                        console.log("tried loading from rww storage"); //debug
                        userpic = g.any(useraccount, SIOC('avatar')).value;
                        console.log("userpic: " + userpic); //debug
                    }

                    // try using the name from the WebID first
                    if (userwebid && $scope.users[userwebid]) {
                        username = $scope.users[userwebid].name;
                    } else if (g.any(useraccount, FOAF('name'))) {
                        username = g.any(useraccount, FOAF('name')).value;
                    } else {
                        username = '';
                    }

                    if (g.any(uri, SIOC('content'))) {
                        body = g.any(uri, SIOC('content')).value;
                        // // console.log("body: "); //debug
                    } else {
                        body = '';
                    }

                    uri = uri.value;

                    // check if we need to overwrite instead of pushing new item

                    var _newPost = {
                        uri : uri,
                        channel: channeluri,
                        chtitle: title,
                        date : date,
                        userwebid : userwebid,
                        userpic : userpic,
                        username : username,
                        body : body
                    };

                    if (!$scope.posts) {
                        $scope.posts =  {};
                    }

                    if ($scope.channels[channeluri]) {
                        if (!$scope.channels[channeluri]['posts']) {
                            $scope.channels[channeluri]['posts'] = []; 
                        }
                        $scope.channels[channeluri].posts.push(_newPost);
                    }


                    // add to user's channels
                    if ($scope.users[userwebid] &&
                        $scope.users[userwebid].channels &&
                        $scope.users[userwebid].channels[channeluri]) {
                        if (!$scope.users[userwebid].channels[channeluri]['posts']) {
                            $scope.users[userwebid].channels[channeluri]["posts"] = [];
                        }
                        $scope.users[userwebid].channels[channeluri].posts.push(_newPost);
                    }

                    // filter post by language (only show posts in English or show all) 
                    //not implemented yet ^, currently a redundant if/else statement        
                    if ($scope.filterFlag && testIfAllEnglish(_newPost.body)) {
                        // add/overwrite post
                        $scope.posts[uri] = _newPost; 
                        // $scope.channels[channeluri].posts.push(_newPost);                       
                        $scope.$apply();
                    } else {
                        // $scope.allPosts[channeluri].push(_newPost);
                        // $scope.posts.push(_newPost);
                        $scope.posts[uri] = _newPost;                   
                        // $scope.channels[channeluri]["posts"].push(_newPost);
                        $scope.$apply();
                    }             
                    if (!$scope.users[$scope.userProfile.webid]) {
                        $scope.users[$scope.userProfile.webid] = {};
                    }       
                    $scope.users[$scope.userProfile.webid].gotposts = true;
                }
            } else {
                if (isEmpty($scope.posts)) {
                    $scope.users[$scope.userProfile.webid].gotposts = false;
                }
            }
            // hide spinner
            $scope.loading = false;
            // console.log("loading 5: false"); //debug
            ngProgress.complete(); 
            // console.log("ng 4.5?: complete"); //testing
            $scope.$apply();
        });
    };

    $scope.safeUri = function (uri) {
        return uri.replace(/^https?:\/\//,'');
    };
    
    // attempt to find a person using webizen.org
    $scope.lookupWebID = function(query) {
        if (query.length > 0) {
            $scope.gotresults = false;
            $scope.search.selected = false;
            // get results from server
            $http.get('http://api.webizen.org/v1/search', {
                params: {
                    q: query
                }
            }).then(function(res){
                $scope.webidresults = [];
                angular.forEach(res.data, function(value, key) {
                    value.webid = key;
                    if (!value.img) {
                        value.img = ['assets/generic_photo.png'];
                    }
                    value.host = getHostname(key);
                    $scope.webidresults.push(value);
                });
                return $scope.webidresults;
            });
        }
    };

    // refresh the channels for a given user
    $scope.refreshUser = function(webid) {
        $scope.getInfo(webid, false, true);
    };

    
    // remove a given user from the people I follow
    $scope.removeUser = function (webid) {
        if (webid) {
            // remove user from list
            delete $scope.users[webid];
            // remove posts for that user
            $scope.removePostsByOwner(webid);
            notify('Success', 'The user was been removed.');
            // save new list of users
            $scope.saveUsers();
        }
    };

    // save the list of users + channels
    $scope.saveUsers = function () {
        // save to PDS
        // TODO: try to discover the followURI instead?
        var channels = {}; // temporary channel list (will load posts from them once this is done)
        var followURI = ''; // uri of the preferences file
        var mywebid = $scope.userProfile.webid;

        // console.log("at saveUsers"); //debug
        // console.log("list of users"); //debug
        for (var x in $scope.users){ //debug
            // console.log("key: " + x); //debug
            // console.log($scope.users[x]); //debug
        }

        // console.log("at save users, saving $scope.users[" + mywebid + "]"); //debug
        // console.log($scope.users[mywebid]); //debug

        if ($scope.users[mywebid].mbspace && $scope.users[mywebid].mbspace.length > 1) {
            followURI = $scope.users[mywebid].mbspace+'following';
        }
        // console.log("at save users"); //debug

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var g = $rdf.graph();

        // set triples
        g.add($rdf.sym(followURI), RDF('type'), SIOC('Usergroup'));        
        g.add($rdf.sym(followURI), DCT('created'), $rdf.lit(Date.now(), '', $rdf.Symbol.prototype.XSDdateTime));
        // add users
        var i=0;
        for (var key in $scope.users) {
            var user = $scope.users[key];
            console.log(user);
            console.log(user.picture);
            var uid = followURI+'#user_'+i;
            // add hash id to main graph
            g.add($rdf.sym(followURI), SIOC('has_member'), $rdf.sym(uid));
            g.add($rdf.sym(uid), RDF('type'), SIOC('UserAccount'));
            g.add($rdf.sym(uid), SIOC('account_of'), $rdf.sym(key));
            g.add($rdf.sym(uid), SIOC('name'), $rdf.lit(user.name));
            g.add($rdf.sym(uid), SIOC('avatar'), $rdf.sym(user.picture));

            // console.log("inside for loop"); //debug
            // add each channel
            if (!isEmpty(user.channels)) {
                // console.log("inside if"); //debug
                for (var j in user.channels) {
                    var ch = user.channels[j];
                    var ch_id = followURI+'#channel_'+i+'_'+j;
                    //add the channel uri to the list
                    channels[ch.uri] = ch;
                    // add the channel reference back to the user
                    g.add($rdf.sym(uid), SIOC('feed'), $rdf.sym(ch_id));
                    // add channel details
                    g.add($rdf.sym(ch_id), RDF('type'), SIOC('Container'));
                    g.add($rdf.sym(ch_id), SIOC('link'), $rdf.sym(ch.uri));
                    g.add($rdf.sym(ch_id), DCT('title'), $rdf.lit(ch.title));
                    // add my WebID if I'm subscribed to this channel
                    if (ch.action === 'Unsubscribe') {
                        // console.log("5.5"); //debug
                        g.add($rdf.sym(ch_id), SIOC('has_subscriber'), $rdf.sym(mywebid));
                    }
                }
            }
            i++;
        }
        // serialize graph
        var t = new $rdf.Serializer(g); //debug
        var s = new $rdf.Serializer(g).toN3(g);
        // PUT the new file on the PDS
        if (s.length > 0) {
            // console.log("s > 0; url: " + followURI); //debug
            $.ajax({
                type: "PUT",
                url: followURI,
                contentType: "text/turtle",
                data: s,
                processData: false,
                xhrFields: {
                    withCredentials: true
                },
                statusCode: {
                    201: function(data) {
                        // console.log("201 Created");
                    },
                    401: function() {
                        // console.log("401 Unauthorized");
                        notify('Error', 'Unauthorized! You need to authenticate before posting.');
                    },
                    403: function() {
                        // console.log("403 Forbidden");
                        notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                    },
                    406: function() {
                        // console.log("406 Content-type unacceptable");
                        notify('Error', 'Content-type unacceptable.');
                    },
                    507: function() {
                        // console.log("507 Insufficient storage");
                        notify('Error', 'Insufficient storage left! Check your server storage.');
                    }
                },
                success: function(d,s,r) {
                    // console.log('Success! Your channel subscription has been updated.');
                    notify('Success', 'Your user and channel subscription has been updated!');
                    //$scope.updatePosts();//testing
                }
            });
        }
    };

    // get list of users (that I'm following) + their channels
    // optionally load posts
    $scope.getUsers = function (loadposts) {
        console.log("get users called");
        // console.log("get subscriptions for " + $scope.userProfile.webid);
        // console.log("space: " + $scope.users[$scope.userProfile.webid].mbspace);
        if ($scope.userProfile.mbspace && $scope.userProfile.mbspace.length > 1) {
            var followURI = $scope.userProfile.mbspace+'following';
    
            var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
            var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
            var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
            var g = $rdf.graph();
            var f = $rdf.fetcher(g, TIMEOUT);
            // add CORS proxy
            $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

            // fetch user data
            f.nowOrWhenFetched(followURI,undefined,function(ok, body){
                var users = g.statementsMatching(undefined, RDF('type'), SIOC('UserAccount'));

                // console.log("listing users: "); //debug
                if (users.length > 0) {
                    for (var i in users) {
                        var u = users[i]['subject'];
                        console.log(users[i]);
                        var _user = {};
                        _user.webid = g.any(u, SIOC('account_of')).value;
                        console.log( g.any(u, SIOC('name')));
                        _user.name = (g.any(u, SIOC('name')))?g.any(u, SIOC('name')).value:'';
                        // console.log(g.any(u, SIOC('avatar')));
                        _user.picture = (g.any(u, SIOC('avatar')))?g.any(u, SIOC('avatar')).value:'assets/generic_photo.png';
                        // console.log("_user.picture: " + _user.picture);
                        // console.log(_user);
                        // console.log("loading user picture for " + _user.webid + ". _user.picture: " + _user.picture); //debug
                        _user.channels = {};
                        // add channels
                        var channels = g.statementsMatching(u, SIOC('feed'), undefined);
                        if (channels.length > 0) {
                            for (var j in channels) {
                                var ch = channels[j]['object'];
                                var _channel = {};
                                _channel.uri = g.any(ch, SIOC('link')).value;
                                _channel.title = (g.any(ch, DCT('title')))?g.any(ch, DCT('title')).value:'Untitled';
                                _channel.author = _user.name; //for subscription
                                // console.log("channel author: " + _channel.author);
                                _channel.owner = _user.webid; //for subscription
                                if (g.any(ch, SIOC('has_subscriber'))) {
                                    // console.log("found channel I'm subscribed to: " + _channel.uri);
                                // subscribed 
                                    _channel.action = 'Unsubscribe';
                                    _channel.button = ch.button = 'fa-check-square-o';
                                    _channel.css = ch.css = 'btn-success';
                                    // also load the posts for this channel
                                    if (loadposts && _channel.uri) {
                                        $scope.getPosts(_channel.uri, _channel.title);
                                    }
                                } else {
                                    _channel.action = ch.action = 'Subscribe';
                                    _channel.button = ch.button = 'fa-square-o';
                                    _channel.css = ch.css = 'btn-info';
                                }
                                // add channel to user objects
                                _user.channels[_channel.uri] = _channel;
                            }
                        }
                        // add user
                        if (!$scope.users) {
                            $scope.users = {};
                        }
                        // console.log("_user"); //debug
                        // console.log(_user); //debug
                        if (_user.webid === $scope.userProfile.webid) {
                            // console.log("got same user as userProfile, _user"); //debug
                            // console.log(_user); //debug
                            // console.log("users[" + _user.webid + "]"); //debug
                            // console.log($scope.users[_user.webid]); //debug
                            // console.log("userProfile"); //debug
                            // console.log($scope.userProfile); //debug
                            $scope.users[$scope.userProfile.webid] = $scope.userProfile;
                            $scope.$apply();
                        }
                        if (_user.webid !== $scope.userProfile.webid) { //do not overwrite our own user
                            //(change later to append because we need to know if we're subscribed or not to our own channel)
                            $scope.users[_user.webid] = _user;
                            // console.log("in $scope.users[" + _user.webid + "], channels are"); //debug
                            for (var chann in $scope.users[_user.webid].channels) {
                                // console.log(_user.channels[chann]); //debug
                                if ($scope.users[_user.webid].channels[chann].action === 'Unsubscribe') {
                                    // console.log("im subscribed to a channel: " + chann); //debug
                                    // console.log($scope.users[_user.webid].channels[chann]); //debug
                                    $scope.userProfile['subscribedChannels'][chann] = _user.channels[chann];
                                    $scope.channels[chann] = _user.channels[chann];
                                    // $scope.users[$scope.userProfile.webid] = $scope.userProfile;

                                }
                            }
                            $scope.$apply();
                        }
                    }
                }
            });
        }
    };

    //not ported properly yet
    // remove a given user from the people I follow
    $scope.removeUser = function (webid) {
        if (webid) {
            // remove user from list
            delete $scope.users[webid];
            // remove posts for that user
            $scope.removePostsByOwner(webid);
            notify('Success', 'The user was been removed.');
            // save new list of users
            $scope.saveUsers();
        }
    };

    // remove all posts from viewer based on the given channel URI
    //as of this point of writing this comment
    //  $scope.users[].channels[].posts is an array, identified by numbered indices
    //  $scope.channels[].posts is an array, identified by numbered indices
    //  $scope.posts is an *object*, identified by post uri indices

    $scope.removePostsByChannel = function(ch, webid) {

        var modified = false;
        // for (var p in $scope.posts) {
        //     if (ch && $scope.posts[p].channel === ch) {
        //         delete $scope.posts[p];
        //         modified = true;
        //     }
        // }
        //
        for (var p in $scope.users[webid].channels[ch].posts) {
            console.log("deleting this: "); //debug
            console.log($scope.posts[$scope.users[webid].channels[ch].posts[p].uri]); //debug
            delete $scope.posts[$scope.users[webid].channels[ch].posts[p].uri];
            console.log("finished"); //debug
        }

        if ($scope.users[webid].channels[ch].posts) {
            console.log("deleting this as well: "); //debug
            for (var r in $scope.users[webid].channels[ch].posts) {
                console.log($scope.users[webid].channels[ch].posts[r]); //debug
            }
            delete $scope.users[webid].channels[ch].posts;
            console.log("finished"); //debug
        }

        // console.log("at removePostsbyChannel, $scope.channels"); //debug
        // console.log($scope.channels); //debug
        // console.log($scope.channels[ch]);
        // console.log("looking 4 ch uri: " + ch); //debug
        if($scope.channels[ch])
        {
            delete $scope.channels[ch];
            modified = true;
        }
    };

    // update the view with new posts
    $scope.updatePosts = function() {
        if ($scope.users[$scope.userProfile.webid] && $scope.users[$scope.userProfile.webid].channels && $scope.users[$scope.userProfile.webid].channels.length > 0) {
            // add my posts
            $scope.loading = true;
            console.log("loading 6: true"); //debug
            for (var c in $scope.users[$scope.userProfile.webid].channels) {
                $scope.getPosts($scope.users[$scope.userProfile.webid].channels[c].uri, $scope.users[$scope.userProfile.webid].channels[c].title);
            }
        }

        // add posts from people I follow
        if ($scope.users) {
            for (var webid in $scope.users) {
                _user = $scope.users[webid];
                for (var i in _user.channels) {
                    var ch = _user.channels[i].uri;
                    if (ch) {
                        $scope.getPosts(ch, _user.channels[i].title);
                    }
                }
            }
        }
    };

    // toggle selected channel for user
    $scope.channelToggle = function(ch, suser) {
        console.log("channelToggle called"); //debug
        console.log("suser: ", suser); //debug
        console.log("$scope.users[" + suser.webid + "] ", $scope.users[suser.webid]); //debug

        console.log($scope.users); //debug
        var user = {};
        console.log(suser);
        if (suser.webid === $scope.userProfile.webid) {
            user.mine = true;
        }
        else {
            user.mine = false;
        }
        user.name = suser.name;
        user.picture = suser.picture;
        user.channels = suser.channels;
        console.log("channeltoggle start: listening search-user's channels"); //debug
        for (var i in suser.channels) {
            console.log("key: " + i); //debug
            console.log(suser.channels[i]); //debug
        }
        console.log("done listing"); //debug

        console.log("listing subscribed channels before channeltoggle"); //debug
        for (var u in $scope.userProfile.subscribedChannels) {
            console.log("key: " + u); //debug
            console.log($scope.userProfile.subscribedChannels[u]); //debug
        }
        console.log("done listing"); //debug

        // we're following this user
        if ($scope.users && $scope.users[suser.webid]) {
            console.log("we have the user saved"); //debug

            var channels = $scope.users[suser.webid].channels;
            console.log("listing var channels"); //debug
            for (var rt in channels) {
                console.log("key: " + rt); //debug
                console.log(channels[rt]); //debug
            }
            console.log("done listing"); //debug
            // console.log($scope.users[suser.webid].channels);
            // console.log(channels);

            // already have the channel
            console.log("checking if we have " + ch.uri + "in channels already"); //debug
            if (channels[ch.uri]) {
                console.log("we do, setting var c equal to it"); //debug
                var c = channels[ch.uri];
                console.log(c); //debug
                // unsubscribe
                if (c.action == 'Unsubscribe') {
                    c.action = ch.action = 'Subscribe';
                    c.button = ch.button = 'fa-square-o';
                    c.css = ch.css = 'btn-info';
                    console.log("channel uri");
                    console.log(ch.uri);
                    $scope.removePostsByChannel(ch.uri, ch.owner);
                    console.log("deleting the following:"); //debug
                    console.log($scope.userProfile.subscribedChannels[ch.uri]); //debug
                    delete $scope.userProfile.subscribedChannels[ch.uri];

                    console.log("listing subscribed channels after unsubscribing in channeltoggle"); //debug
                    for (var uu in $scope.userProfile.subscribedChannels) {
                        console.log("key: " + uu); //debug
                        console.log($scope.userProfile.subscribedChannels[uu]); //debug
                    }
                    console.log("done listing"); //debug

                } else {
                // subscribe
                    c.action = ch.action = 'Unsubscribe';
                    c.button = ch.button = 'fa-check-square-o';
                    c.css = ch.css = 'btn-success';
                    $scope.getPosts(ch.uri, ch.title);
                }
            } else {
                //question: shudnt we add the channel to channels[] list or something since this is the else statement for not having channels[ch.uri]?
                // subscribe
                ch.action = 'Unsubscribe';
                ch.button = 'fa-check-square-o';
                ch.css = 'btn-success';
                $scope.getPosts(ch.uri, ch.title);
            }
            // also update the users list in case there is a new channel
            $scope.users[suser.webid] = user;
            for (var cha in channels) {
                if (channels[cha].action == 'Unsubscribe') {
                    $scope.userProfile.subscribedChannels[cha] = channels[cha];
                }
                console.log("listing subscribed channels after subscribing in channeltoggle"); //debug
                for (var uuu in $scope.userProfile.subscribedChannels) {
                    console.log("key: " + uuu); //debug
                    console.log($scope.userProfile.subscribedChannels[uuu]); //debug
                }
                console.log("done listing"); //debug
            }
            // console.log("saving user"); //debug
            $scope.saveUsers();
        } else {
            // subscribe (also add user + channels)
            ch.action = 'Unsubscribe';
            ch.button = 'fa-check-square-o';
            ch.css = 'btn-success';
            if (!$scope.users) {
                $scope.users = {};
            }
            $scope.users[suser.webid] = user;

            var schans = $scope.users[suser.webid].channels;

            console.log("listing var schans"); //debug
            for (var rtt in schans) {
                console.log("key: " + rtt); //debug
                console.log(schans[rtt]); //debug
            }

            for (var skey in schans) {
                if (schans[skey].action == 'Unsubscribe') {
                    console.log("subscribed, adding key/uri: " + skey + "with channel content: "); //debug
                    console.log(schans[skey]); //debug
                    $scope.userProfile.subscribedChannels[skey] = schans[skey];
                }
                console.log("listing subscribed channels after subscribing in channeltoggle"); //debug
                for (var ut in $scope.userProfile.subscribedChannels) {
                    console.log("key: " + ut); //debug
                    console.log($scope.userProfile.subscribedChannels[ut]); //debug
                }
                console.log("done listing"); //debug
            }
            // console.log("saving user 2"); //debug
            $scope.saveUsers();
            $scope.getPosts(ch.uri, ch.title);
        }
        console.log("listing subscribed channels after channeltoggle"); //debug
        for (var utt in $scope.userProfile.subscribedChannels) {
            console.log("key: " + utt); //debug
            console.log($scope.userProfile.subscribedChannels[utt]); //debug
        }
        console.log("done listing"); //debug
    };

    // lookup a WebID to find channels
    $scope.drawSearchResults = function(webid) {
        $scope.gotresults = true;
        // console.log("at drawSearchResults, webid " + webid + ", $scope.users[" + webid + "] has channels "); //debug
        // for (var y in $scope.users[webid].channels) {
        //     console.log("key: " + y); //debug
        //     console.log($scope.users[webid].channels[y]); //debug
        // }
        // console.log("at drawSearchResults, $scope.search.channels has channels "); //debug
        // for (var yq in $scope.search.channels) {
        //     console.log("key: " + yq); //debug
        //     console.log($scope.search.channels[yq]); //debug
        // }
        $scope.addChannelStyling(webid, $scope.users[webid].channels);
        $scope.searchbtn = 'Search';
        $scope.search.loading = false;
        console.log("search.loading 7: false"); //debug
        ngProgress.complete();
        console.log("ng 5: complete"); //debug
        $scope.$apply();
    };
    
    // add html elements to channels 
    $scope.addChannelStyling = function(webid, channels) {
        // console.log("adding channel styling for " + webid);
        // console.log($scope.users[$scope.userProfile.webid].subscribedChannels);
        // console.log("at addChannelStyling"); //debug
        // console.log("listing channels paramemter"); //debug
        for (var i in channels) {
            // find if we have the channel in our list already
            // console.log("ch key: " + i); //debug
            var ch = channels[i];
            // console.log(ch); //debug
            // check if it's a known user
            if ($scope.users && $scope.users[webid]) {
                // console.log("webid: " + webid); //debug
                // console.log("$scope.users[" + webid + "]"); //debug
                // console.log($scope.users[webid]); //debug

                // for (var k in $scope.users[webid].channels) {
                //     console.log("channel key: " + k); //debug
                //     console.log($scope.users[webid].channels[k]); //debug
                // }

                if ($scope.userProfile.subscribedChannels && 
                    $scope.userProfile.subscribedChannels[ch.uri]) {
                    var sc = $scope.userProfile.subscribedChannels[ch.uri];
                    ch.button = sc.button;
                    ch.css = sc.css;
                    ch.action = sc.action;
                } else {
                    ch.action = 'Subscribe';
                    ch.button = 'fa-square-o';
                    ch.css = 'btn-info';
                }

                // var c = $scope.users[webid].channels[ch.uri];
                // console.log("var c"); //debug
                // console.log(c); //debug
                // console.log("at addChannelStyling, for channel: " + ch.uri); //debug
                // console.log("action: " + c.action + ", css: " + c.css + ", button: " + c.button); //debug

                // set attributes
                // if (ch.uri === c.uri) {
                //     console.log("matching: " + ch.uri);
                //     console.log(ch.css);
                //     console.log(c.css);
                //     // console.log("channels[" + ch.uri + "] exists"); //debug
                //     ch.button = (c.button)?c.button:'fa-square-o';
                //     ch.css = (c.css)?c.css:'btn-info';
                //     ch.action = (c.action)?c.action:'Subscribe';
                // } else {
                //     // console.log("channels[" + ch.uri + "] doesn't exist"); //debug
                //     c.action = ch.action = 'Subscribe';
                //     c.button = ch.button = 'fa-square-o';
                //     c.css = ch.css = 'btn-info';
                // }
                //console.log("channel ch again"); //debug
                //console.log(ch); //debug
                //ch.ret = "wwoo"; //debug
                //console.log("test: " + $scope.users[webid].channels[ch.uri].ret); //debug
            } else {
                if (!ch.button) {
                    ch.button = 'fa-square-o';
                }
                if (!ch.css) {
                    ch.css = 'btn-info';
                }
                if (!ch.action) {
                    ch.action = 'Subscribe';
                }
            }
        }
        // ngProgress.complete();
        // console.log("progress bar complete");
    };

    $scope.flattenObject = function (obj) {
        flatList = [];
        for (var i in obj) {
            flatList.push(obj[i]);
        }
        return flatList;
    };


    $scope.$on("$locationChangeStart", function(event, next, current) {        
        if (!$scope.loggedin) {
            $location.path("/login");
        }  
    });

    // initialize by retrieving user info from sessionStorage
    $scope.loadCredentials();

    // angular.element($window).on('load', function() {
    //     console.log("window load");
    //     // $scope.loadCredentials();
    //     // if ($scope.userProfile.webid) {
    //     //     $scope.loadChannels[$scope.userProfile.webid] = $scope.userProfile.webid;
    //     //     $scope.getInfo($scope.userProfile.webid, true, false);
    //     // }
    // });

})

.factory('noticesData', function($rootScope, $timeout){
    var obj = {};
    obj.add = function(type, text){        
        var nId = obj.count;
        obj.count = (obj.count + 1) % 100;
        $rootScope.notices.push({id: nId, type:type, text:text});
        $timeout(function(){
            obj.close(nId);
        },3000);
    };
    obj.close = function(nId){
        angular.forEach($rootScope.notices, function(notice, key){
            if(notice.id == nId){
                $rootScope.notices.splice(key,1);
            }
        });
    };
    obj.count = 0;

    return obj; 
})

.directive('errSrc', function() {
    return {
        link: function(scope, element, attrs) {
            element.bind('error', function() {
                element.attr('src', attrs.errSrc);
            });
        }
    };
});
