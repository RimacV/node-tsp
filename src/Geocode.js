const request = require('request')  
const urlencode = require('urlencode');

function replaceAll(string, search, replacement) {
    return string.replace(new RegExp(search, 'g'), replacement);
};

// Class to encapsulate api calls to the google geocode api.
class Geocode{
    constructor(key){
        this.apiUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address='
        this.key = 'key='+key
    }

    resolveAddress(address,option, cb){
        address = replaceAll(address,' ', '+')
        request.get(urlencode(`${this.apiUrl}${address}&${this.key}`),option, cb) 
    }

    
}

module.exports = Geocode