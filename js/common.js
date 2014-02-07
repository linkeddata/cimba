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