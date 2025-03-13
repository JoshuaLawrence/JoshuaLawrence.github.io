

window.onload = function() {
    var map = L.map('map',{
        center: [-34.98322204585383, 138.5783569753705],
        zoom:   15    
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}