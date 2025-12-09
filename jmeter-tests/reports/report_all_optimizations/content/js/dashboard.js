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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9545722713864306, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.819, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.981, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.901, 500, 1500, "6. Car Details"], "isController": false}, {"data": [1.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.953, 500, 1500, "5. Car Search"], "isController": false}, {"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.994, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.99, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10170, 100, 0.983284169124877, 226.71199606686383, 6, 1404, 182.0, 461.0, 537.0, 705.289999999999, 257.4748727815894, 1730.7383869686573, 48.32499715182662], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["3. Hotel Search", 1000, 0, 0.0, 442.7799999999999, 93, 1395, 437.5, 661.9, 750.9499999999999, 1041.94, 25.580681469354346, 273.84319362017806, 5.146113654967769], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 83.53999999999999, 47, 462, 75.0, 95.8, 115.79999999999998, 462.0, 10.53518752633797, 3.2510930257058575, 4.341649546986936], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 146.39699999999985, 23, 423, 134.0, 242.89999999999998, 281.89999999999986, 329.97, 25.799793601651185, 1168.7687955527606, 3.930437306501548], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 15.740000000000006, 6, 33, 12.0, 24.9, 28.799999999999983, 33.0, 10.584250635055039, 3.7727065251905163, 2.997492855630821], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 263.1539999999994, 27, 914, 251.0, 433.9, 485.89999999999986, 625.0, 25.63116749967961, 20.199562668204535, 3.479230744585416], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 363.66100000000023, 12, 934, 374.0, 564.8, 615.8499999999998, 795.97, 25.7062800442148, 17.145887959178427, 3.3890115292665994], "isController": false}, {"data": ["10. Create Booking", 1000, 0, 0.0, 144.93799999999987, 24, 490, 135.0, 235.79999999999995, 272.0, 365.8900000000001, 25.827113303546064, 14.552973023580154, 8.928513778764946], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 325.65900000000016, 84, 1404, 304.0, 497.9, 542.8999999999999, 799.94, 25.652865425067983, 209.43159663434406, 5.185686663075265], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 0, 0.0, 52.9, 20, 169, 40.0, 128.20000000000005, 167.04999999999995, 169.0, 18.48428835489834, 6.787199630314232, 3.8809785120147873], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 0, 0.0, 84.3, 35, 240, 74.0, 165.49999999999994, 206.64999999999975, 240.0, 10.222858311183808, 5.760341060110407, 3.5340740646084647], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 106.39900000000011, 11, 446, 95.0, 183.89999999999998, 198.0, 380.0, 25.787152840454887, 15.185208166791304, 3.4752217695144276], "isController": false}, {"data": ["1. Flight Search", 1000, 0, 0.0, 230.50200000000007, 15, 610, 203.0, 393.79999999999995, 435.94999999999993, 516.9300000000001, 25.541479362484676, 9.37851195341234, 5.362712952084185], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 0, 0.0, 67.39500000000007, 10, 241, 64.0, 106.0, 126.89999999999986, 175.99, 25.888627126103504, 10.163308695989851, 5.359754834701115], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 204.53900000000016, 25, 713, 178.0, 342.9, 376.94999999999993, 557.9200000000001, 25.621316935690494, 19.36611260568793, 3.3778103382013835], "isController": false}]}, function(index, item){
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
