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
                    // Capas desactivadas por defecto
                    visible: false,
                    // Agrego concepto de 'capa activa'
                    active: false,
                    source: new ol.source.ImageWMS({
                        url: url,
                        params: {
                            LAYERS: layer.Name
                        }
                    })
                })
            );
        }

        // Agrego capa para dibujar medidas
        layers_ol.push(vector);

        // Definición de barra de escala
        let scale_line_ctrl = new ol.control.ScaleLine();
        scale_line_ctrl.setUnits('metric');

        // Definición del mapa y su capa
        return new ol.Map({
            controls: ol.control.defaults().extend([
                scale_line_ctrl
            ]),
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    title: "Natural Earth Base Map",
                    source: new ol.source.TileWMS({
                        url: 'http://demo.boundlessgeo.com/geoserver/wms',
                        params: {'LAYERS': 'ne:ne'}
                    })
                })
            ].concat(layers_ol),
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
        $('#layers-list').append(
            `<li class="list-group-item row" style="margin-left: 0px; margin-right: 0px;">
                <a href="#" id="${layer_name}" class="list-group-item layer-item col-md-10" style="border: 0; padding: 0;">
                    ${layer_title}
                </a>
                <div class="checkbox checbox-switch switch-primary col-md-2" style="margin-top: 0px; margin-bottom: 0px;">
                    <label>
                        <input type="checkbox" value="${layer_name}" class="layer-checkbox"/>
                        <span></span>
                    </label>
                </div>
            </li>`
        );
    }

    // Marco la capa Red Vial como activa y visible en la lista
    $('#layers-list a#red_vial').addClass('active').parent('li').addClass('active');
    $('#layers-list input[value="red_vial"]').prop('checked', true);

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

        let view_resolution = (view.getResolution());

        let url = findLayerBy('active', true).getSource().getGetFeatureInfoUrl(
            event.coordinate,
            view_resolution,
            'EPSG:4326',
            {
                'INFO_FORMAT': 'text/xml'
            }
        );

        if (url) {
            fetch(url).then(response => response.text()).then(function(data) {
                console.log('URL: ' + url);
                console.log(data);
                console.log('---------------------------------------------');

                // let results = new ol.format.OSMXML().readFeatures(data);
                // console.log(results);

                let parser = new DOMParser();
                let xml_doc = parser.parseFromString(data, "text/xml");
                console.log(xml_doc);

                // let win = window.open(url, '_blank');
                // win.focus();
                // console.log('COORDENADAS: ' + event.coordinate);
            });
        }
    });

    let zoom_ctrl = $('.ol-zoom');

    zoom_ctrl.css('bottom', zoom_ctrl.css('top')).css('right', zoom_ctrl.css('left'));
    zoom_ctrl.css('top', 'unset').css('left', 'unset');
})();
