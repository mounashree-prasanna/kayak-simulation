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

    var data = {"OkPercent": 27.22323049001815, "KoPercent": 72.77676950998185};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.09419237749546279, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.0235, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [1.0, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.0, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.0145, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11020, 8020, 72.77676950998185, 1946.0995462795004, 4, 7057, 70.0, 4819.0, 4987.949999999999, 5396.069999999969, 46.81711586174082, 378.4154628713082, 8.314289761623561], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Cache Test - Flight Search", 20, 20, 100.0, 18.750000000000004, 10, 108, 14.0, 26.700000000000028, 103.99999999999994, 108.0, 49.382716049382715, 16.34837962962963, 9.693287037037036], "isController": false}, {"data": ["8. Get Booking", 1000, 1000, 100.0, 25.728, 7, 715, 14.0, 48.0, 56.94999999999993, 400.2500000000007, 4.2837192964419435, 1.2173460110005911, 0.5772981083095586], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 4272.216999999995, 268, 7055, 4577.0, 5021.7, 5183.799999999999, 6935.97, 4.35358038450822, 214.87719263994583, 0.8588117555377542], "isController": false}, {"data": ["7. Get User", 1000, 1000, 100.0, 59.73000000000003, 41, 226, 54.0, 79.89999999999998, 92.94999999999993, 168.97000000000003, 4.288789960800459, 1.2062221764751293, 0.5779814595609994], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 10.755000000000011, 5, 69, 10.0, 15.0, 18.0, 25.99000000000001, 4.283737646771561, 1.2087502837976192, 0.6358673069426536], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 10.60399999999999, 5, 108, 9.0, 15.0, 19.949999999999932, 33.950000000000045, 4.455970554946573, 1.4751699395770392, 0.8746582827580676], "isController": false}, {"data": ["4. Hotel Details", 1000, 1000, 100.0, 4245.589000000006, 221, 7005, 4535.5, 4974.0, 5106.849999999999, 6884.66, 4.321969435032155, 1.2197745768791923, 0.5740115655902082], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 9.416000000000018, 4, 52, 9.0, 13.0, 15.0, 20.0, 4.274728234152514, 1.465263291198762, 0.872478711853394], "isController": false}, {"data": ["6. Car Details", 1000, 1000, 100.0, 4235.514999999993, 354, 6991, 4519.0, 4997.9, 5148.849999999999, 6935.0, 4.286436856498667, 1.2013743923975755, 0.5525485010330312], "isController": false}, {"data": ["2. Flight Details", 1000, 1000, 100.0, 4206.467999999995, 79, 7006, 4515.5, 4995.8, 5134.799999999999, 6929.95, 4.404917650064532, 1.2474864438659319, 0.5764247706139134], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 74.16700000000014, 45, 734, 65.0, 89.0, 109.94999999999993, 404.60000000000036, 4.273814764320484, 1.2103576969266998, 1.47747111969673], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 4295.452999999997, 261, 7057, 4565.0, 5074.8, 5183.9, 6986.85, 4.296307753116972, 159.21926052219473, 0.8559050601912715], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 2020, 25.18703241895262, 18.330308529945555], "isController": false}, {"data": ["401/Unauthorized", 1000, 12.468827930174564, 9.074410163339383], "isController": false}, {"data": ["404/Not Found", 5000, 62.34413965087282, 45.37205081669691], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11020, 8020, "404/Not Found", 5000, "400/Bad Request", 2020, "401/Unauthorized", 1000, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["Cache Test - Flight Search", 20, 20, "400/Bad Request", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["8. Get Booking", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["7. Get User", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["4. Hotel Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, "401/Unauthorized", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["6. Car Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["2. Flight Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
