import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Style, Fill, Stroke, Circle} from 'ol/style';
import {LineString, Polygon} from 'ol/geom';
import {getArea, getLength} from 'ol/sphere';
import {unByKey} from 'ol/Observable';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import {map} from './app.js'

// Source de la capa vectorial
var source = new VectorSource();

// Capa vectorial donde se dibujan las líneas de medición
export var vector = new VectorLayer({
    title: 'Mediciones',
    name: 'mediciones',
    visible: true,
    active: false,
    source: source,
    style: new Style({
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new Circle({
            radius: 20,
            fill: new Fill({
                color: '#ffcc33'
            })
        })
    })
});

/**
* Currently drawn feature.
* @type {module:ol/Feature~Feature}
*/
var sketch;

/**
* The help tooltip element.
* @type {Element}
*/
export var helpTooltipElement;

/**
* Overlay to show the help messages.
* @type {module:ol/Overlay}
*/
var helpTooltip;

/**
* The measure tooltip element.
* @type {Element}
*/
var measureTooltipElement;

/**
* Overlay to show the measurement.
* @type {module:ol/Overlay}
*/
var measureTooltip;

/**
* Message to show when the user is drawing a polygon.
* @type {string}
*/
var continuePolygonMsg = 'Click para continuar dibujando el Polígono';

/**
* Message to show when the user is drawing a line.
* @type {string}
*/
var continueLineMsg = 'Click para continuar dibujando la línea';

/**
* Handle pointer move.
* @param {module:ol/MapBrowserEvent~MapBrowserEvent} evt The event.
*/
export var pointerMoveHandler = function(evt) {
    if (evt.dragging) {
        return;
    }
    /** @type {string} */
    var helpMsg = 'Click para empezar a dibujar';

    if (sketch) {
        var geom = (sketch.getGeometry());
        if (geom instanceof Polygon) {
            helpMsg = continuePolygonMsg;
        } else if (geom instanceof LineString) {
            helpMsg = continueLineMsg;
        }
    }

    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);

    // Solo si la opción de medición está activa lo muestro
    if ($('#measure-length-ctrl').parent().hasClass('active') || $('#measure-area-ctrl').parent().hasClass('active')) {
        helpTooltipElement.classList.remove('hidden');
    }
};


/**
* Acá obtiene el select para saber qué se está dibujando
* Hacer algo parecido para botones en barra
* Esto va a causar ERROR
*/
var typeSelect = document.getElementById('type');

export var draw; // global so we can remove it later


/**
* Format length output.
* @param {module:ol/geom/LineString~LineString} line The line.
* @return {string} The formatted length.
*/
var formatLength = function(line) {
    var length = getLength(line, {
        'projection': 'EPSG:4326'
    });
    var output;
    if (length > 100) {
        output = (Math.round(length / 1000 * 100) / 100) +
        ' ' + 'km';
    } else {
        output = (Math.round(length * 100) / 100) +
        ' ' + 'm';
    }
    return output;
};


/**
* Format area output.
* @param {module:ol/geom/Polygon~Polygon} polygon The polygon.
* @return {string} Formatted area.
*/
var formatArea = function(polygon) {
    var area = getArea(polygon, {
        'projection': 'EPSG:4326'
    });
    var output;
    if (area > 10000) {
        output = (Math.round(area / 1000000 * 100) / 100) +
        ' ' + 'km<sup>2</sup>';
    } else {
        output = (Math.round(area * 100) / 100) +
        ' ' + 'm<sup>2</sup>';
    }
    return output;
};


// Función que añade la interración al mapa según lo seleccionado
export function addInteraction() {
    var active_element = $('ul.nav.navbar-nav').find('li.active').children().attr('id');
    var type = (active_element === 'measure-length-ctrl') ? 'LineString' : 'Polygon';

    draw = new Draw({
        source: source,
        type: type,
        style: new Style({
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, 0.5)',
                lineDash: [10, 10],
                width: 2
            }),
            image: new Circle({
                radius: 5,
                stroke: new Stroke({
                    color: 'rgba(0, 0, 0, 0.7)'
                }),
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                })
            })
        })
    });
    map.addInteraction(draw);

    createMeasureTooltip();
    createHelpTooltip();

    var listener;
    draw.on('drawstart',
    function(evt) {
        // set sketch
        sketch = evt.feature;

        /** @type {module:ol/coordinate~Coordinate|undefined} */
        var tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on('change', function(evt) {
            var geom = evt.target;
            var output;
            if (geom instanceof Polygon) {
                output = formatArea(geom);
                tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof LineString) {
                output = formatLength(geom);
                tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
        });
    }, this);

    draw.on('drawend',
    function() {
        measureTooltipElement.className = 'tooltip tooltip-static';
        measureTooltip.setOffset([0, -7]);
        // unset sketch
        sketch = null;
        // unset tooltip so that a new one can be created
        measureTooltipElement = null;
        createMeasureTooltip();
        unByKey(listener);
    }, this);
}


/**
* Creates a new help tooltip
*/
export function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip hidden';
    helpTooltip = new Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left'
    });
    map.addOverlay(helpTooltip);
}


/**
* Creates a new measure tooltip
*/
function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
}


/**
* Let user change the geometry type.
* Con esto se cambia el tipo de medida
* Esto hay que adaptar
*/
// typeSelect.onchange = function() {
//     map.removeInteraction(draw);
//     addInteraction();
// };
