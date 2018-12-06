//
//
var draw_form = `
    <div>
        <div class="form-group">
            <label for="name">Nombre de Feature</label>
            <input type="text" class="form-control" id="name" placeholder="Nombre">
        </div>

        <div class="form-group">
            <label for="type">Tipo de Feature</label>
            <input type="text" class="form-control" id="type" placeholder="Tipo">
        </div>

        <button type="button" class="btn btn-success pull-right" id="send">Agregar</button>
    </div>
`;

var source_draw = new ol.source.Vector({wrapX: false});

var vector_draw = new ol.layer.Vector({
    name: 'draw_layer',
    title: 'Draw Layer',
    active: false,
    visible: false,
    source: source_draw
});

// Defino para que no de error
ol.layer.Vector.prototype.getActive = function() {
    return this.O.active;
};

var draw_element; // global so we can remove it later

function addDrawInteraction() {
    draw_element = new ol.interaction.Draw({
        source: source_draw,
        type: 'Point'
    });

    map.addInteraction(draw_element);

    draw_element.on('drawend', function(event) {
        let coordinates = event.feature.getGeometry().getCoordinates();
        let wkt_coordinates = 'POINT(' + coordinates[0] + ' ' + coordinates[1] + ')';

        content.html(draw_form);
        overlay.setPosition(coordinates);

        $('#send').click(function() {
            $.ajax({
                url: 'store.php',
                method: 'POST',
                data: {
                    'name': $('#name').val(),
                    'type': $('#type').val(),
                    'coordinates': wkt_coordinates
                },
                success: function(response) {
                    $('#popup-closer').trigger('click');

                    if (response) {
                        alert('Registro insertado con éxito');
                    } else {
                        alert('Hubo un error. Vuelva a intentar');
                    }

                    findLayerBy('name', 'cervecerias_artesanales').getSource().refresh();
                }
            });
        });
    });
}
