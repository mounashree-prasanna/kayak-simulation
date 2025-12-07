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

    var data = {"OkPercent": 63.63636363636363, "KoPercent": 36.36363636363637};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5422727272727272, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.6725, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.9855, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.988, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.8675, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.869, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.884, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.6985, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11000, 4000, 36.36363636363637, 356.29772727272683, 11, 1129, 315.0, 642.0, 742.0, 915.9899999999998, 200.19291317087377, 1271.6554915987224, 35.741117576937775], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["8. Get Booking", 1000, 1000, 100.0, 246.28699999999972, 27, 806, 223.5, 418.0, 494.0, 624.99, 18.79840589518009, 5.342125112790436, 2.533378919467629], "isController": false}, {"data": ["3. Hotel Search", 1000, 0, 0.0, 582.726000000001, 76, 1107, 601.0, 840.6999999999999, 912.7999999999997, 1020.96, 18.533963488091928, 198.73230585673247, 3.6561138912056346], "isController": false}, {"data": ["7. Get User", 1000, 0, 0.0, 237.63399999999976, 25, 965, 220.0, 400.0, 461.94999999999993, 728.1300000000008, 18.751875187518753, 11.040313015676567, 2.5271081795679566], "isController": false}, {"data": ["9. Get User Bookings", 1000, 0, 0.0, 234.51500000000016, 23, 968, 210.0, 394.9, 465.94999999999993, 556.7500000000002, 18.82423808896335, 883.0476926778421, 2.8677550213655105], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 295.1179999999999, 13, 846, 295.0, 446.5999999999999, 493.89999999999986, 547.99, 18.422652493506014, 6.0989054641587295, 3.616165186713583], "isController": false}, {"data": ["4. Hotel Details", 1000, 0, 0.0, 394.01600000000036, 17, 950, 387.5, 622.8, 690.9499999999999, 887.0, 18.61019094055905, 14.538702799903227, 2.5261880280641678], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 210.59299999999985, 11, 826, 194.5, 356.79999999999995, 404.8499999999998, 635.0, 18.935807612194658, 6.49069186707063, 3.864827920848324], "isController": false}, {"data": ["6. Car Details", 1000, 0, 0.0, 392.24100000000027, 12, 951, 398.0, 594.8, 657.9499999999999, 765.7900000000002, 18.71958068139274, 12.64957383704605, 2.4679134687383], "isController": false}, {"data": ["2. Flight Details", 1000, 0, 0.0, 387.16799999999967, 19, 1117, 386.5, 613.0, 672.8499999999998, 822.0, 18.465856631089117, 14.26263814768992, 2.434463520700225], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 374.9429999999999, 77, 1129, 345.0, 596.9, 679.8999999999999, 831.8900000000001, 18.839487565938207, 5.335401752072344, 6.5128697249434815], "isController": false}, {"data": ["5. Car Search", 1000, 0, 0.0, 564.0339999999999, 70, 1121, 573.0, 840.9, 911.0, 1075.91, 18.63099452248761, 152.4313375074524, 3.7116434400268288], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 2000, 50.0, 18.181818181818183], "isController": false}, {"data": ["401/Unauthorized", 1000, 25.0, 9.090909090909092], "isController": false}, {"data": ["404/Not Found", 1000, 25.0, 9.090909090909092], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11000, 4000, "400/Bad Request", 2000, "401/Unauthorized", 1000, "404/Not Found", 1000, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["8. Get Booking", 1000, 1000, "404/Not Found", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, "401/Unauthorized", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, "400/Bad Request", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
