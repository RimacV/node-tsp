'use strict'
const express = require('express')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const path = require('path')
const TSP = require('./TSP')
const exec = require('child_process').exec;
const logger = require('simple-node-logger').createSimpleLogger(`${__dirname}/../logs/logs.txt`);

class Server {

    constructor(configuration, title) {
        this.title = title
        this.app = express()
        this.tspSolver = new TSP(configuration.google_backend_api_key)
        this.configureApp(configuration)
        this.configureRoutes(configuration)

        this.pathToHeldKarpScript = `${__dirname}/../held-karp/held-karp.py` 
    }

    listen(port, callback) {
        this.app.listen(port, callback)
    }

    // Configure express.js 
    configureApp(config) {

        this.app.use(bodyParser.urlencoded({
            extended: false
        }))

        //important to get 
        //easy acces to json data on post requests.
        this.app.use(bodyParser.json())

        //Setup static file serving
        this.app.use(express.static(path.join(__dirname, '..', 'public')))

        //Configure the view engine.
        //The engine is handlebars.
        this.app.engine('.hbs', exphbs({
            defaultLayout: false,
            extname: '.hbs',
        }))
        this.app.set('view engine', '.hbs')
        this.app.set('views', path.join(__dirname, '..', 'views'))
        this.app.use(this.catchMiddlewareError)
    }
    // Routes exposed by express.js
    configureRoutes(config) {

        //Main route which provides the GUI.
        this.app.get('/', (req, res) => {
            res.render('index', { apiKey: config.google_frontend_api_key })
        })

        // Simple Check if the server is still alive. Currently not used by the frontend.
        this.app.get('/status', (req, res) => res.sendStatus(200))

        //Route which gets called by jquery to calculate tsp.
        this.app.post('/tspWithRespectToDeviation', (req, res) => {
            const respectDeviation = true
            this.calculateTSP(req,res,respectDeviation)
        })
        //Route which gets called by jquery to calculate tsp.
        this.app.post('/tspWithoutRespectToDeviation', (req, res) => {
            const respectDeviation = false
            this.calculateTSP(req,res,respectDeviation)
        })

    }

    calculateTSP(req,res,respectDeviation){
        const destinations = []
        req.body.forEach(element => {
            destinations.push(element.searchbarAddress)
        })
       
        //This method creates matrices from the locations.
        //These locations are used as input for the held-karp script.
        //This method works asynchronous because it executes various google api calls.
        //To handle the asynchrones this method makes use of promises.
        this.tspSolver.createTSPMatrices(destinations).then((matrices) => {

            //If one of the locations is not geocodable, google returns a NOT FOUND error.
            //Further investigation why google can not geocode the location is needed.
            if(matrices.error){
                logger.error("There seems to be locations where no routes between exist.", matrices.error)
                res.send({error:'Sorry google maps could not find a route. Check the Logs for details', result:null})
                
            }else{
                let heldKarpCommand = ''
                if(respectDeviation){
                    heldKarpCommand = this.createHeldKarpCommandFromMatrix(matrices.resultMatrix)
                }else{
                    heldKarpCommand = this.createHeldKarpCommandFromMatrix(matrices.distanceMatrix)
                }
                exec(heldKarpCommand, (error, stdout, stderr) => {
                    if(error || stderr){
                        if(error) logger.error(error)
                        if(stderr) logger.error(stderr)
                        res.send({error:'Command for Held Karp was misformed! Check the Logs for details', result:null})
                    }
                    else{
                        res.send({error:null,result:stdout})
                    }
                });
            }

        })
    }

    //This method creates a argument string which is used to call
    //the python script with arguments.
    //It looks something like this: 
    //"python path/to/script/held-karp.py', '0,90210,106918', '89723,0,20768', '106278,20958,0' "
    createHeldKarpCommandFromMatrix(matrix){
        let heldKarpCommand = `python ${this.pathToHeldKarpScript} `
        matrix.forEach((row,index) =>{
            let rowString = "'"
            row.forEach((value, index)=>{
                if(index != row.length -1){
                    rowString += `${value},`
                }else{
                    rowString += `${value}'`
                }
            })
            if(index != row.length -1){
                heldKarpCommand += `${rowString}, `
            }else{
                heldKarpCommand += `${rowString}`
            }
           
        })
        return heldKarpCommand
    }

    catchMiddlewareError(error, req, res, next) {
        console.error(error.stack)
        res.status(500).send('Something broke!')
    }

}

module.exports = Server