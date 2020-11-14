var mymap;
var api_url;
var marker = new Array();
var bounds;
var reviewChecked = false;

/**
 * Entry point into the script.  Called when the page loads
 **/
function start() {
	setupMap();
	console.log("parse",api_url);
	readTextFile(api_url, parseText);
}

function checkBox() {
	var reviewCheckBox = document.getElementById("myCheck");
	if (reviewCheckBox.checked == true){
		reviewChecked = true;
	} else {
		reviewChecked = false;
	}

	updateMap();
}
/**
 * Returns the value of the parameter of a url
 **/
function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

/**
 * Changes the location bar value to reflect the current bounding box
 **/
function updateLocationBar(minlong, minlat, maxlong, maxlat) {
	var urlparameters = "?bbox=" +minlong + "," + minlat + "," +  maxlong + "," +  maxlat;
	var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + urlparameters;
	window.history.pushState({path:newurl},"",newurl);
}

/**
 * Prepares the map and adds the bounding box according to the url in the urlbar
 **/
function setupMap() {
	var bbox = getURLParameter('bbox') || "-11.0133787,51.222,-5.6582362,55.636";
	api_url = "https://api.openstreetmap.org/api/0.6/changesets?bbox=" + bbox
	var fields = bbox.split(',');
	var minlong = fields[0] * 1;
	var minlat = fields[1] * 1;
	var maxlong = fields[2] * 1;
	var maxlat = fields[3] * 1;
	mymap = L.map("mapid", {editable: true});
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	var southwest = new L.latLng(minlat, minlong);
	var northeast = new L.latLng(maxlat, maxlong);
	bounds = new L.LatLngBounds([southwest, northeast]);
	updateLocationBar(minlong, minlat, maxlong, maxlat);

	mymap.fitBounds(bounds);

	OpenStreetMap_Mapnik.addTo(mymap);

	L.EditControl = L.Control.extend({});
	L.NewRectangleControl = L.EditControl.extend({});
	var rectangle = L.rectangle([southwest,northeast]).addTo(mymap);
	rectangle.enableEdit();
	rectangle.on("editable:dragend editable:vertex:dragend", function() {
		bounds = this.getBounds();
		updateMap();
	});
}

function updateMap() {
		updateLocationBar(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());
		var bbox = getURLParameter("bbox")
		var newurl = "https://api.openstreetmap.org/api/0.6/changesets?bbox=" + bbox
		mymap.fitBounds(bounds);
		readTextFile(newurl, parseText);
}

/**
 * Adds the table of changesets to the relevant div
 **/
function parseText(xmlDoc) {
	for(i=0;i<marker.length;i++) {
		mymap.removeLayer(marker[i]);
	}
	
	marker = [];

	var changesets = xmlDoc.getElementsByTagName("changeset");
	var txt = "<table id='notestable'><thead><th>Changeset ID</th><th>Time Uploaded</th><th>Changeset Comment</th><th>Source Details</th><th>Author</th><th>No of Comments</th></thead><tbody>";

	for (var i = 0; i < changesets.length; i++) {
		var row = addRow(changesets[i], i)
		if (row) {
			txt += row;
		}

	}
	txt += "</tbody></table>";
	
	// Add the table to the notescontainer
	document.getElementById("notescontainer").innerHTML = txt;
	
	// Add layer of markers to the map
	var layerGroup = new L.LayerGroup(marker);
	mymap.addLayer(layerGroup);
}

/**
 * Reads the xml file
 **/
function readTextFile(file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/xml");
	rawFile.open("GET", file, true);
	rawFile.onreadystatechange = function() {
		if (rawFile.readyState === 4 && rawFile.status == "200") {
			callback(rawFile.responseXML);
		}
	};
	rawFile.send(null);
}

/**
 * Creates a table row from changeset xml
 **/
 function addRow(xml, k) {
	if (checkBoxIsWithinBounds(xml, bounds)) {
		var box = getCentreOfBox(xml);
		var lat = box[0];
		var lon = box[1];
		var id = xml.getAttribute('id');
		var dt = new Date(xml.getAttribute('created_at'));
		var changesCount = xml.getAttribute('changes_count');
		var user = xml.getAttribute('user');
		var commentsCount = xml.getAttribute('comments_count');
		var howLongAgo = getHowLongAgo(xml);

		var tags = xml.getElementsByTagName("tag");
		var comment = "";
		var source = "";
		var imagery = "";
		var created = "";
		var version = "";
		var review = "";
		var changesetCount = "";
		for (var j = 0; j < tags.length; j++) {
			if (tags[j].getAttribute('k') == "comment") {
				comment = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "source") {
				source = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "imagery_used") {
				imagery = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "created_by") {
				created = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "version") {
				version = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "review_requested") {
				review = tags[j].getAttribute('v');
			}
			if (tags[j].getAttribute('k') == "changesets_count") {
				changesetCount = tags[j].getAttribute('v');
			}
		}
		
		if (reviewChecked == true) {
			if (!review) {
				return "";
			}
		}

		var changesetIdCell = "<a href=https://www.openstreetmap.org/changeset/" + id + ">" + id + "</a><br/><span class='changesetChanges'>("+ changesCount +" changes)</span>";
		var timeCell = dt.toLocaleDateString() + " " + dt.toLocaleTimeString();

		var changesetCountText = "";
		if (changesetCount) {
			changesetCountText = "<br/><span class='changesetCount'>(" + changesetCount + " Changesets)</span>"
		}
		var createdCell = "";
		if (created) { createdCell += "<span class='changesetSource'>" + created + " </span>"; created = ""}
		if (version) { createdCell += "<span class='changesetSource'>version " + version + " </span>"; version = "";}
		if (createdCell != "") { createdCell += "<br/>"; }
		if (source) { createdCell += "<span class='changesetImagery'>" + source + " </span>"; source = "";}
		if (imagery) { createdCell += "<span class='changesetImagery'>" + imagery + " </span>"; imagery = "";}

		var txt = "";
		txt += "<tr class='toplevel' id ='" + id + "'><td class='changesetId'>" + changesetIdCell + "</td>";
		txt += "<td class='changesetTime'><span title='" + timeCell + "'>"+ howLongAgo + "</span></td>";
		txt+= "<td class='changesetComment'>" + comment + "</td>";
		txt += "<td class='changesetCreated'>" + createdCell + "</td>";
		txt += "<td class='changesetUser'><a href='https://www.openstreetmap.org/user/" + user + "'>" + user + "</a>" + changesetCountText + "</td>";
		txt += "<td class='changesetCommentsCount'>" + commentsCount + "</td>";
		txt += "</tr>";

		var myMarker = new L.marker([lat, lon]).bindPopup("<a href='https://www.openstreetmap.org/changeset/" + id + "'>Changeset " + id + "</a><br/>" + comment);
		marker.push(myMarker);
	}
	return txt;
 }

/**
 * Converts a timestamp into how long ago an event occurred
 **/
function getHowLongAgo(xml) {
	var dt = new Date(xml.getAttribute('created_at'));

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = Date.now() - dt;

    if (elapsed < msPerMinute) {
         return Math.round(elapsed/1000) + ' seconds ago';   
    }

    else if (elapsed < msPerHour) {
         return Math.round(elapsed/msPerMinute) + ' minutes ago';   
    }

    else if (elapsed < msPerDay ) {
         return Math.round(elapsed/msPerHour ) + ' hours ago';   
    }

    else if (elapsed < msPerMonth) {
        return 'about ' + Math.round(elapsed/msPerDay) + ' days ago';   
    }

    else if (elapsed < msPerYear) {
        return 'about ' + Math.round(elapsed/msPerMonth) + ' months ago';   
    }

    else {
        return 'about ' + Math.round(elapsed/msPerYear ) + ' years ago';   
    }
}

/**
 * Gets the centre of a changeset's bounding box (for the map marker position
 **/
function getCentreOfBox(xml) {
	var lat = ((xml.getAttribute('min_lat') * 1) + (xml.getAttribute('max_lat') * 1))/2;
	var lon = ((xml.getAttribute('min_lon') * 1) + (xml.getAttribute('max_lon') * 1))/2;
	return [lat, lon];
}

/**
 * Checks if the bounding box of the changeset is completely within the selected bounds
 * to filter out all the annoying worldwide changesets with no actual changes in the
 * desired area.
 **/
function checkBoxIsWithinBounds(xml, coordinates) {
	if (xml.getAttribute('min_lat') * 1 > coordinates.getSouth(),
		xml.getAttribute('min_lon') * 1 > coordinates.getWest(),
		xml.getAttribute('max_lat') * 1 < coordinates.getNorth(),
		xml.getAttribute('max_lon') * 1 < coordinates.getEast()) {
		return true;
	}
	return false;
}
