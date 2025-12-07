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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5684422560429723, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.724, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [0.9995, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.976, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.958, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.723, 500, 1500, "5. Car Search"], "isController": false}, {"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.969, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11170, 4170, 37.33213965980304, 329.04359892569454, 8, 1344, 296.0, 588.8999999999996, 713.0, 917.8699999999972, 216.3638476736528, 1355.2666125716694, 39.391450952523925], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 285.0429999999996, 36, 1019, 245.5, 509.9, 635.9499999999999, 737.99, 19.722698854111194, 5.604790397017927, 2.6579418377610793], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 531.512, 124, 1344, 524.0, 790.9, 827.9499999999999, 987.98, 19.6174595389897, 210.35127513487004, 3.9464811181951935], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 153.33999999999995, 62, 492, 145.0, 202.0, 333.89999999999924, 492.0, 7.803964413922272, 2.408254643358826, 3.216086897143749], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 215.77000000000032, 25, 507, 200.0, 370.4999999999999, 403.0, 463.8900000000001, 19.748405316270713, 926.4002390791319, 3.0085461224006163], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 45.120000000000005, 14, 103, 46.0, 68.6, 97.89999999999999, 103.0, 8.058017727639, 2.8722426470588234, 2.282055801772764], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 305.5400000000002, 35, 714, 302.0, 444.9, 497.0, 634.99, 19.649067651739927, 15.350834102921816, 2.6672074253826654], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 318.5540000000001, 40, 726, 314.0, 478.5999999999999, 537.0, 652.99, 19.678454060648995, 13.298330283172954, 2.5943274396363423], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 515.7539999999989, 46, 1271, 485.0, 831.9, 948.7999999999997, 1174.6500000000003, 19.782393669634025, 6.33654797230465, 6.8581540553907026], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 521.5910000000005, 104, 1117, 524.0, 789.0, 858.8999999999999, 993.8700000000001, 19.641734758013826, 160.70161504164048, 3.970545991121936], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 20, 100.0, 62.750000000000014, 24, 181, 59.0, 94.9, 176.69999999999993, 181.0, 15.56420233463035, 5.152602140077821, 3.10068093385214], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 50, 100.0, 220.23999999999998, 94, 438, 219.5, 341.0, 383.34999999999997, 438.0, 7.844367743959836, 2.5126490429871353, 2.7194829581110764], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 208.75899999999982, 20, 494, 200.5, 340.0, 385.0, 474.97, 19.712590431508605, 11.608097685741884, 2.6565795698712766], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 251.5800000000001, 36, 548, 258.5, 361.0, 393.94999999999993, 450.99, 19.627470607862765, 6.497766148501443, 3.91016016016016], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 195.26699999999988, 8, 480, 191.0, 322.79999999999995, 357.0, 452.7700000000002, 19.86452394668362, 6.80903115750581, 4.112577223336842], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 303.85699999999986, 29, 715, 300.0, 450.9, 513.9499999999999, 648.96, 19.66916465057729, 15.193661365826793, 2.5931027615507167], "isController": false}]}, function(index, item){
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
