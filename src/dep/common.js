// parse an uri and get the hostname
function getHostname(uri) {
    var l = document.createElement("a");
    l.href = uri;
    return l.hostname;
}

// count number of properties in an object
function objLength(obj) {
	return Object.keys(obj).length;
}

// Logout WebID 
function logout() {
   if (document.all == null) {
      if (window.crypto) {
          try{
              window.crypto.logout();
              return false; //firefox ok -- no need to follow the link
          } catch (err) {//Safari, Opera, Chrome -- try with tis session breaking
          }
      } else { //also try with session breaking
      }
   } else { // MSIE 6+
      document.execCommand('ClearAuthenticationCache');
      return false;
   }
   return true;
}

// check if object is empty
function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop)) {
			return false;
		}
	}
	return true;
}
// test if string is in English or not
testIfAllEnglish = function (str) {
	str = str.replace(/\s+/g, '');
	var english = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}':"\\|,.<>\/?]*$/;
	if(english.test(str)) {
		return true;
	}
	else {
		return false;
	}
};

// get the base name of a path (e.g. filename)
// basename('/root/dir1/file') -> 'file'
basename = function(path) {
    if (path.substring(path.length - 1) == '/') {
        path = path.substring(0, path.length - 1);
    }

    var a = path.split('/');
    return a[a.length - 1];
};

// Notifications
function notify(title, text) {
    $("#notification").notify();
    $("#notification").notify("create", 0, {
        title: title,
        text: text
    });
}
// search an array of objects based on the value of an object's attribute
function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
}

// find object property value
function findItemByValue(obj, prop, val) {
	var ret = obj.filter(function(item) {
		return (item[prop] === val);
	});
	return ret[0];
}
// Resize message textarea
function textareaResize(o) { 
    o.style.height = "100px";
}

// Resize element
function autoResize(id){
	var newheight;
	var newwidth;

	if (document.getElementById) {
		newheight=document.getElementById(id).contentWindow.document .body.scrollHeight;
		newwidth=document.getElementById(id).contentWindow.document .body.scrollWidth;
	}

	document.getElementById(id).height= (newheight) + "px";
	document.getElementById(id).width= (newwidth) + "px";
}


function unquote(value) {
    if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') {
		return value.substring(1, value.length - 1);
    }
    return value;
}
// parse a Link header
function parseLinkHeader(header) {
	var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
	var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

	var matches = header.match(linkexp);
	var rels = {};
	for (i = 0; i < matches.length; i++) {
		var split = matches[i].split('>');
		var href = split[0].substring(1);
		var ps = split[1];
		var link = {};
		link.href = href;
		var s = ps.match(paramexp);
		for (j = 0; j < s.length; j++) {
			var p = s[j];
			var paramsplit = p.split('=');
			var name = paramsplit[0];
			link[name] = unquote(paramsplit[1]);
		}

		if (link.rel !== undefined) {
			rels[link.rel] = link;
		}
	}   
    
    return rels;
}

var debugConsole = function (debug, msg) {
	if (debug) {
		console.log(msg);
	}
};