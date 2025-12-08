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

    var data = {"OkPercent": 99.01671583087513, "KoPercent": 0.983284169124877};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9240904621435595, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.7285, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [0.978, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.971, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.962, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.991, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.732, 500, 1500, "5. Car Search"], "isController": false}, {"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [1.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.9655, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10170, 100, 0.983284169124877, 294.44110127827025, 8, 1039, 262.0, 555.0, 675.8999999999978, 869.0, 222.5967431272982, 1497.041371298262, 41.499631330984066], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["3. Hotel Search", 1000, 0, 0.0, 528.538, 80, 1039, 523.0, 768.9, 863.9499999999999, 977.0, 22.184262484193713, 237.87422077778027, 4.376192404108526], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 117.45999999999998, 64, 474, 106.5, 165.6, 174.35, 474.0, 9.767532721234616, 3.014199550693495, 4.025291805040047], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 224.63400000000001, 20, 920, 193.0, 392.9, 484.74999999999966, 672.95, 22.310970304098525, 1010.7028600572277, 3.39893688226501], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 28.840000000000014, 8, 74, 28.5, 45.699999999999996, 63.19999999999993, 74.0, 9.883376161296699, 3.5228831043684523, 2.7990030144297293], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 314.44500000000005, 21, 765, 320.0, 475.79999999999995, 508.94999999999993, 578.0, 22.236057991639242, 17.52392460864538, 3.0183711531619672], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 325.9779999999995, 24, 821, 330.5, 488.0, 513.9499999999999, 632.98, 22.281143468282792, 14.861348621911276, 2.9374554377130635], "isController": false}, {"data": ["10. Create Booking", 1000, 0, 0.0, 222.7239999999998, 22, 935, 202.0, 403.0, 434.94999999999993, 546.98, 22.340377999195745, 12.588279399937447, 7.723138488003217], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 513.083, 80, 1037, 526.5, 790.9, 854.5499999999994, 963.99, 22.213336887467236, 181.741539495313, 4.425313208050113], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 0, 0.0, 90.5, 31, 195, 77.5, 176.20000000000002, 194.1, 195.0, 10.834236186348862, 3.978196099674973, 2.243025460455038], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 0, 0.0, 115.80000000000004, 41, 208, 108.0, 174.9, 186.89999999999998, 208.0, 9.578544061302681, 5.397285081417625, 3.311332614942529], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 159.69600000000014, 14, 423, 149.5, 298.0, 332.89999999999986, 416.99, 22.328904767221168, 13.148759350228872, 3.0091688065200404], "isController": false}, {"data": ["1. Flight Search", 1000, 0, 0.0, 222.303, 28, 439, 227.0, 327.0, 348.94999999999993, 395.9000000000001, 22.13417738329755, 8.127393257929569, 4.582466411385821], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 0, 0.0, 155.34700000000007, 12, 398, 139.0, 294.79999999999995, 319.0, 346.0, 22.403441168563493, 8.795100927502464, 4.572577347880634], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 312.803, 43, 806, 309.0, 474.0, 517.9499999999999, 786.98, 22.199529369977355, 16.77972239488523, 2.926695766549749], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["404/Not Found", 50, 50.0, 0.4916420845624385], "isController": false}, {"data": ["409/Conflict", 50, 50.0, 0.4916420845624385], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10170, 100, "404/Not Found", 50, "409/Conflict", 50, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, "409/Conflict", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, "404/Not Found", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
