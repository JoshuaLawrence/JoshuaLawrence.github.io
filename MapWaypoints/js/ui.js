

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
    alertMsg.innerText = msg;

    //set accept text - default to Ok
    if(acceptText != null){
        alertAccept.innerText = acceptText;
    }else{
        alertAccept.innerText = "Ok";
    }

    //set accept callback
    if(acceptCallback != null){
        alertAccept.onclick = () => {
            acceptCallback();
            closeAlert();
        };
    }else{
        alertAccept.onclick = () => {
            closeAlert();
        };
    }

    //reject button - not neccessarily always visible
    if(rejectCallback != null || rejectText != null){
        //set the reject button text
        if(rejectText != null){
            alertReject.innerText = rejectText;
        }else{
            alertReject.innerText = "Cancel";
        }
        //show the reject button
        alertReject.style.display = "";
        //set the reject button callback
        if(rejectCallback != null){
            alertReject.onclick = () => {
                rejectCallback();
                closeAlert();
            };
        }else{
            alertReject.onclick = () => {
                closeAlert();
            };
        }
    }

    //show the alert container
    alertContainer.style.display = "";
}
function closeAlert(){
    alertContainer.style.display = "none";
    alertAccept.onclick = "";
    alertReject.onclick = "";
    alertAccept.innerHtml = "";
    alertReject.innerHtml = "";
    alertReject.style.display = "none";
}
