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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.4552820053715309, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.045, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [1.0, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [1.0, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.0405, 500, 1500, "5. Car Search"], "isController": false}, {"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [1.0, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11170, 4170, 37.33213965980304, 786.1794986571161, 5, 5671, 18.0, 4746.0, 5168.0, 5430.289999999999, 103.36275979494013, 1271.5136720557343, 18.700323326717005], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 36.475, 10, 696, 17.0, 47.0, 83.8499999999998, 548.95, 9.334279206959637, 2.652612548071538, 1.25793997125042], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 4251.699, 192, 5671, 4932.0, 5333.0, 5444.95, 5604.85, 9.371456418041928, 462.5416480701829, 1.8486662074653022], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 67.56, 51, 104, 64.0, 82.0, 89.79999999999998, 104.0, 7.457121551081283, 2.3012211036539894, 3.073149701715138], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 18.30100000000001, 8, 76, 16.0, 26.899999999999977, 32.94999999999993, 55.0, 9.343087516700768, 438.28543979080825, 1.4233609888723826], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 12.379999999999999, 5, 44, 11.5, 16.9, 19.0, 44.0, 7.5075075075075075, 2.6760158596096097, 2.1261495870870872], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 20.512999999999998, 7, 134, 15.0, 41.0, 51.94999999999993, 88.97000000000003, 9.397524691996129, 7.112384410446288, 1.2756405587768183], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 17.800999999999984, 7, 155, 14.0, 24.0, 48.0, 85.0, 9.331143624962676, 6.0962256690429975, 1.2301800677441026], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 61.87700000000004, 26, 762, 41.0, 78.89999999999998, 110.89999999999986, 573.8100000000002, 9.345183025409552, 2.993378937826497, 3.239785130879288], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 4283.5710000000045, 144, 5668, 4941.5, 5344.9, 5436.9, 5559.91, 9.311160356803665, 345.06747463290753, 1.8549577273319802], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 20, 100.0, 38.6, 11, 110, 27.5, 85.7, 108.79999999999998, 110.0, 24.93765586034913, 8.255727867830423, 4.894989089775561], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 50, 100.0, 371.72, 36, 710, 370.0, 615.8, 670.4, 710.0, 7.41399762752076, 2.3747961150652435, 2.570282380634638], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 15.159999999999993, 7, 52, 14.0, 22.0, 26.0, 38.99000000000001, 9.333233778839693, 5.496035125625326, 1.2577990834764428], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 18.21300000000002, 6, 78, 14.0, 31.0, 40.0, 65.99000000000001, 9.539891054444157, 3.1582256518130567, 1.8725762714289804], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 12.863999999999994, 6, 47, 12.0, 18.0, 22.0, 32.97000000000003, 9.35401193571923, 3.206306825622509, 1.9091684517239442], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 21.796000000000014, 7, 187, 16.0, 41.89999999999998, 54.0, 81.99000000000001, 9.545628102329134, 7.140577271859488, 1.2584568298969072], "isController": false}]}, function(index, item){
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
