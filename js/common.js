// Notifications
function notify(title, text) {
    $("#notification").notify();
    $("#notification").notify("create", 0, {
        title: title,
        text: text
    });
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
    if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
    return value;
}
// parse a Link header
function parseLinkHeader(header) {
   	var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
	var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

	var matches = header.match(linkexp);
	var rels = new Object();
	for (i = 0; i < matches.length; i++) {
		var split = matches[i].split('>');
		var href = split[0].substring(1);
		var ps = split[1];
		var link = new Object();
		link.href = href;
		var s = ps.match(paramexp);
		for (j = 0; j < s.length; j++) {
			var p = s[j];
			var paramsplit = p.split('=');
			var name = paramsplit[0];
			link[name] = unquote(paramsplit[1]);
		}

		if (link.rel != undefined) {
			rels[link.rel] = link;
		}
	}   
    
    return rels;
}