$(document).ready(function(){
	$(".active").removeClass("active");
	$("#home-tab").addClass("active");

	declareGlForMapView();

	insertIntoKismetTable();
	insertIntoAPtable();

	document.getElementById("searchResults").style.display='none';



	var b12 = $("#rightButton");


	$("#kismetTable").click(function (e){
		e = e || window.event;
		var rowValues = [];
		var target = e.srcElement || e.target;
		
		while (target && target.nodeName !== "TR") {
			target = target.parentNode;
		}
		if (target) {
			var cells = target.getElementsByTagName("td");
			for (var i = 0; i < cells.length; i++) {
				rowValues.push(cells[i].innerHTML);
			}
		}
		var letknow = document.getElementById("savedConnSign").innerHTML="<b>" + rowValues[0] + " - ESSID List</b>";

		knownESSIDs = []
		knownESSIDs = searchKnownESSIDS(rowValues[0]);
		insertIntoTable(knownESSIDs);
		/* Add MAC address to the beginning of the array */
		ESSIDsUnknownLocations.unshift(rowValues[0]);
	});



	/*var table = document.getElementById("accesspointTable");*/

	$("#accesspointTable").click(function (e){
		e = e || window.event;
		var rowValues = [];
		var hasClients = false;
		var target = e.srcElement || e.target;
		
		while (target && target.nodeName !== "TR") {
			target = target.parentNode;
		}
		if (target) {
			var cells = target.getElementsByTagName("td");
			for (var i = 0; i < cells.length; i++) {
				rowValues.push(cells[i].innerHTML);
			}
		}
		var letknow = document.getElementById("savedConnSign").innerHTML="<b>ESSID: " + rowValues[0] + " (" + rowValues[3] + ")</b>";

		for (var i = 0; i < stationsWithKnownClients.length; i++) {
			if(stationsWithKnownClients[i][0] == rowValues[0]){
				insertStations(stationsWithKnownClients[i]);
				hasClients = true;
				break;
			}
		}

		if(!hasClients){
			document.getElementById("savedConnSign").innerHTML="<b>ESSID: " + rowValues[0] + "</b><br><i>no clients</i>";
		}
		
	});


	var mapView = function () {

		var url = "http://0.0.0.0:5000/map?";
		var counter = 1;
		var holder = " ";

		for (var i = 0; i < URLknownLocations.length; i++) {
			if(counter < 20){
				holder = "mac"+counter+"="+URLknownLocations[i]+"&";
				url += holder;
			}
			counter++;
		}

		if(ESSIDsUnknownLocations[0]){
			holder = "unloc=" + ESSIDsUnknownLocations;
			url += holder;
		}else {
			url = url.slice(0,-1);
		}

		$(location).attr('href', url);
	};

	// Add listener to the Map View button
	b12.on('click', mapView);

	// Disable the Map View button on page load
	document.getElementById("rightButton").disabled = true;

	var counterx = 0;
	for(var i = 0; i < stationsWithKnownClients.length; i++) {
		if(stationsWithKnownClients[i][1] == "unknown"){
			counterx++;
		}
	}

	console.log("stationsWithKnownClients with unknown locations: " + counterx);
	

});

/* Global array to store MAC addresses of APs with known locations and unknown locations - URL link for /map page is generated from these arrays when user decides to view the APs on the map */
function declareGlForMapView() {
	URLknownLocations = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
	ESSIDsUnknownLocations = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
	assoc = [];
}

function searchKnownESSIDS(MACaddress)
{
	var ESSIDs = [];

	for(var i = 0, size = stationsWithProbeESSIDs.length; i < size ; i++){
		if (stationsWithProbeESSIDs[i][0] == MACaddress) {
			/* Loop through stationsWithProbeESSIDs array - only possitions 4-13 contain probe requests with ESSIDs */
			for(var y = 4; y < stationsWithProbeESSIDs[i].length; y++){
				ESSIDs.push(stationsWithProbeESSIDs[i][y]);
			}
		} 
	}
	return ESSIDs;
}

function insertIntoTable(ESSIDs_array) {
	URLknownLocations = []
	ESSIDsUnknownLocations = []
	rowCounter = 0
	var islocation = false;
	var buttonLocationCheck = false;
	var table = document.getElementById("listTable");
	/* Empty table before it will be populated and display the "Map View" button*/
	document.getElementById("rightButton").style.display='block';
	table.innerHTML = "";
	
	var row = table.insertRow(rowCounter);
	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);

	col1.innerHTML = "<b>ESSID</b>";
	col2.innerHTML = "<b>Location</b>";

	for(var i = 0; i < ESSIDs_array.length; i++) {
		rowCounter ++;
		row = table.insertRow(rowCounter);
		col1 = row.insertCell(0);
		col2 = row.insertCell(1);

		islocation = hasLocation(ESSIDs_array[i]);
		col1.innerHTML = ESSIDs_array[i];
		if(islocation){
			buttonLocationCheck = true;
			col2.innerHTML = "<span style='color:green;font-style:bold'>Y</span>";
		} else {
			col2.innerHTML = "<span style='color:red;font-style:bold'>N</span>";
		}
	}


	document.getElementById("rightButton").disabled = true;

	if(buttonLocationCheck) {
		document.getElementById("rightButton").disabled = false;
	} else {
		document.getElementById("rightButton").disabled = true;
	}

	scrolldown();
}


function insertStations(essid) {
	rowCounter = 0
	var table = document.getElementById("listTable");
	var isConnected = " "

	/* Empty table before it will be populated and hide the "Map View" button*/
	document.getElementById("rightButton").style.display='none';
	table.innerHTML = "";
	
	var row = table.insertRow(rowCounter);
	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);

	col1.innerHTML = "<b>Station MAC</b>";
	col2.innerHTML = "<b>Connected</b>";

	for(var i = 4; i < essid.length; i++) {

		isConnected = "No";

		for(var y = 0; y < clientsAssociated.length; y++){
			if(essid[i] == clientsAssociated[y][0]){
				isConnected = "Yes";
				break;
			}
		}

		rowCounter ++;
		row = table.insertRow(rowCounter);
		col1 = row.insertCell(0);
		col2 = row.insertCell(1);

		col1.innerHTML = essid[i];

		if(isConnected == "Yes"){
			col2.innerHTML = "<span style='color:green;font-style:bold'>Yes</span>";
		} else {
			col2.innerHTML = "<span style='color:red;font-style:bold'>No</span>";
		}
	}
}




function hasLocation(accessPoint) {

	for (var i = 0; i < kismeLocations.length; i++) {
		if(kismeLocations[i][0] == accessPoint){
			URLknownLocations.push(kismeLocations[i]);
			return true;
		}
	}
	ESSIDsUnknownLocations.push(accessPoint);
	return false;
}

function stringToUpper(str) {
	var sInput = str.value;
	str.value = sInput.toUpperCase();
}

/* Take from https://stackoverflow.com/a/39618103 */
function checkMac() {
	var searchBox = document.getElementById("inputBox")
	var userInput = searchBox.value;
	var isMACaddress = /^(([A-Fa-f0-9]{2}[:]){5}[A-Fa-f0-9]{2}[,]?)+$/i;
	if(isMACaddress.test(userInput)) {
		searchKismetLists(userInput);
	} else {
		console.log("Invalid: "+ userInput);
	}
}


/* SEARCH FOR 
AP 00:02:72:3A:56:61
Station 10:D0:7A:AC:FC:26*/
function searchKismetLists(mac_address) {

	var isAccessPoint = false;
	var isStation = false;

	for (var i = 0; i < kismeLocations.length; i++) {
		if(kismeLocations[i][1] == mac_address){
			isAccessPoint = true;
			createResultsTable(kismeLocations[i], isAccessPoint, isStation);
			break;
		}
	}

	if(!isAccessPoint) {

		
		for (var i = 0; i < stationsWithProbeESSIDs.length; i++) {
			if(stationsWithProbeESSIDs[i][0] == mac_address){
				isStation = true;
				createResultsTable(stationsWithProbeESSIDs[i], isAccessPoint, isStation);
				break;
			}
		}
		

		if(!isStation){
			for (var i = 0; i < allStations.length; i++) {
				if(allStations[i][0] == mac_address){
					isStation = true;
					createResultsTable(allStations[i], isAccessPoint, isStation);
					break;
				}
			}
		}
	}
}


function createResultsTable(searchResults, routerBoolean, stationBoolean) {

	document.getElementById("searchResults").style.display='block';
	document.getElementById("kismetResultsTableDiv").style.display='none';
	document.getElementById("stationsResultsTableDiv").style.display='none';


	if(routerBoolean) {
		var table = document.getElementById("kismetResultsTable");

		table.rows[1].cells[0].innerHTML = searchResults[0];
		table.rows[1].cells[1].innerHTML = searchResults[1];
		table.rows[1].cells[2].innerHTML = searchResults[2];
		table.rows[1].cells[3].innerHTML = searchResults[3];

		document.getElementById("kismetResultsTableDiv").style.display='block';
	}

	if(stationBoolean) {
		var table = document.getElementById("stationsResultsTable");

		table.rows[1].cells[0].innerHTML = searchResults[0];
		table.rows[1].cells[1].innerHTML = searchResults[1];
		table.rows[1].cells[2].innerHTML = searchResults[2];
		table.rows[1].cells[3].innerHTML = searchResults[3];

		document.getElementById("stationsResultsTableDiv").style.display='block';
	}
}

function closeSearchDiv() {
	document.getElementById("searchResults").style.display='none';
}



function insertIntoKismetTable() {
	rowCounter = 0;
	var table = document.getElementById("kismetTable");
	/* Empty table before it will be populated */
	table.innerHTML = "";
	
	var row = table.insertRow(rowCounter);

	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);
	var col4 = row.insertCell(3);

	col1.innerHTML = "<b>MAC</b>";
	col2.innerHTML = "<b>First Seen</b>";
	col3.innerHTML = "<b>Last Seen</b>";
	col4.innerHTML = "<b>ESSID Count</b>";

	for(var i = 0; i < stationsWithProbeESSIDs.length; i++) {
		rowCounter ++;

		row = table.insertRow(rowCounter);
		col1 = row.insertCell(0);
		col2 = row.insertCell(1);
		col3 = row.insertCell(2);
		col4 = row.insertCell(3);

		col1.innerHTML = stationsWithProbeESSIDs[i][0];
		col2.innerHTML = stationsWithProbeESSIDs[i][1];
		col3.innerHTML = stationsWithProbeESSIDs[i][2];
		col4.innerHTML = stationsWithProbeESSIDs[i][3];
	}
}

function insertIntoAPtable() {
	rowCounter = 0;
	var table = document.getElementById("accesspointTable");
	/* Empty table before it will be populated */
	table.innerHTML = "";
	
	var row = table.insertRow(rowCounter);

	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);
	var col4 = row.insertCell(3);

	col1.innerHTML = "<b>ESSID</b>";
	col2.innerHTML = "<b>First Seen</b>";
	col3.innerHTML = "<b>Last Seen</b>";
	col4.innerHTML = "<b>Clients Count</b>";

	for(var i = 0; i < stationsWithKnownClients.length; i++) {
		if(stationsWithKnownClients[i][1] != "unknown" && stationsWithKnownClients[i][3] != "0"){
			rowCounter ++;

			row = table.insertRow(rowCounter);
			col1 = row.insertCell(0);
			col2 = row.insertCell(1);
			col3 = row.insertCell(2);
			col4 = row.insertCell(3);

			col1.innerHTML = stationsWithKnownClients[i][0];
			col2.innerHTML = stationsWithKnownClients[i][1];
			col3.innerHTML = stationsWithKnownClients[i][2];
			col4.innerHTML = stationsWithKnownClients[i][3];
		}
	}
}


function scrolldown() {
  setTimeout(
    function() {
     	var scrolldiv = document.getElementsByClassName("pre-scrollable");
	scrolldiv[2].scrollTop = scrolldiv[2].scrollHeight - scrolldiv[2].clientHeight;
    }, 100);
}
