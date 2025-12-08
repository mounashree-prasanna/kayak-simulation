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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9112094395280236, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.7185, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [0.9775, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.923, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.9285, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.9825, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.756, 500, 1500, "5. Car Search"], "isController": false}, {"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [0.997, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.9935, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.996, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.9245, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10170, 100, 0.983284169124877, 314.8799410029497, 9, 1085, 288.0, 582.0, 688.0, 860.0, 205.6747628774243, 1383.2240438626204, 38.60272741521224], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["3. Hotel Search", 1000, 0, 0.0, 535.9410000000003, 103, 1011, 542.5, 798.8, 880.8999999999999, 983.99, 20.56005592335211, 220.45841214688105, 4.136105000205601], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 91.82000000000002, 57, 364, 83.5, 119.8, 147.35, 364.0, 10.060362173038229, 3.1045648893360163, 4.145969567404427], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 261.4659999999996, 16, 845, 242.0, 437.0, 494.8499999999998, 616.97, 20.589264757355515, 932.6971116478618, 3.136645802878379], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 22.459999999999994, 9, 49, 20.5, 36.0, 41.94999999999995, 49.0, 10.158472165786264, 3.6209397856562373, 2.876911062576189], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 337.1389999999998, 40, 803, 342.0, 532.9, 570.0, 680.0, 20.621107765909183, 16.25120504598507, 2.7991542768177506], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 340.0329999999998, 36, 888, 345.0, 529.0, 593.9499999999999, 717.97, 20.615581256313522, 13.750431638732554, 2.717874482033521], "isController": false}, {"data": ["10. Create Booking", 1000, 0, 0.0, 266.3769999999997, 32, 804, 245.5, 446.9, 483.0, 705.0, 20.600292524153843, 11.607782018004656, 7.121585501514121], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 510.2019999999998, 101, 1085, 497.0, 779.9, 837.9499999999999, 990.96, 20.588416956620204, 168.44702857672274, 4.16191631837928], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 0, 0.0, 51.9, 20, 279, 36.0, 95.10000000000011, 270.04999999999984, 279.0, 18.674136321195146, 6.856909430438843, 3.920839169000934], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 0, 0.0, 105.91999999999999, 46, 270, 94.5, 189.39999999999998, 228.3499999999999, 270.0, 9.686168151879118, 5.457928734017822, 3.348538599380085], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 175.93200000000007, 21, 579, 167.0, 304.0, 329.0, 454.99, 20.62833921241001, 12.147352094807848, 2.779991026672443], "isController": false}, {"data": ["1. Flight Search", 1000, 0, 0.0, 252.73099999999977, 19, 558, 261.0, 372.9, 414.6999999999996, 531.95, 20.545271505762948, 7.543966881022333, 4.313704466542025], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 0, 0.0, 170.26099999999983, 13, 617, 150.5, 319.9, 343.94999999999993, 473.98, 20.624935547076415, 8.096898525317108, 4.270006187480664], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 340.19899999999984, 32, 836, 348.5, 545.0, 584.0, 707.99, 20.602839071224015, 15.572849063600964, 2.7161946041164473], "isController": false}]}, function(index, item){
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
