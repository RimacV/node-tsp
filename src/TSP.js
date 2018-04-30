'use strict'
const distance = require('google-distance-matrix');
const toCSV = require('array-to-csv')
const fs = require('fs');
const NodeGeocoder = require('node-geocoder');
const Elevation = require('./Elevation')
const roundPrecision = require('round-precision')

class TSP {
    
    constructor(apiKey) {
        this.apiKey = apiKey
        var options = {
            provider: 'google',
            httpAdapter: 'https',
            apiKey: apiKey,
            formatter: null
        }
        this.geocoder = NodeGeocoder(options);
        this.elevation = new Elevation(apiKey)
        distance.key(apiKey);
    }

    // Method which creates location Matrices as needed by held-karp algorithm.
    // If successful the method will return a elevation Matrix, a distance matrix
    // and a resultMatrix which already shows respect to deviations as specified.
    // To represent  a matrix a vector of vectors is used.
    // Example: For three locations the result matrix would look like this. (Without the location names (A,B,C))
    // A    B     C
    // A 0,89723,20768 
    // B 90210,0,106918
    // C 20958,106278,0  
    createTSPMatrices(destinations) {
        return new Promise(
            (resolve, reject) => {
                // First thing we need to do is to geocode the locations
                this.geocoder.batchGeocode(destinations).then(res => {
                    // The geolactions can now be used to get the elevation of the single locations
                    const geoLocations = []
                    let allLocationParam = createGeoLocationStringForElevationApi(res,geoLocations)
                    this.elevation.resolveAddress(allLocationParam, null, (err, res, body) => {
                 
                        if (err) {
                            reject(err)
                        }

                        const parsedBody = JSON.parse(body)
                        const elevations = []
                        parsedBody.results.forEach(location => {
                            elevations.push(location.elevation)
                        })

                        const counter = 0;
                        const distanceMatrixPromises = []
                        const distanceMatrix = []
                        const elevationMatrix = []
                        const elevationInPercentMatrix = []
                        const distanceWithRespectToElevationMatrix = []

                        // now that we have the elevations we can calculate the 
                        // distances between the locations. We can use this 
                        // for loop to create a elevation Matrix and to create a distance Matrix.
                        destinations.forEach((destination, index) => {
                            const origin = []
                            origin.push(destinations[index])

                            // param 1 is startpoint, param 2 array of locations
                            elevationMatrix.push(calculateElevationRow(elevations[index], elevations))

                            //To get the distance matrix we need to make api calls which are asynchronous.
                            // To synchronise it, calculateDistanceMatrix returns promises.
                            distanceMatrixPromises.push(calculateDistanceRow(origin, destinations, index))

                        })
                        // We wait for all promises to resolve.
                        Promise.all(distanceMatrixPromises)
                            .then(values => {

                                if(values.hasOwnProperty('status') && values.status === "ZERO_RESULTS")
                                {
                                    reject({status : 'ZERO_RESULTS'})
                                    return
                                } 
                                // Now we have everything we need to create the matrices.   
                                values.forEach((value, index) => {
                                    const distanceRow = []
                                    value.permutationRow.forEach((entry) => {
                                        distanceRow.push(entry.distanceValue)
                                    })
                                    distanceMatrix.push(distanceRow)
                                    const elevationInPercentRow = calculateElevationInPercentRow(distanceRow, elevationMatrix[index])
                                    elevationInPercentMatrix.push(elevationInPercentRow)
                                    const distanceWithRespectToElevationRow = calculateDistanceWithRespectToElevationRow(distanceRow,elevationInPercentRow)
                                    distanceWithRespectToElevationMatrix.push(distanceWithRespectToElevationRow)
                                })

                                /*
                                    Code to write the matrices to a file. Currently not used.
                                    Usefull for debugging
                                */
                                //serializeMatricesToFile(elevationInPercentMatrix,elevationMatrix,distanceMatrix)
                                
                                //Finaly we can resolve with our results.
                                resolve({
                                    error:null,
                                    elevationMatrix: elevationInPercentMatrix,
                                    distanceMatrix : distanceMatrix,
                                    resultMatrix: distanceWithRespectToElevationMatrix
                                })

                            }).catch(err => {
                                if(err){
                                    reject({error:err});
                                }
                            })
                    })
                    
                }).catch(err => {
                    if(err){
                        reject({error:err});
                    }
                    
                })
            }).catch(err => {
                if(err){
                    return err;
                }
            })
    }

}

// _________________________________________________
//
// Helper functions used in createTSPMatrices 
// Hopefully the function names are self explaining.
// _________________________________________________

function createGeoLocationStringForElevationApi(res,geoLocations){
    let allLocationParam = ''
    res.forEach((entry, index) => {
        const locationString = `${entry.value[0].latitude},${entry.value[0].longitude}`
        geoLocations.push(locationString)
        allLocationParam += locationString
        if (index !== res.length - 1) {
            allLocationParam += '|'
        }
    });

    return allLocationParam
}

// This method makes use of the npm package google-distance-matrix.
// https://www.npmjs.com/package/google-distance-matrix
function calculateDistanceRow(origins, destinations, index) {
    return new Promise(function (resolve, reject) {
        distance.matrix(origins, destinations, (err, distances) => {
            if (err) {
                reject(err);
            }
            else {
                const permutationRow = []
                let onePromiseFailed = false
                distances.rows.forEach(row => {
                    row.elements.forEach((element, index) => {

                        if(element.hasOwnProperty('status') && element.status === "ZERO_RESULTS" )
                        {
                            reject({status : "ZERO_RESULTS"} );
                            onePromiseFailed = true
                            return
                        }
                            
                        
                        const entry = {
                            destination: distances.destination_addresses[index],
                            distanceText: element.distance.text,
                            distanceValue: element.distance.value,
                            durationText: element.duration.text,
                            durationValue: element.duration.value
                        }
                        permutationRow.push(entry)
                    })
                });
                if (! onePromiseFailed){
                    resolve({ index: index, permutationRow: permutationRow })
                }
                
            }


        })
    })

}

function calculateElevationRow(origin, destinations) {
    const row = []
    destinations.forEach(location => {
        row.push(origin - location)
    })
    return row
}

function calculateElevationInPercentRow(distanceRow, elevationRow) {
    const elevationInPercentRow = []
    elevationRow.forEach((elevation, index) => {
        if (distanceRow[index] !== 0) {
            elevationInPercentRow.push(roundPrecision(elevation / distanceRow[index] * 100, 2))
        }
        else {
            elevationInPercentRow.push(0)
        }
    })
    return elevationInPercentRow
}

function calculateDistanceWithRespectToElevationRow(distanceRow, elevationInPercentRow) {
    const distanceWithRespectToElevationRow = []
    distanceRow.forEach((entry, index) => 
    {
        if (elevationInPercentRow[index] > 3.0) {
            distanceWithRespectToElevationRow.push(roundPrecision(entry * 1.20),2);
        } else if (elevationInPercentRow[index] <= -3.0) {
            distanceWithRespectToElevationRow.push(roundPrecision(entry * 0.90,2));
        }else{
            distanceWithRespectToElevationRow.push(entry)
        }

    })
    return distanceWithRespectToElevationRow
}

function serializeMatricesToFile(elevationInPercentMatrix,elevationMatrix,distanceMatrix){
    const elevationInPercentMatrixCSVString = toCSV(elevationInPercentMatrix)
    fs.writeFileSync(`${__dirname}/matrix/elevationInPercent_ex.csv`, elevationInPercentMatrixCSVString);
    const elevationMatrixCSVString = toCSV(elevationMatrix)
    fs.writeFileSync(`${__dirname}/matrix/elevation_ex.csv`, elevationMatrixCSVString);
    const distanceMatrixCSVString = toCSV(distanceMatrix)
    fs.writeFileSync(`${__dirname}/matrix/ex.csv`, distanceMatrixCSVString)
}

module.exports = TSP