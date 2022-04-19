function login_display(){
    var x = document.getElementByID("loginprompt");
    if (x.display == "none") {
        x.display = "block";
    } else {
        x.display = "none";
    }
}