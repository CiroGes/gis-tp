// SCRIPT que crea el mapa y sus capas
//
// URL del servicio
var url = 'http://osgeolive/cgi-bin/qgis_mapserv.fcgi?map=/home/user/Desktop/TP Integrador/tp-integrador.qgz'

// Array que contiene todas las capas del servidor WMS
var layers_op = [];

// Instancia de Open Layers
var map;

fetch(url + '&SERVICE=WMS&REQUEST=GetCapabilities')
.then(response => response.text())
.then(function(data) {
    let layers = new ol.format.WMSCapabilities().read(data).Capability.Layer.Layer;

    $.each(layers, function(index, value) {
        layers_op.push(
            new ol.layer.Image({
                title: value.Title,
                //capa desactivada por defecto
                visible: false,
                source: new ol.source.ImageWMS({
                    url: url,
                    params: {
                        LAYERS: value.Name
                    }
                })
            })
        );
    });

    // definicion del mapa y su capa
    map = new ol.Map({
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

    let zoom_ctrl = $('.ol-zoom');

    zoom_ctrl.css('bottom', zoom_ctrl.css('top')).css('right', zoom_ctrl.css('left'));
    zoom_ctrl.css('top', 'unset').css('left', 'unset');
});