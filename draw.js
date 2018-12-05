//
//
var draw_form = `
    <div class="">
        <input type="text" id="name" placeholder="Nombre">
        <input type="text" id="type" placeholder="Tipo">
        <input type="button" id="send" value="Agregar">
    </div>
`;

var source_draw = new ol.source.Vector({wrapX: false});

var vector_draw = new ol.layer.Vector({
    name: 'draw_layer',
    title: 'Draw Layer',
    active: false,
    visible: true,
    source: source_draw
});

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
                    alert(response);
                }
            });
        });
    });
}
