

window.onload = function() {
    createAlert("Hello World");
    var map = L.map('map',{
        center: [-34.98322204585383, 138.5783569753705],
        zoom:   15    
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function createAlert(msg,acceptText = null,rejectText = null,acceptCallback = null, rejectCallback = null){
    //set the alert message
    alertMsg.innerHtml = msg;

    //set accept text - default to Ok
    if(acceptText != null){
        alertAccept.innerHtml = acceptText;
    }else{
        alertAccept.innerHtml = "Ok";
    }

    //set accept callback
    if(acceptCallback != null){
        alertAccept.addEventListener("click",()=>{
            acceptCallback();
            closeAlert();
        });
    }else{
        alertAccept.addEventListener("click",()=>{
            closeAlert();
        });
    }

    //reject button - not neccessarily always visible
    if(rejectCallback != null || rejectText != null){
        //set the reject button text
        if(rejectText != null){
            alertReject.innerHtml = rejectText;
        }else{
            alertReject.innerHtml = "Cancel";
        }
        //show the reject button
        alertReject.style.display = "";
        //set the reject button callback
        if(rejectCallback != null){
            alertReject.addEventListener("click",()=>{
                rejectCallback();
                closeAlert();
            });
        }else{
            alertReject.addEventListener("click",()=>{
                closeAlert();
            });
        }
    }

    //show the alert container
    alertContainer.style.display = "";
}
function closeAlert(){
    alertContainer.style.display = "none";
    alertAccept.removeEventListener("click");
    alertReject.removeEventListener("click");
    alertAccept.innerHtml = "";
    alertReject.innerHtml = "";
    alertReject.style.display = "none";
}
