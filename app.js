// SCRIPT que crea el mapa y sus capas
//
// URL del servicio
var url = 'http://osgeolive/cgi-bin/qgis_mapserv.fcgi?map=/home/user/Desktop/TP Integrador/tp-integrador.qgz';

// Array que contiene todas las capas del servidor WMS
var layers_op = [];

// Instancia de Open Layers
var map;

// async IIFE que construye la instancia del mapa y demás hierbas
(async function() {
    map = await fetch(url + '&SERVICE=WMS&REQUEST=GetCapabilities')
    .then(response => response.text())
    .then(data => {
        let layers = new ol.format.WMSCapabilities().read(data).Capability.Layer.Layer;

        for (let layer of layers) {
            layers_op.push(
                new ol.layer.Image({
                    title: layer.Title,
                    //capa desactivada por defecto
                    visible: false,
                    source: new ol.source.ImageWMS({
                        url: url,
                        params: {
                            LAYERS: layer.Name
                        }
                    })
                })
            );
        }

        // definicion del mapa y su capa
        return new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    title: "Natural Earth Base Map",
                    source: new ol.source.TileWMS({
                        url: 'http://demo.boundlessgeo.com/geoserver/wms',
                        params: {'LAYERS': 'ne:ne'}
                    })
                })
            ].concat(layers_op),
            view: new ol.View({
                projection: 'EPSG:4326',
                center: [-59, -27.5],
                zoom: 6
            })
        });
    }); // End fetch

    let zoom_ctrl = $('.ol-zoom');

    zoom_ctrl.css('bottom', zoom_ctrl.css('top')).css('right', zoom_ctrl.css('left'));
    zoom_ctrl.css('top', 'unset').css('left', 'unset');
})();
