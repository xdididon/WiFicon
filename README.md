# WiFicon

WiFicon (WiFi Connections) is a Python Flask Web application for visualising relationships between devices on wireless networks.
It processes Airodump-ng (1.6) logs and calculates the following relationship groups:

* station to access points relationship
* access point to stations relationship
* station to station relationship
* station to geographical area relationship

The application also provides:

* activity tracking
* access point density overview

WiFicon does not make links between devices by only observing which client is connected to which access point. 
The application extracts the contents of every client's preferred network list (PNL) in the logs and then computes relationship
links this way. This results in an increase of 35% (see below) more relationships being established. 

Note that the application has been designed as PoC and at the moment it only works on the log files which were first formatted.
I might add them here later if I can make them anonymous or even better I will make the application to accept any 
Airodump-ng (1.6) logs.

## Required

Pandas, Numpy, Flask and Google Maps API Key

```
sudo apt install python3-pandas
sudo apt install python3-numpy
pip3 install Flask
```

Insert your Google API key at the bottom of the templates/layouts/map.html page:
```
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOURKEYGOESHERE&callback=initMap"></script>
```
## Usage
```
python3 app.py -c clients.csv -r routers.csv -k name.kismet.csv -l name.log.csv
```

* `-c`, path to the log file with all clients - normally the bottom part of the name.csv file
* `-r`, path to the log file with all routers - normally the top part of the name.csv file
* `-k`, path to the Kismet log (name.kismet.csv)
* `-l`, path to the file with real time probe requests records (name.log.csv)


The application was tested on Ubuntu and Kali Linux.
The capture file contained:

* 80,000 clients
* 24,000 access points with location
* 500,000 clients' probe requests

## Limitations

* Very long initial loading time. WiFicon logs decrease this to around 10 seconds.
* Basic design
* Missing some client side functionality - highlighting rows in the table etc.

## Screenshots

Homepage
![Homepage](/screenshots/1.png?raw=true "Homepage")


Display a PNL contents of the particular client. It is possible to show ESSIDs with known location on the map.
![Clients PNL](/screenshots/2.png?raw=true "Clients PNL")


Map
![Google Map](/screenshots/2a.png?raw=true "Google Map")


Display all clients known to particular access point. Connection "no" means that the client is matched by PNL to the 
access point.
![AP list](/screenshots/3.png?raw=true "AP list")


Client's activity tracking - hourly probe requests count. Clients with minimum 200 probe requests in a day are included in 
the list.
![Activity tracking](/screenshots/4.png?raw=true "Activity tracking")


Station to stations relationships through PNL matching. This can theoretically reveal real world relationships especially 
when the clients are matched through ESSID of home network as oppose to WiFi hotspots. The two ESSIDs in the green box are what 
connects these stations.
![Station to station relationships](/screenshots/5.png?raw=true "Station to station relationships")


Grid showing a density of access points.
![Statistics page](/screenshots/6.png?raw=true "Statistics page")


The idea behind the grid is to get max / min latitude and longitude values from the capture file and create a rectangle
from it.
![rectangle](/screenshots/6a.png?raw=true "rectangle")


The grid shoud resemble the shape of the most populated areas. The picture of the map is not part of the application.
![grid map](/screenshots/7.png?raw=true "grid map")


Graph comparing relationships based on connected clients only versus PNL based approach.
![bar](/screenshots/8.png?raw=true "bar")

Calculated as unique clients connections versus unique clients PNL entries in the file (this also includes
connected clients since this connection should be in their PNL even though in most cases it is not).

## Todo

* Process user's supplied Airodump-ng logs
* Improve design
* Implements tagging - MAC addresses are not very user friendly
* Improve the data processing part of the application
* Add advanced functionality?
