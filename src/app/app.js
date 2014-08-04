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

    $scope.channels = {};
    $scope.posts = {}; //aggregate list of all posts (flat list)
    $scope.search = {};
    $scope.loadChannels = {};
    $scope.loadSubscriptions = {}; 
    $scope.newChannelModal = false;    
    $rootScope.notices = [];
    $scope.postData = {};
    $scope.defaultChannel = {};
    
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
        noticesData.add("error", "helloworld http://google.com");
    };

    $scope.cancelTimeout = function (timeout) {
        // console.log("timeout executed");
        $timeout.cancel(timeout);
    };

    $scope.isEmpty = function (obj) {
        console.log('empty called');
        return angular.equals({}, obj);
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
        for (var ch in $scope.userProfile.channels) {
            delete $scope.userProfile.channels[ch].posts;
        }
        cimba.userProfile = $scope.userProfile;
        sessionStorage.setItem($scope.appuri, JSON.stringify(cimba));
    };

    // retrieve from sessionStorage
    $scope.loadCredentials = function () {        
        if (sessionStorage.getItem($scope.appuri)) {
            var cimba = JSON.parse(sessionStorage.getItem($scope.appuri));
            if (cimba.userProfile) {
                if (!$scope.userProfile) {
                    $scope.userProfile = {};                    
                }

                $scope.userProfile = cimba.userProfile;
                $scope.loggedin = true;                

                if ($scope.userProfile.channels && !$scope.defaultChannel) {
                    for (var w in $scope.userProfile.channels) {
                        $scope.defaultChannel = $scope.userProfile.channels[w];
                        break;
                    }
                }

                if ($scope.userProfile.mbspace && (!$scope.users || Object.keys($scope.users).length === 0)) {                                        
                    $scope.getUsers();
                }
                // refresh data
                $scope.getInfo(cimba.userProfile.webid, true);                
            } else {
                // clear sessionStorage in case there was a change to the data structure
                sessionStorage.removeItem($scope.appuri);                
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

        if (mine) {
            $scope.loading = true;
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
            if (!ok) {
                if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                  notify('Warning', 'WebID profile not found.');
                  $scope.found = false;
                  $scope.searchbtn = 'Search';
                  // reset progress bar
                  ngProgress.complete();
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
            } else {
                if (depic) {
                    pic = depic.value;
                } else {
                    pic = 'assets/generic_photo.png';
                }
            }

            // add to search object if it was the object of a search
            if ($scope.search && $scope.search.webid && $scope.search.webid === webid) {
                $scope.search.name = name;
                $scope.search.picture = pic;
            }

            if (!$scope.users[webid]) {
                $scope.users[webid] = {};
            }
            

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
                $scope.users[webid].name = name;
                $scope.users[webid].picture = pic;
                $scope.users[webid].storagespace = storage;
                $scope.users[webid].mine = mine;
                
                //but it's nice to have just in case
                if (!$scope.userProfile.subscribedChannels) {
                    $scope.userProfile.subscribedChannels = {};
                }
                if (!$scope.userProfile.channels) {
                    $scope.userProfile.channels = {};
                }

                // find microblogging feeds/channels
                if (!storage) {
                    $scope.loading = false; // hide spinner
                }

                // cache user credentials in sessionStorage
                $scope.saveCredentials();

                // update DOM
                $scope.loggedin = true;
                $scope.profileloading = false;

                $scope.$apply();
            }

            // Load Channels 
            if ($scope.loadChannels[webid]) {                
                $scope.getChannels(storage, webid, mine, update, false);                
                $scope.$apply();
            } else {
                ngProgress.complete();
                $scope.loading = false;
            }

            $scope.getInfoDone = true;
        });
    };

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
        if ( angular.isDefined( toState.data.pageTitle ) ) {
            $scope.pageTitle = toState.data.pageTitle + ' | Cimba' ;
        }
    });

    // returns the channel object for 
    $scope.getChannel = function (uri) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        $scope.loading = true;

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
                
                ownerObj = g.any(chs[0]['subject'], SIOC('has_creator'));
                if (g.any(ownerObj, SIOC('account_of'))) {
                    channel["owner"] = g.any(ownerObj, SIOC('account_of')).value;                                        
                } else if ($scope.userProfile.channels && 
                    $scope.userProfile.channels[channel.uri]) {
                    channel["owner"] = $scope.userProfile.webid;
                }               
               
                $scope.$apply();
                $scope.getPosts(channel.uri, channel.title);
            }            
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
                if (!$scope.users[webid]) {
                    $scope.users[webid] = {};
                }
                if (mine && !$scope.users[webid].mbspace) {
                    // set default Microblog space                    
                    $scope.users[webid].mbspace = ws[0]['subject']['value'];
                    $scope.userProfile.mbspace = ws[0]['subject']['value'];
                    $scope.getUsers(true); // get the list of people I'm following + channels + posts
                }

                var func = function() {
                    var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));

                    if (chs.length > 0) {
                        if (!$scope.channels) {
                            $scope.channels = {};
                        }
                        if (!$scope.users[webid].channels) {
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
                                channel['title'] = channel.uri;
                            }

                            channel["owner"] = webid;
                            channel["author"] = webid; //default
                            if ($scope.users[webid]) {
                                channel["author"] = $scope.users[webid].name;
                            }
                            var authorlink = g.any(chs[ch]['subject'], SIOC('has_creator'));
                            
                            var author = g.any(authorlink, FOAF('name'));
                            
                            if (author) {
                                channel["author"] = author.value;
                            }
                            
                            if (!$scope.channels[channel.uri]) {
                                $scope.channels[channel.uri] = channel;
                            }
                            
                            if ($scope.users[webid].channels && !$scope.users[webid].channels[channel.uri]) {
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
                                $scope.users[webid].chspace = true;
                                $scope.$apply();
                            }
                        }

                        // set a default channel for the logged user
                        if (mine) {
                            $scope.userProfile.channel_size = Object.keys($scope.userProfile.channels).length; //not supported in IE8 and below
                            if (isEmpty($scope.defaultChannel)) {
                                for (var u in $scope.userProfile.channels) {                                
                                    $scope.defaultChannel = $scope.userProfile.channels[u];                                    
                                    $scope.$apply();                                   
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
                        if (mine) {
                            // hide loader
                            $scope.loading = false;
                            $scope.users[webid].chspace = false;
                        }
                    }

                    if ($scope.loadChannels[webid]) {                        
                        delete $scope.loadChannels[webid];
                        $scope.addChannelStyling(webid, $scope.users[webid].channels);
                        ngProgress.complete();                        
                        $scope.$apply();
                    } 
                    if (mine) {
                        $scope.loading = false;
                        $scope.saveCredentials();
                        $scope.$apply();
                    }                    
                };

                for (var i in ws) {
                    w = ws[i]['subject']['value'];

                    // find the channels info for the user (from .meta files)
                    f.nowOrWhenFetched(w+'.*', undefined,func);
                }

            } else { // no Microblogging workspaces found!

                if ($scope.loadChannels[webid]) {
                    delete $scope.loadChannels[webid];
                    ngProgress.complete();
                    
                    $scope.$apply();
                }

                if (mine) {
                    $scope.gotmb = false;
                    $scope.users[webid].mbspace = false;
                    $scope.users[webid].chspace = false;
                    $scope.users[webid].channels = {};
                    $scope.saveCredentials();

                    // hide loader
                    $scope.loading = false;

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
                        userpic = $scope.users[userwebid].picture;
                    }
                    else if (g.any(useraccount, SIOC('avatar'))) {
                        userpic = g.any(useraccount, SIOC('avatar')).value;
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
                        $scope.$apply();
                    } else {
                        $scope.posts[uri] = _newPost;
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
            ngProgress.complete(); 
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
            }).success(function(data) {
                console.log("success");
                $scope.webidresults = [];
                angular.forEach(data, function(value, key) {                    
                    value.webid = key;
                    if (!value.img) {                        
                        value.img = ['assets/generic_photo.png'];
                    }
                    value.host = getHostname(key);
                    $scope.webidresults.push(value);
                });
                return $scope.webidresults;
            }).error(function(data, status) {
                console.log("error");
                $scope.webidresults = [];
                $scope.search.selected = true;
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
    $scope.saveUsers = function (sch) {
        // save to PDS
        // TODO: try to discover the followURI instead?
        var channels = {}; // temporary channel list (will load posts from them once this is done)
        var followURI = ''; // uri of the preferences file
        var mywebid = $scope.userProfile.webid;
        var _users = {};

        angular.forEach($scope.userProfile.subscribedChannels, function(value, key) {
            var u;
            if ( !_users[value.owner]) {
                u = {};
                u.name = $scope.users[value.owner].name;
                u.picture = $scope.users[value.owner].picture;
                u.channels = [];
                _users[value.owner] = u;
            } else {
                u = _users[value.owner];
            }           
            u.channels.push(value); 
        });

        if ($scope.users[mywebid].mbspace && $scope.users[mywebid].mbspace.length > 1) {
            followURI = $scope.users[mywebid].mbspace+'following';
        }

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var g = $rdf.graph();

        // add triplets
        g.add($rdf.sym(followURI), RDF('type'), SIOC('Usergroup'));        
        g.add($rdf.sym(followURI), DCT('created'), $rdf.lit(Date.now(), '', $rdf.Symbol.prototype.XSDdateTime));
        
        var i = 0;
        for (var userId in _users) {       
            var user = _users[userId];
            var uid = followURI+'#user_'+i;

            g.add($rdf.sym(followURI), SIOC('has_member'), $rdf.sym(uid));
            g.add($rdf.sym(uid), RDF('type'), SIOC('UserAccount'));
            g.add($rdf.sym(uid), SIOC('account_of'), $rdf.sym(userId));
            g.add($rdf.sym(uid), SIOC('name'), $rdf.lit(user.name));
            g.add($rdf.sym(uid), SIOC('avatar'), $rdf.sym(user.picture));
            
            var j = 0;
            for (var ind in user.channels) {
                var ch = user.channels[ind];
                var ch_id = followURI+'#channel_'+ i + "_" + j;

                // add the channel reference back to the user
                g.add($rdf.sym(uid), SIOC('feed'), $rdf.sym(ch_id));
                // add channel details
                g.add($rdf.sym(ch_id), RDF('type'), SIOC('Container'));
                g.add($rdf.sym(ch_id), SIOC('link'), $rdf.sym(ch.uri));
                g.add($rdf.sym(ch_id), DCT('title'), $rdf.lit(ch.title));
                // add my WebID if I'm subscribed to this channel
                if (ch.action === 'Unsubscribe') {
                    g.add($rdf.sym(ch_id), SIOC('has_subscriber'), $rdf.sym(mywebid));
                }
                j++;
            }
            i++;
        }

        // serialize graph        
        var s = new $rdf.Serializer(g).toN3(g);
        // PUT the new file on the PDS
        if (s.length > 0) {
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
                    },
                    401: function() {
                        notify('Error', 'Unauthorized! You need to authenticate before posting.');
                    },
                    403: function() {
                        notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                    },
                    406: function() {
                        notify('Error', 'Content-type unacceptable.');
                    },
                    507: function() {
                        notify('Error', 'Insufficient storage left! Check your server storage.');
                    }
                },
                success: function(d,s,r) {
                    notify('Success', 'Your user and channel subscription has been updated!');
                    sch.enabled = true; //reenable disabled subscribed buttons
                }
            });
        }
    };

    // get list of users (that I'm following) + their channels
    // optionally load posts
    $scope.getUsers = function (loadposts) {
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
                if (ok) {
                    var users = g.statementsMatching(undefined, RDF('type'), SIOC('UserAccount'));

                    // console.log("listing users: "); //debug
                    if (users.length > 0) {
                        for (var i in users) {
                            var u = users[i]['subject'];
                            var _user = {};
                            _user.webid = g.any(u, SIOC('account_of')).value;
                            _user.name = (g.any(u, SIOC('name')))?g.any(u, SIOC('name')).value:'';
                            _user.picture = (g.any(u, SIOC('avatar')))?g.any(u, SIOC('avatar')).value:'assets/generic_photo.png';
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
                                    _channel.owner = _user.webid; //for subscription
                                    if (g.any(ch, SIOC('has_subscriber'))) {
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

                            if (_user.webid === $scope.userProfile.webid) {
                                $scope.users[$scope.userProfile.webid] = $scope.userProfile;
                                $scope.$apply();
                            }
                            if (_user.webid !== $scope.userProfile.webid) { //do not overwrite our own user
                                //(change later to append because we need to know if we're subscribed or not to our own channel)
                                $scope.users[_user.webid] = _user;
                                
                                for (var chann in $scope.users[_user.webid].channels) {
                                    if ($scope.users[_user.webid].channels[chann].action === 'Unsubscribe') {
                                        $scope.userProfile['subscribedChannels'][chann] = _user.channels[chann];
                                        $scope.channels[chann] = _user.channels[chann];
                                    }
                                }
                                $scope.$apply();
                            }
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
    $scope.removePostsByChannel = function(ch, webid) {

        var modified = false;

        for (var p in $scope.users[webid].channels[ch].posts) {
            delete $scope.posts[$scope.users[webid].channels[ch].posts[p].uri];
        }

        if ($scope.users[webid].channels[ch].posts) {
            delete $scope.users[webid].channels[ch].posts;
        }

        if($scope.channels[ch])
        {
            delete $scope.channels[ch];
            modified = true;
        }
    };

    // update the view with new posts
    $scope.updatePosts = function() {
        if ($scope.userProfile.channels && Object.keys($scope.userProfile.channels).length > 0) {
            // add my posts
            $scope.loading = true;            
            for (var c in $scope.userProfile.channels) {
                $scope.getPosts($scope.userProfile.channels[c].uri, $scope.userProfile.channels[c].title);
            }
        }

        // add posts from people I follow
        for (var sch in $scope.userProfile.subscribedChannels) {
            $scope.getPosts(sch, $scope.userProfile.subscribedChannels[sch].title);
        }
    };

    // toggle selected channel for user
    $scope.channelToggle = function(ch) {
        ch.enabled = false; //disable the button to prevent asynchronous actions
        if (ch.action === 'Unsubscribe') {
            // we are following this channel
            // set properties
            ch.action = 'Subscribe';
            ch.button = 'fa-square-o';
            ch.css = 'btn-info';

            $scope.loading = true; //test
            // remove the channel
            $scope.removePostsByChannel(ch.uri, ch.owner);
            delete $scope.userProfile.subscribedChannels[ch.uri];

            $scope.loading = false; //test
        } else {
            // we are not following this channel
            // subscribe to the channel
            ch.action = 'Unsubscribe';
            ch.button = 'fa-check-square-o';
            ch.css = 'btn-success';
            $scope.userProfile.subscribedChannels[ch.uri] = ch;
            $scope.getPosts(ch.uri, ch.title);
        }

        $scope.saveCredentials();
        $scope.saveUsers(ch);        
    };

    // lookup a WebID to find channels
    $scope.drawSearchResults = function(webid) {
        $scope.gotresults = true;

        $scope.addChannelStyling(webid, $scope.users[webid].channels);
        $scope.searchbtn = 'Search';
        $scope.search.loading = false;
        
        ngProgress.complete();
        
        $scope.$apply();
    };
    
    // add html elements to channels 
    $scope.addChannelStyling = function(webid, channels) {

        for (var i in channels) {
            // find if we have the channel in our list already
            var ch = channels[i];

            // check if it's a known user
            if ($scope.users && $scope.users[webid]) {
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
    };

    $scope.flattenObject = function (obj) {
        flatList = [];
        for (var i in obj) {
            flatList.push(obj[i]);
        }
        return flatList;
    };

    $scope.goPath = function (path) {
        $location.path(path);
    };


    $scope.$on("$locationChangeStart", function(event, next, current) {        
        if (!$scope.loggedin) {
            $location.path("/login");
        }  
    });

    // initialize by retrieving user info from sessionStorage
    $scope.loadCredentials();

})

.factory('noticesData', function($rootScope, $timeout){
    var obj = {};    
    obj.add = function(type, text){        
        var nId = obj.count;
        obj.count = (obj.count + 1) % 100;
        var notice = {id: nId, type:type, text:text};
        notice.timeout = $timeout(function(){
            obj.close(nId);
        }, 5000);
        $rootScope.notices.push(notice);
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
