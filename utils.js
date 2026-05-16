import {Image} from 'ol/layer';
import {url, map} from './app.js';


// Agrego métodos al prototype de capas para obtener/setear capa activa
Image.prototype.setActive = function(active) {
    return this.values_.active = active;
};

Image.prototype.getActive = function() {
    return this.values_.active;
};

// Funcion que busca una capa por propiedad dada
export var findLayerBy = function(property, value) {
    return map.getLayers().array_.find(function(element) {
        return element.getProperties()[property] === value;
    });
};

// Funcion que habilita/deshabilita una capa con el nombre dado
export var toggleLayerVisibility = function(layer_name) {
    let layer = findLayerBy('name', layer_name);

    layer.setVisible(!layer.getVisible());
    return layer.getVisible();
};

// Funcion que cambia la capa activa
export var toggleLayerActivity = function(layer_name) {
    // Primero desactivo la que esté activada
    findLayerBy('active', true).setActive(false);
    let layer = findLayerBy('name', layer_name);

    return layer.setActive(!layer.getActive());
};

// Funcion que formatea un poligono a WKT
export var wktFormat = function(coordinates) {
    let wkt = 'POLYGON((';

    for (let i = 0; i < coordinates[0].length - 1; i++) {
        wkt += coordinates[0][i][0] + ' ' + coordinates[0][i][1] + ',';
    }

    wkt += coordinates[0][0][0] + ' ' + coordinates[0][0][1]+'))';

    return wkt;
};

// Función que habilita/deshabilita legenda de una capa
export var toggleLegend = function(layer_name) {
    let url_legend = url + `&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${layer_name}`;
    $('#layer-legend').attr('src', url_legend);
};