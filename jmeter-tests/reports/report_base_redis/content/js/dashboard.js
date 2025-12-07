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

    var data = {"OkPercent": 29.53720508166969, "KoPercent": 70.4627949183303};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.2821687840290381, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.0, 500, 1500, "8. Get Booking"], "isController": false}, {"data": [0.429, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.446, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.433, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.0, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.4675, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.0, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.4435, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.483, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.0, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.4075, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11020, 7765, 70.4627949183303, 172.5785843920154, 4, 889, 139.0, 345.0, 414.9499999999989, 580.5799999999981, 337.22994063284165, 1371.2663324235725, 27.444460435920192], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Cache Test - Flight Search", 20, 20, 100.0, 21.85, 12, 85, 17.0, 27.900000000000002, 82.14999999999996, 85.0, 43.66812227074236, 14.456536572052402, 8.571574781659388], "isController": false}, {"data": ["8. Get Booking", 1000, 1000, 100.0, 138.06600000000003, 5, 396, 121.0, 269.0, 318.94999999999993, 357.97, 30.94346628709348, 42.98422173314355, 1.8515313147878825], "isController": false}, {"data": ["3. Hotel Search", 1000, 512, 51.2, 251.4389999999999, 5, 803, 212.5, 513.9, 565.8999999999999, 721.99, 30.761658668635413, 196.74099452442474, 2.9612902977728557], "isController": false}, {"data": ["7. Get User", 1000, 554, 55.4, 134.61599999999993, 6, 458, 109.0, 263.0, 294.94999999999993, 370.94000000000005, 30.9281538984938, 47.04286980407015, 1.8589511876411098], "isController": false}, {"data": ["9. Get User Bookings", 1000, 567, 56.7, 131.52700000000027, 6, 398, 115.0, 263.0, 292.0, 366.94000000000005, 30.967422271770097, 668.8968049362071, 2.0427611714975846], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, 100.0, 153.22899999999984, 5, 487, 135.0, 287.9, 318.0, 392.99, 30.672964848782286, 39.79475712763021, 3.0224252921599906], "isController": false}, {"data": ["4. Hotel Details", 1000, 526, 52.6, 175.6879999999999, 4, 649, 141.0, 352.0, 397.94999999999993, 508.98, 30.824240182479503, 48.243427694038594, 1.9832870006473091], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, 100.0, 126.46499999999995, 5, 392, 108.0, 252.89999999999998, 293.0, 359.98, 31.091627024842207, 45.85787264286603, 2.6208359081086967], "isController": false}, {"data": ["6. Car Details", 1000, 547, 54.7, 181.60100000000006, 6, 655, 150.0, 353.0, 395.0, 544.97, 30.915723737092684, 47.877043819173934, 1.84633895033389], "isController": false}, {"data": ["2. Flight Details", 1000, 508, 50.8, 186.82700000000008, 7, 691, 167.0, 365.0, 410.89999999999986, 543.96, 30.748416456552487, 47.166989845335465, 1.9944431846134925], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, 100.0, 172.26, 5, 889, 159.0, 326.0, 364.0, 482.94000000000005, 31.02121851346321, 44.497393248231795, 4.514859648374489], "isController": false}, {"data": ["5. Car Search", 1000, 531, 53.1, 249.66100000000006, 7, 791, 210.5, 518.0, 591.5499999999994, 726.99, 30.843254580223302, 155.5532556982913, 2.8817961183764114], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 943, 12.144236960721186, 8.557168784029038], "isController": false}, {"data": ["401/Unauthorized", 413, 5.318737926593689, 3.747731397459165], "isController": false}, {"data": ["Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 5965, 76.8190598840953, 54.12885662431942], "isController": false}, {"data": ["404/Not Found", 444, 5.717965228589826, 4.029038112522686], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11020, 7765, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 5965, "400/Bad Request", 943, "404/Not Found", 444, "401/Unauthorized", 413, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["Cache Test - Flight Search", 20, 20, "400/Bad Request", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["8. Get Booking", 1000, 1000, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 556, "404/Not Found", 444, "", "", "", "", "", ""], "isController": false}, {"data": ["3. Hotel Search", 1000, 512, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 512, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["7. Get User", 1000, 554, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 554, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["9. Get User Bookings", 1000, 567, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 567, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["1. Flight Search", 1000, 1000, "400/Bad Request", 502, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 498, "", "", "", "", "", ""], "isController": false}, {"data": ["4. Hotel Details", 1000, 526, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 526, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 1000, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 587, "401/Unauthorized", 413, "", "", "", "", "", ""], "isController": false}, {"data": ["6. Car Details", 1000, 547, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 547, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["2. Flight Details", 1000, 508, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 508, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10. Create Booking", 1000, 1000, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 579, "400/Bad Request", 421, "", "", "", "", "", ""], "isController": false}, {"data": ["5. Car Search", 1000, 531, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 531, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
