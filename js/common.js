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
