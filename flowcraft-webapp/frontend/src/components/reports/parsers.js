import _ from "lodash";
import React from "react";
import Typography from "@material-ui/core/Typography";

import {CellBar} from "./tables";

import styles from "../../styles/reports.css"

/**
 * Parses the reportData array and search for all unique table signatures.
 * Returns an array with the table signatures found
 *
 * This will check each object in report Array for the presence of the
 * following signature:
 *      object["report_json"]["tableRow"]
 *
 * If present, this will be an array of objects, each containing an individual
 * entry belonging to table defined by the `table` key.
 *
 * @param reportArray : Raw reports array of objects
*/
export const findTableSignatures = (reportArray) => {

    // Stores the unique table signatures found and sets the value as the
    // array of JSON for those tables
    let tables = new Map();

    const signatures = ["tableRow"];

    for (const r of reportArray){

        for (const s of signatures){

            // Skip entries without the tableRow signture
            if (!r.reportJson.hasOwnProperty(s)){
                continue
            }

            for (const tr of r.reportJson[s]){
                if (!tr.hasOwnProperty("data")){
                    continue
                }

                for (const cell of tr.data){

                    cell.rowId = tr.sample;
                    cell.projectId = r.projectid;
                    cell.processName = r.processName;
                    cell.processId = r.processId;

                    if (!tables.has(cell.table)){
                        tables.set(cell.table, [cell])
                    } else {
                        tables.get(cell.table).push(cell)
                    }
                }
            }

        }

    }

    return tables;

};


/**
 * Parses the reportData array and search for all unique chart signatures.
 * Returns an array object with the chart signatures.
 *
 * This will check each object in report Array for the presence of the
 * following signature:
 *      object["report_json"]["plotData"]
 *
 * @param reportArray
 * @returns {Array}
 */
export const findChartSignatures = (reportArray) => {

    let charts = [];

    for (const r of reportArray){

        // Skip entries without the plotData signature
        if (!r.reportJson.hasOwnProperty("plotData")){
            continue
        }

        for (const el of r.reportJson.plotData){

            if (!el.hasOwnProperty("data")){
                continue
            }

            for (const plot of Object.keys(el.data)) {

                !charts.includes(plot) && charts.push(plot)
            }
        }
    }

    return charts;
};


/**
 * Method used to retrieve the JSON array needed for the column tableHeaders of
 * a ReactTable component. The Headers are sorted by their processId attribute.
 * @param dataArray
 * @returns {{accessor: *, Header: *, processName: *}[]}
 */
export const getTableHeaders = (dataArray) => {

    let columnsMap = new Map();

    // Build the unsorted Map object for each column eader
    for (const el of dataArray){
        const columnAccessor = el.header.split(" ").join("");
        const processNum = el.processId.split("_").slice(-1);
        if (!columnsMap.has(columnAccessor)) {
            columnsMap.set(columnAccessor, {
                num: parseInt(processNum),
                header: el.header,
                processName: el.processName
            })
        }
    }

    // Sort the column tableHeaders according to the processId
    const sortedColumns = [...columnsMap.entries()].sort((a, b) => {return a[1].num - b[1].num});

    return sortedColumns.map((v) => {
        return {
            accessor: `${v[0]}${v[1].processName}`,
            Header: v[1].header,
            processName: v[1].processName,
        }
    })

};


/**
 * Returns the maximum numeric values for each header in the reportArray. Returns
 * a Map object with tableHeaders as keys and the maximum values as values.
 * @param reportArray
 * @returns {Map<any, any>}
 */
const getColumnMax = (reportArray) => {

    let columnMax = new Map();

    for (const cell of reportArray){

        if (!columnMax.has(cell.header)){
            columnMax.set(cell.header, parseFloat(cell.value))
        } else if (parseFloat(cell.value) > columnMax.get(cell.header)) {
            columnMax.set(cell.header, parseFloat(cell.value))
        }

    }

    return columnMax
};


/**
 * Generic parser for simple numeric table data. This simply assumes that each
 * JSON in the reportArray argument has a numeric value that should be displayed
 * as is. Additional modifications to the table cell can still be performed
 * conditional on the present of certain keys in the JSON (columnBar for instance)
 * @param reportArray
 * @returns {{tableArray: Array, columnsArray: Array, rawTableArray: Array}}
 */
export const genericTableParser = (reportArray) => {

    // Temporary data object. Will be used to generate the finalDataDict array
    let dataDict = {};

    // Stores the column array, ready to be provided to react table
    let columnsArray = [];

    // Stores the final processed data to display in the table, already
    // with the final components of the table cells
    let tableArray = [];

    // Stores the final array, but contains the raw values, instead of the
    // processed cell components used in the tableArray.
    let rawDataDict = {};
    let rawTableArray = [];


    const tableHeaders  = getTableHeaders(reportArray);
    const columnMaxVals = getColumnMax(reportArray);

    // Add ID to columns
    columnsArray.push({
        Header: <Typography>ID</Typography>,
        accessor: "rowId",
        minWidth: 90
    });

    // Add tableHeaders with typography and minWidth
    for (const h of tableHeaders){
        columnsArray.push({
            Header: <div>
                        <Typography className={styles.tableMainHeader}>{h.Header}</Typography>
                        <Typography className={styles.tableSecondaryHeader}>{h.processName}</Typography>
                    </div>,
            accessor: h.accessor,
            minWidth: 90
        })
    }

    for (const cell of reportArray) {

        const accessor = `${cell.header.split(" ").join("")}${cell.processName}`;

        // Add values to dictionary by rowId
        if (!dataDict.hasOwnProperty(cell.rowId)) {
            // Add rowId in the _id field to have checkbox on Checkbox
            // React-table
            dataDict[cell.rowId] = {
                "_id": cell.rowId,
                "rowId": <Typography className={styles.tableCell}>{cell.rowId}</Typography>
            };
            rawDataDict[cell.rowId] = {
                "rowId": cell.rowId
            };
            dataDict[cell.rowId][accessor] = <CellBar value={cell.value} max={columnMaxVals.get(cell.header)}/>;
            rawDataDict[cell.rowId][accessor] = cell.value;
        } else {
            dataDict[cell.rowId][accessor] = <CellBar value={cell.value} max={columnMaxVals.get(cell.header)}/>;
            rawDataDict[cell.rowId][accessor] = cell.value;
        }
    }

    // Create array of data by row
    for (const id in dataDict){
        tableArray.push(dataDict[id]);
        rawTableArray.push(rawDataDict[id])
    }

    return {
        tableArray,
        columnsArray,
        rawTableArray,
    }

};
