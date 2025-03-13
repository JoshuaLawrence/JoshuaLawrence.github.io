var map = null;

window.onload = async function() {
    
    await registerServiceWorker();

    //check online status and set event listeners
    if(navigator.onLine){
        internetActiveIndicator.innerText = "Online";
    }else{
        internetActiveIndicator.innerText = "Offline";
    }
    window.addEventListener("offline", (e) => {
        internetActiveIndicator.innerText = "Offline";
    });
    window.addEventListener("online", (e) => {
        internetActiveIndicator.innerText = "Online";
    });

    createAlert("Hello World");
    map = L.map('map',{
        center: [-34.98322204585383, 138.5783569753705],
        zoom:   15    
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

//service worker
const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("/MapWaypoints/sw.js", {
                scope: "/MapWaypoints/",
            });
            if (registration.installing) {
                console.log("Service worker installing");
            } else if (registration.waiting) {
                console.log("Service worker installed");
            } else if (registration.active) {
                console.log("Service worker active");
            }
        } catch (error) {
            console.error(`Registration failed with ${error}`);
        }
    }
};
  

let alertQueue = [];
function createAlert(msg,acceptText = null,rejectText = null,acceptCallback = null, rejectCallback = null){
    //add to alert queue if alert box is already open
    if(alertContainer.style.display != "none"){
        alertQueue.push([msg,acceptText,rejectText,acceptCallback,rejectCallback]);
        return;
    }

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
    //show the next queued alert
    if(alertQueue.length > 0){
        let alertParams = alertQueue.shift();
        setTimeout(()=>{
            createAlert(...alertParams);
        },500);
    }
}
