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

    var data = {"OkPercent": 67.42514970059881, "KoPercent": 32.5748502994012};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.6637225548902196, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Cache Test - Flight Search"], "isController": false}, {"data": [0.643, 500, 1500, "3. Hotel Search"], "isController": false}, {"data": [0.659, 500, 1500, "7. Get User"], "isController": false}, {"data": [0.656, 500, 1500, "9. Get User Bookings"], "isController": false}, {"data": [0.704, 500, 1500, "1. Flight Search"], "isController": false}, {"data": [0.6815, 500, 1500, "4. Hotel Details"], "isController": false}, {"data": [0.635, 500, 1500, "11. Top Properties Analytics"], "isController": false}, {"data": [0.6685, 500, 1500, "6. Car Details"], "isController": false}, {"data": [0.7015, 500, 1500, "2. Flight Details"], "isController": false}, {"data": [0.6415, 500, 1500, "10. Create Booking"], "isController": false}, {"data": [0.6405, 500, 1500, "5. Car Search"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10020, 3264, 32.5748502994012, 177.75588822355354, 5, 669, 154.0, 353.0, 429.9499999999989, 543.0, 310.3416235636634, 1641.9143093098617, 38.349413076470405], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Cache Test - Flight Search", 20, 0, 0.0, 28.350000000000005, 20, 104, 24.0, 32.7, 100.44999999999995, 104.0, 33.72681281618887, 12.384064080944352, 6.982504215851602], "isController": false}, {"data": ["3. Hotel Search", 1000, 298, 29.8, 281.7140000000001, 8, 662, 275.5, 511.0, 546.0, 644.0, 31.15750116840629, 255.622590162019, 4.3147053668795765], "isController": false}, {"data": ["7. Get User", 1000, 341, 34.1, 119.55300000000017, 5, 331, 108.0, 217.0, 243.94999999999993, 300.99, 31.363693388533434, 36.46467345494605, 2.785426761855476], "isController": false}, {"data": ["9. Get User Bookings", 1000, 344, 34.4, 144.27699999999993, 6, 482, 124.0, 283.9, 325.0, 395.98, 31.39027529271432, 957.3601121809963, 3.1370656370656373], "isController": false}, {"data": ["1. Flight Search", 1000, 296, 29.6, 144.1280000000001, 6, 300, 148.0, 252.0, 267.0, 291.0, 31.047222825918222, 28.900598435219965, 4.5251327268775805], "isController": false}, {"data": ["4. Hotel Details", 1000, 317, 31.7, 182.83899999999983, 7, 535, 166.0, 331.79999999999995, 358.94999999999993, 466.9200000000001, 31.23048094940662, 39.298040043332286, 2.89543766591193], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 365, 36.5, 111.14699999999992, 5, 308, 104.0, 203.89999999999998, 220.0, 261.0, 31.499039279301982, 33.96789952593946, 4.082416990188049], "isController": false}, {"data": ["6. Car Details", 1000, 329, 32.9, 186.89799999999985, 6, 542, 175.0, 349.9, 382.0, 439.0, 31.33912062427528, 37.44617873288101, 2.7723185954589615], "isController": false}, {"data": ["2. Flight Details", 1000, 297, 29.7, 185.33000000000018, 6, 530, 180.0, 330.9, 349.0, 399.0, 31.142946122703208, 37.55839302398007, 2.886348927514793], "isController": false}, {"data": ["10. Create Booking", 1000, 358, 35.8, 156.76899999999978, 6, 503, 143.0, 288.0, 329.94999999999993, 423.96000000000004, 31.45445395067942, 36.95720179211751, 6.981045742639657], "isController": false}, {"data": ["5. Car Search", 1000, 319, 31.9, 267.8919999999998, 7, 669, 264.5, 487.0, 539.8999999999999, 628.0, 31.259768677711783, 196.820905947171, 4.2409493201000314], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 3264, 100.0, 32.5748502994012], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10020, 3264, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 3264, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": ["3. Hotel Search", 1000, 298, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 298, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["7. Get User", 1000, 341, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 341, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["9. Get User Bookings", 1000, 344, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 344, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["1. Flight Search", 1000, 296, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 296, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["4. Hotel Details", 1000, 317, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 317, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11. Top Properties Analytics", 1000, 365, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 365, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["6. Car Details", 1000, 329, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 329, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["2. Flight Details", 1000, 297, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 297, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10. Create Booking", 1000, 358, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 358, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["5. Car Search", 1000, 319, "Non HTTP response code: java.net.BindException/Non HTTP response message: Address already in use: connect", 319, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
