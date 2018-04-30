'use strict'


const configuration = require('./src/Configuration')
const Server = require('./src/Server')
const title =  'TSP'
const server = new Server(configuration, title)

//Entrypoint for the app
server.listen(configuration.public_port, () => {
    console.log(`Server running on ${configuration.public_url}, internal port ${configuration.public_port}`)
})