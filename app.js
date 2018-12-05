// SCRIPT que crea el mapa y sus capas
//
// URL del servicio
var url = 'http://osgeolive/cgi-bin/qgis_mapserv.fcgi?map=/home/user/Desktop/TP Integrador/tp-integrador.qgz';

// Array que contiene todas las capas del servidor WMS
var layers_ol = [];

// Instancia de Open Layers
var map;

// View del mapa
var view;

// Capa de prueba
var red_vial;

// Varbiales relacionadas al popup
var container, content, closer, overlay;

// XML parseado
var xml;

// Funcion que busca una capa por propiedad dada
var findLayerBy = function(property, value) {
    return layers_ol.find(function(element) {
        return element.getProperties()[property] === value;
    });
};

// async IIFE que construye la instancia del mapa y demás hierbas
(async function() {
    map = await fetch(url + '&SERVICE=WMS&REQUEST=GetCapabilities')
    .then(response => response.text())
    .then(data => {
        let layers = new ol.format.WMSCapabilities().read(data).Capability.Layer.Layer;

        for (let layer of layers) {
            layers_ol.push(
                new ol.layer.Image({
                    title: layer.Title,
                    name: layer.Name,
                    visible: false,
                    active: false,
                    source: new ol.source.ImageWMS({
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
        layers_ol.push(vector);

        // Agrego capa para mostrar eltos a agregar
        layers_ol.push(vector_draw);

        // Definición de barra de escala
        let scale_line_ctrl = new ol.control.ScaleLine();
        scale_line_ctrl.setUnits('metric');

        /**
        * Elements that make up the popup.
        */
        container = document.getElementById('popup');
        content = $('#popup-content');
        closer = document.getElementById('popup-closer');

        /**
        * Create an overlay to anchor the popup to the map.
        */
        overlay = new ol.Overlay({
            element: container,
            autoPan: true,
            autoPanAnimation: {
                duration: 250
            }
        });

        /**
        * Add a click handler to hide the popup.
        * @return {boolean} Don't follow the href.
        */
        closer.onclick = function() {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };

        // Definición del mapa y su capa
        return new ol.Map({
            controls: ol.control.defaults().extend([
                scale_line_ctrl
            ]),
            target: 'map',
            layers: layers_ol = [
                new ol.layer.Tile({
                    title: 'OpenStreetMap Layer',
                    name: 'osm_layer',
                    visible: true,
                    active: false,
                    source: new ol.source.OSM()
                }),
                new ol.layer.Tile({
                    title: 'Natural Earth Base Map',
                    name: 'base_layer',
                    visible: false,
                    active: false,
                    source: new ol.source.TileWMS({
                        url: 'http://demo.boundlessgeo.com/geoserver/wms',
                        params: {'LAYERS': 'ne:ne'}
                    })
                })
            ].concat(layers_ol),
            overlays: [overlay],
            view: view = new ol.View({
                projection: 'EPSG:4326',
                center: [-59, -27.5],
                zoom: 6
            })
        });
    }); // End fetch

    // Agrego métodos al prototype de capas para obtener/setear capa activa
    ol.layer.Image.prototype.setActive = function(active) {
        return this.O.active = active;
    };
    ol.layer.Image.prototype.getActive = function() {
        return this.O.active;
    };

    // Capa de prueba
    red_vial = findLayerBy('name', 'red_vial');
    red_vial.setVisible(true);
    red_vial.setActive(true);

    // Carga de capas en listado
    for (let layer of layers_ol) {
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

        var hdms = ol.coordinate.toStringHDMS(ol.proj.toLonLat(coordinate, 'EPSG:4326'));

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
