const request = require("request")

// Class to encapsulate api calls to the google elevation api.
class Elevation{

    constructor(key){
        this.apiUrl = 'https://maps.googleapis.com/maps/api/elevation/json?locations='
        this.key = 'key='+key
    }

    resolveAddress(locations,option, cb){
        request.get(`${this.apiUrl}${locations}&${this.key}`,option, cb) 
    }

    
}

module.exports = Elevation