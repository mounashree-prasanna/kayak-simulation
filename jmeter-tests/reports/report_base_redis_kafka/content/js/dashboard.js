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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9431170108161259, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.8245, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.0, 500, 1500, "14. Create User (Kafka Event)"], "isController": false}, {"data": [0.9975, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "13. Process Payment (Saga Pattern)"], "isController": false}, {"data": [0.95, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.8815, 500, 1500, "6. Car Details"], "isController": false}, {"data": [1.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.9175, 500, 1500, "5. Car Search"], "isController": false}, {"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "12. Create Booking (Kafka Event)"], "isController": false}, {"data": [1.0, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.975, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [1.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.9755, 500, 1500, "2. Flight Details"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10170, 100, 0.983284169124877, 236.6696165191741, 6, 1847, 184.0, 488.0, 566.4499999999989, 756.8699999999972, 250.83859510655094, 1686.0947943900455, 46.76487658469811], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["3. Hotel Search", 1000, 0, 0.0, 435.39499999999936, 66, 1598, 426.0, 680.0, 786.8999999999999, 1091.88, 24.873146950552183, 266.2689813202666, 4.906616878917521], "isController": false}, {"data": ["14. Create User (Kafka Event)", 50, 50, 100.0, 65.86, 47, 95, 64.0, 82.8, 92.89999999999999, 95.0, 10.016025641025642, 3.0908829126602564, 4.127698066907051], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 161.72200000000024, 17, 529, 143.0, 283.9, 346.89999999999986, 471.8800000000001, 24.94200982715187, 1129.8747989050457, 3.7997593096051676], "isController": false}, {"data": ["13. Process Payment (Saga Pattern)", 50, 50, 100.0, 13.420000000000002, 6, 49, 11.0, 19.0, 31.599999999999966, 49.0, 10.164667615368977, 3.623148124618825, 2.8786656332587928], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 298.27700000000016, 10, 810, 291.0, 502.69999999999993, 564.8499999999998, 673.95, 24.916529625753725, 19.63636660935865, 3.382224236308367], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 350.05399999999946, 9, 874, 364.5, 578.9, 650.9499999999999, 840.99, 24.929573953581134, 16.627831064742104, 3.28661375364595], "isController": false}, {"data": ["10. Create Booking", 1000, 0, 0.0, 141.9819999999999, 18, 411, 136.5, 247.89999999999998, 275.0, 328.98, 24.98625755834291, 14.079170518714708, 8.637827319974015], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 358.76499999999965, 56, 1847, 340.5, 562.0, 633.8999999999999, 1040.820000000001, 24.886145882587165, 203.17205036955926, 4.957786875046661], "isController": false}, {"data": ["Cache Test - Flight Search", 20, 0, 0.0, 26.8, 12, 99, 19.0, 78.6000000000001, 98.19999999999999, 99.0, 35.97122302158273, 13.208183453237409, 7.44716726618705], "isController": false}, {"data": ["12. Create Booking (Kafka Event)", 50, 0, 0.0, 65.88, 26, 250, 53.0, 111.59999999999998, 189.24999999999972, 250.0, 10.052271813429835, 5.664219566747085, 3.475101779252111], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 92.62399999999992, 10, 324, 84.0, 168.0, 188.94999999999993, 310.0, 24.943254096929486, 14.688263887156719, 3.3614932279065126], "isController": false}, {"data": ["1. Flight Search", 1000, 0, 0.0, 238.92400000000006, 9, 756, 204.5, 422.0, 505.6999999999996, 671.9200000000001, 24.865725084543463, 9.130383429480803, 5.147982146409389], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 0, 0.0, 68.89700000000002, 8, 237, 63.0, 123.0, 139.0, 173.99, 25.009378516943855, 9.818134925597098, 5.104453232462173], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 252.49600000000015, 13, 674, 257.0, 426.0, 498.8499999999998, 544.8700000000001, 24.904739371902473, 18.824480736184096, 3.283339663287924], "isController": false}]}, function(index, item){
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
