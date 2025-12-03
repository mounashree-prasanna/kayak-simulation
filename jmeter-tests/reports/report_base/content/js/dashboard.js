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

    var data = {"OkPercent": 27.272727272727273, "KoPercent": 72.72727272727273};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.09504545454545454, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.0275, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [1.0, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.0, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.018, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11000, 8000, 72.72727272727273, 1778.0675454545442, 4, 4949, 19.0, 4353.0, 4417.0, 4533.98, 50.546824740373125, 409.5621094108997, 8.97493337009466], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 10.32800000000002, 5, 80, 9.0, 13.0, 15.0, 59.99000000000001, 4.613801726484605, 1.3111487328193558, 0.6217818732957769], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 3927.7480000000014, 149, 4947, 4265.0, 4446.0, 4486.95, 4870.87, 4.699513130439686, 231.88701166184183, 0.9270523948718912], "isController": false}, {"data": ["7. Get User", 1000, 1000, 100.0, 7.662999999999997, 4, 61, 7.0, 10.0, 12.0, 23.970000000000027, 4.614589486119314, 1.7349774923397814, 0.6218880362152983], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 12.743000000000004, 7, 95, 11.0, 15.0, 18.0, 67.0, 4.613056795955272, 1.2388580262575193, 0.6847506181496106], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 13.02699999999999, 5, 108, 10.0, 23.0, 30.0, 51.0, 4.831851565519907, 1.5996071100695786, 0.9484396139350599], "isController": false}, {"data": ["4. Hotel Details", 1000, 1000, 100.0, 3895.6550000000034, 79, 4910, 4214.0, 4400.9, 4436.0, 4822.84, 4.661570016781652, 1.3156188816893528, 0.6191147678538131], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 9.50499999999999, 4, 68, 9.0, 12.0, 16.0, 31.99000000000001, 4.612418475503445, 1.5810145360368255, 0.9414018177541211], "isController": false}, {"data": ["6. Car Details", 1000, 1000, 100.0, 3885.1699999999996, 183, 4931, 4217.0, 4415.9, 4455.0, 4871.93, 4.611142364409359, 1.2923807212748886, 0.5944050704121439], "isController": false}, {"data": ["2. Flight Details", 1000, 1000, 100.0, 3841.9419999999973, 50, 4901, 4215.0, 4402.9, 4445.849999999999, 4833.96, 4.768489819274236, 1.3504512183491488, 0.6240015974440895], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 18.251000000000012, 10, 96, 16.0, 23.0, 27.0, 70.99000000000001, 4.612227013813619, 1.3467342550100316, 1.5944612918847867], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 3936.710999999999, 188, 4949, 4257.0, 4448.0, 4482.9, 4839.76, 4.624940453891656, 171.33507433435545, 0.9213748560487284], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 2000, 25.0, 18.181818181818183], "isController": false}, {"data": ["500/Internal Server Error", 1000, 12.5, 9.090909090909092], "isController": false}, {"data": ["401/Unauthorized", 1000, 12.5, 9.090909090909092], "isController": false}, {"data": ["404/Not Found", 4000, 50.0, 36.36363636363637], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11000, 8000, "404/Not Found", 4000, "400/Bad Request", 2000, "500/Internal Server Error", 1000, "401/Unauthorized", 1000, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["8. Get Booking", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["7. Get User", 1000, 1000, "500/Internal Server Error", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["4. Hotel Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, "401/Unauthorized", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["6. Car Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["2. Flight Details", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
