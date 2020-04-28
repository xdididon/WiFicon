from flask import Flask, render_template, make_response, json, jsonify, request, Response
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure
from timeit import default_timer as timer
import argparse
import concurrent.futures
import gc
import hashlib
import io
import numpy as np
import pandas as pd
import os

# Define Flask's options
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.debug = True
app._static_folder = os.path.abspath("templates/static/")

# lambda basestring returns 'NameError' exception because it is no longer defined in Python 3. This is a patch taken from:
# https://github.com/oxplot/fysom/issues/1
try:
	unicode = unicode
except NameError:
	# 'unicode' is undefined, must be Python 3
	str = str
	unicode = str
	bytes = bytes
	basestring = (str,bytes)
else:
	# 'unicode' exists, must be Python 2
	str = str
	unicode = unicode
	bytes = str
	basestring = basestring


# Define file prefixes for output files. Their names correspond to the variables passed to the Flask routes.
outFilenames = ["out_stationsAPsCountWithoutPNL_", "out_kismetLists_", "out_associatedClients_", "out_areaCount_", "out_channelCount_", "out_privacyCount_", "out_statistics_", "out_stationsAPsCount_", "out_uESSIDlist_"]

firstRun = False
statistics = []
captureTime = []
accessPointsList = []
remainingAPs = []
stationsWithProbeRequests = []
stationsAPsCount = []
stationsAPsCountWithoutPNL = []
associatedClients = []
listOfAllStations = []
kismetLists = []
uESSIDlist = []
cleanList = []
areaCount = []
channelCount = []
privacyCount = []
dailyRequests = []
up = 1.0
down = 1.0
left = 1.0
right = 1.0
totalH = 1.0
totalW = 1.0
sectionH = 1.0
sectionW = 1.0

def parse_args():
    # Define script's arguments options - user needs to pass path to all log file 
    parser = argparse.ArgumentParser(description="Python script for processing data from Airodump-ng log files")
    parser.add_argument("-c", "--clients", help="Path to the log file with all clients - normally the bottom part of the name.csv file", required=True)
    parser.add_argument("-r", "--routers", help="path to the log file with all routers - normally the top part of the name.csv file", required=True)
    parser.add_argument("-k", "--kismetlog", help="Path to the Kismet log file - name.kismet.csv", required=True)
    parser.add_argument("-l", "--logfile", help="Path to the log - name.log.csv", required=True)
    return parser.parse_args()


args = parse_args()

# Save script's arguments (filenames) in variables
stationsLogFile = args.clients
routersLogFile = args.routers
kismetLogFile = args.kismetlog
carLogFile = args.logfile



# Function to calulate hash value of the name.kismet.csv file. The 
# first six values of the hash are used to differentiate one Airodump-ng 
# capture from another.
# The function was taken from https://stackoverflow.com/a/3431838
def md5(fname):
    hash_md5 = hashlib.md5()
    with open(fname, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


fileHEX = md5(kismetLogFile)
fileHEX = fileHEX[:6]


def getTimestamps(mac):
    results = []
    for stime in listOfAllStations:
            if stime[0] == mac:
                results = [stime[1], stime[2]]
                return results
    results = [0, 0]
    return results


def getTimeForAPs(essid):
    results = []
    for name in accessPointsList:
        if name[9] == essid:
            results = [name[1], name[2]]
            return results

    results = ["unknown", "unknown"]
    return results
            

# Match BSSID address of associated stations to AP's ESSID. Return ESSID if known, 0 otherwise.
def getEssid(essid):
    for klist in kismetLists:
        if klist[1] == essid:
            return klist[0]

    return 0


# Add column to the csv_stations dataframe with essid of associated clients - 0 otherwise.
def assignAssoc(x):
    # First row
    if x['BSSID'] == "(not associated)": return 0
    else: 
        match = getEssid(x['BSSID'])
        return match


# Get all unique probe requests for particular client
def essidsPerMAC(stationMAC):
    results = []
    for i in cleanList:
        if(stationMAC == i[0]):
            counter = 0
            for element in i:
                # count > 3 because probe requests are recorded from index 5. Not all clients have these records so accessing directly index 5 would throw error 
                if(counter > 3):
                    if(element not in results):
                        results.append(element)
                counter += 1
    return results


# Lambda function to group APs in name.kismet.csv file into different geographic areas - the areas represent a 5x5 grid based on the highest/lowest latitude and longitude data recorded.
# Height: max lat - min lat
# Width: max lon - min lon
# Both height and width is then divided by 5. This forms 1 row / columns in the grid.
def assignArea(x):
    # First row
    if x['BestLat'] >= down+(sectionH*4) and x['BestLon'] < left+sectionW: return 1
    elif x['BestLat'] >= down+(sectionH*4) and x['BestLon'] < left+(sectionW*2) and x['BestLon'] >= left+sectionW: return 2
    elif x['BestLat'] >= down+(sectionH*4) and x['BestLon'] < left+(sectionW*3) and x['BestLon'] >= left+(sectionW*2): return 3
    elif x['BestLat'] >= down+(sectionH*4) and x['BestLon'] < left+(sectionW*4) and x['BestLon'] >= left+(sectionW*3): return 4
    elif x['BestLat'] >= down+(sectionH*4) and x['BestLon'] >= left+(sectionW*4): return 5
    # Second row
    elif x['BestLat'] >= down+(sectionH*3) and x['BestLat'] < down+(sectionH*4) and x['BestLon'] < left+sectionW: return 6
    elif x['BestLat'] >= down+(sectionH*3) and x['BestLat'] < down+(sectionH*4) and x['BestLon'] < left+(sectionW*2) and x['BestLon'] >= left+sectionW: return 7
    elif x['BestLat'] >= down+(sectionH*3) and x['BestLat'] < down+(sectionH*4) and x['BestLon'] < left+(sectionW*3) and x['BestLon'] >= left+(sectionW*2): return 8
    elif x['BestLat'] >= down+(sectionH*3) and x['BestLat'] < down+(sectionH*4) and x['BestLon'] < left+(sectionW*4) and x['BestLon'] >= left+(sectionW*3): return 9
    elif x['BestLat'] >= down+(sectionH*3) and x['BestLat'] < down+(sectionH*4) and x['BestLon'] >= left+(sectionW*4): return 10
    # Third row
    elif x['BestLat'] >= down+(sectionH*2) and x['BestLat'] < down+(sectionH*3) and x['BestLon'] < left+sectionW: return 11
    elif x['BestLat'] >= down+(sectionH*2) and x['BestLat'] < down+(sectionH*3) and x['BestLon'] < left+(sectionW*2) and x['BestLon'] >= left+sectionW: return 12
    elif x['BestLat'] >= down+(sectionH*2) and x['BestLat'] < down+(sectionH*3) and x['BestLon'] < left+(sectionW*3) and x['BestLon'] >= left+(sectionW*2): return 13
    elif x['BestLat'] >= down+(sectionH*2) and x['BestLat'] < down+(sectionH*3) and x['BestLon'] < left+(sectionW*4) and x['BestLon'] >= left+(sectionW*3): return 14
    elif x['BestLat'] >= down+(sectionH*2) and x['BestLat'] < down+(sectionH*3) and x['BestLon'] >= left+(sectionW*4): return 15
    # Forth row
    elif x['BestLat'] >= down+sectionH and x['BestLat'] < down+(sectionH*2) and x['BestLon'] < left+sectionW: return 16
    elif x['BestLat'] >= down+sectionH and x['BestLat'] < down+(sectionH*2) and x['BestLon'] < left+(sectionW*2) and x['BestLon'] >= left+sectionW: return 17
    elif x['BestLat'] >= down+sectionH and x['BestLat'] < down+(sectionH*2) and x['BestLon'] < left+(sectionW*3) and x['BestLon'] >= left+(sectionW*2): return 18
    elif x['BestLat'] >= down+sectionH and x['BestLat'] < down+(sectionH*2) and x['BestLon'] < left+(sectionW*4) and x['BestLon'] >= left+(sectionW*3): return 19
    elif x['BestLat'] >= down+sectionH and x['BestLat'] < down+(sectionH*2) and x['BestLon'] >= left+(sectionW*4): return 20
    # Fifth row
    elif x['BestLat'] < down+sectionH and x['BestLon'] < left+sectionW: return 21
    elif x['BestLat'] < down+sectionH and x['BestLon'] < left+(sectionW*2) and x['BestLon'] >= left+sectionW: return 22
    elif x['BestLat'] < down+sectionH and x['BestLon'] < left+(sectionW*3) and x['BestLon'] >= left+(sectionW*2): return 23
    elif x['BestLat'] < down+sectionH and x['BestLon'] < left+(sectionW*4) and x['BestLon'] >= left+(sectionW*3): return 24
    elif x['BestLat'] < down+sectionH and x['BestLon'] >= left+(sectionW*4): return 25
    else: return 0



# Count stations for all known access points - the results is an sorted array from highest to lowest count
# For example: WiFiName (10) - meaning 10 clients are known to WiFiName AP. This does not mean that 10 clients were seen as associated to this AP but rather that
# probe requests of 10 clients contain WiFiName AP.
#####################################################


# Count number ap APs in each are and store the results in areaCount array
def getAreaCount():
    # kareas holds pandas Series with the count of each area
    kareas = log_kismet['area'].value_counts()

    global areaCount

    counter = 1

    for i in range(1, 26):
        # to escape 'KeyError' when particular area has 0 APs (kareas only returns values > 0) area variable is used to pull the values from karea
        area = kareas.get(counter)
        if area:
            areaCount.append([str(counter), str(area)])
            counter += 1
        else:
            # The area is empty, log it too...
            areaCount.append([str(counter), "0"])
            counter += 1



def apToDiffLocations(kismetdf):
	global up, down, left, right, totalH, totalW, sectionH, sectionW

	up = kismetdf['BestLat'].max()
	down = kismetdf['BestLat'].min()
	left = kismetdf['BestLon'].min()
	right = kismetdf['BestLon'].max()

	totalH = float('%.6f'%(up - down))
	totalW = float('%.6f'%(right - left))

	sectionH = float('%.6f'%(totalH / 5))
	sectionW = float('%.6f'%(totalW / 5))



def countChannels(APdataframe):
    global channelCount

    countCh = APdataframe['channel'].value_counts()

    counter = 1

    for i in range(1, 14):
        channel = countCh.get(counter)

        if channel:
            channelCount.append([str(counter), str(channel)])
            counter += 1
        else:
            channelCount.append([str(counter), "0"])
            counter += 1

            
def countPrv(dataframe):
    global privacyCount

    countPrivacy = dataframe['Privacy'].value_counts()
    pr = ["WPA2", "WPA", "OPN", "WEP"]

    for i in pr:
        priv = countPrivacy.get(i)
        if priv:
            privacyCount.append([ i, str(priv)])
        else:
            privacyCount.append([ i, "0"])


def getStatistics(UroutersDF, kismetDF, clientsDF):

	global captureTime, carLogFile, stationsLogFile, routersLogFile, kismetLogFile

	statsd = []
	tmp = []

	carLogsDF = pd.read_csv(carLogFile, usecols=["LocalTime" ,"BSSID", "Type"])

	# Get length count of name.csv log file - the log file contains only unique values so there is no need for further processing

	UroutersCount = len(UroutersDF.index)
	tmp = [routersLogFile, str(UroutersCount), "x"]
	statsd.append(tmp)

	# Get unique count from the name.kismet.csv sorted by BSSID
	routersKismetCount = kismetDF["BSSID"].value_counts()
	routersKismetCount = len(routersKismetCount)

	tmp = [kismetLogFile, str(routersKismetCount), "x"]
	statsd.append(tmp)

	# Get unique count of clients.csv sorted by BSSID
	clientsCount = clientsDF["Station_MAC"].value_counts()
	clientsCount = len(clientsCount)

	tmp = [stationsLogFile, "x", str(clientsCount)]
	statsd.append(tmp)

	# Get unique count of name.log.csv file - it contains both APs and clients so needs to be processed. Time capture from / to is 
	#taken from this file because it is the most strightforward log.
	routersCount = carLogsDF.loc[carLogsDF['Type'] == "AP"]
	routersCount = routersCount["BSSID"].value_counts()
	routersCount = len(routersCount)

	clientsDFCount = carLogsDF.loc[carLogsDF['Type'] != "AP"]
	clientsDFCount = clientsDFCount["BSSID"].value_counts()
	clientsDFCount = len(clientsDFCount)
        
	timeFrom = carLogsDF["LocalTime"].head(1).to_list()
	timeTo = carLogsDF["LocalTime"].tail(1).to_list()

	tmp = [carLogFile, str(routersCount), str(clientsDFCount)]

	statsd.append(tmp)

	captureTime = [timeFrom[0], timeTo[0]]

	return statsd, carLogsDF


def carLogs():
	global carLogFile

	car_station_log = pd.read_csv(carLogFile, usecols=["LocalTime" ,"BSSID", "Type"])
	car_station_log['datetime'] = pd.to_datetime(car_station_log['LocalTime'])
	car_station_log.drop(['LocalTime'], axis=1, inplace=True)
	car_station_log = car_station_log.loc[car_station_log['Type'] != "AP"].applymap(lambda x: np.nan if
                                                                      isinstance(x, basestring) and x.isspace() else x)
	car_station_log.drop('Type', axis=1, inplace=True)
	car_station_log = car_station_log.sort_values(by='datetime')
	car_station_log["Count"] = 1

	return car_station_log


def carLogs2():
# global carLogFile
	
	car_station_log = pd.read_csv("A-out_final.log.csv", usecols=["LocalTime" ,"BSSID", "Type"], dtype=object)
	car_station_log['datetime'] = pd.to_datetime(car_station_log['LocalTime'])
	car_station_log.drop(['LocalTime'], axis=1, inplace=True)
	#car_station_log = car_station_log.loc[car_station_log['Type'] != "AP"].applymap(lambda x: np.nan if
	#                                                               isinstance(x, basestring) and x.isspace() else x)
	car_station_log.drop('Type', axis=1, inplace=True)
	car_station_log = car_station_log.sort_values(by='datetime')
	car_station_log["Count"] = 1

	return car_station_log



def kismetLogsProcess():
	global kismetLogFile, kismetLists

	accurate_kismet = pd.read_csv(kismetLogFile, usecols=['ESSID', 'BSSID', 'BestLat', 'BestLon'])

	log_kismet = accurate_kismet[accurate_kismet['BestLat'] <= 50.526804 ]


	##########################################
	# add name.kismet.csv into list

	kismetLists = log_kismet.values.tolist()


	for lists in range(len(kismetLists)-1):
		if(str(kismetLists[lists][1]) == 'nan' or str(kismetLists[lists][2]) == 'nan' or str(kismetLists[lists][3]) == 'nan'):
			continue
		# Clean latitude and longitude columns - some fields are incomplete or they contain GPS co-ordinates with 10+ decimal places
		# The following code checks if GPS co-ordinates are valid (float) and then it cuts anything longer then 6 decimal from the list 
		if(float(kismetLists[lists][2]) and float(kismetLists[lists][3])):
			lat = '%.6f'%(float(kismetLists[lists][2]))
			lon = '%.6f'%(float(kismetLists[lists][3]))
			kismetLists[lists][2] = lat
			kismetLists[lists][3] = lon

	return log_kismet


def getPlotSelection(carDF):
    
    tmp = []
    availableToPlot = []
    
    car_clients_only = carDF.loc[carDF['Type'] != "AP"].applymap(lambda x: np.nan if
                                                                      isinstance(x, basestring) and x.isspace() else x)
    countCarLog = car_clients_only["BSSID"].value_counts()

    selection = countCarLog[countCarLog > 200]
    macs = selection.index.tolist()

    listlen = len(macs)

    for i in range(0,listlen):
        tmp = [str(macs[i]), str(selection[i])]
        availableToPlot.append(tmp)
    
    return availableToPlot


def filterClientsFromLogfile():
    wru = open ("A-out_final.log.csv", "w")
    car = open("final.log.csv", "r")
    
    name = "Client"
 
    wru.write("LocalTime,GPSTime,ESSID,BSSID,Power,Security,Latitude,Longitude,Latitude Error,Longitude Error,Type\n")

    for line in car:
        line = line.rstrip()
        if line.endswith(name):
            wru.write(line + "\n")

    wru.close()
    car.close()



def getProbeRequests(carProbeRequests):

    global dailyRequests

    clientsCopy = carProbeRequests.copy()
    macaddress_copy = clientsCopy.set_index('datetime')

    availableDates = carProbeRequests['datetime'].dt.strftime("%Y-%m-%d").unique().tolist()

    for day in availableDates:
        tmp = []
        uniqueDatesList = []
        uniqueDatesList.append(day)

        dfByDate = macaddress_copy[pd.to_datetime(macaddress_copy.index.date).isin(uniqueDatesList)]
        probesByDay = dfByDate["BSSID"].value_counts()
    
        probeReq = probesByDay.to_frame()
        probeReq.reset_index(drop=False, inplace=True)
        dayRequests = probeReq.values.tolist()
    
        for entry in dayRequests:
            if(entry[1] > 200):
                tmp.append(entry)
            else:
                continue

        dailyRequests.append(tmp)



def create_dataframes():

    global accessPointsList, stationsLogFile, routersLogFile, kismetLogFile

    accessPoints = pd.read_csv(routersLogFile, usecols=['BSSID', 'First time seen', 'Last time seen', 'channel', 'Speed', 'Privacy', 'Cipher', 'Authentication', 'ID-length' ,'ESSID'])


    accessPoints = accessPoints.fillna('unknown', inplace=False)
    accessPointsList = accessPoints.values.tolist()

    countChannels(accessPoints)
    countPrv(accessPoints)

    # Read clients.csv into dataframe
    csv_stations = pd.read_csv(stationsLogFile, usecols=['Station MAC', 'Station First seen', 'Station Last seen', 'BSSID',
                                                     'ESSID 1', 'ESSID 2', 'ESSID 3', 'ESSID 4',
                                                     'ESSID 5', 'ESSID 6', 'ESSID 7', 'ESSID 8',
                                                     'ESSID 9', 'ESSID 10'])


    csv_stations.columns = [c.replace(' ', '_') for c in csv_stations.columns]
   
    
    st_with_probe_essid = csv_stations[pd.notnull(csv_stations['ESSID_1'])]
    

    global stationsWithProbeRequests
    
    # Iterrate rows of st_with_probe_essid datagrame, select specific columns and add them to the stationsWithProbeRequests list.
    for index, rows in st_with_probe_essid.iterrows(): 
    # Get values of each row and append it to the list
        row = [rows.Station_MAC, rows.Station_First_seen, rows.Station_Last_seen, rows.BSSID, rows.ESSID_1,
        rows.ESSID_2, rows.ESSID_3, rows.ESSID_4, rows.ESSID_5, rows.ESSID_6, rows.ESSID_7, rows.ESSID_8,
        rows.ESSID_9, rows.ESSID_10]
        stationsWithProbeRequests.append(row)         
            
    # Create new column assoc_essid and run lambda function assignAssoc on it.
    # The function return ESSID of the AP to which the client was assiciated - zero otherwise. This is done because the dataframe contains only BSSID of access point which is not very user friendly.             
    csv_stations.loc[:, ('assoc_essid')] = csv_stations.apply(assignAssoc, axis=1)
      
    # Select only relevant columns from the dataframe
    csv_stations = csv_stations[['Station_MAC', 'Station_First_seen', 'Station_Last_seen',
                             'BSSID', 'assoc_essid', 'ESSID_1', 'ESSID_2', 'ESSID_3', 'ESSID_4', 'ESSID_5',
                             'ESSID_6', 'ESSID_7', 'ESSID_8', 'ESSID_9', 'ESSID_10']]


    # Combine ESSID_1 and assoc_essid columns
    csv_stations["assoc_essid"] = csv_stations["assoc_essid"].replace(0,np.NaN)
    csv_stations["ESSID_1"] = csv_stations["ESSID_1"].replace(0,np.NaN)

    csv_stations["PNL"] = csv_stations["ESSID_1"].combine_first(csv_stations["assoc_essid"]).astype(str)

    csv_stations = csv_stations.drop('ESSID_1', 1)
    csv_stations["PNL"] = csv_stations["PNL"].replace("nan",np.NaN)
    csv_stations.rename(columns={'PNL':'ESSID_1'}, inplace=True)


    # Fill 'nan' values with zeroes so JavaScript can understand it    
    csv_stations = csv_stations.fillna(0)
    
    global listOfAllStations, associatedClients

    listOfAllStations = csv_stations.values.tolist()
    
    
    assoc_stations = csv_stations.loc[csv_stations['assoc_essid'] != 0]
    assoc_stations = assoc_stations[['Station_MAC', 'assoc_essid']]
    
    tempList = assoc_stations.values.tolist()

    for entry in tempList:
        if entry in associatedClients:
            continue
        else:
            associatedClients.append(entry)
    

    uniqeESSIDsarray = pd.unique(csv_stations[['ESSID_1','ESSID_2', 'ESSID_3', 'ESSID_4','ESSID_5', 'ESSID_6', 'ESSID_7','ESSID_8', 'ESSID_9', 'ESSID_10']].values.ravel())

    dtype = [('Col1','object')]
    index = [str(i-1) for i in range(1, len(uniqeESSIDsarray)+1)]
    uniqueESSIDs = pd.DataFrame(uniqeESSIDsarray, index=index)

    uniqueESSIDs = uniqueESSIDs.dropna()

    uniqueESSIDs.rename(columns = {0:'UESSID'}, inplace = True)

    macAlist = st_with_probe_essid.Station_MAC.unique()

    for index, rows in uniqueESSIDs.iterrows(): 
        # Get values of each row and append it to the list - 0 is the initial count for stations known to 
        # particular AP
        row = [rows.UESSID, 0]
        uESSIDlist.append(row)


    global cleanList

    for i in stationsWithProbeRequests:
        noNan = [x for x in i if str(x) != 'nan']
        cleanList.append(noNan)

    # add count with default value 0 to the first index of each list in uESSIDlist
    for i in uESSIDlist:
        i[1] = 0


    global stationsAPsCount, stationsAPsCountWithoutPNL, remainingAPs
   
    #????
    # for each MAC address (station) with probe request:
    # - collect all probe requests for each station
    # - 
    for mac in macAlist:
        entries = essidsPerMAC(mac)        
        for element in entries:
            if element != "unknown":
                for essid in uESSIDlist:
                    # If ESSID is in the list then increment count at index 1
                    if(element == essid[0]):
                        essid[1] += 1
                        essid.append(mac)

        entries.insert(0, len(entries))
        entries.insert(0, mac)
        stationsAPsCount.append(entries)
        
    stationsAPsCount = sorted(stationsAPsCount, key=lambda list: list[1], reverse=True)

    timelist = []
    
    for station in stationsAPsCount:
            timeList = getTimestamps(station[0])
            station.insert(1, timeList[1])
            station.insert(1, timeList[0])
            
    remainingStations = csv_stations.loc[csv_stations['ESSID_1'] == 0]
    remainingStations = remainingStations.Station_MAC.unique()
            
    temp = []

    for station in remainingStations:
            timeList = getTimestamps(station)
            temp = [station, timeList[0], timeList[1], 0]
            stationsAPsCountWithoutPNL.append(temp)

    essidTime = []
    holder = "none"

    for entry in uESSIDlist:
        holder = entry[0]
        essidTime = getTimeForAPs(holder)
        entry.insert(1, essidTime[1])
        entry.insert(1, essidTime[0])

    # Finally, compare uESSIDlist against all access points
    # uESSIDlist holds count of clients per access point from probe requests
    # As not all probe requests include all known access points, the following
    # for loop checks for the remaining APs not yet processed (the majority of APs)
    # The results are appended into a list which has the same format as uESSIDlist
    # [ wifiname, First time seen, Last time seen, count of known clients - 0 in this case]
    temp = []
    
    for name in accessPointsList:
        # continue if essid is unknown - most likely hidden essid or broken packet
        if name[9] == "unknown":
            continue
        # continue if essid is in uESSIDlist - we already have this one 
        for wifi in uESSIDlist:
            if name[9] == wifi[0]:
                continue
        # if above is false then append the AP to remainingAPs
        temp = [name[9], name[1], name[2], 0]
        remainingAPs.append(temp) 


    return stationsAPsCountWithoutPNL, stationsAPsCount, uESSIDlist, csv_stations, accessPoints


def threadGetDataframe():

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future = executor.submit(create_dataframes)
        future2 = executor.submit(kismetLogsProcess)
        stationsAPsCountWithoutPNL, stationsAPsCount, uESSIDlist, csv_stations, accessPoints = future.result()
        log_kismet = future2.result()


    uESSIDlist = sorted(uESSIDlist, key=lambda list: list[3], reverse=True)

    apToDiffLocations(log_kismet)

    log_kismet.loc[:, ('area')] = log_kismet.apply(assignArea, axis=1)

    return stationsAPsCountWithoutPNL, stationsAPsCount, uESSIDlist, csv_stations, accessPoints, log_kismet


def finalStep(log_kismet, accessPoints, csv_stations):

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as e:
        future = e.submit(getAreaCount)

    statistics, carLogDF = getStatistics(accessPoints, log_kismet, csv_stations)

    filterClientsFromLogfile()

    clientsCarLog = carLogs2()

    getProbeRequests(clientsCarLog)

    dateRange = clientsCarLog['datetime'].dt.strftime("%Y-%m-%d").unique().tolist()
    
    return statistics, clientsCarLog, dateRange


# Check if the application ran previously on the give Airodump-ng log files. If all 9 files are present this function will return False.
def checkSession(checksum):
    global outFilenames, kismetLogFile

    extension = ".csv"
    filename = " "

    # For each output file
    for fprefix in outFilenames:
        # Create correct filename related to this capture file
        filename = fprefix + checksum + extension
        # Check if file exists in the current directory
        if not os.path.isfile(filename):
            return True

    return False

# Save 9 lists (which are used by the Flask Routes) into CSV file so the application does not need to do all the computing repeatedly on the same Airodump-ng log file.
def saveListsToCSV(outputFiles, fHex, l1, l2, l3, l4, l5, l6, l7, l8, l9):

    counter = 0
    extension = ".csv"
    filename = " "

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l1)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l2)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l3)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l4)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l5)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l6)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l7)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l8)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1

    filename = outputFiles[counter] + fHex + extension
    df = pd.DataFrame(l9)
    df.to_csv(filename, sep=',', index=False, encoding='utf-8')
    counter += 1


# Load pre-processed data from WiFicon logs rather than Airodump-ng logs.
def loadFromFile(outputFiles, fHex):

    extension = ".csv"
    removeEmpty = 'NoneNan'

    filename = outputFiles[0] + fHex + extension
    df1 = pd.read_csv(filename, dtype=object)
    dfList1 = df1.values.tolist()

    filename = outputFiles[1] + fHex + extension
    df2 = pd.read_csv(filename, dtype=object)
    dfList2 = df2.values.tolist()

    filename = outputFiles[2] + fHex + extension
    df3 = pd.read_csv(filename, dtype=object)
    dfList3 = df3.values.tolist()

    filename = outputFiles[3] + fHex + extension
    df4 = pd.read_csv(filename, dtype=object)
    dfList4 = df4.values.tolist()

    filename = outputFiles[4] + fHex + extension
    df5 = pd.read_csv(filename, dtype=object)
    dfList5 = df5.values.tolist()

    filename = outputFiles[5] + fHex + extension
    df6 = pd.read_csv(filename, dtype=object)
    dfList6 = df6.values.tolist()

    filename = outputFiles[6] + fHex + extension
    df7 = pd.read_csv(filename, dtype=object)
    dfList7 = df7.values.tolist()

    filename = outputFiles[7] + fHex + extension
    df8 = pd.read_csv(filename, dtype=object)
    df8.fillna("NoneNan", inplace=True)
    dfList8 = df8.values.tolist()

    filename = outputFiles[8] + fHex + extension
    df9 = pd.read_csv(filename, dtype=object)
    df9.fillna("NoneNan", inplace=True)
    dfList9 = df9.values.tolist()

    # Remove "nan" from two lists.
    for i in dfList8:
         while removeEmpty in i: i.remove(removeEmpty)

    for i in dfList9:
         while removeEmpty in i: i.remove(removeEmpty)

    return dfList1, dfList2, dfList3, dfList4, dfList5, dfList6, dfList7, dfList8, dfList9


def getDateRange():

    carLog = carLogs2()

    getProbeRequests(carLog)

    dates = carLog['datetime'].dt.strftime("%Y-%m-%d").unique().tolist()
    
    return dates, carLog


# Check if the program ran previously. If so firstRun is true, false otherwise.
firstRun = checkSession(fileHEX)

# If program runs for the first time on the given Airodump-ng log file.
if firstRun:
	# Run all the computation tasks --> unpack threadGetDataframe() function into 6 global variables (3 lists and 3 dataframes). Flask routes use the lists.
	stationsAPsCountWithoutPNL, stationsAPsCount, uESSIDlist, csv_stations, accessPoints, log_kismet = threadGetDataframe()

	# Same as above, finalStep() returns 3 lists which are used by the Flask routes.
	statistics, clientsCarLog, dateRange = finalStep(log_kismet, accessPoints, csv_stations)

	# Finally, to avoid running the expensive computation repeatedly on the same Airodump-ng log
	# files, save the results (from computations) in 9 CSV files and load them instead next time.
	# 9 CSV files because all of the Flask Routes in the application expect in total 9 variables (lists).
	saveListsToCSV(outFilenames, fileHEX, stationsAPsCountWithoutPNL, kismetLists, associatedClients, areaCount, channelCount, privacyCount, statistics, stationsAPsCount, uESSIDlist)
# If WiFicon has all 9 CSV log files for the given data catpure then load them. This saves considerable time rather then running all of the above computations.
else:
	# Save all of the 9 lists (from 9 CSVs file) into variables
	stationsAPsCountWithoutPNL, kismetLists, associatedClients, areaCount, channelCount, privacyCount, statistics, stationsAPsCount, uESSIDlist = loadFromFile(outFilenames, fileHEX)

	# Get date ranges and names.log.csv as a list - these are not loaded from WiFicon log files. 
	dateRange, clientsCarLog = getDateRange()


# Define Flask Route to /, application's main page. The route sends 4 lists to the HTML page.
@app.route('/', methods=['GET'])
def index():
	return render_template("layouts/index.html", associatedClients=associatedClients, stationsAPsCount=stationsAPsCount, kismetLists=kismetLists, stationsAPsCountWithoutPNL=stationsAPsCountWithoutPNL, uESSIDlist=uESSIDlist)


# Route to the "Plots" page.
@app.route('/activity', methods=['GET'])
def activity():
	return render_template("layouts/activity.html", associatedClients=associatedClients, dailyRequests=dailyRequests, dateRange=dateRange)


# Route to dynamically generate plots to see probe requests over specific time period for particular client. It accepts two URL paramets, mac and idx.
# Example: http:127.0.0.1/plot.png?mac=11:22:33:44:55:66&idx=3
@app.route('/plot.png')
def plot_png():
	mac = request.args.get('mac', default = '*', type = str)
	index = request.args.get('idx', default = 0, type = int)

	# generatePlot function return the actual plot. Index parameter specifies which 24 hour time period the user requested - where the capture file spans over
	# multiple days. 0 for the first day, 1 for the second day and so on. MAC is the MAC address of the device.
	probeReqPlot = generatePlot(mac, index)
	pngPlot = io.BytesIO()
	FigureCanvas(probeReqPlot).print_png(pngPlot)
	return Response(pngPlot.getvalue(), mimetype='image/png')


def generatePlot(address, dateIndex):

	# Convert deteIndex form string to int
	idx = int(dateIndex)

	# Initialise plots
	probeReqPlot = Figure()
	probeReqPlot.set_size_inches(4, 3)

	# Pull all probe request in the file for the specific device
	macaddress = clientsCarLog.loc[clientsCarLog['BSSID'] == address].applymap(lambda x: np.nan if
                                                                      isinstance(x, basestring) and x.isspace() else x)
	# Drop BSSID column as it empty
	macaddress.drop('BSSID', axis=1, inplace=True)

	# Get copy of macaddress dataframe as this function will change it
	macaddress_copy = macaddress.copy()

	# Get unique dates from the datetime column and save the result in the list
	availableDates = macaddress_copy['datetime'].dt.strftime("%Y-%m-%d").unique().tolist()

	# Save the date the user requested in the list
	uniqueDatesList = []
	uniqueDatesList.append(availableDates[idx])

	# Set datetime column as index
	macaddress_copy = macaddress_copy.set_index('datetime')

	# Get all records for the given date
	dfByDate = macaddress_copy[pd.to_datetime(macaddress_copy.index.date).isin(uniqueDatesList)]

	# Group the day into hours, count total of probe requests in each hour (Count column is 1) and add the result into a new dataframe
	probeRequestsByHour = dfByDate.groupby(dfByDate.index.hour)['Count'].value_counts().to_frame()
	
	# Rename the column Count to Total - the above added sub index with the name Count (Count is already column so this is
	# to avoid colision)
	probeRequestsByHour = probeRequestsByHour.rename(columns={'Count': 'Total'})

	# Reset index
	probeRequestsByHour.reset_index(drop=False, inplace=True)

	# Drop column Count - the one that was already there with default values set to 1
	# The results is a dataframe with two columns - assuming that the client has only probe requests for two hours (2pm and 3pm) the results will be:
	# datetime | Total
	# 14       | 200
	# 15       | 120
	probeRequestsByHour.drop('Count', axis=1, inplace=True)

	# Initialise new dataframe with range 0-23. This represents 24 hours. "Total" column is added with default value 0.
	# This is done in case users capture file does not cover full 24 hours but the plot should display full day coverage regardless. 
	# probeRequestsByHour varible above will not return hours which are missing.
	hoursInDay = pd.Series(range(0,24))
	dateHour = pd.DataFrame(hoursInDay, columns=['datetime'])
	dateHour['Total'] = 0

	# Concat probeRequestsByHour and dateHour dataframes and delete duplicates. probeRequestsByHour is given priority as it contains valid data. resulting dataframe will hold 2 columns:
	# datetime - values 0-23
	# Total - count of probe requests / 0 if none
	results = pd.concat([probeRequestsByHour,dateHour])
	results.drop_duplicates(subset=['datetime'], inplace=True, keep='first')

	# sort by ascending order - from midnight until 23:00
	results = results.sort_values(by=['datetime'], ascending=True)

	# Initialise subplot
	xyAxis = probeReqPlot.add_subplot(1, 1, 1)

	# Add X Y axis, color (C10 - blue), label and marker type
	xyAxis.plot(results['datetime'], results['Total'], 'C10', label='Probe Requests', marker = 'o')

	# Set label as legend, title and its size. Display the date in better format than the default Airodump-ng yyy-mm-dd. We will use dd/mm/yyy.
	splitdate = availableDates[idx].split("-")
	xyAxis.legend()
	title = "Activity on " + splitdate[2] + "/" + splitdate[1] + "/" + splitdate[0]
	probeReqPlot.suptitle(title, fontsize=12)

	# Create labels - note that set_xticklabels reads the array from index 1.
	labels = ["set_xticklabels ignors me", "12am", "5am", "12pm", "5pm", "10pm"]
	xyAxis.set_xticklabels(labels, fontdict=None, minor=False)
	
	return probeReqPlot

@app.route('/rel', methods=['GET'])
def relationships():
	return render_template("layouts/relationships.html", associatedClients=associatedClients, stationsAPsCount=stationsAPsCount, kismetLists=kismetLists, uESSIDlist=uESSIDlist)


# Define route for the "Help" page
@app.route('/help', methods=['GET'])
def helpPage():
	return render_template("layouts/help.html")



# Define route for the "Map" page. It passes 12 mac addresses of APs with known location as an URL argument. unloc argumenent holds ESSIDs of APs with unknown locations.
@app.route('/map' , methods = ['POST', 'GET'])
def map():
	mac1 = request.args.get('mac1', default = '*', type = str)
	mac2 = request.args.get('mac2', default = '*', type = str)
	mac3 = request.args.get('mac3', default = '*', type = str)
	mac4 = request.args.get('mac4', default = '*', type = str)
	mac5 = request.args.get('mac5', default = '*', type = str)
	mac6 = request.args.get('mac6', default = '*', type = str)
	mac7 = request.args.get('mac7', default = '*', type = str)
	mac8 = request.args.get('mac8', default = '*', type = str)
	mac9 = request.args.get('mac9', default = '*', type = str)
	mac10 = request.args.get('mac10', default = '*', type = str)
	mac11 = request.args.get('mac11', default = '*', type = str)
	mac12 = request.args.get('mac12', default = '*', type = str)
	unloc = request.args.get('unloc', default = '*', type = str)
	toView = [ mac1, mac2, mac3, mac4, mac5, mac6, mac7, mac8, mac9, mac10, mac11, mac12 ]
	unknownLoc = [ unloc ]
	return render_template("layouts/map.html", toView=toView, unknownLoc=unknownLoc)


# Define route to the "Statistics" page.
@app.route('/stats', methods = ['GET'])
def stats():
	return render_template("layouts/statistics.html", areaCount=areaCount, channelCount=channelCount, privacyCount=privacyCount, statistics=statistics)




if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
