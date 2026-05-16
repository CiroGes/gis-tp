import 'babel-polyfill';
import 'ol/ol.css';
import './import-jquery.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';

import {Map, View, Overlay} from 'ol';
import {Image, Tile as TileLayer} from 'ol/layer';
import {OSM, ImageWMS} from 'ol/source';
import {defaults as defaultControls, ScaleLine} from 'ol/control';
import {Style, Stroke} from 'ol/style';
import WMSCapabilities from 'ol/format/WMSCapabilities';
import {toStringHDMS} from 'ol/coordinate';
import {toLonLat} from 'ol/proj';
import DragBox from 'ol/interaction/DragBox';
import {always} from 'ol/events/condition';

import {pointerMoveHandler, createHelpTooltip, helpTooltipElement} from './measure.js';
import {findLayerBy, toggleLayerVisibility, toggleLayerActivity, wktFormat, toggleLegend} from './utils.js'

import {draw_element, addDrawInteraction, vector_draw} from './draw.js';
import {draw, addInteraction, vector} from './measure.js';


// URL del servicio
export var url = 'http://osgeolive/cgi-bin/qgis_mapserv.fcgi?map=/home/user/Desktop/TP Integrador/tp-integrador.qgz';

// Array que contiene todas las capas del servidor WMS
// var layers_ol = [];

// Instancia de Open Layers
export var map;

// View del mapa
var view;

// Capa de prueba
var red_vial;

// Varbiales relacionadas al popup
var container, content, closer, overlay;

// XML parseado
var xml;


/**
 * Create an overlay to anchor the popup to the map.
 */
overlay = new Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

// Definición de barra de escala
let scale_line_ctrl = new ScaleLine();
scale_line_ctrl.setUnits('metric');

map = new Map({
    controls: defaultControls().extend([
        scale_line_ctrl
    ]),
    target: 'map',
    layers: [
        new TileLayer({
            title: 'OpenStreetMap Layer',
            name: 'osm_layer',
            visible: true,
            active: false,
            source: new OSM()
        })
    ],
    overlays: [overlay],
    view: view = new View({
        projection: 'EPSG:4326',
        center: [-59, -27.5],
        zoom: 6
    })
});


// async IIFE que construye la instancia del mapa y demás hierbas
(async function() {
    
    await fetch(url + '&SERVICE=WMS&REQUEST=GetCapabilities')
    .then(response => response.text())
    .then(data => {
        let layers = new WMSCapabilities().read(data).Capability.Layer.Layer;

        for (let layer of layers) {
            map.addLayer(
                new Image({
                    title: layer.Title,
                    name: layer.Name,
                    visible: false,
                    active: false,
                    source: new ImageWMS({
                        url: url,
                        crossOrigin: 'anonymous',
                        params: {
                            LAYERS: layer.Name
                        }
                    })
                })
            );
        }

        // Agrego capa para dibujar medidas
        map.addLayer(vector);

        // Agrego capa para mostrar eltos a agregar
        map.addLayer(vector_draw);

        /**
         * Elements that make up the popup.
         */
        container = document.getElementById('popup');
        content = $('#popup-content');
        closer = document.getElementById('popup-closer');

        /**
         * Add a click handler to hide the popup.
         * @return {boolean} Don't follow the href.
         */
        closer.onclick = function() {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };

        // Capa de prueba
        red_vial = findLayerBy('name', 'red_vial');
        red_vial.setVisible(true);
        red_vial.setActive(true);
    }); // End fetch


    // Carga de capas en listado
    for (let layer of map.getLayers().array_) {
        let layer_title = layer.getProperties().title;
        let layer_name = layer.getProperties().name;
        let checked = (layer.getVisible()) ? 'checked' : '';

        $('#layers-list').append(
            `<li class="list-group-item row" style="margin-left: 0px; margin-right: 0px;">
                <a href="#" id="${layer_name}" class="list-group-item layer-item col-md-10" style="border: 0; padding: 0;">
                    ${layer_title}
                </a>
                <div class="checkbox checbox-switch switch-primary col-md-2" style="margin-top: 0px; margin-bottom: 0px;">
                    <label>
                        <input type="checkbox" value="${layer_name}" class="layer-checkbox" ${checked}/>
                        <span></span>
                    </label>
                </div>
            </li>`
        );
    }

    // Marco la capa Red Vial como activa en la lista
    $('#layers-list a#red_vial').addClass('active').parent('li').addClass('active');

    // Evento que llama a función que maneja el movimiento del puntero
    map.on('pointermove', pointerMoveHandler);

    // Llamo a la función para que no de error la primera vez
    createHelpTooltip();

    // Evento que destruye el tooltip cuando el mouse sale del mapa
    map.getViewport().addEventListener('mouseout', function() {
        helpTooltipElement.classList.add('hidden');
    });

    map.on('singleclick', function(event) {
        if (!$('#nav-ctrl').parent().hasClass('active')) {
            return;
        }

        let coordinate = event.coordinate;
        let view_resolution = (view.getResolution());

        var hdms = toStringHDMS(toLonLat(coordinate, 'EPSG:4326'));

        content.html(`<p>Haz clickeado aquí:</p><code>${hdms}</code><br>`);

        let url = findLayerBy('active', true).getSource().getGetFeatureInfoUrl(
            coordinate,
            view_resolution,
            'EPSG:4326',
            {
                'INFO_FORMAT': 'text/xml'
            }
        );

        if (url) {
            fetch(url)
            .then(response => response.text())
            .then(data => {
                let parsed_data = $.parseXML(data);
                xml = $(parsed_data);

                let feature_id = xml.find('Feature').attr('id');
                let feature_name = (xml.find('[name="nombre"]').attr('value')) ? xml.find('[name="nombre"]').attr('value') : 'Sin Datos';
                let feature_type = (xml.find('[name="tipo"]').attr('value')) ? xml.find('[name="tipo"]').attr('value') : 'Sin Datos';

                if (feature_id) {
                    content.append(
                        `<br>
                        <b>Feature Id: </b>${feature_id}<br>
                        <b>Nombre: </b>${feature_name}<br>
                        <b>Tipo: </b>${feature_type}`
                    );
                } else {
                    content.append(
                        `<br>
                        <code>
                            <b>Aquí no hay nada! :-(</b>
                        </code>`
                    );
                }
            })
            .then(() => { overlay.setPosition(coordinate); });
        }
    });

    map.on('pointermove', function(event) {
        if (event.dragging) {
            return;
        }

        let pixel = map.getEventPixel(event.originalEvent);
        let hit = map.forEachLayerAtPixel(pixel, function(layer) {
            if (layer.getProperties().name === 'osm_layer' || layer.getProperties().name === 'base_layer') {
                return false;
            }

            return layer.getActive();
        });
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    let zoom_ctrl = $('.ol-zoom');

    // zoom_ctrl.css('bottom', zoom_ctrl.css('top')).css('right', zoom_ctrl.css('left'));
    zoom_ctrl.css('bottom', '2.5em').css('right', '.5em');
    zoom_ctrl.css('top', 'unset').css('left', 'unset');
})();

$(document).ready(function() {
    $('#slide-submenu').on('click',function() {
        $(this).closest('.list-group').fadeOut('slide',function(){
            $('.mini-submenu').fadeIn();
        });
    });

    $('.mini-submenu').on('click',function(){
        $(this).next('.list-group').toggle('slide');
        $('.mini-submenu').hide();
    })

    $('.select-ctrl').click(function() {
        $('ul.nav.navbar-nav').find('li.active').removeClass('active');
        $(this).parent().addClass('active');

        seleccionarControl($(this).attr('id'));
    });

    $('#layers-list').on('click', '.layer-item', function() {
        let layer_name = $(this).attr('id');
        let checkbox = $(this).parent('li').find('input[type="checkbox"]');

        if (layer_name !== 'osm_layer' && layer_name !== 'base_layer') {
            toggleLayerActivity(layer_name);
            toggleLegend(layer_name);

            $('#layers-list').find('a.active').removeClass('active').parent('li').removeClass('active');
            $(this).addClass('active').parent('li').addClass('active');

            if (!checkbox.prop('checked')) {
                checkbox.prop('checked', true);
                checkbox.trigger('change');
            }
        } else {
            alert('Funcionalidad capa activa no soportada para capas bases');
        }
    });

    $('#layers-list').on('change', '.layer-checkbox', function() {
        let layer_name = $(this).val();
        toggleLayerVisibility(layer_name);
    });

    $('#anchor-layer-legend').click(function () {
        let link = $(this).find('img').attr('src');
        $('#layer-legend-expanded').attr('src', link);

        $('#modal-img').modal('show');
    });

    select_interaction.on('boxend', function() {
        let coordinates = this.getGeometry().getCoordinates();
        let wkt_coordinates = wktFormat(coordinates);
        let layer_name = findLayerBy('active', true).getProperties().name;

        let url_features = url
        + '&SERVICE=WMS'
        + '&VERSION=1.3.0'
        + '&REQUEST=GetFeatureInfo'
        + '&CRS=EPSG%3A4326'
        + '&INFO_FORMAT=text/xml'
        + '&FEATURE_COUNT=50'
        + `&QUERY_LAYERS=${layer_name}`
        + `&FILTER_GEOM=${wkt_coordinates}`;

        fetch(url_features)
        .then(response => response.text())
        .then(data => {
            let parsed_data = $.parseXML(data);
            let xml = $(parsed_data);

            // Limpio la tabla antes de cargar nuevos resultados
            $('#tbody-features').html('');

            xml.find('Feature').each(function(index) {
                let feature_id = $(this).attr('id');
                let feature_name = ($(this).find('[name="nombre"]').attr('value')) ? $(this).find('[name="nombre"]').attr('value') : 'Sin Datos';
                let feature_type = ($(this).find('[name="tipo"]').attr('value')) ? $(this).find('[name="tipo"]').attr('value') : 'Sin Datos';

                $('#tbody-features').append(
                    `<tr>
                        <td>${index + 1}</td>
                        <td>${feature_id}</td>
                        <td>${feature_name}</td>
                        <td>${feature_type}</td>
                    </tr>`
                );
            });
        })
        .then(() => { $('#modal-features').modal('show'); });
    });
}); // Fin $(document).ready()

// Funcion que habilita/deshabilita controles
var seleccionarControl = function(element) {
    if (element === 'box-ctrl') {    // Consulta por Polígono
        map.removeInteraction(draw);
        map.removeInteraction(draw_element);
        map.addInteraction(select_interaction);
    } else if (element === 'nav-ctrl') {    // Navegación
        map.removeInteraction(draw);
        map.removeInteraction(draw_element);
        map.removeInteraction(select_interaction);
    } else if (element === 'measure-length-ctrl' || element === 'measure-area-ctrl') {    // Medición de distancias y áreas
        map.removeInteraction(draw);
        map.removeInteraction(draw_element);
        map.removeInteraction(select_interaction);
        addInteraction();
    } else if (element === 'edit-ctrl') {    // Agregar eltos nuevos a una capa (de puntos)
        map.removeInteraction(draw);
        map.removeInteraction(select_interaction);
        map.removeInteraction(draw_element);
        addDrawInteraction();
    }
};

// Definición de una interacción
var select_interaction = new DragBox({
    condition: always, //noModifierKeys
    style: new Style({
        stroke: new Stroke({
            color: [0, 0, 255, 1]
        })
    })
});
