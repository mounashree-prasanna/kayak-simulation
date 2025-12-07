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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5811996418979409, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.7775, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.9835, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.9745, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.7745, 500, 1500, "5. Car Search"], "isController": false}, {"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.982, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11170, 4170, 37.33213965980304, 291.23769024171895, 11, 1249, 248.0, 550.0, 636.0, 848.289999999999, 232.34046093684998, 1455.3417050607372, 42.03488519479574], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 250.66999999999965, 28, 940, 193.0, 480.9, 584.9499999999999, 804.97, 21.17567338641369, 6.017696245553109, 2.8537528587159073], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 472.919, 110, 918, 482.5, 647.9, 691.8999999999999, 824.96, 21.02563024326654, 225.450605538151, 4.147634090956877], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 127.25999999999999, 64, 387, 115.5, 159.5, 264.09999999999906, 387.0, 8.496176720475786, 2.6218670348343247, 3.501354078164826], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 164.0090000000002, 16, 444, 156.5, 274.0, 303.94999999999993, 389.95000000000005, 21.181952976064395, 993.6484341903198, 3.2269381486973097], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 34.3, 13, 68, 30.5, 61.0, 63.449999999999996, 68.0, 8.650519031141869, 3.0834369593425603, 2.4498540224913494], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 286.2389999999998, 30, 594, 277.5, 457.0, 489.0, 533.97, 21.117540228914134, 16.49807830383917, 2.8665411052920557], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 292.04799999999994, 22, 591, 290.0, 456.0, 502.0, 572.0, 21.159990689604097, 14.299524958209018, 2.7896472100552274], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 498.56899999999985, 39, 1249, 445.5, 843.9, 933.7999999999997, 1116.8300000000002, 21.195421788893597, 6.789158541754981, 7.348022202204324], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 470.1189999999998, 84, 920, 481.0, 654.0, 695.0, 814.98, 21.099272075113408, 172.6266615676759, 4.203370608713999], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 20, 100.0, 57.9, 20, 199, 45.5, 100.80000000000004, 194.19999999999993, 199.0, 16.764459346186086, 5.549952849958088, 3.2906800083822296], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 50, 100.0, 176.92000000000004, 77, 329, 168.0, 271.5, 279.9, 329.0, 8.33472245374229, 2.6697157859643275, 2.8894789756626107], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 152.23900000000003, 12, 401, 149.0, 247.0, 288.89999999999986, 329.0, 21.181055663814284, 12.472828677031263, 2.854478204693722], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 224.59100000000018, 22, 434, 223.5, 324.0, 361.7999999999997, 409.0, 20.99252666050886, 6.949674353430178, 4.120603377697539], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 140.09799999999967, 11, 332, 137.0, 229.0, 271.8499999999998, 308.0, 21.246308453906135, 7.282670182930715, 4.336404752799201], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 283.5419999999998, 25, 615, 273.5, 442.9, 483.94999999999993, 575.0, 21.05883839447416, 16.267130048856504, 2.776311702396496], "isController": false}]}, function(index, item){
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
