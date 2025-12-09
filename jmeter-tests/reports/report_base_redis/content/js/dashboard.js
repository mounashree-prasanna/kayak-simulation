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

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9695109780439122, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.8785, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.9925, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.9995, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.97, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [1.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.941, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.9735, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.998, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.9415, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10020, 0, 0.0, 219.72564870259458, 10, 1500, 183.0, 440.0, 530.0, 654.789999999999, 248.61055974593094, 1694.5984444006797, 45.75189497320365], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Cache Test - Flight Search", 20, 0, 0.0, 19.05, 11, 77, 15.0, 34.60000000000003, 74.94999999999997, 77.0, 49.87531172069826, 18.31359102244389, 10.32574812967581], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 387.2299999999998, 65, 1500, 373.5, 615.9, 668.0, 1085.8300000000002, 25.015634771732334, 267.7943245778612, 4.934724828017511], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 102.496, 11, 285, 100.0, 177.89999999999998, 188.0, 225.99, 25.040064102564102, 14.745272122896635, 3.3745398888221154], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 182.19799999999998, 17, 684, 166.0, 305.0, 369.94999999999993, 548.0, 25.033795624092527, 1134.020038379938, 3.813742302107846], "isController": false}, {"data": ["1. Flight Search", 1000, 0, 0.0, 199.67799999999988, 14, 517, 192.5, 336.0, 384.8499999999998, 460.0, 25.05888838771112, 9.201310579862678, 5.187972986518318], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 260.2790000000002, 14, 704, 248.0, 455.79999999999995, 512.8999999999999, 644.99, 25.0557490416176, 19.74608347322793, 3.4011221843602013], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 0, 0.0, 74.71400000000001, 10, 294, 63.0, 136.89999999999998, 175.0, 208.95000000000005, 25.070825080853414, 9.842257502444406, 5.11699457216637], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 307.48199999999997, 11, 659, 307.0, 520.9, 563.8499999999998, 619.99, 25.04131817498873, 16.702363587419242, 3.3013456578354288], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 227.0260000000001, 12, 711, 191.5, 403.9, 538.7499999999997, 653.98, 25.07648327398566, 18.954294974672752, 3.3059816816289684], "isController": false}, {"data": ["10. Create Booking", 1000, 0, 0.0, 141.66499999999994, 24, 644, 130.0, 238.0, 279.6999999999996, 355.99, 25.053865811494713, 14.117266184797314, 8.661199704364384], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 318.50200000000007, 62, 1171, 289.0, 531.0, 601.8999999999999, 686.96, 25.012506253126563, 204.2036643321661, 4.982960230115058], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10020, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
