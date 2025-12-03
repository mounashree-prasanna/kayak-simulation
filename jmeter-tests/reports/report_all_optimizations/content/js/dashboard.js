/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 62.66786034019696, "KoPercent": 37.33213965980304};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5329901521933751, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.669, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [0.975, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.8885, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.871, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.6825, 500, 1500, "5. Car Search"], "isController": false}, {"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [0.9765, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.891, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11170, 4170, 37.33213965980304, 395.07350044762717, 8, 2336, 333.0, 767.0, 954.0, 1343.289999999999, 192.51318465409673, 1187.3845736854125, 35.04917181198511], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 383.15600000000023, 21, 1483, 268.0, 926.9, 1052.0, 1317.97, 18.123165029540758, 5.150235374605821, 2.4423796621842038], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 632.7090000000005, 127, 1440, 601.0, 978.8, 1053.85, 1361.91, 17.547553870990384, 178.55934993989962, 3.5300743138906436], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 133.11999999999995, 66, 521, 121.0, 174.9, 296.79999999999893, 521.0, 8.180628272251308, 2.5244907558900525, 3.3713136043848166], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 220.70900000000012, 18, 805, 184.0, 417.0, 506.6499999999995, 754.9300000000001, 18.131708732230926, 850.5610418139868, 2.762252502175805], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 29.820000000000004, 8, 69, 28.0, 51.29999999999999, 63.04999999999996, 69.0, 8.34306691139663, 2.973847092441181, 2.3627826213916236], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 385.8899999999999, 23, 1129, 368.5, 607.0, 709.8999999999999, 854.95, 17.699115044247787, 13.394842367256636, 2.402516592920354], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 389.7249999999997, 15, 1234, 371.0, 616.8, 722.9499999999999, 928.8900000000001, 17.973327581868507, 11.740619888834969, 2.369530491750243], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 677.2899999999997, 53, 2336, 585.5, 1288.0, 1417.85, 1807.98, 18.17124582061346, 5.82047717691525, 6.299601822575956], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 620.1130000000002, 91, 1445, 586.0, 987.8, 1091.7999999999997, 1337.4400000000005, 17.813563247056308, 137.6540316547019, 3.600983976699859], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 20, 100.0, 40.4, 11, 298, 20.0, 84.10000000000007, 287.4499999999998, 298.0, 23.696682464454973, 7.8448978080568725, 4.72082345971564], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 50, 100.0, 433.62000000000006, 105, 1634, 344.0, 779.3, 1109.6999999999978, 1634.0, 7.2854436835203265, 2.3336186798776044, 2.5257153395016756], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 204.11900000000006, 20, 766, 184.0, 375.79999999999995, 485.89999999999986, 658.9000000000001, 18.121522932787272, 10.671170242647191, 2.4421583639889097], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 295.154, 14, 993, 284.0, 466.69999999999993, 566.8499999999998, 662.8600000000001, 17.365633411478683, 5.748974342276634, 3.4595597811930188], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 191.55000000000013, 12, 752, 173.0, 347.9, 454.0, 629.99, 18.363786612799558, 6.294618262785787, 3.8018776971811588], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 381.91999999999985, 28, 1447, 363.0, 586.9, 682.8499999999998, 865.96, 17.448961786773687, 13.050971416419472, 2.300400235560984], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 2070, 49.64028776978417, 18.531781557743958], "isController": false}, {"data": ["401/Unauthorized", 1000, 23.980815347721823, 8.952551477170994], "isController": false}, {"data": ["404/Not Found", 1050, 25.179856115107913, 9.400179051029543], "isController": false}, {"data": ["409/Conflict", 50, 1.1990407673860912, 0.4476275738585497], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11170, 4170, "400/Bad Request", 2070, "404/Not Found", 1050, "401/Unauthorized", 1000, "409/Conflict", 50, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["8. Get Booking", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, "409/Conflict", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, "404/Not Found", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 20, "400/Bad Request", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 50, "400/Bad Request", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, "401/Unauthorized", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
