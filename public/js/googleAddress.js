// This example displays an address form, using the autocomplete feature
// of the Google Places API to help users fill in the information.

// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

var placeSearch, autocomplete;
var componentForm = {
    street_number: 'short_name',
    route: 'long_name',
    locality: 'long_name',
    administrative_area_level_1: 'short_name',
    country: 'long_name',
    postal_code: 'short_name'
};
var locationCounter = 1
var locations = []

function initAutocomplete() {
    // Create the autocomplete object, restricting the search to geographical
    // location types.
    autocomplete = new google.maps.places.Autocomplete(
            /** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
        { types: ['geocode'] });

    // When the user selects an address from the dropdown, populate the address
    // fields in the form.
    autocomplete.addListener('place_changed', fillInAddress);
}

function fillInAddress() {
    // Get the place details from the autocomplete object.
    var place = autocomplete.getPlace();

    for (var component in componentForm) {
        document.getElementById(component).value = '';
    }

    // Get each component of the address from the place details
    // and fill the corresponding field on the form.
    for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
        if (componentForm[addressType]) {
            var val = place.address_components[i][componentForm[addressType]];
            document.getElementById(addressType).value = val;
        }
    }
}

// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.
function geolocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            var circle = new google.maps.Circle({
                center: geolocation,
                radius: position.coords.accuracy
            });
            autocomplete.setBounds(circle.getBounds());
        });
    }
}

function addLocation() {
    var listContainer = $('#locationList');
    var address = document.getElementById('autocomplete').value
    if (!address || address.length === 0 || locationCounter === 12) {
        return
    }
    var location = {}
    for (var component in componentForm) {
        location[component] = document.getElementById(component).value
    }
    location['searchbarAddress'] = address
    locations.push(location)

   var cross = `<button id=cross${locationCounter} type="button" onClick="deleteLocation(${locationCounter})" class="close" aria-label="Close">
   <span aria-hidden="true">&times;</span>
 </button>` 

    var li = '<li id=li'+ locationCounter +' class="list-group-item">' + locationCounter + '. ' + address + ' ' + cross + ' </li>'
    locationCounter++
    listContainer.append(li);
}

function calculateTSP(withDeviation) {

    if(locations.length <= 2) return 

    var url = '/tspWithoutRespectToDeviation'
    if(withDeviation){
        url = '/tspWithRespectToDeviation'
    }
    

    $.post({
        url: url,
        data: JSON.stringify(locations),
        contentType : 'application/json',
    }).done(function (msg) {
        if(msg.error){
            alert(msg.error);
        }else{
            alert('Best route: ' + msg.result)
        }
    });

}


function deleteLocation(id){
    var listContainer = $('#locationList');

    locations.forEach( (location,index) => {
        $("#li"+(index +1)).remove()
    })
    locations.splice(id - 1,1)
    locations.forEach( (location,index) => {
        var cross = `<button id=cross${index + 1} type="button" onClick="deleteLocation(${index + 1})" class="close" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>` 
        var li = '<li id=li'+ (index + 1) +' class="list-group-item">' + (index + 1) + '. ' + location.searchbarAddress + ' ' + cross + ' </li>'
        listContainer.append(li);
    })
    if(locationCounter -1 !== 0)
        locationCounter--
}