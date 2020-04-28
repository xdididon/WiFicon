$(document).ready(function(){
	$(".active").removeClass("active");
	$("#rel-tab").addClass("active");

	// Declare global variables
	declareGlobal();

	populateDropdownOptions();
	addESSIDsOptions();

	// Compute users relationships, statistics and populate the table with results
	updateRelationships();

	// onclick listener for the relationships results table
	$("#rel-table").click(function (e){
		e = e || window.event;
		var target = e.srcElement || e.target;

		cellMonitor();

		var tableRows = resultsTable.getElementsByTagName('tr');

		// On click reset row highlighting and font color back to default
		for (var i = 0, row; row = resultsTable.rows[i]; i++) {
			row.style.color = "white";
			row.style.backgroundColor = "";
   			for (var y = 0, column; column = row.cells[y]; y++) {
				column.style.color = "white";
   			}  
		}

		// find the row which the user clicked on
		while (target && target.nodeName !== "TR") {
			target = target.parentNode;
		}
		// Process the row and cell the user selected
		if (target) {
			var cells = target.getElementsByTagName("td");
			// For each cell in the row
			for (var y = 0; y < cells.length; y++) {
				// Save the value of the first cell and change its font colour to black
  				if(y == 0){
					firstColumnValue = cells[y].innerHTML;
					cells[y].style.color = "Black";
				} else {
					// Change the font colour of the cell (other than the first one) to black. 
					// cellValue variable holds the value of the cell the user clicked on.
					if(cells[y].innerHTML == cellValue){
						cells[y].style.color = "Black";
					} else {
						// Change the font of all the other cells to white
						cells[y].style.color = "white";
					}
				}
			}
			// Highlight the row
			target.style.backgroundColor = "DarkRed";
			displayCommonProbeRequests();
		}
	});


	$("#relDropdown").on("change", function() {
		updateRelationships();
	});

	// Listener for the dropdown menu - when user chooses some ESSID from the list add it to the table in the scroll-down DIV
	$("#exludeDropdown").on("change", function() {
		// Get index of the selected ESSID (- 1 because the first option is a description)
		var dropdownIndex = $("select[id='exludeDropdown'] option:selected").index() - 1;
		
		// Do nothing if dropdownIndex is -1 (user selected the first option which is the description and not ESSID)
		if(dropdownIndex == -1){
			return;
		}

		// Get the real ESSID from the earray (the ESSIDs in the dropdown menu are formatted so this is easier)
		var wifiName = stationsWithKnownClients[dropdownIndex][0];

		excludeEssid(wifiName);		
	});

	$("#clearButton").click(function(){
		clearExclusionTable();
		clearGreenResults();
	});

});

// Declare global variables
function declareGlobal() {
	resultsTable = document.getElementById("rel-table");
	relationshipsResults = [[]];
	relationshipsLength = [];
	totalRelationships = 0;
	totalConnections = 0;
	averageConnections = 0;
	walkThroughSwitch = false;
	dropdownValue = 2;
	maxRelations = 0;
	firstColumnValue = " ";
	cellValue = "";
	commonProbes = "";
	excludedEssids = [];
}

function displayCommonProbeRequests() {

	commonProbes = "";

	var results = document.getElementById("probeRequests");

	if(cellValue != "-"){
		for(var i = 0; i < relationshipsResults.length; i++) {
			if(relationshipsResults[i][0] == firstColumnValue){
				for(var y = 0; y < relationshipsResults[i][1].length; y++) {
					if(relationshipsResults[i][1][y][0] == cellValue){
						for(var t = 1; t < relationshipsResults[i][1][y].length; t++){
							commonProbes = commonProbes + relationshipsResults[i][1][y][t] + ", ";
						}
					}
				}
				// Trim the ", " from the end of the string
				commonProbes = commonProbes.substring(0, commonProbes.length - 2);

				// Display results to tthe user and break from the loop
				results.innerHTML = commonProbes;
				break;
			}
		}
	} else {
		// Display error message when user selects cell "-" in it
		results.innerHTML = "Nothing to show...";
	}
}

function getStats() {
	totalRelationships = relationshipsResults.length - 1;
	maxRelations = 0;
	relationshipsLength = [];
	totalConnections = 0;

	// Calculate total number of "connections". For example, if device 1 shares at least 2 probe requests with 4 other devices than this is recorded as 4 connections.
	for(var i = 1; i < relationshipsResults.length; i++) {
		relationshipsLength.push(relationshipsResults[i][1].length);
		totalConnections = totalConnections + relationshipsResults[i][1].length;
		if(relationshipsResults[i][1].length > maxRelations) {
			maxRelations = relationshipsResults[i][1].length;
		}
	}

	// Calculate average count
	averageConnections = totalConnections / totalRelationships;
}

function displayTotalAvg() {
	document.getElementById("desc1").innerHTML = "<b>Groups count: " + totalRelationships + "</b>";
	document.getElementById("desc2").innerHTML = "<b>Average members in group: " + averageConnections.toFixed(1) + "</b>";
}


function cellMonitor() {
	// Get value of the cell user clicks on
	for (var i = 0; i < resultsTable.rows.length; i++) {
		for (var y = 1; y < resultsTable.rows[i].cells.length; y++)
			resultsTable.rows[i].cells[y].onclick = function () { getCellValue(this); 
		}
	}
}

// Function to save the value of the cell user clicked on to the global variable cellValue
function getCellValue(selectedCell) {
	cellValue = selectedCell.innerHTML;
}

function computeRelationships() {
	var deviceConnections = [];
	var tmpResults = [];
	var userProbes = [];
	var macAddress = [];

	// Empty relationshipsResults array
	relationshipsResults = [[]];


	for(var i = 0; i < stationsWithProbeESSIDs.length; i++) {

		macAddress = [];
		userProbes = [];
		deviceConnections = [];

		if(stationsWithProbeESSIDs[i][3] == "2"){
			break;
		}

		macAddress.push(stationsWithProbeESSIDs[i][0]);

		deviceConnections.push(macAddress);

		for(var y = 4; y < stationsWithProbeESSIDs[i].length; y++){
			userProbes.push(stationsWithProbeESSIDs[i][y]);
		}

		tmpResults = findMatches(userProbes, i);

		if(tmpResults.length > 0){
			deviceConnections.push(tmpResults);
			relationshipsResults.push(deviceConnections);
		}
	}
}

function findMatches(probeRequests, index) {

	var matches = [];
	var tmp = [];

	// Iterrate over the array which holds all clients and their PNL
	for(var i = 0; i < stationsWithProbeESSIDs.length; i++) {
		// Skip all processed records
		if(i <= index){
			continue;
		}

		// Clear temporary array and add the clients MAC address to it
		tmp = [];
		tmp.push(stationsWithProbeESSIDs[i][0]);

		// Iterrate over the PNL part of the array (it start at index 4)
		// probeRequests array holds the client's PNL and excludedEssids array ESSIDs the user wants to exclude
		// Add matches to the tmp array only if the ESSID is not included in the excludedEssids array
		for(var y = 4; y < stationsWithProbeESSIDs[i].length; y++){
			if(probeRequests.includes(stationsWithProbeESSIDs[i][y]) && !excludedEssids.includes(stationsWithProbeESSIDs[i][y])){
				tmp.push(stationsWithProbeESSIDs[i][y]);
			}
		}

		// If the client has at least 2 matching probe requests add them it to the list
		if(tmp.length > dropdownValue) {
			matches.push(tmp);
		}
	}
	return matches;
}



function populateTable() {

	var rowCounter = 0;
	var isConnected = " ";

	// Display only up to 40 relations. The number is already high enough and anything close to or over 40 can be considered as not useful.
	// This is because a large group of devices sharing the same ESSID will most likely share free hotspots which does not indicate 
	// that the user might know each other in real life. 
	var maxCells = 40;

	// maxRelations variable holds the highest count of relations per group. If this number is less than 40 then use it for maximum count of cells.
	if(maxRelations < maxCells){
		maxCells = maxRelations;
	}

	// Empty the table before it will be populated.
	resultsTable.innerHTML = "";

	// Add table header.
	var row = resultsTable.insertRow(rowCounter);
	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);

	col1.innerHTML = "<b>Device</b>";
	col2.innerHTML = "<b>Relations</b>";

	// For each group of relations, populate the table. Index needs to start from 1, 0 is an empty array.
	for(var i = 1; i < relationshipsResults.length; i++) {

		rowCounter ++;

		// Add new row - the first one.
		row = resultsTable.insertRow(rowCounter);
		col1 = row.insertCell(0);

		// Add the first MAC address of the device - the group was obtained by matching its probe requests against other devices.
		col1.innerHTML = relationshipsResults[i][0];

		// Add all other columns (cells). Maximum 40.
		for(var y = 0; y < maxCells; y++) {

			// Insert second column (y+1).
			col2 = row.insertCell(y+1);

			// Add MAC address of the device to the cell or "-" otherwise - since not all groups have 40 members.
			if(y < relationshipsResults[i][1].length){
				// [i][1][y][0] is the index of the MAC address of the group's member. relationshipsResults is a 3D array.
				// Example: [[['11:22:33:44:55:66'], ['22:33:44:55:66:77', 'essid1', 'essid2'], ['33:44:55:66:77:88', 'essid2', 'essid3']]] where
				// '11:22:33:44:55:66' shares 'essid1', 'essid2' and 'essid3' with 2 devices.
				col2.innerHTML = relationshipsResults[i][1][y][0];
			}else {
				col2.innerHTML = "-";
			}
		}
	}
}

// Function to populate the dropdown menu with values from 2 to 7 (Minimum shared ESSIDs among devices.). User can choose any of these values but higher values
// will produce better results as 2 probe requests (ESSIDs) are likely be shared among large number of devices.
function populateDropdownOptions() {

	var drowdownRelations = document.getElementById("relDropdown");
	var firstRel = document.getElementById("firstRel");

	// Set default option in the dropdown list to 2. 1 would be too low.
	firstRel.innerHTML = 2;

	// populate the rest of the menu.
	for(var i = 3; i < 8; i++) {
		var opt = i;
		var newOption = document.createElement("option");
		newOption.textContent = opt;
		newOption.value = opt;
		drowdownRelations.appendChild(newOption);
	}
}


function addESSIDsOptions() {

	var drowdownESSIDs = document.getElementById("exludeDropdown");
	var firstOption = document.getElementById("excludeOptions");
	var formatedName = " ";

	// Example values in the dropdown menu: WiFi name (190)
	// It is similar format like the one used on the home page for access points. The number in the brackets is how many clients are known to this particular AP.
	firstOption.innerHTML = "ESSID + Clients Count";

	// populate the rest of the menu.


	for (var i = 0; i < 100; i++) {

		formatedName = stationsWithKnownClients[i][0];

		// Trim WiFi names longer than 16 characters
		if(formatedName.length > 16) {
			formatedName = formatedName.slice(0, 12) + "...." + " (" + stationsWithKnownClients[i][3] + ")";
		} else {
			formatedName = formatedName + " (" + stationsWithKnownClients[i][3] + ")";
		}

		var opt = formatedName;
		var newOption = document.createElement("option");
		newOption.textContent = opt;
		newOption.value = opt;
		drowdownESSIDs.appendChild(newOption);
	}
}

// Function to add user's selected ESSID from the dropdown menu to the sroll-down table and the global array
function excludeEssid(essid) {
	var exclTable = document.getElementById("exclusion-table");

	// Get the length of the table (rows)
	var rowsCount = exclTable.tBodies[0].rows.length;

	// Add new row
	var row = exclTable.insertRow(rowsCount);

	// Add the ESSID into the cell
	row.innerHTML = essid;

	excludedEssids.push(essid);

	updateRelationships();
}

// Function to clear contents of the exclusion table and the array which holds all the excluded ESSIDs
function clearExclusionTable() {
	var exclTable = document.getElementById("exclusion-table");

	// Clear the table
	exclTable.innerHTML = "";

	// Add tbody tag to the table as the previous line deleted it
	exclTable.appendChild(document.createElement('tbody'));

	// Clear the array
	excludedEssids = [];

	updateRelationships();
}


function updateRelationships() {
	var minDropdown = document.getElementById("relDropdown");
	var optionsValue = minDropdown.options[minDropdown.selectedIndex].value;

	dropdownValue = optionsValue;

	computeRelationships();
	getStats();
	displayTotalAvg();
	populateTable();
}

function clearGreenResults() {
	var results = document.getElementById("probeRequests");
	results.innerHTML = ".....";
}
