$(document).ready(function(){
	$(".active").removeClass("active");
	$("#stats-tab").addClass("active");

	
	/* Populate grid with with cout (APs per sector) */
	var gridDivs = document.getElementsByClassName("gridCell");

	for(i = 0; i < gridDivs.length;i++) {
		gridDivs[i].innerHTML = locationAsgrid[i][1];
	}

	insertIntoChannelTable();
	insertIntoPrivacyTable();
	insertIntoFilesTable();

	getAreaAverage();

	/*$('.gridCell').hover( function() {
		var APcount = $(this).text();
	});*/


	$('.gridCell').click(function () {
		var APcount = $(this).text();
		on(APcount);
	});
});


function on(count) {
	var overl = document.getElementById("overlay");
	var msg = document.getElementById("message");
	var box = document.getElementById("overlayBox");
	
	msg.innerHTML = count;

	var realCount = parseInt(count, 10);

	if(realCount < avgRange[0]){
		box.style.background = "green";
	} else if (realCount > avgRange[1]) {
		box.style.background = "red";
	} else {
		box.style.background = "DarkOrange";
	}

	overl.style.display = "block"
}

function off() {
	document.getElementById("message").innerHTML = " ";
	document.getElementById("overlay").style.display = "none";
}

var avgRange = [];


function getAreaAverage() {

	var total = 0;
	var areasCount = 0;
	var average = 0;

	for (var i = 0; i < locationAsgrid.length; i++) {
		if( locationAsgrid[i][1] != "0" ){
			total += parseInt( locationAsgrid[i][1], 10 );
			areasCount ++;
		}
	}

	average = total / areasCount;
	average = Math.round(average);

	var onePercent = average / 100;

	avgRange.push(average - Math.round(65 * onePercent));
	avgRange.push(average + Math.round(65 * onePercent));
	

	console.log("average range: " + avgRange);

}


function insertIntoChannelTable() {

	var table = document.getElementById("channelTable");
	
	var row = table.insertRow(0);

	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);
	var col4 = row.insertCell(3);
	var col5 = row.insertCell(4);
	var col6 = row.insertCell(5);
	var col7 = row.insertCell(6);
	var col8 = row.insertCell(7);
	var col9 = row.insertCell(8);
	var col10 = row.insertCell(9);
	var col11 = row.insertCell(10);
	var col12 = row.insertCell(11);
	var col13 = row.insertCell(12);
	var col14 = row.insertCell(13);

	col1.innerHTML = "<b>Channel</b>";
	col2.innerHTML = statsChannels[0][0];
	col3.innerHTML = statsChannels[1][0];
	col4.innerHTML = statsChannels[2][0];
	col5.innerHTML = statsChannels[3][0];
	col6.innerHTML = statsChannels[4][0];
	col7.innerHTML = statsChannels[5][0];
	col8.innerHTML = statsChannels[6][0];
	col9.innerHTML = statsChannels[7][0];
	col10.innerHTML = statsChannels[8][0];
	col11.innerHTML = statsChannels[9][0];
	col12.innerHTML = statsChannels[10][0];
	col13.innerHTML = statsChannels[11][0];
	col14.innerHTML = statsChannels[12][0];

	row = table.insertRow(1);

	col1 = row.insertCell(0);
	col2 = row.insertCell(1);
	col3 = row.insertCell(2);
	col4 = row.insertCell(3);
	col5 = row.insertCell(4);
	col6 = row.insertCell(5);
	col7 = row.insertCell(6);
	col8 = row.insertCell(7);
	col9 = row.insertCell(8);
	col10 = row.insertCell(9);
	col11 = row.insertCell(10);
	col12 = row.insertCell(11);
	col13 = row.insertCell(12);
	col14 = row.insertCell(13);

	col1.innerHTML = "<b>Count</b>";
	col2.innerHTML = statsChannels[0][1];
	col3.innerHTML = statsChannels[1][1];
	col4.innerHTML = statsChannels[2][1];
	col5.innerHTML = statsChannels[3][1];
	col6.innerHTML = statsChannels[4][1];
	col7.innerHTML = statsChannels[5][1];
	col8.innerHTML = statsChannels[6][1];
	col9.innerHTML = statsChannels[7][1];
	col10.innerHTML = statsChannels[8][1];
	col11.innerHTML = statsChannels[9][1];
	col12.innerHTML = statsChannels[10][1];
	col13.innerHTML = statsChannels[11][1];
	col14.innerHTML = statsChannels[12][1];
}

function insertIntoPrivacyTable() {

	var table = document.getElementById("encryptionTable");
	
	var row = table.insertRow(0);

	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);
	var col4 = row.insertCell(3);
	var col5 = row.insertCell(4);

	col1.innerHTML = "<b>Privacy</b>";
	col2.innerHTML = privacy[0][0];
	col3.innerHTML = privacy[1][0];
	col4.innerHTML = privacy[2][0];
	col5.innerHTML = privacy[3][0];

	row = table.insertRow(1);

	col1 = row.insertCell(0);
	col2 = row.insertCell(1);
	col3 = row.insertCell(2);
	col4 = row.insertCell(3);
	col5 = row.insertCell(4);

	col1.innerHTML = "<b>Count</b>";
	col2.innerHTML = privacy[0][1];
	col3.innerHTML = privacy[1][1];
	col4.innerHTML = privacy[2][1];
	col5.innerHTML = privacy[3][1];
}


function insertIntoFilesTable() {

	rowCounter = 0;
	var table = document.getElementById("filestats");
	
	var row = table.insertRow(rowCounter);

	var col1 = row.insertCell(0);
	var col2 = row.insertCell(1);
	var col3 = row.insertCell(2);

	col1.innerHTML = "<b>Name</b>";
	col2.innerHTML = "<b>Unique Access Points</b>";
	col3.innerHTML = "<b>Clients</b>";

	for(var i = 0; i < filestats.length; i++) {

		rowCounter ++;
		row = table.insertRow(rowCounter);

		col1 = row.insertCell(0);
		col2 = row.insertCell(1);
		col3 = row.insertCell(2);

		col1.innerHTML = filestats[i][0];
		col2.innerHTML = filestats[i][1];
		col3.innerHTML = filestats[i][2];
	}
}
