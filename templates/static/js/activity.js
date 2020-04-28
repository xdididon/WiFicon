$(document).ready(function(){
	$(".active").removeClass("active");
	$("#scope-tab").addClass("active");

	// Function to declare global arrays. They will hold html table state - rows are either selected or not.
	declareGlobalArrays();

	// Function wchich populates the dropdown menu with all available dates found in the "name.log.csv" file.
	populateDates();

	// Listener to populate the table with new data when the user chooses new date from the dropdown menu.
	$("#datesDropdown").on("change", function() {
		insertIntoMACTable(this.value); 
	});


	// Function to get value (MAC address) of the user's selected row
	$("#macProbeTable").click(function (e){
		e = e || window.event;

		// this holds the MAC address
		var rowValues = [];

		// declare target
		var target = e.srcElement || e.target;
		
		// get TR element
		while (target && target.nodeName !== "TR") {
			target = target.parentNode;
		}
		// if target is found get its TD child and save the value of the row in the "rowValues" array
		if (target) {
			var cells = target.getElementsByTagName("td");
			for (var i = 0; i < cells.length; i++) {
				rowValues.push(cells[i].innerHTML);
			}
		}

		// Pass the MAC address (first element of the rowValues array) to the plotReady function
		plotReady(rowValues[0]);
	});

	/* Insert MACs and probe requests count into table */
	
	/* MOCKUP FUNCTION - clientsAssociated array would normally hold ESSID to which was particular client seen connected.
	However, since the clients capture was repeated in Aberdeen and not in Most (see dissertation for explaination), the records would not match. 
	This function uses random ESSIDs to populate the second column in the table.*/
	for(var i = 0; i < requestsByDate.length; i++) {
		for(var y = 0; y < requestsByDate[i].length; y++) {
			if ((y >= 0 && y <= 7) || (y >= 12 && y <= 17)) {
            			requestsByDate[i][y].push(clientsAssociated[i][1]);
			} else {
				requestsByDate[i][y].push("-");
			}
		}
	}

	// Function to populate the table with records.
	insertIntoMACTable(availableDates[0]);

});

// Function to highlight rows in the table
$(document).on("click","#macProbeTable tr", function(event) {
	// If the row is already selected
	if ($(this).hasClass('selected')) {
		// then remove the class
		$(this).removeClass('selected');
		// otherwise add the class
	} else {
		$(this).addClass('selected');
	}
});

// Global arrays which keep track of which plots have been already generated.
function declareGlobalArrays() {
	alreadySelected = ["none"];
	idCount = 0;
	colors = ["blue"];
	plotElement = {}
}


function plotReady(macAddress) {

	var pltTable = document.getElementById("plotTable");

	// Declare default boolean to check if the requested plot has been already processed.
	var processed = false;
	// var id = "none"
	var dropdownDate = getDropdownValue();
	var records = []
 

	// If the MAC address is already in alreadySelected array - plot has been already generated...
	for (var i = 0; i < alreadySelected.length; i++) {
		if(alreadySelected[i][0] == macAddress && alreadySelected[i][1] == dropdownDate){
			processed = true;
			alreadySelected[i] = []
		}
	}

	// Generate new plot.
	if(!processed){
		// Generate plot,
		insertPlot(macAddress);

 		// var tbodyRowCount = pltTable.tBodies[0].rows.length;
 
		// id = tbodyRowCount.toString();

		records = [macAddress, dropdownDate]

		// add the MAC address to the array
		alreadySelected.push(records);
	}	
}

// Function to check what is the index number of the selected date (dropdownDate). availableDates variable holds all available dates from the "name.log.csv" file. 
function dateToIndex(dropdownDate){

	var index = 0

	for(var i = 0; i < availableDates.length; i++) {
		if (availableDates[i] == dropdownDate) {
            		return index;
		} else {
			index++;
		}
	}

	return 0;
}

function insertIntoMACTable(selectedDate) {

	// Variable which holds index of user selected date.
	// It is used for requestsByDate index to populate the table with data of the specific date.
	var indexDate = 0;

	indexDate = dateToIndex(selectedDate);


	// This holds row number - 0 is header.
	var rowCounter = 0;

	var table = document.getElementById("macProbeTable");

	// Empty the table before it is populated
	table.innerHTML = "";

	// Insert new row into the table
	var row = table.insertRow(rowCounter);

	// Insert three cells (columns)
	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);

	// Define headers
	col1.innerHTML = "<b>MAC</b>";
	col2.innerHTML = "<b>Associated To</b>";
	col3.innerHTML = "<b>Probe Requests</b>";

	// Populate the table with records. requestsByDate 3D array holds a count of probe requests for each client (> 200). 
	for(var i = 0; i < requestsByDate[indexDate].length; i++) {

		// Row counter needs to increment by 1 because 0 is the header.
		rowCounter ++;
		// Create new row.
		row = table.insertRow(rowCounter);

		// Create 3 cells in the newly added row.
		col1 = row.insertCell(0);
		col2 = row.insertCell(1);
		col3 = row.insertCell(2);

		// Add MAC address to the table
		col1.innerHTML = requestsByDate[indexDate][i][0];
		// Add ESSID of the AP to which the client was een connected. "-" if none.
		col2.innerHTML = requestsByDate[indexDate][i][2];
		// Add total probe requests count for this specific date.
		col3.innerHTML = requestsByDate[indexDate][i][1];
	}

}


function getDropdownValue(){
	var options = document.getElementById('datesDropdown');
	var date = options[options.selectedIndex].value;
	return date;
}


// Function which inserts newly generated plot into the plotTable. It takes MAC address from the selected row (form macProbeTable) as its argument.
function insertPlot(macaddress, dateIndex) {

	var pltTable = document.getElementById("plotTable");

	var thisDate = getDropdownValue();

	var dateIndex = dateToIndex(thisDate);


	// urlstart defines classes and properties of the DIV
	var urlstart = '<div class="tableRow" onclick=removePlot(this)><div class="closeme"><h5 class="crossSign"><b>remove</b></h5></div><div class="imageHolder"><img src="/plot.png?mac=';

	var indexPart = "&idx="

	// End of the the DIV definition
	var urlend = '" alt="Plot"></div></div>';

	// Join everything together including the user's selected MAC address.
	var url = urlstart + macaddress + indexPart + dateIndex.toString() + urlend;

	// Get count of the elements of pltTable table. 
	var tbodyRowCount = pltTable.tBodies[0].rows.length;

	// Add new row to the end of the table.
	var row = pltTable.insertRow(tbodyRowCount);

	// Add new cell the the last row.
	var col1 = row.insertCell(0);

	// Add the DIV definition inside the table cell. This will automatically make HTTP request to the /plot.png?mac=[MAC address] which returns the plot.
	col1.innerHTML = url;

	// Scoll down to the bottom of the table.
	scrolldown();

}

// Function to scroll down so the user can see the last added plot.
function scrolldown() {
	setTimeout(
		function() {
			var plotDiv = document.getElementsByClassName("pre-scrollable");
			plotDiv[1].scrollTop = plotDiv[1].scrollHeight - plotDiv[1].clientHeight;
	}, 100);
}

// Function to remove plot from the table when the user clicks on the image or the button above it.
function removePlot(element) {
	var row = element.parentNode.parentNode;
	row.parentNode.removeChild(row);
}


function populateDates() {

	var drowdownDates = document.getElementById("datesDropdown");
	var firstOption = document.getElementById("firstDate");

	// Set default option in the dropdown list to the first available date.
	firstOption.innerHTML = availableDates[0];

	for(var i = 1; i < availableDates.length; i++) {
		var opt = availableDates[i];
		var newOption = document.createElement("option");
		newOption.textContent = opt;
		newOption.value = opt;
		drowdownDates.appendChild(newOption);
	}
}
