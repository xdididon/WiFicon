$(document).ready(function(){
	$(".active").removeClass("active");
	$("#map-tab").addClass("active");
});

declareGlArrays();

getURLparameters();
populateLeftSide();

function declareGlArrays() {
	selectedLocations = ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"];
	unknownESSIDs = ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"];
}






function getURLparameters(){
	selectedLocations = [];
	unknownESSIDs = [];

	for (var i = 0; i < listMACaddresses.length; i++) {
		if(listMACaddresses[i][0] == "*") {
			break;
		}
		var inputs = listMACaddresses[i].toString();
		var fields = inputs.split(',');
		selectedLocations.push(fields);
	}


	var inputs = unknownLocations.toString();

	/* By default unknownLocations array contains MAC address of the station which is being search. This is followed by the list of unknown ESSIds. When there are none then "*" will be at index 18 */
	if(inputs[18] != "*"){
		var fields = inputs.split(',');

		for (var i = 0; i < fields.length; i++) {
			unknownESSIDs.push(fields[i]);
		}		
	}else {
		unknownESSIDs.push("Nothing to show");
	}
}

function populateLeftSide() {

	var table = document.getElementById("tableGPS");
	var textHolder = "";
	var finalList = "";

	for (var i = 0; i < selectedLocations.length; i++) {

		var newRow = table.insertRow(table.rows.length);
		var newCell = newRow.insertCell(0);
		newCell = newRow.insertCell(1);
		newCell = newRow.insertCell(2);

		table.rows[i].cells[0].innerHTML = selectedLocations[i][0];
		table.rows[i].cells[1].innerHTML = selectedLocations[i][2];
		table.rows[i].cells[2].innerHTML = selectedLocations[i][3];
	}

	document.getElementById("MACaddress").innerHTML=unknownESSIDs[0];

	/* Start the loop from index 1 becaue the MAC address is at index 0 */
	for (var i = 1; i < unknownESSIDs.length; i++) {
		textHolder = " " + unknownESSIDs[i] + ",";
		finalList += textHolder;
		console.log("RE:unknownESSIDs["+i+"] " + unknownESSIDs[i]);
	}

	finalList = finalList.slice(0,-1);

	document.getElementById("uknownList").innerHTML=finalList;

}






function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: 50.500910,
			lng: 13.641542,
		},
		zoom: 13,
		mapTypeId: 'satellite'
	})

	var infowindow = new google.maps.InfoWindow({})

	var marker, i

	for (i = 0; i < selectedLocations.length; i++) {
		marker = new google.maps.Marker({
			position: new google.maps.LatLng(selectedLocations[i][2], selectedLocations[i][3]),
			map: map,
		})

		google.maps.event.addListener(
			marker,
			'click',
			(function(marker, i) {
				return function() {
					infowindow.setContent(selectedLocations[i][0])
					infowindow.open(map, marker)
				}
			})(marker, i)
		)
	}
}












